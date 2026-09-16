import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

// Redirect do deep-link do magic link. `path` casa com app/auth-callback.tsx,
// resolvendo para "meucaramelo://auth-callback" num dev/standalone build.
const redirectTo = makeRedirectUri({
  scheme: 'meucaramelo',
  path: 'auth-callback',
});

// Validação simples de formato de e-mail (§6.2 — "E-mail inválido").
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

// Envia o link de acesso por e-mail (PKCE + emailRedirectTo, research §1).
// shouldCreateUser (default true) cobre o primeiro acesso.
export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}
