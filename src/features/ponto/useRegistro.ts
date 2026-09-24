// Registro de alimentação (§6.7): mutation online com queda para fila offline,
// hook de flush global e a mensagem de sucesso H2. As regras de quem pode
// registrar vivem na RLS; aqui só oferecemos a ação a quem está autenticado.

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { abbreviateName } from '@/features/auth/abbreviate';
import { supabase } from '@/lib/supabase';
import {
  type DadosRegistro,
  enfileirar,
  enviarRegistro,
  flushFila,
  invalidarRegistro,
  lerFila,
} from './filaOffline';
import { gerarIdRegistro } from './registro';

// Entrada da mutation: os dados do registro menos o pontoId (fixo por hook) e o
// id (gerado aqui). A validação real (>= 1 tipo) já ocorre na tela.
export type EntradaRegistro = Omit<DadosRegistro, 'pontoId' | 'id'>;

export type ResultadoRegistro = { modo: 'online' | 'offline' };

// ---------------------------------------------------------------------------
// Mutation online com fail-safe para a fila offline (§6.7). Gera a PK no
// cliente (idempotência) e tenta enviar direto. Como a validação já passou,
// QUALQUER erro do envio é inesperado/transitório: enfileira o rascunho e
// sinaliza 'offline' — nunca lança perdendo o registro. Só falha se nem o
// rascunho conseguir ser persistido (aí a tela avisa e o usuário tenta de novo).
// ---------------------------------------------------------------------------
export function useRegistrarAlimentacao(pontoId: string) {
  return useMutation<ResultadoRegistro, Error, EntradaRegistro>({
    mutationFn: async (entrada) => {
      const dados: DadosRegistro = {
        ...entrada,
        pontoId,
        id: gerarIdRegistro(),
      };
      try {
        await enviarRegistro(dados);
        return { modo: 'online' };
      } catch {
        // Falha no envio online → cai na fila com a MESMA PK (não duplica).
        // enfileirar pode lançar se a persistência falhar: aí sim propaga.
        await enfileirar(dados);
        return { modo: 'offline' };
      }
    },
    onSuccess: (res) => {
      // Só o envio online muda o servidor agora; o offline invalida no flush.
      if (res.modo === 'online') invalidarRegistro(pontoId);
    },
  });
}

// ---------------------------------------------------------------------------
// Flush global da fila offline (§6.7). Montado em app/_layout.tsx: tenta subir
// os rascunhos ao abrir, sempre que o app volta ao foreground e num retry com
// backoff enquanto houver itens. Não bloqueia a UI.
// ---------------------------------------------------------------------------
export function useFlushFilaOffline(): void {
  // Flag de cancelamento: o retry é um setTimeout recursivo com await no meio,
  // então checamos antes de re-agendar e depois do await para nenhum timer
  // nascer após o unmount.
  const canceladoRef = useRef(false);

  useEffect(() => {
    canceladoRef.current = false;
    void flushFila();

    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void flushFila();
    });

    // Retry com backoff simples: 15 s → dobra até 2 min enquanto sobrar item;
    // reseta para uma sondagem lenta (30 s) quando a fila esvazia.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let atraso = 15_000;
    const agendar = () => {
      if (canceladoRef.current) return;
      timer = setTimeout(async () => {
        const antes = await lerFila();
        if (antes.length > 0) {
          await flushFila();
          const depois = await lerFila();
          atraso = depois.length > 0 ? Math.min(atraso * 2, 120_000) : 30_000;
        } else {
          atraso = 30_000;
        }
        if (canceladoRef.current) return;
        agendar();
      }, atraso);
    };
    agendar();

    return () => {
      canceladoRef.current = true;
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Mensagem de sucesso H2 (§6.7). Olha os registros de HOJE de OUTROS usuários:
// se não houver, "Você foi o primeiro hoje"; senão, cita o autor e a hora do
// último registro alheio. Roda depois do insert online.
// ---------------------------------------------------------------------------
export async function buscarMensagemH2(
  pontoId: string,
  meuUserId: string,
): Promise<string> {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('registros')
    .select('user_id, criado_em, profiles(nome)')
    .eq('ponto_id', pontoId)
    .gte('criado_em', inicioDia.toISOString())
    .order('criado_em', { ascending: false });
  if (error) throw error;

  const deOutros = (data ?? []).filter((r) => r.user_id !== meuUserId);
  if (deOutros.length === 0) return 'Você foi o primeiro hoje';

  const ultimo = deOutros[0];
  // Só o primeiro nome (§7.6): abbreviateName já reduz o sobrenome à inicial.
  const primeiroNome = abbreviateName(ultimo.profiles?.nome ?? 'Vizinho').split(
    ' ',
  )[0];
  const hora = new Date(ultimo.criado_em).getHours();
  return `${primeiroNome} passou às ${hora}h — bom reforço`;
}
