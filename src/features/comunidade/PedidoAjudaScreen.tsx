// Pedido de ajuda — criação (§6.9). Folha inferior: "Quando" (Hoje · Amanhã ·
// Escolher data), recado com sugestão, aviso de alcance e "Publicar pedido".
// Bloqueia a duplicata por data mostrando o pedido já aberto (§6.9 Estados).
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import {
  AVISO_ALCANCE,
  TEXTO_MAX,
  TEXTO_SUGESTAO,
  dataAlvoISO,
  mensagemErroCriar,
  validarPedido,
  type QuandoChip,
} from './pedidoAjuda';
import { useCriarPedido, usePedidoAbertoExistente } from './usePedidoAjuda';

const CHIPS: { valor: QuandoChip; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'amanha', rotulo: 'Amanhã' },
  { valor: 'escolher', rotulo: 'Escolher data' },
];

export function PedidoAjudaScreen({ id }: { id: string }) {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const nome = usePontoNome(id);

  const [chip, setChip] = useState<QuandoChip>('hoje');
  const [escolhida, setEscolhida] = useState<Date | null>(null);
  // Recado começa VAZIO: a sugestão é só placeholder (§6.9 "sugestão", uma
  // dica). Pré-preencher publicaria a história de exemplo ("São 5 cães fixos")
  // como se fosse real quando o usuário não editasse.
  const [texto, setTexto] = useState('');

  const dataISO = useMemo(() => dataAlvoISO(chip, escolhida), [chip, escolhida]);
  const existente = usePedidoAbertoExistente(id, dataISO);
  const criar = useCriarPedido(id);

  const jaExiste = existente.data != null;

  function escolherChip(valor: QuandoChip) {
    setChip(valor);
    // Ao entrar em "Escolher", parte de depois de amanhã (hoje/amanhã já têm
    // chip próprio) — evita cair numa data-alvo no passado.
    if (valor === 'escolher' && !escolhida) {
      const base = new Date();
      base.setDate(base.getDate() + 2);
      setEscolhida(base);
    }
  }

  function onPublicar() {
    const validacao = validarPedido({ texto, dataISO });
    if (!validacao.ok) {
      Alert.alert('Falta um detalhe', validacao.erro);
      return;
    }
    if (!requireAuth('Para pedir ajuda, entre na sua conta.', `/ponto/${id}/ajuda`)) {
      return;
    }
    criar.mutate(
      { texto, dataISO: dataISO! },
      {
        onSuccess: () => {
          router.back();
          Alert.alert('Pedido publicado', 'Avisamos a vizinhança. Ele já está no topo do feed.');
        },
        onError: (erro) => {
          Alert.alert('Não publicado', mensagemErroCriar(erro));
        },
      }
    );
  }

  function onVerPedido() {
    // O pedido vive no feed da comunidade (§6.8); não há tela própria de pedido.
    router.back();
    router.push('/feed');
  }

  const restante = TEXTO_MAX - texto.length;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.pega} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Pedir ajuda</Text>
        <Text style={styles.subtitulo}>{nome.data ?? 'Este ponto'}</Text>

        <Text style={styles.rotulo}>Quando</Text>
        <View style={styles.chips}>
          {CHIPS.map(({ valor, rotulo }) => {
            const ativo = valor === chip;
            return (
              <Pressable
                key={valor}
                onPress={() => escolherChip(valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                style={({ pressed }) => [
                  styles.chip,
                  ativo && styles.chipAtivo,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{rotulo}</Text>
              </Pressable>
            );
          })}
        </View>

        {chip === 'escolher' && escolhida ? (
          <SeletorData data={escolhida} onChange={setEscolhida} />
        ) : null}

        <Text style={styles.rotulo}>Recado</Text>
        <TextInput
          style={styles.campo}
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={TEXTO_MAX}
          placeholder={TEXTO_SUGESTAO}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Recado do pedido de ajuda"
        />
        <Text style={styles.contador}>{restante}</Text>

        <Text style={styles.aviso}>{AVISO_ALCANCE}</Text>

        {jaExiste ? (
          <View style={styles.duplicata}>
            <Text style={styles.duplicataTexto}>
              Já existe um pedido aberto para este dia. Um por ponto por data.
            </Text>
            <Pressable
              onPress={onVerPedido}
              accessibilityRole="button"
              accessibilityLabel="Ver pedido"
              style={({ pressed }) => [styles.botaoSecundario, pressed && styles.pressed]}
            >
              <Text style={styles.botaoSecundarioTexto}>Ver pedido</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.rodape}>
        <Pressable
          onPress={onPublicar}
          disabled={jaExiste || criar.isPending || existente.isLoading}
          accessibilityRole="button"
          accessibilityLabel="Publicar pedido"
          accessibilityState={{ disabled: jaExiste || criar.isPending }}
          style={({ pressed }) => [
            styles.botaoPublicar,
            (jaExiste || criar.isPending || existente.isLoading) && styles.botaoDesabilitado,
            pressed && styles.botaoPublicarPressed,
          ]}
        >
          {criar.isPending ? (
            <ActivityIndicator color={colors.onDark} />
          ) : (
            <Text style={styles.botaoPublicarTexto}>Publicar pedido</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Nome do ponto para o cabeçalho da folha. Query leve e cacheada por ponto —
// compartilha nada com o detalhe, mas é barata (uma linha).
function usePontoNome(id: string) {
  return useQuery<string | null>({
    queryKey: ['ponto-nome', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pontos_com_status')
        .select('nome')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as { nome: string } | null)?.nome ?? null;
    },
  });
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function formatarData(d: Date): string {
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${DIAS[d.getDay()]} ${dia}/${mes}`;
}

// Seletor de data sem dependência nativa: passos de ±1 dia a partir de hoje.
// O "Escolher data" cobre os dias além de amanhã sem um date-picker nativo
// (que exigiria rebuild do dev-client).
function SeletorData({ data, onChange }: { data: Date; onChange: (d: Date) => void }) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const noPiso = data <= hoje;

  function mover(dias: number) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    if (nova <= hoje) return; // nunca antes de amanhã
    onChange(nova);
  }

  return (
    <View style={styles.seletorData}>
      <Pressable
        onPress={() => mover(-1)}
        disabled={noPiso}
        accessibilityRole="button"
        accessibilityLabel="Um dia antes"
        style={({ pressed }) => [styles.setaData, noPiso && styles.setaDesabilitada, pressed && styles.pressed]}
      >
        <Text style={styles.setaTexto}>‹</Text>
      </Pressable>
      <Text style={styles.dataEscolhida}>{formatarData(data)}</Text>
      <Pressable
        onPress={() => mover(1)}
        accessibilityRole="button"
        accessibilityLabel="Um dia depois"
        style={({ pressed }) => [styles.setaData, pressed && styles.pressed]}
      >
        <Text style={styles.setaTexto}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  pega: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  conteudo: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxl },

  titulo: { fontFamily: fonts.title, fontSize: 24, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginBottom: spacing.md },

  rotulo: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    height: touch.chip,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: colors.caramelo, borderColor: colors.caramelo },
  chipTexto: { fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextoAtivo: { color: colors.onDark },

  seletorData: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    height: touch.min,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  setaData: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  setaDesabilitada: { opacity: 0.3 },
  setaTexto: { fontSize: 24, color: colors.text },
  dataEscolhida: { fontFamily: fonts.body, fontSize: 15, fontWeight: '600', color: colors.text },

  campo: {
    minHeight: 96,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  contador: { alignSelf: 'flex-end', fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  aviso: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    backgroundColor: colors.bg,
    borderRadius: radii.control,
    padding: spacing.md,
    marginTop: spacing.sm,
  },

  duplicata: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.alerta,
    backgroundColor: `${colors.alerta}11`,
    gap: spacing.sm,
  },
  duplicataTexto: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.text },
  botaoSecundario: {
    alignSelf: 'flex-start',
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundarioTexto: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.text },

  rodape: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  botaoPublicar: {
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPublicarPressed: { backgroundColor: colors.carameloPressed },
  botaoDesabilitado: { backgroundColor: colors.border },
  botaoPublicarTexto: { fontFamily: fonts.body, fontSize: 16, fontWeight: '600', color: colors.onDark },

  pressed: { opacity: 0.7 },
});
