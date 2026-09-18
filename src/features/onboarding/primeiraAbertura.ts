// Porta de primeira execução (§6.1 "Como se chega"): o onboarding aparece só na
// primeira abertura depois da instalação e nunca mais — a menos que a pessoa
// saia da conta e apague os dados. Guardamos um marcador no SecureStore (some
// junto com os dados do app), não em memória.
import * as SecureStore from 'expo-secure-store';

export const CHAVE_ONBOARDING_VISTO = 'onboarding_visto';

export type RotaInicial = 'onboarding' | 'app';

// Decisão pura, sem I/O — fácil de testar e de raciocinar:
// - já autenticado → vai direto ao app (quem tem conta nunca vê onboarding);
// - ainda carregando a sessão → espera (`null`), pra não piscar a tela errada;
// - visitante que ainda não viu o onboarding → onboarding;
// - caso contrário → app.
export function decidirRotaInicial(params: {
  sessaoCarregando: boolean;
  temSessao: boolean;
  onboardingVisto: boolean | null;
}): RotaInicial | null {
  const { sessaoCarregando, temSessao, onboardingVisto } = params;
  if (temSessao) return 'app';
  if (sessaoCarregando || onboardingVisto == null) return null;
  return onboardingVisto ? 'app' : 'onboarding';
}

export async function lerOnboardingVisto(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(CHAVE_ONBOARDING_VISTO);
    return v === '1';
  } catch {
    // Sem storage: trata como "já visto" pra não prender a pessoa num
    // onboarding que reaparece a cada abertura.
    return true;
  }
}

export async function marcarOnboardingVisto(): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE_ONBOARDING_VISTO, '1');
  } catch {
    // Falha ao persistir não pode travar a navegação; no pior caso o
    // onboarding reaparece numa próxima abertura.
  }
}
