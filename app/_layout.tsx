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
          <StatusBar style="dark" />
          <OnboardingGate />
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
            <Stack.Screen name="ponto/[id]/mantenedores" />
            {/* Aceite de convite de co-mantenedor por deep-link (§7.4). */}
            <Stack.Screen name="convite/[token]" />
            {/* Login empilhado como card/modal (§6.2). */}
            <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="auth-callback" />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
