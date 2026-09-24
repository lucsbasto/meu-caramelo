import { describe, expect, it } from '@jest/globals';
import {
  APAGAR_CONTA_MENSAGEM,
  NOTIFICACOES,
  PREFERENCIAS_PADRAO,
  type Preferencias,
  preferenciasDeRow,
  RAIOS,
  rotuloRaio,
  rowDePreferencias,
} from '../configuracoes';

describe('preferenciasDeRow', () => {
  it('sem linha, devolve tudo ligado com raio de bairro', () => {
    expect(preferenciasDeRow(null)).toEqual(PREFERENCIAS_PADRAO);
    expect(preferenciasDeRow(undefined)).toEqual(PREFERENCIAS_PADRAO);
    expect(preferenciasDeRow(null).raio_m).toBeNull();
  });

  it('respeita interruptores desligados sem mexer nos outros', () => {
    const prefs = preferenciasDeRow({
      notif_comentario: false,
      notif_ponto_vencido: false,
    });
    expect(prefs.notif_comentario).toBe(false);
    expect(prefs.notif_ponto_vencido).toBe(false);
    expect(prefs.notif_pedido_ajuda).toBe(true);
  });

  it('aceita raios válidos e cai para bairro (null) em valor inválido', () => {
    expect(preferenciasDeRow({ raio_m: 1000 }).raio_m).toBe(1000);
    expect(preferenciasDeRow({ raio_m: 5000 }).raio_m).toBe(5000);
    expect(preferenciasDeRow({ raio_m: 42 }).raio_m).toBeNull();
    expect(preferenciasDeRow({ raio_m: null }).raio_m).toBeNull();
  });
});

describe('rowDePreferencias', () => {
  it('serializa o estado inteiro com o user_id e sem atualizado_em', () => {
    const prefs: Preferencias = {
      notif_ponto_vencido: true,
      notif_pedido_ajuda: false,
      notif_registro_seguido: true,
      notif_comentario: false,
      notif_ponto_novo: true,
      raio_m: 3000,
    };
    const row = rowDePreferencias('u1', prefs);
    expect(row.user_id).toBe('u1');
    expect(row).not.toHaveProperty('atualizado_em');
    // roundtrip preserva as preferências
    expect(preferenciasDeRow(row)).toEqual(prefs);
  });
});

describe('rotuloRaio', () => {
  it('mapeia metros para o rótulo e null para bairro todo', () => {
    expect(rotuloRaio(1000)).toBe('1 km');
    expect(rotuloRaio(3000)).toBe('3 km');
    expect(rotuloRaio(5000)).toBe('5 km');
    expect(rotuloRaio(null)).toBe('Bairro todo');
  });
});

describe('constantes de UI', () => {
  it('tem cinco interruptores, com ponto vencido em primeiro', () => {
    expect(NOTIFICACOES).toHaveLength(5);
    expect(NOTIFICACOES[0].chave).toBe('notif_ponto_vencido');
  });

  it('oferece 1/3/5 km e bairro todo', () => {
    expect(RAIOS.map((r) => r.valor)).toEqual([1000, 3000, 5000, null]);
  });

  it('a confirmação de apagar diz "Voluntário removido" e que o histórico fica', () => {
    expect(APAGAR_CONTA_MENSAGEM).toContain('Voluntário removido');
    expect(APAGAR_CONTA_MENSAGEM).toContain('histórico');
  });
});
