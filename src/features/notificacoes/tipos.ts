// Fonte única do vocabulário canônico de `tipo` de notificação (§7.5 +
// `promovido_principal`) e da tabela `tipo → rota` (§4.5).
//
// Contrato T6 (#44): a Edge Function envia `data = { tipo, ...ids }` cru (sem
// rota pré-computada); a tabela `tipo → rota` vive AQUI, no app. Assim trocar
// uma rota versiona junto com o cliente e não exige redeploy da EF.

export const TIPOS_NOTIFICACAO = [
  'ponto_vencido',
  'ponto_novo_por_perto',
  'pedido_ajuda',
  'cobertura_confirmada',
  'registro_em_ponto_seguido',
  'comentario',
  'lembrete_cobertura',
  'promovido_principal',
] as const;

export type TipoNotificacao = (typeof TIPOS_NOTIFICACAO)[number];

export function isTipoNotificacao(v: unknown): v is TipoNotificacao {
  return (
    typeof v === 'string' &&
    (TIPOS_NOTIFICACAO as readonly string[]).includes(v)
  );
}

// Qual campo de id, no `data` cru, cada tipo precisa para montar a rota.
type CampoId = 'ponto_id' | 'pedido_id' | 'registro_id';

// §4.5 — tabela canônica `tipo → rota`. Só `lembrete_cobertura` abre no atalho
// de alimentar; `ponto_vencido` abre no detalhe do ponto (preserva contexto).
const ROTA_POR_TIPO: Record<
  TipoNotificacao,
  { campo: CampoId; rota: (id: string) => string }
> = {
  ponto_vencido: { campo: 'ponto_id', rota: (id) => `/ponto/${id}` },
  ponto_novo_por_perto: { campo: 'ponto_id', rota: (id) => `/ponto/${id}` },
  promovido_principal: { campo: 'ponto_id', rota: (id) => `/ponto/${id}` },
  lembrete_cobertura: {
    campo: 'ponto_id',
    rota: (id) => `/ponto/${id}/registrar`,
  },
  pedido_ajuda: { campo: 'pedido_id', rota: (id) => `/pedido/${id}` },
  cobertura_confirmada: { campo: 'pedido_id', rota: (id) => `/pedido/${id}` },
  registro_em_ponto_seguido: {
    campo: 'registro_id',
    rota: (id) => `/registro/${id}`,
  },
  comentario: { campo: 'registro_id', rota: (id) => `/registro/${id}` },
};

// Resolve a rota interna a partir do `data` cru da mensagem push.
// tipo desconhecido → null (não navega); id ausente/malformado → null (descarta).
export function rotaDeNotificacao(
  tipo: unknown,
  dados: Record<string, unknown>,
): string | null {
  if (!isTipoNotificacao(tipo)) return null;
  const spec = ROTA_POR_TIPO[tipo];
  const id = dados[spec.campo];
  if (typeof id !== 'string' || id.length === 0) return null;
  return spec.rota(id);
}
