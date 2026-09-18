import { describe, it, expect } from '@jest/globals';
import {
  linkPara,
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

describe('linkPara (§4.5)', () => {
  it('abre o ponto para tipos de ponto', () => {
    expect(linkPara('ponto_vencido', { ponto_id: 'p1' })).toBe('/ponto/p1');
    expect(linkPara('ponto_novo', { ponto_id: 'p2' })).toBe('/ponto/p2');
    expect(linkPara('promovido_principal', { ponto_id: 'p3' })).toBe('/ponto/p3');
  });

  it('abre o registro para registro/comentário', () => {
    expect(linkPara('registro', { registro_id: 'r1' })).toBe('/registro/r1');
    expect(linkPara('comentario', { registro_id: 'r2' })).toBe('/registro/r2');
  });

  it('abre o pedido para tipos de cobertura, com fallback para o ponto', () => {
    expect(linkPara('pedido_ajuda', { pedido_id: 'pd1' })).toBe('/pedido/pd1');
    expect(linkPara('cobertura_confirmada', { ponto_id: 'p9' })).toBe('/ponto/p9');
  });

  it('abre o convite pelo token', () => {
    expect(linkPara('convite_comantenedor', { convite_token: 'abc' })).toBe(
      '/convite/abc'
    );
  });

  it('retorna null sem ids utilizáveis', () => {
    expect(linkPara('registro', {})).toBeNull();
    expect(linkPara('tipo_desconhecido', {})).toBeNull();
  });
});

describe('conteudoPara', () => {
  it('usa o texto padrão do tipo', () => {
    expect(conteudoPara('ponto_vencido', {}).titulo).toBe('Um ponto precisa de você');
  });

  it('permite override pelo payload', () => {
    const c = conteudoPara('registro', { titulo: 'Oi', corpo: 'Tchau' });
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
      podeEnviar({ agora: dia, tz: TZ, tipo: 'registro', payload: {}, enviadasHoje: 0 })
    ).toEqual({ enviar: true, motivo: 'ok' });
  });

  it('bloqueia ao atingir o teto diário de 5', () => {
    expect(
      podeEnviar({ agora: dia, tz: TZ, tipo: 'registro', payload: {}, enviadasHoje: 5 })
        .motivo
    ).toBe('teto_diario');
  });

  it('silencia entre 22h e 7h', () => {
    expect(
      podeEnviar({ agora: noite, tz: TZ, tipo: 'registro', payload: {}, enviadasHoje: 0 })
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
