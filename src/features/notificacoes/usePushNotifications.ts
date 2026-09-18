import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/features/auth/session';
import { registrarTokenPush } from './push';
import { resolveNotificationLink } from './deepLink';

// Handler de foreground (§ escopo WP14): com o app aberto, ainda mostramos o
// aviso como banner + lista, sem badge. Definido no escopo do módulo para valer
// para o app inteiro, uma única vez.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Monta os efeitos de notificação: registra o token ao logar, re-registra
// quando o Expo rotaciona o token, e navega para o destino (§4.5) ao tocar no
// push — tanto com o app em background quanto no cold start.
export function usePushNotifications(): void {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  // Ids de response já navegados — o response de cold start chega tanto por
  // getLastNotificationResponseAsync quanto pelo listener; deduplicamos por
  // identifier para não empilhar a mesma tela duas vezes.
  const tratados = useRef<Set<string>>(new Set());

  // Registro do token: no login e a cada rotação de token do Expo.
  // Chaveado por userId (string) para não re-rodar a cada TOKEN_REFRESHED, que
  // troca o objeto de sessão sem trocar o usuário.
  useEffect(() => {
    if (!userId) return;
    void registrarTokenPush(userId);

    const sub = Notifications.addPushTokenListener(() => {
      void registrarTokenPush(userId);
    });
    return () => sub.remove();
  }, [userId]);

  // Toque no push -> deep link.
  useEffect(() => {
    function abrir(response: Notifications.NotificationResponse | null): void {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (tratados.current.has(id)) return;
      tratados.current.add(id);
      const data = response.notification.request.content.data;
      const link = resolveNotificationLink(data);
      if (link) router.push(link as never);
    }

    // Cold start: app aberto a partir de um push.
    void Notifications.getLastNotificationResponseAsync().then(abrir);

    // App em foreground/background: toque enquanto a sessão está viva.
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [router]);
}
