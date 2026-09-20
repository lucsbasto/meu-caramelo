// Tela mínima do pedido de ajuda (WP14/R5): carrega e mostra o pedido para o
// deep link `/pedido/:id` abrir uma tela real. Detalhe/cobertura completos ficam
// para o WP13. Estados: carregando, não-encontrado (id inexistente, sem crash),
// e o pedido carregado.
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fonts, radii, spacing, touch } from '@/theme';
import { ROTULOS_STATUS } from './dados';
import { usePedidoAjuda } from './usePedidoAjuda';

type Props = { id: string };

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function PedidoAjudaScreen({ id }: Props) {
  const router = useRouter();
  const { data: pedido, isLoading, isError } = usePedidoAjuda(id);

  // Cold start via deep link pode não ter histórico para voltar; nesse caso
  // manda para a home em vez de um back que seria no-op (usuário preso).
  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <BarraTopo onVoltar={voltar} />
        <View style={styles.centro}>
          <ActivityIndicator color={colors.caramelo} />
        </View>
      </View>
    );
  }

  // id inexistente (data === null) ou erro de rede: estado não-encontrado, nunca
  // um crash — o deep link pode chegar de um pedido já apagado.
  if (isError || pedido == null) {
    return (
      <View style={styles.container}>
        <BarraTopo onVoltar={voltar} />
        <View style={styles.centro}>
          <Text style={styles.vazioTexto}>
            {isError ? 'Não deu para carregar este pedido.' : 'Pedido não encontrado.'}
          </Text>
        </View>
      </View>
    );
  }

  const dataAlvo = formatarData(pedido.dataAlvo);

  return (
    <View style={styles.container}>
      <BarraTopo onVoltar={voltar} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.selo}>
          <Text style={styles.seloTexto}>{ROTULOS_STATUS[pedido.status]}</Text>
        </View>

        <Pressable onPress={() => router.push(`/ponto/${pedido.pontoId}`)} hitSlop={6}>
          <Text style={styles.ponto}>{pedido.pontoNome}</Text>
        </Pressable>

        <Text style={styles.texto}>{pedido.texto}</Text>

        <Text style={styles.meta}>Pedido de {pedido.autorNome}</Text>
        {dataAlvo ? <Text style={styles.meta}>Para {dataAlvo}</Text> : null}
      </ScrollView>
    </View>
  );
}

function BarraTopo({ onVoltar }: { onVoltar: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barraTopo, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable
        onPress={onVoltar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={({ pressed }) => [styles.botaoTopo, pressed && styles.pressed]}
      >
        <Text style={styles.botaoTopoIcone}>‹</Text>
      </Pressable>
      <Text style={styles.titulo}>Pedido de ajuda</Text>
      <View style={styles.botaoTopo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  vazioTexto: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  barraTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  botaoTopo: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  botaoTopoIcone: { fontSize: 24, color: colors.text, fontFamily: fonts.body },
  titulo: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  pressed: { opacity: 0.6 },

  scroll: { padding: spacing.xl, gap: spacing.md },
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.verdeLightBg,
  },
  seloTexto: { fontFamily: fonts.body, fontSize: 12, fontWeight: '600', color: colors.verde },
  ponto: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.caramelo },
  texto: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
});
