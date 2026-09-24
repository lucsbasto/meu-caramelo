// Dados e mutações do editor de ponto (§6.6): carregar ponto para edição,
// "meus pontos", geocodificação reversa, verificação de duplicata, criação,
// atualização, desativação e saída de mantenedor. As regras de quem pode o quê
// vivem na RLS; aqui o cliente só oferece as ações e trata os erros.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { distanciaMetros } from '@/features/mapa/pontos';
import type { TablesInsert } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ResultadoSaida } from './convites';
import {
  BUCKET_FOTOS,
  type Coord,
  coordParaEwkt,
  DISTANCIA_DUPLICATA_M,
  geomHexParaCoord,
  PAPEL_PRINCIPAL,
} from './editor';

// Ponto no formato que o editor consome (coordenada real, não arredondada:
// editar precisa da posição exata para não deslocar o pin ~50 m a cada save).
export type PontoEditavel = {
  id: string;
  nome: string;
  endereco: string | null;
  fotoUrl: string | null;
  lat: number;
  lng: number;
  ativo: boolean;
};

export type PontoDaLista = {
  id: string;
  nome: string;
  endereco: string | null;
  ativo: boolean;
};

export type PontoProximo = {
  id: string;
  nome: string;
  distanciaM: number;
};

function chaveMeusPontos(userId: string) {
  return ['meus-pontos', userId] as const;
}

