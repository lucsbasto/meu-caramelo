import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/query';
import { colors } from '@/theme';
import { AuthProvider } from '@/features/auth/session';
import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { useFlushFilaOffline } from '@/features/ponto/useRegistro';
import { usePushNotifications } from '@/features/notificacoes/usePushNotifications';
import { ToastProvider } from '@/features/notificacoes/Toast';

// Efeitos de push (WP14): registra o token ao logar e navega no toque (§4.5).
// Fica dentro do AuthProvider (usa useAuth) e não renderiza nada.
function PushBridge() {
  usePushNotifications();
  return null;
}

// Segura o splash até a porta de primeira execução decidir a rota inicial
// (§6.1), pra não piscar o mapa antes de eventualmente ir ao onboarding.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Sobe os registros feitos offline sempre que o app volta ao foreground (§6.7).
  useFlushFilaOffline();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <OnboardingGate />
            <PushBridge />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
              {/* Onboarding de primeira execução (§6.1), sem gesto de voltar. */}
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="ponto/[id]/index" />
              <Stack.Screen name="ponto/novo" />
              <Stack.Screen name="ponto/[id]/editar" />
              <Stack.Screen name="ponto/[id]/registrar" />
              {/* Pedido de ajuda como folha inferior sobre o detalhe (§6.9). */}
              <Stack.Screen name="ponto/[id]/ajuda" options={{ presentation: 'formSheet' }} />
              <Stack.Screen name="ponto/[id]/mantenedores" />
              {/* Detalhe do registro empilhado sobre o feed (§6.10). */}
              <Stack.Screen name="registro/[id]" />
              {/* Detalhe do pedido de ajuda — deep link de push (§4.5/§6.13). */}
              <Stack.Screen name="pedido/[id]" />
              {/* Busca empilhada sobre o mapa (§6.14). */}
              <Stack.Screen name="busca" />
              {/* Configurações empilhada sobre o Perfil (§6.13). */}
              <Stack.Screen name="configuracoes" />
              {/* Aceite de convite de co-mantenedor por deep-link (§7.4). */}
              <Stack.Screen name="convite/[token]" />
              {/* Login empilhado como card/modal (§6.2). */}
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
              <Stack.Screen name="auth-callback" />
            </Stack>
          </ToastProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
