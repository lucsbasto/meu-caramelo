import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { TablesInsert } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Nome inicial do perfil: full_name/name do provedor, senão o local-part
// do e-mail (§6.2 Dados). Editável depois no perfil.
function deriveNome(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromProvider =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    '';
  if (fromProvider.trim()) return fromProvider.trim();

  const local = (user.email ?? '').split('@')[0];
  return local || 'Vizinho';
}

// Cria a linha em `profiles` no primeiro acesso, de forma idempotente.
// ignoreDuplicates preserva edições do usuário em acessos seguintes.
async function ensureProfile(user: User): Promise<void> {
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null;

  const row: TablesInsert<'profiles'> = {
    id: user.id,
    nome: deriveNome(user),
    avatar_url: avatarUrl,
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    console.error('[auth] falha ao criar profile:', error.message);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_IN' && next?.user) {
        void ensureProfile(next.user);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return ctx;
}
