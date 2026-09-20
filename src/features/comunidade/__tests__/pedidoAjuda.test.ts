import { describe, expect, it } from '@jest/globals';
import {
  dataAlvoISO,
  ehErroDeRede,
  mensagemErroCobrir,
  mensagemErroCriar,
  TEXTO_MAX,
  validarPedido,
} from '../pedidoAjuda';

describe('dataAlvoISO', () => {
  const base = new Date(2026, 8, 20, 15, 30); // 2026-09-20 15:30 local

  it('hoje devolve a data local do relógio', () => {
    expect(dataAlvoISO('hoje', null, base)).toBe('2026-09-20');
  });

  it('amanha soma um dia', () => {
    expect(dataAlvoISO('amanha', null, base)).toBe('2026-09-21');
  });

  it('amanha vira o mês corretamente na virada', () => {
    const fimDoMes = new Date(2026, 8, 30, 10, 0); // 2026-09-30
    expect(dataAlvoISO('amanha', null, fimDoMes)).toBe('2026-10-01');
  });

  it('escolher usa a data escolhida', () => {
    const escolhida = new Date(2026, 11, 25, 0, 0); // 2026-12-25
    expect(dataAlvoISO('escolher', escolhida, base)).toBe('2026-12-25');
  });

  it('escolher sem data devolve null', () => {
    expect(dataAlvoISO('escolher', null, base)).toBeNull();
  });

  it('usa a data LOCAL perto da meia-noite, não UTC', () => {
    // 23:30 local — um toISOString() em fuso negativo cairia no dia seguinte.
    const tarde = new Date(2026, 8, 20, 23, 30);
    expect(dataAlvoISO('hoje', null, tarde)).toBe('2026-09-20');
  });
});

describe('validarPedido', () => {
  it('exige a data-alvo', () => {
    const r = validarPedido({ texto: 'oi', dataISO: null });
    expect(r.ok).toBe(false);
  });

  it('exige texto não vazio', () => {
    const r = validarPedido({ texto: '   ', dataISO: '2026-09-20' });
    expect(r.ok).toBe(false);
  });

  it('barra texto acima do limite', () => {
    const r = validarPedido({ texto: 'x'.repeat(TEXTO_MAX + 1), dataISO: '2026-09-20' });
    expect(r.ok).toBe(false);
  });

  it('aceita pedido válido', () => {
    const r = validarPedido({ texto: 'Viajo amanhã', dataISO: '2026-09-20' });
    expect(r.ok).toBe(true);
  });
});

describe('ehErroDeRede', () => {
  it('reconhece a falha de fetch do supabase-js', () => {
    expect(ehErroDeRede(new Error('Network request failed'))).toBe(true);
    expect(ehErroDeRede({ message: 'TypeError: Failed to fetch' })).toBe(true);
  });

  it('não confunde erro de banco com rede', () => {
    expect(ehErroDeRede({ code: '23505', message: 'duplicate key' })).toBe(false);
  });
});

describe('mensagemErroCriar', () => {
  it('duplicata (23505) vira aviso de pedido já aberto', () => {
    const msg = mensagemErroCriar({ code: '23505', message: 'duplicate key value' });
    expect(msg).toMatch(/já existe um pedido aberto/i);
  });

  it('violação nomeada da unique também é duplicata', () => {
    const msg = mensagemErroCriar({ message: 'pedidos_ajuda_um_aberto_por_data' });
    expect(msg).toMatch(/já existe um pedido aberto/i);
  });

  it('rede vira aviso sem fila', () => {
    const msg = mensagemErroCriar(new Error('Network request failed'));
    expect(msg).toMatch(/sem rede/i);
    expect(msg).toMatch(/fila/i);
  });

  it('erro genérico tem mensagem de fallback', () => {
    expect(mensagemErroCriar(new Error('boom'))).toMatch(/tente de novo/i);
  });
});

describe('mensagemErroCobrir', () => {
  it('ja_coberto avisa que alguém assumiu', () => {
    expect(mensagemErroCobrir(new Error('ja_coberto'))).toMatch(/já assumiu/i);
  });

  it('proprio_pedido avisa que não cobre o próprio', () => {
    expect(mensagemErroCobrir(new Error('proprio_pedido'))).toMatch(/próprio pedido/i);
  });

  it('pedido_invalido avisa indisponível', () => {
    expect(mensagemErroCobrir(new Error('pedido_invalido'))).toMatch(/não está mais dispon/i);
  });
});
