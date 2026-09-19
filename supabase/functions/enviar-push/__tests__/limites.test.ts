import { describe, it, expect } from '@jest/globals';
import {
  dadosDeRota,
  conteudoPara,
  podeEnviar,
  horaLocal,
  dataLocal,
} from '../limites';

const TZ = 'America/Araguaina'; // Palmas/TO, UTC-3, sem horário de verão

describe('horaLocal / dataLocal', () => {
  it('converte UTC para hora local do fuso', () => {
    // 02:00Z = 23:00 local (UTC-3)
    expect(horaLocal(new Date('2026-01-15T02:00:00Z'), TZ)).toBe(23);
    // 12:00Z = 09:00 local
    expect(horaLocal(new Date('2026-01-15T12:00:00Z'), TZ)).toBe(9);
  });

  it('meia-noite local vira 0, não 24', () => {
    // 03:00Z = 00:00 local
    expect(horaLocal(new Date('2026-01-15T03:00:00Z'), TZ)).toBe(0);
  });

  it('respeita a virada de dia do fuso', () => {
    // 02:00Z de 15/01 ainda é 14/01 às 23h local
    expect(dataLocal(new Date('2026-01-15T02:00:00Z'), TZ)).toBe('2026-01-14');
    expect(dataLocal(new Date('2026-01-15T12:00:00Z'), TZ)).toBe('2026-01-15');
  });
});

describe('dadosDeRota — data cru { tipo, ...ids }', () => {
  it('copia só os ids de rota presentes no payload (sem JOIN)', () => {
    expect(dadosDeRota('ponto_vencido', { ponto_id: 'p1', foo: 'bar' })).toEqual({
      tipo: 'ponto_vencido',
      ponto_id: 'p1',
    });
    expect(dadosDeRota('pedido_ajuda', { pedido_id: 'pd1', data_alvo: '2026-01-15' })).toEqual({
      tipo: 'pedido_ajuda',
      pedido_id: 'pd1',
    });
    expect(dadosDeRota('comentario', { registro_id: 'r1' })).toEqual({
      tipo: 'comentario',
      registro_id: 'r1',
    });
  });

  it('não computa rota nem inclui link', () => {
    const d = dadosDeRota('ponto_vencido', { ponto_id: 'p1' });
    expect(d).not.toHaveProperty('link');
  });

  it('omite ids ausentes ou não-string', () => {
    expect(dadosDeRota('ponto_vencido', {})).toEqual({ tipo: 'ponto_vencido' });
    expect(dadosDeRota('ponto_vencido', { ponto_id: 42 })).toEqual({ tipo: 'ponto_vencido' });
  });
});

describe('conteudoPara', () => {
  it('usa o texto padrão do tipo', () => {
    expect(conteudoPara('ponto_vencido', {}).titulo).toBe('Um ponto precisa de você');
  });

  it('usa vocabulário canônico dos tipos §7.5', () => {
    expect(conteudoPara('registro_em_ponto_seguido', {}).titulo).toBe(
      'Novo registro em ponto seguido'
    );
    expect(conteudoPara('ponto_novo_por_perto', {}).titulo).toBe('Ponto novo por perto');
  });

  it('permite override pelo payload', () => {
    const c = conteudoPara('registro_em_ponto_seguido', { titulo: 'Oi', corpo: 'Tchau' });
    expect(c).toEqual({ titulo: 'Oi', corpo: 'Tchau' });
  });

  it('tem fallback para tipo desconhecido', () => {
    expect(conteudoPara('xpto', {}).titulo).toBe('Meu Caramelo');
  });
});

describe('podeEnviar (§7.5)', () => {
  const dia = new Date('2026-01-15T12:00:00Z'); // 09h local
  const noite = new Date('2026-01-15T02:00:00Z'); // 23h local

  it('envia durante o dia dentro do teto', () => {
    expect(
      podeEnviar({ agora: dia, tz: TZ, tipo: 'registro_em_ponto_seguido', payload: {}, enviadasHoje: 0 })
    ).toEqual({ enviar: true, motivo: 'ok' });
  });

  it('bloqueia ao atingir o teto diário de 5', () => {
    expect(
      podeEnviar({ agora: dia, tz: TZ, tipo: 'registro_em_ponto_seguido', payload: {}, enviadasHoje: 5 })
        .motivo
    ).toBe('teto_diario');
  });

  it('silencia entre 22h e 7h', () => {
    expect(
      podeEnviar({ agora: noite, tz: TZ, tipo: 'registro_em_ponto_seguido', payload: {}, enviadasHoje: 0 })
        .motivo
    ).toBe('silencio_noturno');
  });

  it('deixa passar pedido de ajuda com data para hoje mesmo de madrugada', () => {
    const hoje = dataLocal(noite, TZ);
    expect(
      podeEnviar({
        agora: noite,
        tz: TZ,
        tipo: 'pedido_ajuda',
        payload: { data_alvo: hoje },
        enviadasHoje: 0,
      })
    ).toEqual({ enviar: true, motivo: 'ok' });
  });

  it('silencia pedido de ajuda com data que não é hoje', () => {
    expect(
      podeEnviar({
        agora: noite,
        tz: TZ,
        tipo: 'pedido_ajuda',
        payload: { data_alvo: '2020-01-01' },
        enviadasHoje: 0,
      }).motivo
    ).toBe('silencio_noturno');
  });

  it('teto tem prioridade sobre a exceção noturna', () => {
    const hoje = dataLocal(noite, TZ);
    expect(
      podeEnviar({
        agora: noite,
        tz: TZ,
        tipo: 'pedido_ajuda',
        payload: { data_alvo: hoje },
        enviadasHoje: 5,
      }).motivo
    ).toBe('teto_diario');
  });
});
