import { describe, it, expect } from '@jest/globals';
import { resolveNotificationLink } from '../deepLink';

describe('resolveNotificationLink', () => {
  it('extrai a rota interna do data.link', () => {
    expect(resolveNotificationLink({ link: '/ponto/abc' })).toBe('/ponto/abc');
  });

  it('ignora link ausente', () => {
    expect(resolveNotificationLink({})).toBeNull();
    expect(resolveNotificationLink(null)).toBeNull();
    expect(resolveNotificationLink(undefined)).toBeNull();
  });

  it('ignora link que não é string', () => {
    expect(resolveNotificationLink({ link: 42 })).toBeNull();
  });

  it('rejeita URL externa (só rota absoluta interna)', () => {
    expect(resolveNotificationLink({ link: 'https://evil.example/x' })).toBeNull();
    expect(resolveNotificationLink({ link: 'ponto/abc' })).toBeNull();
  });
});
