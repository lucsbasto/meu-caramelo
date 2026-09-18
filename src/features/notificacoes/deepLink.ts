// §4.5 — o toque no push abre a tela final. A Edge Function já grava a rota do
// Expo Router em `data.link`; aqui só validamos e extraímos essa rota do
// conteúdo recebido pelo listener do expo-notifications.

export function resolveNotificationLink(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const link = (data as Record<string, unknown>).link;
  if (typeof link !== 'string') return null;
  // Só aceitamos rotas internas absolutas — nunca URLs externas num push.
  if (!link.startsWith('/')) return null;
  return link;
}
