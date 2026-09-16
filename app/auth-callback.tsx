import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fonts } from '@/theme';
import { createSessionFromUrl } from '@/features/auth/callback';

// Handler do deep-link do magic link (research §3). Trata cold-start e
// warm links: parseia `?code=` e troca por sessão, depois volta ao app.
export default function AuthCallback() {
  const url = Linking.useURL();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url)
      .then((sessionResult) => {
        if (sessionResult) {
          if (typeof next === 'string' && next.length > 0) {
            router.replace(next as never);
          } else {
            router.replace('/');
          }
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Não deu para validar o link. Ele pode ter expirado.'
        );
      });
  }, [url, next, router]);

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color={colors.caramelo} />
          <Text style={styles.label}>Entrando…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  label: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.alerta,
    textAlign: 'center',
  },
});
