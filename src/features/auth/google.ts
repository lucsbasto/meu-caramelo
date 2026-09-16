import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

// Sem o Web client id não dá pra pedir o idToken de audiência certa.
// A UI usa isso pra desabilitar o botão enquanto os clients OAuth não
// forem provisionados externamente (Google Cloud + Supabase).
export const isGoogleConfigured = webClientId.length > 0;

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
  });
  configured = true;
}

// Login social nativo do Google -> idToken -> Supabase (research §2).
// Não passa pela rota de callback (não há round-trip de browser).
export async function signInWithGoogle(): Promise<void> {
  if (!isGoogleConfigured) {
    throw new Error(
      'Login com Google indisponível no momento. Use o link por e-mail.'
    );
  }

  ensureConfigured();
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response) || !response.data.idToken) {
    // Fluxo cancelado pelo usuário ou sem idToken: nada a fazer.
    return;
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });
  if (error) throw error;
}
