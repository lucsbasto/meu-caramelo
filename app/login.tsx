import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radii, touch, fonts } from '@/theme';
import { useAuth } from '@/features/auth/session';
import { isValidEmail, sendMagicLink } from '@/features/auth/magic-link';
import { signInWithGoogle, isGoogleConfigured } from '@/features/auth/google';

const RESEND_SECONDS = 60;

export default function LoginScreen() {
  const router = useRouter();
  const { reason, next } = useLocalSearchParams<{
    reason?: string;
    next?: string;
  }>();
  const { session } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const anyLoading = sending || googleLoading;

  // Ao autenticar (Google no mesmo processo, ou retorno), volta para a tela
  // de origem (`next`) e não para a home (§6.2 Interações).
  const navigateNext = useCallback(() => {
    if (typeof next === 'string' && next.length > 0) {
      router.replace(next as never);
    } else {
      router.replace('/');
    }
  }, [next, router]);

  useEffect(() => {
    if (session) navigateNext();
  }, [session, navigateNext]);

  // Contador de reenvio (§6.2 — "Reenviar" desabilitado por 60 s). Só re-arma
  // quando o cooldown cruza o zero, não a cada tick.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emCooldown = cooldown > 0;
  useEffect(() => {
    if (!emCooldown) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [emCooldown]);

  function dismissToMap() {
    // "Só quero ver o mapa" -> mapa em modo visitante (§6.2).
    router.replace('/');
  }

  async function onGoogle() {
    if (anyLoading) return;
    setEmailError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navegação acontece no efeito ao detectar a sessão.
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : 'Não deu para entrar com Google.'
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSendLink() {
    if (anyLoading) return;
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setEmailError('Digite um e-mail válido.');
      return;
    }
    setEmailError(null);
    setSending(true);
    try {
      await sendMagicLink(trimmed);
      setSentTo(trimmed);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : 'Não deu para enviar o link.'
      );
    } finally {
      setSending(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || !sentTo || anyLoading) return;
    setSending(true);
    try {
      await sendMagicLink(sentTo);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : 'Não deu para reenviar o link.'
      );
    } finally {
      setSending(false);
    }
  }

  function onChangeEmail() {
    setSentTo(null);
    setCooldown(0);
    setEmailError(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : dismissToMap())}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Text style={styles.backLabel}>‹ Voltar</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Entrar</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.context}>
            {reason ??
              'Entre para participar. Dá para olhar o mapa sem entrar.'}
          </Text>

          {/* Botão Google (54 px, branco com borda) — §6.2. */}
          <Pressable
            onPress={onGoogle}
            disabled={anyLoading || !isGoogleConfigured}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && styles.googleBtnPressed,
              (anyLoading || !isGoogleConfigured) && styles.disabled,
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.caramelo} />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleLabel}>Continuar com Google</Text>
              </>
            )}
          </Pressable>
          {!isGoogleConfigured && (
            <Text style={styles.note}>
              Login com Google chega em breve. Use o link por e-mail.
            </Text>
          )}

          {/*
            Botão Apple: FORA deste WP. É obrigatório no iOS quando há login
            social de terceiros (§6.2) — adicionar antes das builds de loja iOS
            (follow-up WP), via expo-apple-authentication + signInWithIdToken.
          */}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          {sentTo ? (
            // Estado pós-envio (§6.2 item 7).
            <View style={styles.sentBox}>
              <Text style={styles.sentTitle}>
                Enviamos um link para {sentTo}
              </Text>
              <Text style={styles.sentHint}>
                Abra o link neste aparelho para entrar.
              </Text>

              <Pressable
                onPress={onResend}
                disabled={cooldown > 0 || anyLoading}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.secondaryBtnPressed,
                  (cooldown > 0 || anyLoading) && styles.disabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.caramelo} />
                ) : (
                  <Text style={styles.secondaryLabel}>
                    {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar'}
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={onChangeEmail} hitSlop={8}>
                <Text style={styles.link}>Trocar e-mail</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.field}>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError(null);
                }}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textWeak}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
                editable={!anyLoading}
                style={styles.input}
              />
              {emailError && <Text style={styles.error}>{emailError}</Text>}

              <Pressable
                onPress={onSendLink}
                disabled={anyLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                  anyLoading && styles.disabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.onDark} />
                ) : (
                  <Text style={styles.primaryLabel}>Enviar link de acesso</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <Pressable onPress={dismissToMap} hitSlop={12} style={styles.footer}>
          <Text style={styles.footerLink}>Só quero ver o mapa</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  backLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.caramelo },
  headerTitle: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  context: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  googleBtn: {
    height: 54,
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
  },
  googleBtnPressed: { backgroundColor: colors.bg },
  googleG: {
    fontFamily: fonts.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.caramelo,
  },
  googleLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textTertiary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textTertiary,
  },
  field: { gap: spacing.sm },
  input: {
    height: 54,
    minHeight: touch.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.alerta },
  primaryBtn: {
    height: 54,
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryBtnPressed: { backgroundColor: colors.carameloPressed },
  primaryLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
  sentBox: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  sentTitle: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  sentHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  secondaryBtn: {
    height: 48,
    minHeight: touch.min,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnPressed: { backgroundColor: colors.bg },
  secondaryLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.caramelo,
  },
  link: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.caramelo,
    textAlign: 'center',
  },
  footer: { alignItems: 'center', paddingVertical: spacing.xl },
  footerLink: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textTertiary,
  },
  disabled: { opacity: 0.5 },
});
