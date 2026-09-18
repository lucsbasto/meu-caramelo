import { describe, it, expect } from '@jest/globals';
import { normalizarEstatisticas } from '../estatisticas';

describe('normalizarEstatisticas', () => {
  it('normaliza um objeto válido', () => {
    expect(
      normalizarEstatisticas({
        pontos_ativos: 142,
        alimentados_hoje: 38,
        voluntarios: 610,
      })
    ).toEqual({ pontosAtivos: 142, alimentadosHoje: 38, voluntarios: 610 });
  });

  it('aceita a forma "returns table" (array de uma linha)', () => {
    expect(
      normalizarEstatisticas([
        { pontos_ativos: 1, alimentados_hoje: 2, voluntarios: 3 },
      ])
    ).toEqual({ pontosAtivos: 1, alimentadosHoje: 2, voluntarios: 3 });
  });

  it('aceita números vindos como string (bigint do Postgres)', () => {
    expect(
      normalizarEstatisticas({
        pontos_ativos: '10',
        alimentados_hoje: '4',
        voluntarios: '7',
      })
    ).toEqual({ pontosAtivos: 10, alimentadosHoje: 4, voluntarios: 7 });
  });

  it('esconde (null) quando a resposta é vazia ou malformada', () => {
    expect(normalizarEstatisticas(null)).toBeNull();
    expect(normalizarEstatisticas(undefined)).toBeNull();
    expect(normalizarEstatisticas([])).toBeNull();
    expect(normalizarEstatisticas('erro')).toBeNull();
    expect(normalizarEstatisticas({})).toBeNull();
  });

  it('esconde quando falta um campo ou o valor é inválido', () => {
    expect(
      normalizarEstatisticas({ pontos_ativos: 5, alimentados_hoje: 2 })
    ).toBeNull();
    expect(
      normalizarEstatisticas({
        pontos_ativos: -1,
        alimentados_hoje: 2,
        voluntarios: 3,
      })
    ).toBeNull();
    expect(
      normalizarEstatisticas({
        pontos_ativos: 'abc',
        alimentados_hoje: 2,
        voluntarios: 3,
      })
    ).toBeNull();
  });

  it('esconde quando os três são zero (dia do lançamento)', () => {
    expect(
      normalizarEstatisticas({
        pontos_ativos: 0,
        alimentados_hoje: 0,
        voluntarios: 0,
      })
    ).toBeNull();
  });

  it('mostra quando ao menos um é positivo', () => {
    expect(
      normalizarEstatisticas({
        pontos_ativos: 3,
        alimentados_hoje: 0,
        voluntarios: 0,
      })
    ).toEqual({ pontosAtivos: 3, alimentadosHoje: 0, voluntarios: 0 });
  });
});
