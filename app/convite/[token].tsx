// Rota de aceite do convite de co-mantenedor (§7.4). Deep-link
// meucaramelo://convite/<token> — o scheme 'meucaramelo' (app.config.ts) mais
// esta rota app/convite/[token].tsx resolvem o link automaticamente.
// Sem sessão: parede de login com retorno para cá (não aceita sozinho). Com
// sessão: chama a RPC de aceite uma vez e redireciona ao ponto.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LoginWall } from '@/features/auth/LoginWall';
import { useAuth } from '@/features/auth/session';
import { mensagemAceite } from '@/features/ponto/convites';
import { useAceitarConvite } from '@/features/ponto/useMantenedores';
import { colors, fonts, radii, spacing, touch } from '@/theme';

export default function ConviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, loading } = useAuth();
  const aceitar = useAceitarConvite();
  const [erro, setErro] = useState<string | null>(null);
  // Aceita só uma vez, mesmo com re-renders (a mutation muda de identidade).
  const tentou = useRef(false);

  useEffect(() => {
    if (loading || !session || !token || tentou.current) return;
    tentou.current = true;
    aceitar.mutate(token, {
      onSuccess: (pontoId) => {
        router.replace(`/ponto/${pontoId}`);
        Alert.alert('Pronto!', 'Você agora é co-mantenedor!');
      },
      onError: (e) => setErro(mensagemAceite(e)),
    });
  }, [loading, session, token, aceitar, router]);

  // Token ausente na URL: convite quebrado.
  if (!token) {
    return (
      <MensagemErro
        texto="Este convite não é válido."
        onVoltar={() => router.replace('/')}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  // Sem sessão: entra e volta para cá; o aceite acontece no retorno (§7.1).
  if (!session) {
    return (
      <LoginWall
        title="Aceitar convite"
        reason="Entre para virar co-mantenedor deste ponto e ajudar a cuidar dele."
        next={`/convite/${token}`}
      />
    );
  }

  if (erro) {
    return <MensagemErro texto={erro} onVoltar={() => router.replace('/')} />;
  }

  return (
    <View style={styles.centro}>
      <ActivityIndicator color={colors.caramelo} />
      <Text style={styles.label}>Aceitando convite…</Text>
    </View>
  );
}

function MensagemErro({
  texto,
  onVoltar,
}: {
  texto: string;
  onVoltar: () => void;
}) {
  return (
    <View style={styles.centro}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Convite indisponível</Text>
        <Text style={styles.corpo}>{texto}</Text>
        <Pressable
          onPress={onVoltar}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.botao,
            pressed && styles.botaoPressed,
          ]}
        >
          <Text style={styles.botaoTexto}>Voltar ao início</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  label: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  titulo: { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  corpo: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  botao: {
    minHeight: touch.min,
    height: 54,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  botaoPressed: { backgroundColor: colors.carameloPressed },
  botaoTexto: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
});
