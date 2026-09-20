// Gate de navegação do push (T8 #46), isolado do React para ser testável direto:
// resolve a rota do toque (§4.5), deduplica por identifier, e segura o deep link
// até router+auth prontos e o usuário logado — com flush quando ficarem prontos.
import type * as Notifications from 'expo-notifications';
import { resolveNotificationLink } from './deepLink';

export type GatePush = {
  // Processa o toque no push. Devolve a rota a navegar agora, ou null quando
  // descartado (já tratado / sem rota) ou segurado (ainda não pode navegar).
  aoTocar(
    response: Notifications.NotificationResponse | null,
    podeNavegar: boolean
  ): string | null;
  // Chamado quando router+auth ficam prontos e logado. Devolve a rota segurada
  // a navegar, ou null se não há nada pendente.
  aoFicarPronto(podeNavegar: boolean): string | null;
};

export function criarGatePush(): GatePush {
  // Ids de response já navegados — o response de cold start chega tanto por
  // getLastNotificationResponseAsync quanto pelo listener; deduplicamos por
  // identifier para não empilhar a mesma tela duas vezes.
  const tratados = new Set<string>();
  // Deep link segurado até poder navegar (cold start deslogado / nav não pronta).
  let pendente: string | null = null;

  return {
    aoTocar(response, podeNavegar) {
      if (!response) return null;
      const id = response.notification.request.identifier;
      if (tratados.has(id)) return null;
      tratados.add(id);
      const link = resolveNotificationLink(response.notification.request.content.data);
      if (!link) return null;
      if (podeNavegar) return link;
      pendente = link;
      return null;
    },

    aoFicarPronto(podeNavegar) {
      if (podeNavegar && pendente) {
        const link = pendente;
        pendente = null;
        return link;
      }
      return null;
    },
  };
}
