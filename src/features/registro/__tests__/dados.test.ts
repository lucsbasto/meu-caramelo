import { describe, expect, it } from '@jest/globals';
import {
  formatarDataHoraCompleta,
  formatarTempoComentario,
  normalizarComentario,
  normalizarRegistroDetalhe,
  type ComentarioRow,
  type RegistroDetalheRow,
} from '../dados';

describe('formatarDataHoraCompleta (§6.10 — absoluta)', () => {
  const agora = new Date('2026-03-12T20:00:00');

  it('mesmo dia → "hoje às …"', () => {
    expect(formatarDataHoraCompleta('2026-03-12T07:10:00', agora)).toBe('hoje às 7h10');
  });

  it('dia anterior → "ontem às …"', () => {
    expect(formatarDataHoraCompleta('2026-03-11T07:10:00', agora)).toBe('ontem às 7h10');
  });

  it('mais antigo → "dia de mês às …"', () => {
    expect(formatarDataHoraCompleta('2026-03-05T18:05:00', agora)).toBe('5 de março às 18h05');
  });

  it('zera minutos com dois dígitos', () => {
    expect(formatarDataHoraCompleta('2026-03-12T09:00:00', agora)).toBe('hoje às 9h00');
  });
});

describe('formatarTempoComentario (§6.10 — relativo)', () => {
  const agora = new Date('2026-03-12T20:00:00');
  it('menos de 1 h → "agora"', () => {
    expect(formatarTempoComentario('2026-03-12T19:30:00', agora)).toBe('agora');
  });
  it('horas → "há N h"', () => {
    expect(formatarTempoComentario('2026-03-12T14:00:00', agora)).toBe('há 6 h');
  });
  it('um dia → "ontem"', () => {
    expect(formatarTempoComentario('2026-03-11T14:00:00', agora)).toBe('ontem');
  });
  it('vários dias → "há N dias"', () => {
    expect(formatarTempoComentario('2026-03-09T14:00:00', agora)).toBe('há 3 dias');
  });
});

describe('normalizarRegistroDetalhe', () => {
  const base: RegistroDetalheRow = {
    id: 'r1',
    ponto_id: 'p1',
    user_id: 'u1',
    caes: 2,
    gatos: null,
    quantidade_kg: 1.5,
    observacao: 'deixei ração',
    foto_url: 'http://foto',
    tipos: ['racao'],
    criado_em: '2026-03-12T07:10:00',
    profiles: { nome: 'Marina Cardoso', avatar_url: 'http://a' },
    pontos: { nome: 'Praça Central' },
  };

  it('abrevia o nome do autor (§7.6) e mapeia o ponto', () => {
    const r = normalizarRegistroDetalhe(base);
    expect(r.autorNome).toBe('Marina C.');
    expect(r.pontoNome).toBe('Praça Central');
    expect(r.caes).toBe(2);
    expect(r.fotoUrl).toBe('http://foto');
  });

  it('cai em textos padrão quando faltam autor/ponto', () => {
    const r = normalizarRegistroDetalhe({ ...base, profiles: null, pontos: null });
    expect(r.autorNome).toBe('Vizinho');
    expect(r.pontoNome).toBe('Ponto');
  });
});

describe('normalizarComentario', () => {
  const row: ComentarioRow = {
    id: 'c1',
    registro_id: 'r1',
    autor_id: 'u2',
    texto: 'que fofo',
    criado_em: '2026-03-12T08:00:00',
    profiles: { nome: 'João Pedro Silva', avatar_url: null },
  };

  it('abrevia autor e preserva texto', () => {
    const c = normalizarComentario(row);
    expect(c.autorNome).toBe('João S.');
    expect(c.texto).toBe('que fofo');
    expect(c.autorAvatarUrl).toBeNull();
  });
});
