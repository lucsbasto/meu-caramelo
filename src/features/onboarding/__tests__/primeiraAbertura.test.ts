import { describe, it, expect } from '@jest/globals';
import { decidirRotaInicial } from '../primeiraAbertura';

describe('decidirRotaInicial', () => {
  it('quem tem sessão vai direto ao app, mesmo carregando', () => {
    expect(
      decidirRotaInicial({
        sessaoCarregando: true,
        temSessao: true,
        onboardingVisto: null,
      })
    ).toBe('app');
    expect(
      decidirRotaInicial({
        sessaoCarregando: false,
        temSessao: true,
        onboardingVisto: false,
      })
    ).toBe('app');
  });

  it('espera (null) enquanto a sessão carrega ou o marcador não chegou', () => {
    expect(
      decidirRotaInicial({
        sessaoCarregando: true,
        temSessao: false,
        onboardingVisto: false,
      })
    ).toBeNull();
    expect(
      decidirRotaInicial({
        sessaoCarregando: false,
        temSessao: false,
        onboardingVisto: null,
      })
    ).toBeNull();
  });

  it('visitante que ainda não viu → onboarding', () => {
    expect(
      decidirRotaInicial({
        sessaoCarregando: false,
        temSessao: false,
        onboardingVisto: false,
      })
    ).toBe('onboarding');
  });

  it('visitante que já viu → app (execuções seguintes vão direto)', () => {
    expect(
      decidirRotaInicial({
        sessaoCarregando: false,
        temSessao: false,
        onboardingVisto: true,
      })
    ).toBe('app');
  });
});
