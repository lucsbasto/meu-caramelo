import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radii, touch, fonts } from '@/theme';

type LoginWallProps = {
  // Frase de contexto que muda conforme a origem (§6.2 / §7.1).
  reason?: string;
  // Rota de retorno após entrar. Preservada como `next` no /login.
  next?: string;
  title?: string;
};

// Parede de login reutilizável (§7.1). Mostra o argumento do que se ganha
// ao entrar e leva ao /login carregando reason/next.
export function LoginWall({
  reason = 'Entre para participar: adotar pontos, registrar alimentações e acompanhar o bairro.',
  next,
  title = 'Entre para participar',
}: LoginWallProps) {
  const router = useRouter();

  function goToLogin() {
    router.push({
      pathname: '/login',
      params: {
        ...(reason ? { reason } : {}),
        ...(next ? { next } : {}),
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{reason}</Text>

        <Pressable
          onPress={goToLogin}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Entrar</Text>
        </Pressable>

        <Text style={styles.hint}>
          Você pode continuar só olhando o mapa sem entrar.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  button: {
    minHeight: touch.min,
    height: 54,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.carameloPressed,
  },
  buttonLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
