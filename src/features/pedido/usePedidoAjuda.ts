// Query do pedido de ajuda por id (WP14/R5). `maybeSingle` não lança quando não
// há linha, então id inexistente vira `null` (estado não-encontrado), não erro.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  normalizarPedidoAjuda,
  type PedidoAjuda,
  type PedidoAjudaRow,
} from './dados';

export function chavePedido(id: string) {
  return ['pedido', id] as const;
}

async function buscarPedido(id: string): Promise<PedidoAjuda | null> {
  const { data, error } = await supabase
    .from('pedidos_ajuda')
    // Hint de FK: pedidos_ajuda tem duas relações com profiles (autor_id e
    // coberto_por) e duas com pontos (tabela + view), então apontamos a coluna.
    .select(
      'id, texto, status, criado_em, data_alvo, ponto_id, autor:profiles!pedidos_ajuda_autor_id_fkey(nome), ponto:pontos!pedidos_ajuda_ponto_id_fkey(nome)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizarPedidoAjuda(data as PedidoAjudaRow) : null;
}

export function usePedidoAjuda(id: string) {
  return useQuery({
    queryKey: chavePedido(id),
    queryFn: () => buscarPedido(id),
  });
}
