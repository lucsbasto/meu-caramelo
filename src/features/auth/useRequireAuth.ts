import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from './session';

type RequireAuth = (reason?: string, next?: string) => boolean;

// Primitiva reutilizável da "parede de login" (§7.1). Futuros WPs chamam
// antes de uma ação que exige identidade (registrar, adotar, comentar...):
//   const requireAuth = useRequireAuth();
//   if (!requireAuth('Para registrar esta alimentação...', '/ponto/123')) return;
// Se não houver sessão, empurra `/login?reason=...&next=...` e devolve false.
export function useRequireAuth(): RequireAuth {
  const { session } = useAuth();
  const router = useRouter();

  return useCallback(
    (reason, next) => {
      if (session) return true;
      router.push({
        pathname: '/login',
        params: {
          ...(reason ? { reason } : {}),
          ...(next ? { next } : {}),
        },
      });
      return false;
    },
    [session, router],
  );
}
