import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

// Smoke de fiação do hook (T8 #46): a lógica de gate/dedupe/flush é coberta,
// pura, em navGate.test.ts. Aqui só verificamos que o hook liga os listeners do
// expo-notifications ao gate (navega no toque) e ao toast (foreground).
//
// Um único `it` de propósito: com react-test-renderer só o primeiro render de um
// arquivo dispara os efeitos de mount de forma confiável.
//
// Nomes com prefixo `mock` para o babel-plugin-jest-hoist permitir a referência
// dentro da factory de jest.mock.

const mockPush = jest.fn();
const mockShowToast = jest.fn();

let mockResponseCb: ((r: unknown) => void) | null = null;
let mockReceivedCb: ((n: unknown) => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRootNavigationState: () => ({ key: 'root' }),
}));

jest.mock('@/features/auth/session', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

jest.mock('../Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('../push', () => ({
  registrarTokenPush: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(
    (cb: (r: unknown) => void) => {
      mockResponseCb = cb;
      return { remove: jest.fn() };
    },
  ),
  addNotificationReceivedListener: jest.fn((cb: (n: unknown) => void) => {
    mockReceivedCb = cb;
    return { remove: jest.fn() };
  }),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

// eslint-disable-next-line import/first -- precisa vir depois dos jest.mock acima.
import { usePushNotifications } from '../usePushNotifications';

describe('usePushNotifications — fiação dos listeners', () => {
  it('toque navega ao alvo e foreground vira toast in-app (sem navegar)', async () => {
    await act(async () => {
      renderHook(() => usePushNotifications());
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockResponseCb).not.toBeNull();
    expect(mockReceivedCb).not.toBeNull();

    // Toque no push: navega ao alvo resolvido pela rota (§4.5).
    act(() => {
      mockResponseCb?.({
        notification: {
          request: {
            identifier: 'n1',
            content: { data: { tipo: 'pedido_ajuda', pedido_id: 'pd1' } },
          },
        },
      });
    });
    expect(mockPush).toHaveBeenCalledWith('/pedido/pd1');

    // Foreground: mostra toast in-app, sem navegar de novo.
    act(() => {
      mockReceivedCb?.({
        request: { content: { title: 'Novo pedido', body: 'perto de você' } },
      });
    });
    expect(mockShowToast).toHaveBeenCalledWith('Novo pedido');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
