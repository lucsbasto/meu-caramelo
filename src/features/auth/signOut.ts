import { removerTokenPush } from '@/features/notificacoes/push';
import { supabase } from '@/lib/supabase';

// Encerra a sessão. Remove o token deste dispositivo ANTES do signOut, porque a
// RLS de device_tokens (user_id = auth.uid()) só permite apagar enquanto a
// sessão ainda existe (§7.5 / issue WP14: "remover no logout").
export async function signOut(): Promise<void> {
  await removerTokenPush();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
