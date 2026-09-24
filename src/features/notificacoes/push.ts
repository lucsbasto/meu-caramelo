import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Canal Android obrigatório para exibir push com som/heads-up.
const CANAL_ANDROID = 'default';
// Guardamos o token registrado para poder removê-lo no logout mesmo offline ou
// depois de o token rotacionar (sem depender de re-derivar via rede).
const CHAVE_TOKEN = 'push_expo_token';

function projectId(): string | null {
  const fromExpo = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  const id = fromExpo ?? fromEas;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function garantirCanalAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Avisos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Pede permissão (se ainda não concedida) e devolve o Expo push token, ou null
// quando não é possível obter (emulador, permissão negada, sem projectId).
export async function obterExpoPushToken(): Promise<string | null> {
  // Push só chega em device físico; emulador não tem token válido.
  if (!Device.isDevice) return null;

  const atual = await Notifications.getPermissionsAsync();
  let status = atual.status;
  if (status !== 'granted') {
    const pedido = await Notifications.requestPermissionsAsync();
    status = pedido.status;
  }
  if (status !== 'granted') return null;

  await garantirCanalAndroid();

  const id = projectId();
  if (!id) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return data;
}

// Registra/atualiza o token do dispositivo em device_tokens para o usuário.
// Idempotente por causa do upsert com onConflict no token (PK).
export async function registrarTokenPush(
  userId: string,
): Promise<string | null> {
  const token = await obterExpoPushToken();
  if (!token) return null;

  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      plataforma: Platform.OS,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );

  if (error) {
    console.error('[push] falha ao registrar token:', error.message);
    return null;
  }

  // Persiste o token para o logout conseguir removê-lo sem depender de rede.
  try {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token);
  } catch {
    // storage indisponível: seguimos; a remoção cai no fallback por rede.
  }
  return token;
}

// Remove o token deste dispositivo. DEVE rodar antes do signOut, enquanto a
// sessão ainda existe — a RLS de device_tokens exige user_id = auth.uid().
// Usa o token persistido no registro; só re-deriva via rede como fallback.
export async function removerTokenPush(): Promise<void> {
  if (!Device.isDevice) return;

  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync(CHAVE_TOKEN);
  } catch {
    token = null;
  }

  if (!token) {
    const id = projectId();
    if (!id) return;
    try {
      const { data } = await Notifications.getExpoPushTokenAsync({
        projectId: id,
      });
      token = data;
    } catch (e) {
      console.error('[push] erro ao obter token para remoção:', e);
      return;
    }
  }

  const { error } = await supabase
    .from('device_tokens')
    .delete()
    .eq('token', token);
  if (error) console.error('[push] falha ao remover token:', error.message);
  else {
    try {
      await SecureStore.deleteItemAsync(CHAVE_TOKEN);
    } catch {
      // ignora: a linha no banco já foi apagada.
    }
  }
}
