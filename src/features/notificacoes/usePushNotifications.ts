import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/session';
import { criarGatePush } from './navGate';
import { registrarTokenPush } from './push';
import { useToast } from './Toast';

// Handler de foreground (T8 #46): com o app aberto NÃO mostramos banner do SO —
// o aviso vira toast in-app (addNotificationReceivedListener abaixo). Mantemos a
// notificação na lista/central e sem badge. Definido no escopo do módulo para
// valer para o app inteiro, uma única vez.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Monta os efeitos de notificação: registra o token ao logar, re-registra quando
// o Expo rotaciona o token, mostra toast in-app no foreground e navega para o
// destino (§4.5) ao tocar no push — em background e no cold start. A navegação é
// segurada até router+auth prontos e o usuário logado, com flush no login.
export function usePushNotifications(): void {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  // Navegação só é segura depois que a árvore do expo-router montou. No cold
  // start o response chega antes disso; sem esperar, o push se perde.
  const navState = useRootNavigationState();
  const navReady = navState?.key != null;
  const { showToast } = useToast();

  // Gate de navegação (dedupe + hold/flush), estável entre renders.
  const [gate] = useState(criarGatePush);
  const podeNavegar = navReady && userId != null;
  // Prontidão lida dentro do listener (registrado uma vez): um response que
  // resolve tarde precisa enxergar o estado atual, não o do render que o disparou.
  const podeNavegarRef = useRef(podeNavegar);
  useEffect(() => {
    podeNavegarRef.current = podeNavegar;
  });

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

  // Foreground: sem banner do SO (handler acima); mostramos toast in-app.
  // `||` (não `??`) para um title vazio cair no body em vez de virar toast vazio.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notificacao) => {
      const conteudo = notificacao.request.content;
      showToast(conteudo.title || conteudo.body || 'Nova notificação');
    });
    return () => sub.remove();
  }, [showToast]);

  // Toque no push -> deep link. Listener registrado uma vez (router é estável);
  // a prontidão vem do ref para um response que resolve tarde não se perder.
  useEffect(() => {
    function abrir(response: Notifications.NotificationResponse | null): void {
      const link = gate.aoTocar(response, podeNavegarRef.current);
      if (link) router.push(link as never);
    }

    // Cold start: app aberto a partir de um push.
    void Notifications.getLastNotificationResponseAsync().then(abrir);

    // App em foreground/background: toque enquanto a sessão está viva.
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [gate, router]);

  // Flush: quando router+auth prontos e logado, navega ao alvo segurado.
  // Cobre o cold start deslogado — o toque fica pendente até o login autenticar.
  useEffect(() => {
    const link = gate.aoFicarPronto(podeNavegar);
    if (link) router.push(link as never);
  }, [gate, podeNavegar, router]);
}
