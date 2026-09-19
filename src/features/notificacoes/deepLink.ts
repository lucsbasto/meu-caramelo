// §4.5 — o toque no push abre a tela final, nunca a home. A Edge Function envia
// `data = { tipo, ...ids }` cru (contrato T6 #44); aqui resolvemos a rota do
// Expo Router a partir da tabela canônica `tipo → rota` (tipos.ts), que vive no
// app para que trocar uma rota não exija redeploy da função.

import { rotaDeNotificacao } from './tipos';

export function resolveNotificationLink(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  return rotaDeNotificacao(d.tipo, d);
}
