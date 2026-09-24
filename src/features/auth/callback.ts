import type { Session } from '@supabase/supabase-js';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';

// Parseia o deep-link `meucaramelo://auth-callback?code=...` do fluxo PKCE
// (magic link) e troca o code por uma sessão (research §3).
export async function createSessionFromUrl(
  url: string,
): Promise<Session | undefined> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { code } = params;
  if (!code) return undefined;

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;

  return data.session;
}
