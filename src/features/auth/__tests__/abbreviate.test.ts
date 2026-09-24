import { describe, expect, it } from '@jest/globals';
import { AUTOR_REMOVIDO, abbreviateName, nomeAutor } from '../abbreviate';

describe('abbreviateName', () => {
  it('primeiro nome + inicial do sobrenome', () => {
    expect(abbreviateName('Marina Cardoso')).toBe('Marina C.');
  });
  it('só primeiro nome fica inteiro', () => {
    expect(abbreviateName('Marina')).toBe('Marina');
  });
  it('vazio/null viram string vazia', () => {
    expect(abbreviateName('')).toBe('');
    expect(abbreviateName(null)).toBe('');
    expect(abbreviateName(undefined)).toBe('');
  });
});

describe('nomeAutor', () => {
  it('abrevia quando há nome', () => {
    expect(nomeAutor('Marina Cardoso')).toBe('Marina C.');
  });
  it('autor apagado (sem nome) vira "Voluntário removido"', () => {
    expect(nomeAutor(null)).toBe(AUTOR_REMOVIDO);
    expect(nomeAutor('')).toBe(AUTOR_REMOVIDO);
    expect(nomeAutor('   ')).toBe(AUTOR_REMOVIDO);
  });
});
