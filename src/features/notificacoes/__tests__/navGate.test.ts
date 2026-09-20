import { describe, it, expect } from '@jest/globals';
import { criarGatePush } from '../navGate';

// Gate de navegação do push (T8 #46), testado puro: resolução da rota (§4.5),
// dedupe por identifier, e hold/flush até poder navegar (cold start deslogado).

function toque(identifier: string, data: Record<string, unknown>) {
  return { notification: { request: { identifier, content: { data } } } } as never;
}

describe('criarGatePush — resolução até a rota (§4.5)', () => {
  it('logado e pronto: toque devolve a rota resolvida pelo tipo', () => {
    const gate = criarGatePush();
    expect(gate.aoTocar(toque('n1', { tipo: 'pedido_ajuda', pedido_id: 'pd1' }), true)).toBe(
      '/pedido/pd1'
    );
  });

  it('tipo desconhecido: descarta (null), não segura', () => {
    const gate = criarGatePush();
    expect(gate.aoTocar(toque('n1', { tipo: 'xpto', ponto_id: 'p1' }), false)).toBeNull();
    // Nada ficou pendente para dar flush.
    expect(gate.aoFicarPronto(true)).toBeNull();
  });

  it('response nulo: null', () => {
    const gate = criarGatePush();
    expect(gate.aoTocar(null, true)).toBeNull();
  });
});

describe('criarGatePush — dedupe por identifier', () => {
  it('mesmo identifier não navega duas vezes', () => {
    const gate = criarGatePush();
    const t = toque('n1', { tipo: 'ponto_vencido', ponto_id: 'p1' });
    expect(gate.aoTocar(t, true)).toBe('/ponto/p1');
    expect(gate.aoTocar(t, true)).toBeNull();
  });

  it('response de cold start (mesmo id via getLast e via listener) só navega uma vez', () => {
    const gate = criarGatePush();
    const t = toque('cold', { tipo: 'comentario', registro_id: 'r1' });
    expect(gate.aoTocar(t, true)).toBe('/registro/r1');
    // Segunda entrega do mesmo response (o listener repete o de cold start).
    expect(gate.aoTocar(t, true)).toBeNull();
  });
});

describe('criarGatePush — hold e flush', () => {
  it('cold start deslogado: segura o toque e faz flush quando pronto/logado', () => {
    const gate = criarGatePush();
    // Deslogado / nav não pronta: segura (não navega ainda).
    expect(gate.aoTocar(toque('cold', { tipo: 'pedido_ajuda', pedido_id: 'pd9' }), false)).toBeNull();
    // Ainda não pronto: flush não libera.
    expect(gate.aoFicarPronto(false)).toBeNull();
    // Login + nav prontos: flush navega ao alvo segurado.
    expect(gate.aoFicarPronto(true)).toBe('/pedido/pd9');
    // Já consumido: não repete.
    expect(gate.aoFicarPronto(true)).toBeNull();
  });

  it('segura o último toque enquanto não pode navegar', () => {
    const gate = criarGatePush();
    expect(gate.aoTocar(toque('a', { tipo: 'ponto_vencido', ponto_id: 'p1' }), false)).toBeNull();
    expect(gate.aoTocar(toque('b', { tipo: 'ponto_vencido', ponto_id: 'p2' }), false)).toBeNull();
    // O último toque segurado é o que abre no flush.
    expect(gate.aoFicarPronto(true)).toBe('/ponto/p2');
  });

  it('flush sem nada pendente: null', () => {
    const gate = criarGatePush();
    expect(gate.aoFicarPronto(true)).toBeNull();
  });
});
