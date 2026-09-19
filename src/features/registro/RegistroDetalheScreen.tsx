// Tela de detalhe do registro (§6.10): lê um registro por inteiro e deixa
// conversar sobre ele — cabeçalho, o que foi deixado, foto/observação, barra de
// ações (coração otimista, comentários, compartilhar), lista de comentários e
// campo fixo no rodapé. Visitante lê livre; agir cai na parede de login (§7.1).
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import { useAuth } from '@/features/auth/session';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { ROTULOS_TIPO, podeRemoverRegistro } from '@/features/ponto/dados';
import {
  buscarMantenedores,
  chaveMantenedores,
} from '@/features/ponto/usePontoDetalhe';
import {
  formatarDataHoraCompleta,
  formatarTempoComentario,
  type Comentario,
  type RegistroDetalhe,
} from './dados';
import {
  RegistroNaoRemovidoError,
  useComentar,
  useReagir,
  useRegistroDetalhe,
  useRemoverRegistro,
} from './useRegistroDetalhe';
import {
  perguntarMotivoDenuncia,
  useBloquear,
  useDenunciar,
} from '@/features/moderacao/useModeracao';

type Props = { id: string };

export function RegistroDetalheScreen({ id }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const { registro, comentarios, reacoes } = useRegistroDetalhe(id, user?.id ?? null);
  const reagir = useReagir(id, user?.id ?? null);
  const comentar = useComentar(id);
  const remover = useRemoverRegistro(id);
  const denunciar = useDenunciar();
  const bloquear = useBloquear();

  const reg = registro.data ?? null;

  // Só busca quem mantém o ponto quando já temos o registro — decide se o menu
  // de três pontos mostra "remover" (autor ou mantenedor, §6.10).
  const mantenedores = useQuery({
    queryKey: reg ? chaveMantenedores(reg.pontoId) : ['ponto', 'sem-id', 'mantenedores'],
    queryFn: () => buscarMantenedores(reg!.pontoId),
    enabled: reg != null,
  });

  const [texto, setTexto] = useState('');

  if (registro.isLoading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  // Registro removido (§6.10 Estados): "Este registro foi removido" e nada mais.
  // Cobre o data === null (removido por outro / após remover aqui) e o erro.
  if (registro.isError || reg == null) {
    return <RegistroRemovido onVoltar={() => router.back()} temErro={registro.isError} />;
  }

  const podeRemover = podeRemoverRegistro(
    { userId: reg.userId },
    user?.id ?? null,
    mantenedores.data ?? []
  );

  function onReagir() {
    if (!requireAuth('Para reagir, entre na sua conta.', `/registro/${id}`)) return;
    reagir.mutate(!(reacoes.data?.euReagi ?? false));
  }

  function onFocarComentario() {
    // Visitante que toca no contador de comentários cai na parede de login.
    requireAuth('Para comentar, entre na sua conta.', `/registro/${id}`);
  }

  async function onCompartilhar() {
    try {
      await Share.share({ message: `${reg!.pontoNome} — acompanhe em Meu Caramelo.` });
    } catch {
      // folha nativa cancelada/indisponível: sem ação
    }
  }

  function onEnviarComentario() {
    const limpo = texto.trim();
    if (!limpo) return;
    if (!requireAuth('Para comentar, entre na sua conta.', `/registro/${id}`)) return;
    const userId = user?.id;
    if (!userId) return; // requireAuth garante sessão; guarda só para tipagem
    comentar.mutate(
      { userId, texto: limpo },
      {
        onSuccess: () => setTexto(''),
        onError: () =>
          Alert.alert('Não deu para comentar', 'Tente de novo em instantes.'),
      }
    );
  }

  function onMenu() {
    const opcoes: {
      text: string;
      style?: 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [
      { text: 'Denunciar', onPress: onDenunciar },
    ];
    // Não faz sentido bloquear a si mesmo — só oferece no conteúdo dos outros.
    const souAutor = user?.id != null && user.id === reg!.userId;
    if (!souAutor) {
      opcoes.push({ text: 'Bloquear autor', style: 'destructive', onPress: onBloquear });
    }
    if (podeRemover) {
      opcoes.push({ text: 'Remover registro', style: 'destructive', onPress: onRemover });
    }
    opcoes.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Registro', undefined, opcoes);
  }

  function onDenunciar() {
    if (!requireAuth('Para denunciar, entre na sua conta.', `/registro/${id}`)) return;
    const userId = user?.id;
    if (!userId) return;
    // Segundo passo: escolher um motivo (§7.7) confirma a denúncia; cancelar aborta.
    perguntarMotivoDenuncia((motivo) =>
      denunciar.mutate(
        { alvoTipo: 'registro', alvoId: id, userId, motivo },
        {
          onSuccess: () =>
            Alert.alert('Obrigado', 'Recebemos sua denúncia e vamos revisar.'),
          onError: () =>
            Alert.alert('Não deu para denunciar', 'Tente de novo em instantes.'),
        }
      )
    );
  }

  function onBloquear() {
    if (!requireAuth('Para bloquear, entre na sua conta.', `/registro/${id}`)) return;
    const userId = user?.id;
    if (!userId) return;
    Alert.alert('Bloquear autor', 'Você não verá mais o conteúdo dele.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: () =>
          bloquear.mutate(
            { userId, bloqueadoId: reg!.userId },
            {
              // Bloqueado o autor, este registro dele sai da vista: volta ao feed.
              onSuccess: () => router.back(),
              onError: () =>
                Alert.alert('Não deu para bloquear', 'Tente de novo em instantes.'),
            }
          ),
      },
    ]);
  }

  function onRemover() {
    Alert.alert('Remover registro', 'Remover este registro de alimentação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remover.mutate(undefined, {
            // Já removido por outra pessoa também vira o estado vazio, nunca erro
            // técnico — o hook já marcou o registro como removido.
            onError: (erro) => {
              if (!(erro instanceof RegistroNaoRemovidoError)) {
                Alert.alert('Não deu para remover', 'Tente de novo em instantes.');
              }
            },
          }),
      },
    ]);
  }

  const estadoReacao = reacoes.data ?? { count: 0, euReagi: false };

  return (
    <View style={styles.container}>
      <BarraTopo onVoltar={() => router.back()} onMenu={onMenu} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <CabecalhoRegistro
            registro={reg}
            onPonto={() => router.push(`/ponto/${reg.pontoId}`)}
          />

          <OQueFoiDeixado registro={reg} />

          {reg.fotoUrl ? (
            <Image source={{ uri: reg.fotoUrl }} style={styles.foto} resizeMode="cover" />
          ) : null}

          {reg.observacao ? (
            <Text style={styles.observacao}>{reg.observacao}</Text>
          ) : null}

          <BarraAcoes
            count={estadoReacao.count}
            euReagi={estadoReacao.euReagi}
            comentariosCount={comentarios.data?.length ?? 0}
            onReagir={onReagir}
            onComentar={onFocarComentario}
            onCompartilhar={onCompartilhar}
          />

          <ListaComentarios
            comentarios={comentarios.data ?? []}
            carregando={comentarios.isLoading}
            erro={comentarios.isError}
          />
        </ScrollView>

        <CampoComentario
          valor={texto}
          onChange={setTexto}
          onEnviar={onEnviarComentario}
          enviando={comentar.isPending}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

function RegistroRemovido({
  onVoltar,
  temErro,
}: {
  onVoltar: () => void;
  temErro: boolean;
}) {
  return (
    <View style={styles.container}>
      <BarraTopo onVoltar={onVoltar} />
      <View style={styles.centro}>
        <Text style={styles.removidoTexto}>
          {temErro ? 'Não deu para carregar este registro.' : 'Este registro foi removido'}
        </Text>
      </View>
    </View>
  );
}

function BarraTopo({ onVoltar, onMenu }: { onVoltar: () => void; onMenu?: () => void }) {
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
      {onMenu ? (
        <Pressable
          onPress={onMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mais opções"
          style={({ pressed }) => [styles.botaoTopo, pressed && styles.pressed]}
        >
          <Text style={styles.botaoTopoIcone}>⋯</Text>
        </Pressable>
      ) : (
        <View style={styles.botaoTopo} />
      )}
    </View>
  );
}

function CabecalhoRegistro({
  registro,
  onPonto,
}: {
  registro: RegistroDetalhe;
  onPonto: () => void;
}) {
  return (
    <View style={styles.cabecalho}>
      <Avatar url={registro.autorAvatarUrl} size={46} />
      <View style={styles.cabecalhoInfo}>
        <Text style={styles.cabecalhoNome}>{registro.autorNome}</Text>
        <Pressable onPress={onPonto} hitSlop={6}>
          <Text style={styles.cabecalhoPonto}>{registro.pontoNome}</Text>
        </Pressable>
        <Text style={styles.cabecalhoData}>{formatarDataHoraCompleta(registro.criadoEm)}</Text>
      </View>
    </View>
  );
}

// "O que foi deixado" (§6.10): selos de tipos + quantidade de cães e gatos.
function OQueFoiDeixado({ registro }: { registro: RegistroDetalhe }) {
  const temTipos = registro.tipos.length > 0;
  const partesAnimais: string[] = [];
  if (registro.caes) partesAnimais.push(`${registro.caes} ${registro.caes === 1 ? 'cão' : 'cães'}`);
  if (registro.gatos) partesAnimais.push(`${registro.gatos} ${registro.gatos === 1 ? 'gato' : 'gatos'}`);

  if (!temTipos && partesAnimais.length === 0 && registro.quantidadeKg == null) {
    return null;
  }

  return (
    <View style={styles.deixado}>
      <Text style={styles.deixadoTitulo}>O que foi deixado</Text>
      {temTipos ? (
        <View style={styles.selos}>
          {registro.tipos.map((t) => (
            <View key={t} style={styles.selo}>
              <Text style={styles.seloTexto}>{ROTULOS_TIPO[t] ?? t}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {partesAnimais.length > 0 || registro.quantidadeKg != null ? (
        <Text style={styles.deixadoDetalhe}>
          {[
            ...partesAnimais,
            registro.quantidadeKg != null ? `${registro.quantidadeKg} kg` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

function BarraAcoes({
  count,
  euReagi,
  comentariosCount,
  onReagir,
  onComentar,
  onCompartilhar,
}: {
  count: number;
  euReagi: boolean;
  comentariosCount: number;
  onReagir: () => void;
  onComentar: () => void;
  onCompartilhar: () => void;
}) {
  return (
    <View style={styles.acoes}>
      <Pressable
        onPress={onReagir}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={euReagi ? 'Remover reação' : 'Reagir'}
        accessibilityState={{ selected: euReagi }}
        style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
      >
        <Text style={[styles.acaoIcone, euReagi && styles.acaoIconeAtivo]}>
          {euReagi ? '♥' : '♡'}
        </Text>
        {count > 0 ? (
          <Text style={[styles.acaoContador, euReagi && styles.acaoContadorAtivo]}>{count}</Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onComentar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Comentar"
        style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
      >
        <Text style={styles.acaoIcone}>💬</Text>
        {comentariosCount > 0 ? (
          <Text style={styles.acaoContador}>{comentariosCount}</Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onCompartilhar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Compartilhar"
        style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
      >
        <Text style={styles.acaoIcone}>⤴</Text>
      </Pressable>
    </View>
  );
}

function ListaComentarios({
  comentarios,
  carregando,
  erro,
}: {
  comentarios: Comentario[];
  carregando: boolean;
  erro: boolean;
}) {
  if (carregando) {
    return <ActivityIndicator color={colors.caramelo} style={{ marginVertical: spacing.lg }} />;
  }
  if (erro) {
    return <Text style={styles.comentariosErro}>Não deu para carregar os comentários.</Text>;
  }
  if (comentarios.length === 0) {
    return <Text style={styles.comentariosVazio}>Nenhum comentário ainda.</Text>;
  }
  return (
    <View style={styles.comentarios}>
      {comentarios.map((c) => (
        <LinhaComentario key={c.id} comentario={c} />
      ))}
    </View>
  );
}

function LinhaComentario({ comentario }: { comentario: Comentario }) {
  return (
    <View style={styles.comentario}>
      <Avatar url={comentario.autorAvatarUrl} size={34} />
      <View style={styles.comentarioCorpo}>
        <View style={styles.comentarioTopo}>
          <Text style={styles.comentarioNome}>{comentario.autorNome}</Text>
          <Text style={styles.comentarioTempo}>{formatarTempoComentario(comentario.criadoEm)}</Text>
        </View>
        <Text style={styles.comentarioTexto}>{comentario.texto}</Text>
      </View>
    </View>
  );
}

function CampoComentario({
  valor,
  onChange,
  onEnviar,
  enviando,
}: {
  valor: string;
  onChange: (t: string) => void;
  onEnviar: () => void;
  enviando: boolean;
}) {
  const insets = useSafeAreaInsets();
  const podeEnviar = valor.trim().length > 0 && !enviando;
  return (
    <View style={[styles.campo, { paddingBottom: insets.bottom + spacing.sm }]}>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Escreva um comentário…"
        placeholderTextColor={colors.textWeak}
        style={styles.campoInput}
        multiline
        editable={!enviando}
      />
      <Pressable
        onPress={onEnviar}
        disabled={!podeEnviar}
        accessibilityRole="button"
        accessibilityLabel="Enviar comentário"
        style={({ pressed }) => [
          styles.campoBotao,
          pressed && styles.campoBotaoPressed,
          !podeEnviar && styles.campoBotaoDesabilitado,
        ]}
      >
        {enviando ? (
          <ActivityIndicator color={colors.onDark} />
        ) : (
          <Text style={styles.campoBotaoIcone}>↑</Text>
        )}
      </Pressable>
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
      style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={{ fontSize: size * 0.45 }}>🐾</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  removidoTexto: {
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
  botaoTopo: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTopoIcone: { fontSize: 24, color: colors.text, fontFamily: fonts.body },
  pressed: { opacity: 0.6 },

  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },

  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cabecalhoInfo: { flex: 1, gap: 2 },
  cabecalhoNome: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  cabecalhoPonto: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.caramelo },
  cabecalhoData: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  deixado: { gap: spacing.sm },
  deixadoTitulo: { fontFamily: fonts.title, fontSize: 15, color: colors.text },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  selo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.verdeLightBg,
  },
  seloTexto: { fontFamily: fonts.body, fontSize: 12, fontWeight: '600', color: colors.verde },
  deixadoDetalhe: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  foto: { width: '100%', height: 240, borderRadius: radii.card, backgroundColor: colors.border },
  observacao: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },

  acoes: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  acao: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  acaoIcone: { fontSize: 22, color: colors.textSecondary },
  acaoIconeAtivo: { color: colors.alerta },
  acaoContador: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  acaoContadorAtivo: { color: colors.alerta },

  comentarios: { gap: spacing.lg },
  comentario: { flexDirection: 'row', gap: spacing.sm },
  comentarioCorpo: { flex: 1, gap: 2 },
  comentarioTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  comentarioNome: { fontFamily: fonts.body, fontSize: 14, fontWeight: '700', color: colors.text },
  comentarioTempo: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  comentarioTexto: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  comentariosVazio: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textTertiary,
    paddingVertical: spacing.md,
  },
  comentariosErro: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.alerta,
    paddingVertical: spacing.sm,
  },

  campo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  campoInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: touch.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  campoBotao: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campoBotaoPressed: { backgroundColor: colors.carameloPressed },
  campoBotaoDesabilitado: { opacity: 0.4 },
  campoBotaoIcone: { fontSize: 20, color: colors.onDark, fontFamily: fonts.body },

  avatarFallback: {
    backgroundColor: colors.verdeLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
