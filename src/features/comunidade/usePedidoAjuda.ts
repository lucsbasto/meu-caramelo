// Mutations/queries do pedido de ajuda (§6.9) e da cobertura (§6.8).
// Os tipos gerados em database.types.ts ainda não conhecem a RPC cobrir_pedido
// nem a unique nova, então casteamos na fronteira do supabase — igual às notas
// dos WPs anteriores (useMantenedores).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/session';

// Cast único na fronteira: libera .rpc()/.from() que os tipos gerados ainda não
// enxergam por completo (RPC nova, insert sem regen contra o hosted).
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => any;
};

export function chavePedidoAberto(pontoId: string, dataISO: string | null) {
  return ['pedido-aberto', pontoId, dataISO] as const;
}

// Verifica se já há um pedido ABERTO para o ponto naquela data (§6.9 Estados):
// a folha mostra o existente e oferece "Ver pedido" em vez de duplicar. Só roda
// com uma data resolvida.
export function usePedidoAbertoExistente(pontoId: string, dataISO: string | null) {
  return useQuery<string | null>({
    queryKey: chavePedidoAberto(pontoId, dataISO),
    enabled: dataISO != null,
    queryFn: async () => {
      const { data, error } = await db
        .from('pedidos_ajuda')
        .select('id')
        .eq('ponto_id', pontoId)
        .eq('data_alvo', dataISO)
        .eq('status', 'aberto')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string } | null)?.id ?? null;
    },
  });
}

export type EntradaPedido = { texto: string; dataISO: string };

// Publica um pedido (§6.9): insere em pedidos_ajuda com status `aberto`. A
// unique parcial (migration 0012) barra a duplicata por data no servidor — a
// mutation deixa o erro subir para a folha traduzir. Sem fila offline.
export function useCriarPedido(pontoId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, EntradaPedido>({
    mutationFn: async ({ texto, dataISO }) => {
      const userId = user?.id;
      if (!userId) throw new Error('auth_required');
      const { data, error } = await db
        .from('pedidos_ajuda')
        .insert({
          ponto_id: pontoId,
          autor_id: userId,
          texto: texto.trim(),
          data_alvo: dataISO,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      // Aparece no topo do feed (§6.9 Interações). O realtime de INSERT também
      // invalida, mas o autor não depende dele para ver o próprio pedido.
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-aberto', pontoId] });
    },
  });
}

// Cobre um pedido (§6.8): a RPC faz a transição aberto -> coberto e notifica o
// autor. Devolve o texto 'coberto'; erros ('ja_coberto' etc.) sobem para o
// chamador traduzir. Invalida o feed para o pedido coberto sair da lista.
export function useCobrirPedido() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (pedidoId: string) => {
      const { data, error } = await db.rpc('cobrir_pedido', { p_pedido: pedidoId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
