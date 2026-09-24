// Tela de mantenedores do ponto (§7.4 / §6.6): lista o principal e os
// co-mantenedores, deixa o principal convidar por link e remover co, e
// qualquer mantenedor sair (com promoção do co mais antigo ou órfão).

import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { abbreviateName } from '@/features/auth/abbreviate';
import { useAuth } from '@/features/auth/session';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { colors, fonts, radii, spacing, touch } from '@/theme';
import { linkConvite, mensagemSaida } from './convites';
import { formatarDesde, type Mantenedor } from './dados';
import {
  useCriarConvite,
  useMantenedores,
  useRemoverCoMantenedor,
  useSairMantenedor,
} from './useMantenedores';

type Props = { id: string };

export function MantenedoresScreen({ id }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const mantenedores = useMantenedores(id);

  const criarConvite = useCriarConvite(id);
  const removerCo = useRemoverCoMantenedor(id);
  const sair = useSairMantenedor(id);

  const rotaRetorno = `/ponto/${id}/mantenedores`;

  const lista = mantenedores.data ?? [];
  // buscarMantenedores ordena por criado_em asc, então o primeiro co é o mais
  // antigo — o mesmo que a RPC sair_mantenedor promove.
  const principal = lista.find((m) => m.papel === 'principal') ?? null;
  const cos = lista.filter((m) => m.papel === 'co');
  const souPrincipal = user != null && principal?.userId === user.id;
  const souCo = user != null && cos.some((c) => c.userId === user.id);

  function onConvidar() {
    if (
      !requireAuth(
        'Entre para convidar quem cuida deste ponto com você.',
        rotaRetorno,
      )
    ) {
      return;
    }
    if (criarConvite.isPending) return;
    criarConvite.mutate(undefined, {
      onSuccess: async (token) => {
        try {
          await Share.share({
            message: `Ajude a cuidar deste ponto no Meu Caramelo: ${linkConvite(token)}`,
          });
        } catch {
          // folha de compartilhamento cancelada/indisponível: sem ação
        }
      },
      onError: () =>
        Alert.alert('Não deu para criar o convite', 'Tente de novo.'),
    });
  }

  function onRemoverCo(co: Mantenedor) {
    if (removerCo.isPending) return;
    Alert.alert(
      'Remover co-mantenedor',
      `Remover ${abbreviateName(co.nome)} da manutenção deste ponto?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            removerCo.mutate(co.userId, {
              onError: () =>
                Alert.alert('Não deu para remover', 'Tente de novo.'),
            }),
        },
      ],
    );
  }

  function onSairPrincipal() {
    if (sair.isPending) return;
    const temCo = cos.length > 0;
    Alert.alert(
      'Sair de mantenedor',
      temCo
        ? 'Você deixa de manter este ponto. O co-mantenedor mais antigo será promovido a mantenedor principal.'
        : 'Você deixa de manter este ponto. Como não há co-mantenedor, ele ficará órfão até alguém adotar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () =>
            sair.mutate(undefined, {
              onSuccess: (resultado) => {
                router.replace(`/ponto/${id}`);
                if (resultado === 'promovido') {
                  const novo = cos[0];
                  Alert.alert(
                    'Você saiu',
                    `${novo ? abbreviateName(novo.nome) : 'Outra pessoa'} agora mantém o ponto.`,
                  );
                } else if (resultado === 'orfao') {
                  Alert.alert(
                    'Você saiu',
                    'O ponto ficou órfão até alguém adotar.',
                  );
                } else {
                  Alert.alert('Você saiu', 'Você não mantém mais este ponto.');
                }
              },
              onError: (erro) =>
                Alert.alert('Não deu para sair', mensagemSaida(erro)),
            }),
        },
      ],
    );
  }

  function onSairCo() {
    if (sair.isPending) return;
    Alert.alert(
      'Sair de co-mantenedor',
      'Você deixa de ser co-mantenedor deste ponto.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () =>
            sair.mutate(undefined, {
              onSuccess: () => router.replace(`/ponto/${id}`),
              onError: (erro) =>
                Alert.alert('Não deu para sair', mensagemSaida(erro)),
            }),
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTopo}>
        <View style={styles.cabecalho}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={({ pressed }) => [
              styles.botaoVoltar,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.iconeVoltar}>‹</Text>
          </Pressable>
          <Text style={styles.tituloCabecalho}>Mantenedores</Text>
          <View style={styles.botaoVoltar} />
        </View>
      </SafeAreaView>

      {mantenedores.isLoading ? (
        <View style={styles.centro}>
          <ActivityIndicator color={colors.caramelo} />
        </View>
      ) : mantenedores.isError ? (
        <View style={styles.centro}>
          <Text style={styles.erroTexto}>
            Não deu para carregar os mantenedores.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conteudo}>
          {principal ? (
            <LinhaMantenedor
              mantenedor={principal}
              eu={user?.id ?? null}
              principal
            />
          ) : (
            <Text style={styles.vazio}>
              Este ponto está órfão — ninguém o mantém agora.
            </Text>
          )}

          {cos.length > 0 && (
            <View style={styles.secaoCo}>
              <Text style={styles.secaoRotulo}>CO-MANTENEDORES</Text>
              {cos.map((co) => (
                <LinhaMantenedor
                  key={co.userId}
                  mantenedor={co}
                  eu={user?.id ?? null}
                  onRemover={souPrincipal ? () => onRemoverCo(co) : undefined}
                />
              ))}
            </View>
          )}

          {souPrincipal && (
            <Pressable
              onPress={onConvidar}
              disabled={criarConvite.isPending}
              accessibilityRole="button"
              accessibilityLabel="Convidar co-mantenedor"
              style={({ pressed }) => [
                styles.botaoPrimario,
                pressed && styles.botaoPrimarioPressed,
                criarConvite.isPending && styles.desabilitado,
              ]}
            >
              {criarConvite.isPending ? (
                <ActivityIndicator color={colors.onDark} />
              ) : (
                <Text style={styles.botaoPrimarioTexto}>
                  Convidar co-mantenedor
                </Text>
              )}
            </Pressable>
          )}

          {souPrincipal && (
            <Text style={styles.dica}>
              O convite é um link de uso único, válido por 7 dias. Quem tocar
              nele e estiver logado vira co-mantenedor na hora.
            </Text>
          )}

          {souPrincipal ? (
            <Pressable
              onPress={onSairPrincipal}
              hitSlop={8}
              style={styles.acaoSair}
            >
              <Text style={styles.acaoSairTexto}>Sair de mantenedor</Text>
            </Pressable>
          ) : souCo ? (
            <Pressable onPress={onSairCo} hitSlop={8} style={styles.acaoSair}>
              <Text style={styles.acaoSairTexto}>Sair de co-mantenedor</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function LinhaMantenedor({
  mantenedor,
  eu,
  principal = false,
  onRemover,
}: {
  mantenedor: Mantenedor;
  eu: string | null;
  principal?: boolean;
  onRemover?: () => void;
}) {
  const souEu = eu != null && mantenedor.userId === eu;
  // "Você" para o próprio; nome abreviado para os demais (§7.6).
  const nome = souEu ? 'Você' : abbreviateName(mantenedor.nome);

  return (
    <View style={styles.linha}>
      <View style={styles.avatarCaixa}>
        <Avatar url={mantenedor.avatarUrl} size={46} />
        {principal && <Text style={styles.coroa}>👑</Text>}
      </View>

      <View style={styles.linhaInfo}>
        <Text style={styles.linhaRotulo}>
          {principal ? 'MANTENEDOR PRINCIPAL' : 'CO-MANTENEDOR'}
        </Text>
        <Text style={styles.linhaNome}>{nome}</Text>
        <Text style={styles.linhaDesde}>
          {formatarDesde(mantenedor.criadoEm)}
        </Text>
      </View>

      {onRemover && (
        <Pressable
          onPress={onRemover}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${nome}`}
        >
          <Text style={styles.remover}>Remover</Text>
        </Pressable>
      )}
    </View>
  );
}

function Avatar({ url, size }: { url: string | null; size: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>🐾</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safeTopo: { backgroundColor: colors.surface },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  botaoVoltar: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  iconeVoltar: { fontSize: 28, color: colors.text, fontFamily: fonts.body },
  tituloCabecalho: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.text,
  },

  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  erroTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.alerta },

  conteudo: { padding: spacing.xl, gap: spacing.lg },
  vazio: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  secaoCo: { gap: spacing.sm },
  secaoRotulo: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textWeak,
  },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  avatarCaixa: { position: 'relative' },
  coroa: { position: 'absolute', top: -8, right: -4, fontSize: 16 },
  linhaInfo: { flex: 1, gap: 2 },
  linhaRotulo: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textWeak,
  },
  linhaNome: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  linhaDesde: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  remover: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.alerta,
  },

  avatarFallback: {
    backgroundColor: colors.verdeLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoPrimario: {
    minHeight: touch.min,
    height: 54,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPrimarioPressed: { backgroundColor: colors.carameloPressed },
  desabilitado: { opacity: 0.6 },
  botaoPrimarioTexto: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
  dica: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textTertiary,
    marginTop: -spacing.sm,
  },

  acaoSair: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  acaoSairTexto: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.alerta,
  },
});
