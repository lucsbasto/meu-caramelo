// Fila offline de registros (§6.7). Único lugar do app com fila: o registro de
// alimentação NUNCA pode se perder por falta de rede. Rascunhos ficam em
// expo-secure-store e sobem sozinhos quando a conexão volta (flush no
// foreground + retry com backoff). Guardamos só a URI local da foto (file://),
// nunca base64, por causa do limite ~2 KB do SecureStore no Android.
import * as SecureStore from 'expo-secure-store';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/lib/database.types';
import { queryClient } from '@/lib/query';
import { BUCKET_FOTOS } from './editor';
import type { TipoItem } from './registro';

const CHAVE_FILA = 'fila_registros';

// Teto de auto-retentativas por rascunho: depois disso paramos de tentar
// sozinhos, mas NUNCA descartamos — o registro fica na fila (§6.7).
const MAX_TENTATIVAS = 8;

// Dados de um registro pronto para enviar (online ou como rascunho). O `id` é
// gerado no cliente (UUID) para dar idempotência sem tocar o schema: se o
// servidor já comitou e o ack se perdeu, o re-insert bate na PK e é tratado
// como sucesso.
export type DadosRegistro = {
  id: string;
  pontoId: string;
  userId: string;
  tipos: TipoItem[];
  quantidadeKg: number | null;
  caes: number | null;
  gatos: number | null;
  observacao: string | null;
  fotoLocalUri: string | null;
};

// Rascunho persistido: os mesmos dados + carimbo de tempo e contador de
// tentativas. O `localId` da fila é o próprio `id` do registro (mesmo UUID).
export type RascunhoRegistro = DadosRegistro & {
  localId: string;
  criadoEm: string;
  tentativas: number;
};

// Código do erro do postgrest/Postgres, quando presente (ex.: '23505' = PK).
// PostgrestError é um objeto plano (tem `.code`/`.message`, mas não é
// `instanceof Error`), então lemos os campos direto.
function codigoErro(err: unknown): string | null {
  const c = (err as { code?: unknown })?.code;
  return typeof c === 'string' ? c : null;
}

// Invalida as chaves que dependem de um novo registro: o pin muda de cor no
// mapa (['pontos']) e o detalhe se atualiza (§6.7 / §6.6).
export function invalidarRegistro(pontoId: string): void {
  queryClient.invalidateQueries({ queryKey: ['pontos'] });
  queryClient.invalidateQueries({ queryKey: ['ponto', pontoId] });
  queryClient.invalidateQueries({ queryKey: ['ponto', pontoId, 'registros'] });
  queryClient.invalidateQueries({ queryKey: ['ponto', pontoId, 'estatisticas'] });
}

