// Dados do pedido de ajuda (§6.13) — tela mínima do WP14/R5. O detalhe completo
// com cobertura fica para o WP13; aqui só carregamos e mostramos o pedido para
// que o deep link `/pedido/:id` (tipos pedido_ajuda / cobertura_confirmada) abra
// uma tela real em vez de quebrar.
import type { Database } from '@/lib/database.types';

export type StatusPedido = Database['public']['Enums']['status_pedido'];

export type PedidoAjuda = {
  id: string;
  texto: string;
  status: StatusPedido;
  criadoEm: string;
  dataAlvo: string | null;
  autorNome: string;
  pontoId: string;
  pontoNome: string;
};

// Forma crua devolvida pelo select com os joins to-one de autor e ponto.
export type PedidoAjudaRow = {
  id: string;
  texto: string;
  status: StatusPedido;
  criado_em: string;
  data_alvo: string | null;
  ponto_id: string;
  autor: { nome: string } | { nome: string }[] | null;
  ponto: { nome: string } | { nome: string }[] | null;
};

// Supabase devolve o join to-one ora como objeto, ora como array de um item
// dependendo da inferência; normalizamos para pegar sempre o primeiro.
function primeiro<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function normalizarPedidoAjuda(row: PedidoAjudaRow): PedidoAjuda {
  return {
    id: row.id,
    texto: row.texto,
    status: row.status,
    criadoEm: row.criado_em,
    dataAlvo: row.data_alvo,
    autorNome: primeiro(row.autor)?.nome ?? 'Alguém',
    pontoId: row.ponto_id,
    pontoNome: primeiro(row.ponto)?.nome ?? 'Ponto',
  };
}

export const ROTULOS_STATUS: Record<StatusPedido, string> = {
  aberto: 'Aberto',
  coberto: 'Coberto',
  expirado: 'Expirado',
};
