import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/query';
import { colors } from '@/theme';
import { AuthProvider } from '@/features/auth/session';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            {/* Login empilhado como card/modal (§6.2). */}
            <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="auth-callback" />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