// ---------------------------------------------------------------------------
// Foto do registro: mesmo padrão de subirFotoPonto (§6.6) — resize 1600,
// compress 0.8, arrayBuffer, upload. Caminho estável por registro.
// ---------------------------------------------------------------------------
export async function subirFotoRegistro(
  registroId: string,
  localUri: string
): Promise<string> {
  const contexto = ImageManipulator.manipulate(localUri);
  contexto.resize({ width: 1600 });
  const renderizada = await contexto.renderAsync();
  const comprimida = await renderizada.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  const arquivo = await fetch(comprimida.uri).then((r) => r.arrayBuffer());
  const caminho = `registros/${registroId}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, arquivo, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Envio online do registro: insere em `registros` e, se houver foto, sobe e
// grava `foto_url`. A foto é passo à parte (§6.7): se o upload falhar, o
// registro permanece salvo — nunca se perde por causa da imagem.
// Lança em falha de rede/insert para o chamador decidir (enfileirar ou UI).
// ---------------------------------------------------------------------------
export async function enviarRegistro(dados: DadosRegistro): Promise<void> {
  const novo: TablesInsert<'registros'> = {
    // PK vinda do cliente (§6.7): reenvio do mesmo rascunho não duplica.
    id: dados.id,
    ponto_id: dados.pontoId,
    user_id: dados.userId,
    tipos: dados.tipos,
    quantidade_kg: dados.quantidadeKg,
    caes: dados.caes,
    gatos: dados.gatos,
    observacao: dados.observacao,
  };

  const { error } = await supabase.from('registros').insert(novo);
  if (error) {
    // 23505 = violação de PK: a linha já existe (ack perdido num reenvio).
    // Tratamos como sucesso idempotente — a foto do primeiro envio permanece.
    if (codigoErro(error) === '23505') return;
    throw error;
  }

  if (dados.fotoLocalUri) {
    try {
      const url = await subirFotoRegistro(dados.id, dados.fotoLocalUri);
      await supabase.from('registros').update({ foto_url: url }).eq('id', dados.id);
    } catch {
      // Registro já salvo: seguir sem foto (§6.7).
    }
  }
}

// ---------------------------------------------------------------------------
// Persistência da fila em SecureStore.
// ---------------------------------------------------------------------------
export async function lerFila(): Promise<RascunhoRegistro[]> {
  try {
    const bruto = await SecureStore.getItemAsync(CHAVE_FILA);
    if (!bruto) return [];
    const fila = JSON.parse(bruto);
    return Array.isArray(fila) ? (fila as RascunhoRegistro[]) : [];
  } catch {
    // JSON corrompido ou store indisponível: trata como fila vazia.
    return [];
  }
}

// Grava a fila. NÃO engole erro do SecureStore (limite ~2 KB no Android com
// vários rascunhos): propaga para o chamador avisar o usuário em vez de sumir
// com o registro (§6.7).
// TODO(follow-up): se o volume offline crescer, migrar a fila para
// expo-file-system (sem limite de tamanho) — não adicionar a dep agora.
async function gravarFila(fila: RascunhoRegistro[]): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_FILA, JSON.stringify(fila));
}

// Enfileira um rascunho. O localId é o próprio UUID do registro, então um
// reenvio usa a mesma PK e não duplica. Propaga erro de persistência.
export async function enfileirar(dados: DadosRegistro): Promise<void> {
  const fila = await lerFila();
  const rascunho: RascunhoRegistro = {
    ...dados,
    localId: dados.id,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  };
  fila.push(rascunho);
  await gravarFila(fila);
}

export async function removerDaFila(localId: string): Promise<void> {
  const fila = await lerFila();
  await gravarFila(fila.filter((r) => r.localId !== localId));
}

// Conta mais uma tentativa falha sem descartar o rascunho. Best-effort: falha
// de persistência aqui não pode derrubar o registro (ele fica na fila).
async function incrementarTentativas(localId: string): Promise<void> {
  try {
    const fila = await lerFila();
    const nova = fila.map((r) =>
      r.localId === localId ? { ...r, tentativas: (r.tentativas ?? 0) + 1 } : r
    );
    await gravarFila(nova);
  } catch {
    // bookkeeping opcional: o item permanece na fila de qualquer forma
  }
}

// ---------------------------------------------------------------------------
// Flush: tenta enviar cada rascunho. Em SUCESSO (ou PK duplicada, tratada como
// sucesso em enviarRegistro) remove da fila; em QUALQUER falha mantém o item,
// conta a tentativa e para o loop (retry depois pelo backoff). NUNCA descarta
// por falha de envio — o registro não pode se perder (§6.7). Idempotente e com
// guard em memória contra flush concorrente.
// ---------------------------------------------------------------------------
let flushando = false;

export async function flushFila(): Promise<void> {
  if (flushando) return;
  flushando = true;
  try {
    const fila = await lerFila();
    if (fila.length === 0) return;

    const pontosAfetados = new Set<string>();
    for (const rascunho of fila) {
      // Atingiu o teto: não auto-retenta mais, mas segue na fila (não descarta).
      if ((rascunho.tentativas ?? 0) >= MAX_TENTATIVAS) continue;
      try {
        await enviarRegistro(rascunho);
      } catch {
        // Falha (rede ou inesperada): mantém o item, conta a tentativa e para.
        await incrementarTentativas(rascunho.localId);
        break;
      }
      await removerDaFila(rascunho.localId);
      pontosAfetados.add(rascunho.pontoId);
    }

    // Se algo subiu, atualiza mapa e detalhes dos pontos afetados.
    pontosAfetados.forEach((pontoId) => invalidarRegistro(pontoId));
  } finally {
    flushando = false;
  }
}