// ---------------------------------------------------------------------------
// Geocodificação reversa (§6.6): endereço legível a partir da coordenada.
// ---------------------------------------------------------------------------
export async function geocodeReverso(coord: Coord): Promise<string | null> {
  try {
    const [lugar] = await Location.reverseGeocodeAsync({
      latitude: coord.lat,
      longitude: coord.lng,
    });
    if (!lugar) return null;
    // Rua + número quando houver; cai para bairro/cidade para nunca vir vazio.
    const linha = [lugar.street, lugar.streetNumber].filter(Boolean).join(', ');
    const complemento = [lugar.district ?? lugar.subregion, lugar.city]
      .filter(Boolean)
      .join(' · ');
    const texto = [linha, complemento].filter(Boolean).join(' — ');
    return texto || null;
  } catch {
    // Sem rede ou serviço indisponível: o campo continua editável à mão.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verificação de duplicata (§6.6 Estados): aviso, nunca bloqueio.
// ---------------------------------------------------------------------------
export async function buscarPontoProximo(
  coord: Coord,
  ignorarId?: string,
): Promise<PontoProximo | null> {
  const { data, error } = await supabase.rpc('pontos_proximos', {
    lat: coord.lat,
    lng: coord.lng,
    raio_m: 200,
  });
  if (error) throw error;

  let maisProximo: PontoProximo | null = null;
  for (const row of data ?? []) {
    if (row.id == null || row.lat == null || row.lng == null) continue;
    if (ignorarId && row.id === ignorarId) continue;
    const d = distanciaMetros(coord, { lat: row.lat, lng: row.lng });
    if (
      d < DISTANCIA_DUPLICATA_M &&
      (!maisProximo || d < maisProximo.distanciaM)
    ) {
      maisProximo = {
        id: row.id,
        nome: row.nome ?? 'Ponto sem nome',
        distanciaM: d,
      };
    }
  }
  return maisProximo;
}

// ---------------------------------------------------------------------------
// Foto: redimensiona (~1600 px / 80%) e sobe para o Storage (§6.6 Dados).
// Lança em caso de falha para o chamador decidir "salvar sem foto".
// ---------------------------------------------------------------------------
// Redimensiona (~1600 px / 80%) e devolve o binário JPEG pronto para o Storage.
// fetch(file://).arrayBuffer() é o caminho recomendado do Supabase no RN:
// não depende de lib de base64 e funciona com o Storage direto.
async function comprimirParaJpeg(localUri: string): Promise<ArrayBuffer> {
  const contexto = ImageManipulator.manipulate(localUri);
  contexto.resize({ width: 1600 });
  const renderizada = await contexto.renderAsync();
  const comprimida = await renderizada.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return fetch(comprimida.uri).then((r) => r.arrayBuffer());
}

export async function subirFotoPonto(
  pontoId: string,
  localUri: string,
): Promise<string> {
  const arquivo = await comprimirParaJpeg(localUri);
  // Nome estável por ponto: trocar a capa sobrescreve o arquivo antigo em vez
  // de deixar órfãos acumulados no bucket.
  const caminho = `${pontoId}/foto.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, arquivo, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho);
  // Quebra o cache do CDN/Image quando a foto é substituída no mesmo caminho.
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Galeria (§6.4): várias fotos por ponto na tabela `ponto_fotos`. Cada imagem
// vira um arquivo com nome único no bucket (não sobrescreve as outras) e uma
// linha na tabela. A tabela ainda não está nos tipos gerados — fronteira
// tipada estreita, mesmo padrão de `useSairMantenedor`.
// ---------------------------------------------------------------------------
const dbFotos = supabase as unknown as {
  from: (t: 'ponto_fotos') => {
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    delete: () => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    };
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        order: (
          col: string,
          o: { ascending: boolean },
        ) => {
          order: (
            col: string,
            o: { ascending: boolean },
          ) => Promise<{ data: FotoEditavelRow[] | null; error: unknown }>;
        };
      };
    };
  };
};

type FotoEditavelRow = { id: string; url: string; ordem: number | null };

// Sobe uma foto da galeria com nome único (não colide com as outras do ponto).
export async function subirFotoGaleria(
  pontoId: string,
  localUri: string,
): Promise<string> {
  const arquivo = await comprimirParaJpeg(localUri);
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const caminho = `${pontoId}/galeria/${nome}`;

  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, arquivo, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho);
  return data.publicUrl;
}

export async function inserirFotoPonto(args: {
  pontoId: string;
  url: string;
  ordem: number;
  userId: string;
}): Promise<void> {
  const { error } = await dbFotos.from('ponto_fotos').insert({
    ponto_id: args.pontoId,
    url: args.url,
    ordem: args.ordem,
    criado_por: args.userId,
  });
  if (error) throw error;
}

// Extrai o caminho dentro do bucket a partir da URL pública, para apagar o
// arquivo junto com a linha. A URL pública é `.../<bucket>/<caminho>[?t=...]`.
function caminhoNoBucket(url: string): string | null {
  const marcador = `/${BUCKET_FOTOS}/`;
  const i = url.indexOf(marcador);
  if (i < 0) return null;
  const bruto = url.slice(i + marcador.length).split('?')[0];
  return bruto || null;
}

export async function removerFotoPonto(
  fotoId: string,
  url: string,
): Promise<void> {
  const { error } = await dbFotos.from('ponto_fotos').delete().eq('id', fotoId);
  if (error) throw error;
  // Limpeza do Storage é best-effort: a linha já saiu; um arquivo que não
  // apagou (rede/permissão) não deve reverter a remoção lógica nem travar o
  // save. Sobra, no pior caso, um órfão — nunca uma foto fantasma na galeria.
  const caminho = caminhoNoBucket(url);
  if (caminho) {
    try {
      await supabase.storage.from(BUCKET_FOTOS).remove([caminho]);
    } catch {
      // ignora: órfão tolerável, remoção lógica preservada.
    }
  }
}

async function buscarFotosEditavel(pontoId: string): Promise<FotoEditavel[]> {
  const { data, error } = await dbFotos
    .from('ponto_fotos')
    .select('id, url, ordem')
    .eq('ponto_id', pontoId)
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    url: f.url,
    ordem: f.ordem ?? 0,
  }));
}

export type FotoEditavel = { id: string; url: string; ordem: number };

export function useFotosEditavel(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? ['ponto-fotos-editavel', id]
      : ['ponto-fotos-editavel', 'sem-id'],
    queryFn: () => buscarFotosEditavel(id as string),
    enabled: id != null,
    staleTime: 0,
  });
}

// ---------------------------------------------------------------------------
// Carregar ponto para edição. Lê direto da TABELA `pontos` (não da view
// `pontos_com_status`, que filtra `where p.ativo`) para que pontos DESATIVADOS
// também abram na edição e possam ser reativados. A coordenada exata vem do
// `geom` (EWKB hexa) decodificado no cliente. RLS: só o criador enxerga o
// próprio ponto desativado (`ativo or criado_por = auth.uid()`); um co-mantenedor
// não-criador continua bloqueado pela RLS — follow-up conhecido.
async function buscarPontoEditavel(id: string): Promise<PontoEditavel | null> {
  const { data, error } = await supabase
    .from('pontos')
    .select('id, nome, endereco, foto_url, ativo, geom')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const coord =
    typeof data.geom === 'string' ? geomHexParaCoord(data.geom) : null;
  if (!coord) return null;

  return {
    id: data.id,
    nome: data.nome ?? '',
    endereco: data.endereco,
    fotoUrl: data.foto_url,
    lat: coord.lat,
    lng: coord.lng,
    ativo: data.ativo,
  };
}

export function usePontoEditavel(id: string | undefined) {
  return useQuery({
    queryKey: id ? ['ponto-editavel', id] : ['ponto-editavel', 'sem-id'],
    queryFn: () => buscarPontoEditavel(id as string),
    enabled: id != null,
    staleTime: 0,
  });
}

// ---------------------------------------------------------------------------
// "Meus pontos": pontos em que o usuário é mantenedor (§6.6 Como se chega).
// ---------------------------------------------------------------------------
async function buscarMeusPontos(userId: string): Promise<PontoDaLista[]> {
  const { data, error } = await supabase
    .from('ponto_mantenedores')
    .select('ponto_id, pontos(id, nome, endereco, ativo)')
    .eq('user_id', userId);
  if (error) throw error;

  return (data ?? [])
    .map((linha) => linha.pontos)
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      endereco: p.endereco,
      ativo: p.ativo,
    }));
}

export function useMeusPontos(userId: string | null) {
  return useQuery({
    queryKey: userId ? chaveMeusPontos(userId) : ['meus-pontos', 'sem-id'],
    queryFn: () => buscarMeusPontos(userId as string),
    enabled: userId != null,
  });
}

// ---------------------------------------------------------------------------
// Criar ponto (§6.6 Interações). São dois passos que o cliente NÃO consegue
// tornar transacionais (sem RPC/transação no ambiente hospedado): (1) inserir
// a linha em `pontos`; (2) registrar o criador em `ponto_mantenedores`. Para
// não gerar ponto órfão (sem mantenedor, com o criador travado pela RLS) nem
// duplicar o ponto numa nova tentativa, a tela guarda o id já criado e chama:
//   - `useCriarPonto` uma única vez (insere só o ponto, devolve o id);
//   - `useGarantirMantenedor` (idempotente via upsert) quantas vezes precisar.
// ---------------------------------------------------------------------------
export type DadosCriarPonto = {
  nome: string;
  coord: Coord;
  endereco: string | null;
  criadoPor: string;
};

export function useCriarPonto() {
  return useMutation({
    mutationFn: async ({
      nome,
      coord,
      endereco,
      criadoPor,
    }: DadosCriarPonto) => {
      const novoPonto: TablesInsert<'pontos'> = {
        nome: nome.trim(),
        criado_por: criadoPor,
        geom: coordParaEwkt(coord),
        endereco: endereco?.trim() || null,
      };
      const { data, error } = await supabase
        .from('pontos')
        .insert(novoPonto)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
  });
}

export function useGarantirMantenedor() {
  return useMutation({
    mutationFn: async ({
      pontoId,
      userId,
    }: {
      pontoId: string;
      userId: string;
    }) => {
      const mantenedor: TablesInsert<'ponto_mantenedores'> = {
        ponto_id: pontoId,
        user_id: userId,
        papel: PAPEL_PRINCIPAL,
      };
      // Idempotente: repetir a tentativa não duplica nem sobrescreve o papel.
      const { error } = await supabase
        .from('ponto_mantenedores')
        .upsert(mantenedor, {
          onConflict: 'ponto_id,user_id',
          ignoreDuplicates: true,
        });
      if (error) throw error;
    },
  });
}

// ---------------------------------------------------------------------------
// Atualizar ponto (§6.6 Interações — Salvar em edição).
// ---------------------------------------------------------------------------
export type DadosAtualizarPonto = {
  id: string;
  nome: string;
  coord: Coord;
  endereco: string | null;
};

export function useAtualizarPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome, coord, endereco }: DadosAtualizarPonto) => {
      const { error } = await supabase
        .from('pontos')
        .update({
          nome: nome.trim(),
          geom: coordParaEwkt(coord),
          endereco: endereco?.trim() || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ponto', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['ponto-editavel', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['pontos'] });
    },
  });
}

// Grava só a foto_url depois que o ponto já existe (upload é passo à parte
// para nunca perder o cadastro por causa da imagem — §6.6 Estados).
export async function gravarFotoUrl(
  id: string,
  fotoUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('pontos')
    .update({ foto_url: fotoUrl })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Desativar ponto (§6.6): nunca apagar — o histórico é de várias pessoas.
// ---------------------------------------------------------------------------
export function useDesativarPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pontos')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['ponto', id] });
      queryClient.invalidateQueries({ queryKey: ['ponto-editavel', id] });
      queryClient.invalidateQueries({ queryKey: ['pontos'] });
      queryClient.invalidateQueries({ queryKey: ['meus-pontos'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Reativar ponto: desfaz a desativação (só o criador enxerga o ponto
// desativado pela RLS, então é ele quem reativa — §6.6).
// ---------------------------------------------------------------------------
export function useReativarPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pontos')
        .update({ ativo: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['ponto', id] });
      queryClient.invalidateQueries({ queryKey: ['ponto-editavel', id] });
      queryClient.invalidateQueries({ queryKey: ['pontos'] });
      queryClient.invalidateQueries({ queryKey: ['meus-pontos'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Sair de mantenedor (§7.4/§6.6): passa pela RPC `sair_mantenedor`, que decide
// entre promover o co mais antigo a principal (avisando-o) ou orfanar o ponto.
// Um DELETE cru não serve: a RLS pós-0006 bloqueia o principal de apagar a
// própria linha justamente para forçar este caminho de promoção/órfão.
// ---------------------------------------------------------------------------
export function useSairMantenedor() {
  const queryClient = useQueryClient();
  // Fronteira do supabase: a RPC nova ainda não está nos tipos gerados.
  const db = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  return useMutation<ResultadoSaida, Error, { id: string; userId: string }>({
    mutationFn: async ({ id }) => {
      const { data, error } = await db.rpc('sair_mantenedor', { p_ponto: id });
      if (error) throw error;
      return data as ResultadoSaida;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ponto', vars.id] });
      queryClient.invalidateQueries({
        queryKey: ['ponto', vars.id, 'mantenedores'],
      });
      queryClient.invalidateQueries({ queryKey: ['pontos'] });
      queryClient.invalidateQueries({ queryKey: ['meus-pontos'] });
    },
  });
}
