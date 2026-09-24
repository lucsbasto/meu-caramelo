import { describe, expect, it } from '@jest/globals';
import { resolveNotificationLink } from '../deepLink';

// Contrato T6 (#44): a EF envia `data = { tipo, ...ids }` cru; a tabela
// `tipo → rota` (§4.5) vive no app. Estes testes cobrem a tabela inteira e os
// casos de borda (tipo desconhecido, id ausente, data malformado).

describe('resolveNotificationLink — tabela tipo → rota (§4.5)', () => {
  it.each([
    ['ponto_vencido', { ponto_id: 'p1' }, '/ponto/p1'],
    ['ponto_novo_por_perto', { ponto_id: 'p2' }, '/ponto/p2'],
    ['promovido_principal', { ponto_id: 'p3' }, '/ponto/p3'],
    ['lembrete_cobertura', { ponto_id: 'p4' }, '/ponto/p4/registrar'],
    ['pedido_ajuda', { pedido_id: 'pd1' }, '/pedido/pd1'],
    ['cobertura_confirmada', { pedido_id: 'pd2' }, '/pedido/pd2'],
    ['registro_em_ponto_seguido', { registro_id: 'r1' }, '/registro/r1'],
    ['comentario', { registro_id: 'r2' }, '/registro/r2'],
  ])('%s → %s', (tipo, ids, esperado) => {
    expect(resolveNotificationLink({ tipo, ...ids })).toBe(esperado);
  });
});

describe('resolveNotificationLink — casos de borda', () => {
  it('tipo desconhecido → null (não navega, não abre home)', () => {
    expect(
      resolveNotificationLink({ tipo: 'xpto', ponto_id: 'p1' }),
    ).toBeNull();
    expect(
      resolveNotificationLink({
        tipo: 'convite_comantenedor',
        convite_token: 'x',
      }),
    ).toBeNull();
  });

  it('id obrigatório ausente → descarta (null)', () => {
    expect(resolveNotificationLink({ tipo: 'ponto_vencido' })).toBeNull();
    expect(
      resolveNotificationLink({ tipo: 'pedido_ajuda', ponto_id: 'p1' }),
    ).toBeNull();
    expect(
      resolveNotificationLink({ tipo: 'comentario', registro_id: '' }),
    ).toBeNull();
  });

  it('id do tipo errado → descarta (null)', () => {
    expect(
      resolveNotificationLink({ tipo: 'ponto_vencido', ponto_id: 42 }),
    ).toBeNull();
  });

  it('data ausente ou não-objeto → null', () => {
    expect(resolveNotificationLink(null)).toBeNull();
    expect(resolveNotificationLink(undefined)).toBeNull();
    expect(resolveNotificationLink('/ponto/p1')).toBeNull();
    expect(resolveNotificationLink({})).toBeNull();
  });

  it('não usa mais link pré-computado (contrato antigo descartado)', () => {
    expect(resolveNotificationLink({ link: '/ponto/abc' })).toBeNull();
  });
});
