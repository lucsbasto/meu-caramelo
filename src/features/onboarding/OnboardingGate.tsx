// Porta de primeira execução. Decide UMA vez, no boot, se a primeira tela é o
// onboarding (§6.1) ou o app. Segura o splash até decidir, pra não piscar o mapa
// antes de redirecionar. Depois disso não interfere mais na navegação.

import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/session';
import { decidirRotaInicial, lerOnboardingVisto } from './primeiraAbertura';

export function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading } = useAuth();
  const [onboardingVisto, setOnboardingVisto] = useState<boolean | null>(null);
  const decidido = useRef(false);

  useEffect(() => {
    lerOnboardingVisto().then(setOnboardingVisto);
  }, []);

  useEffect(() => {
    if (decidido.current) return;

    const rota = decidirRotaInicial({
      sessaoCarregando: loading,
      temSessao: session != null,
      onboardingVisto,
    });
    if (rota == null) return; // ainda decidindo — mantém o splash.

    decidido.current = true;
    if (rota === 'onboarding' && segments[0] !== 'onboarding') {
      // Não esconde o splash aqui: o swap de rota ainda não pintou o
      // onboarding, então revelar agora piscaria o mapa de baixo por um frame.
      // Quem esconde é o próprio OnboardingScreen, no primeiro layout.
      router.replace('/onboarding');
    } else {
      // Vai direto ao app: nada a esperar, some com o splash já.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, session, onboardingVisto, segments, router]);

  return null;
}
