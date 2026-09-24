import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginWall } from '@/features/auth/LoginWall';
import { useAuth } from '@/features/auth/session';
import { signOut } from '@/features/auth/signOut';
import type { Tables } from '@/lib/database.types';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii, spacing, touch } from '@/theme';
import {
  APAGAR_CONTA_MENSAGEM,
  APAGAR_CONTA_TITULO,
  type ChaveNotificacao,
  NOTIFICACOES,
  RAIOS,
  type RaioM,
} from './configuracoes';
import {
  type Bloqueado,
  useApagarConta,
  useBloqueados,
  useDesbloquear,
  usePreferencias,
  useSalvarPreferencias,
} from './useConfiguracoes';

const TERMOS_URL = 'https://meucaramelo.app/termos';
const PRIVACIDADE_URL = 'https://meucaramelo.app/privacidade';
const CONTATO_URL = 'mailto:contato@meucaramelo.app';

type Profile = Tables<'profiles'>;

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function abrirLink(url: string) {
  Linking.openURL(url).catch(() =>
    Alert.alert('Não foi possível abrir', 'Tente de novo mais tarde.'),
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function ConfiguracoesScreen() {
  const { session, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  if (!session || !user) {
    return (
      <LoginWall
        title="Configurações"
        reason="Entre para ajustar sua conta e o que você quer ser avisado."
        next="/configuracoes"
      />
    );
  }

  return <ConfiguracoesLogado userId={user.id} email={user.email ?? '—'} />;
}

function ConfiguracoesLogado({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Cabecalho />
      <ScrollView contentContainerStyle={styles.content}>
        <SecaoConta userId={userId} email={email} />
        <SecaoNotificacoes userId={userId} />
        <SecaoPrivacidade />
        <SecaoBloqueados userId={userId} />
        <SecaoSobre />
        <SecaoConta userId={userId} email={email} soPerigo />
      </ScrollView>
    </SafeAreaView>
  );
}

function Cabecalho() {
  const router = useRouter();
  return (
    <View style={styles.cabecalho}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={styles.voltar}
      >
        <Text style={styles.voltarLabel}>‹ Voltar</Text>
      </Pressable>
      <Text style={styles.cabecalhoTitulo}>Configurações</Text>
      <View style={styles.voltar} />
    </View>
  );
}

// ── Conta (§6.13): nome, foto, e-mail (não editável), bairro ────────────────
// `soPerigo` reaproveita o componente só para renderizar Sair/Apagar no rodapé.
function SecaoConta({
  userId,
  email,
  soPerigo,
}: {
  userId: string;
  email: string;
  soPerigo?: boolean;
}) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });

  if (soPerigo) {
    return (
      <Secao>
        <SairDaConta />
        <ApagarConta />
      </Secao>
    );
  }

  if (isLoading || !profile) {
    return (
      <Secao titulo="Conta">
        <ActivityIndicator
          color={colors.caramelo}
          style={{ marginVertical: spacing.md }}
        />
      </Secao>
    );
  }

  return (
    <Secao titulo="Conta">
      <EditarConta profile={profile} email={email} />
    </Secao>
  );
}

function EditarConta({ profile, email }: { profile: Profile; email: string }) {
  const [nome, setNome] = useState(profile.nome);
  const [bairro, setBairro] = useState(profile.bairro ?? '');
  // Foto só pré-visualizada: o bucket de avatar ainda não foi provisionado
  // (mesmo estado do editar em Perfil). Upload fica para follow-up.
  const [localAvatar, setLocalAvatar] = useState<string | null>(
    profile.avatar_url,
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: nome.trim(), bairro: bairro.trim() || null })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
      Alert.alert('Pronto', 'Conta atualizada.');
    },
    onError: (err) =>
      Alert.alert(
        'Erro',
        err instanceof Error ? err.message : 'Não deu para salvar.',
      ),
  });

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permissão necessária',
        'Libere o acesso às fotos para escolher um avatar.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0])
      setLocalAvatar(result.assets[0].uri);
  }

  const canSave =
    nome.trim().length > 0 &&
    !mutation.isPending &&
    (nome.trim() !== profile.nome ||
      (bairro.trim() || null) !== (profile.bairro ?? null));

  return (
    <View style={{ gap: spacing.lg }}>
      <Pressable onPress={pickPhoto} style={styles.avatarPick}>
        <Avatar url={localAvatar} size={72} />
        <Text style={styles.linkLabel}>Trocar foto</Text>
      </Pressable>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Nome</Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          placeholderTextColor={colors.textWeak}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>E-mail</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.inputDisabledText} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Bairro</Text>
        <TextInput
          value={bairro}
          onChangeText={setBairro}
          placeholder="Ex.: Centro"
          placeholderTextColor={colors.textWeak}
          style={styles.input}
        />
      </View>

      <Pressable
        onPress={() => mutation.mutate()}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.primaryBtnPressed,
          !canSave && styles.disabled,
        ]}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={colors.onDark} />
        ) : (
          <Text style={styles.primaryLabel}>Salvar</Text>
        )}
      </Pressable>
    </View>
  );
}

// ── Notificações (§6.13): um interruptor por tipo + seletor de raio ─────────
function SecaoNotificacoes({ userId }: { userId: string }) {
  const { data: prefs, isLoading, isError } = usePreferencias(userId);
  const salvar = useSalvarPreferencias(userId);

  if (isLoading || !prefs) {
    return (
      <Secao titulo="Notificações">
        {isError ? (
          <Text style={styles.erro}>
            Não deu para carregar suas preferências.
          </Text>
        ) : (
          <ActivityIndicator
            color={colors.caramelo}
            style={{ marginVertical: spacing.md }}
          />
        )}
      </Secao>
    );
  }

  function alternar(chave: ChaveNotificacao, valor: boolean) {
    salvar.mutate({ ...prefs!, [chave]: valor });
  }
  function escolherRaio(raio: RaioM) {
    salvar.mutate({ ...prefs!, raio_m: raio });
  }

  return (
    <Secao titulo="Notificações">
      {NOTIFICACOES.map(({ chave, rotulo, descricao }) => (
        <View key={chave} style={styles.switchRow}>
          <View style={styles.switchTexto}>
            <Text style={styles.rowTitulo}>{rotulo}</Text>
            <Text style={styles.rowDescricao}>{descricao}</Text>
          </View>
          <Switch
            value={prefs[chave]}
            onValueChange={(v) => alternar(chave, v)}
            trackColor={{ true: colors.caramelo, false: colors.border }}
            thumbColor={colors.surface}
          />
        </View>
      ))}

      <View style={styles.raioBloco}>
        <Text style={styles.rowTitulo}>Raio de &ldquo;Perto de mim&rdquo;</Text>
        <Text style={styles.rowDescricao}>
          Até onde você quer ver pontos, pedidos e ser avisado.
        </Text>
        <View style={styles.chips}>
          {RAIOS.map(({ valor, rotulo }) => {
            const ativo = prefs.raio_m === valor;
            return (
              <Pressable
                key={rotulo}
                onPress={() => escolherRaio(valor)}
                style={[styles.chip, ativo && styles.chipAtivo]}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
              >
                <Text
                  style={[styles.chipLabel, ativo && styles.chipLabelAtivo]}
                >
                  {rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Secao>
  );
}

// ── Privacidade (§6.13/§7.6): informativo + link para a política ────────────
function SecaoPrivacidade() {
  return (
    <Secao titulo="Privacidade">
      <View style={styles.field}>
        <Text style={styles.rowTitulo}>Quem pode ver meu perfil</Text>
        <Text style={styles.rowDescricao}>
          No momento, seu nome abreviado e seus registros são públicos para o
          bairro. Controles de visibilidade chegam depois.
        </Text>
      </View>
      <LinkRow
        rotulo="Política de privacidade"
        onPress={() => abrirLink(PRIVACIDADE_URL)}
      />
    </Secao>
  );
}

// ── Bloqueados (§6.13, tabela bloqueios): lista com desbloquear ─────────────
function SecaoBloqueados({ userId }: { userId: string }) {
  const { data: bloqueados, isLoading, isError } = useBloqueados(userId);

  return (
    <Secao titulo="Bloqueados">
      {isLoading ? (
        <ActivityIndicator
          color={colors.caramelo}
          style={{ marginVertical: spacing.md }}
        />
      ) : isError ? (
        <Text style={styles.erro}>Não deu para carregar sua lista.</Text>
      ) : !bloqueados || bloqueados.length === 0 ? (
        <Text style={styles.rowDescricao}>Você não bloqueou ninguém.</Text>
      ) : (
        bloqueados.map((b) => (
          <LinhaBloqueado key={b.id} bloqueado={b} userId={userId} />
        ))
      )}
    </Secao>
  );
}

function LinhaBloqueado({
  bloqueado,
  userId,
}: {
  bloqueado: Bloqueado;
  userId: string;
}) {
  const desbloquear = useDesbloquear(userId);
  return (
    <View style={styles.bloqueadoRow}>
      <Avatar url={bloqueado.avatarUrl} size={40} />
      <Text style={styles.bloqueadoNome}>{bloqueado.nome}</Text>
      <Pressable
        onPress={() => desbloquear.mutate(bloqueado.id)}
        disabled={desbloquear.isPending}
        hitSlop={8}
        style={styles.desbloquearBtn}
      >
        {desbloquear.isPending ? (
          <ActivityIndicator color={colors.caramelo} />
        ) : (
          <Text style={styles.linkLabel}>Desbloquear</Text>
        )}
      </Pressable>
    </View>
  );
}

// ── Sobre (§6.13): versão, termos, privacidade, contato ─────────────────────
function SecaoSobre() {
  const versao = Constants.expoConfig?.version ?? '—';
  return (
    <Secao titulo="Sobre">
      <View style={styles.infoRow}>
        <Text style={styles.rowTitulo}>Versão</Text>
        <Text style={styles.rowValor}>{versao}</Text>
      </View>
      <LinkRow rotulo="Termos de uso" onPress={() => abrirLink(TERMOS_URL)} />
      <LinkRow
        rotulo="Política de privacidade"
        onPress={() => abrirLink(PRIVACIDADE_URL)}
      />
      <LinkRow
        rotulo="Falar com a gente"
        onPress={() => abrirLink(CONTATO_URL)}
      />
    </Secao>
  );
}

// ── Sair / Apagar (§6.13) ───────────────────────────────────────────────────
function SairDaConta() {
  const [saindo, setSaindo] = useState(false);
  function confirmar() {
    Alert.alert('Sair da conta', 'Deseja encerrar a sessão neste aparelho?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setSaindo(true);
          try {
            await signOut();
          } catch (e) {
            Alert.alert(
              'Erro',
              e instanceof Error ? e.message : 'Não deu para sair agora.',
            );
            setSaindo(false);
          }
        },
      },
    ]);
  }
  return (
    <Pressable
      onPress={confirmar}
      disabled={saindo}
      style={({ pressed }) => [styles.sairBtn, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {saindo ? (
        <ActivityIndicator color={colors.alerta} />
      ) : (
        <Text style={styles.sairLabel}>Sair da conta</Text>
      )}
    </Pressable>
  );
}

function ApagarConta() {
  const apagar = useApagarConta();
  function confirmar() {
    Alert.alert(APAGAR_CONTA_TITULO, APAGAR_CONTA_MENSAGEM, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar conta',
        style: 'destructive',
        onPress: () =>
          apagar.mutate(undefined, {
            onError: (err) =>
              Alert.alert(
                'Erro',
                err instanceof Error
                  ? err.message
                  : 'Não deu para apagar a conta agora.',
              ),
          }),
      },
    ]);
  }
  return (
    <Pressable
      onPress={confirmar}
      disabled={apagar.isPending}
      style={({ pressed }) => [styles.apagarBtn, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {apagar.isPending ? (
        <ActivityIndicator color={colors.alerta} />
      ) : (
        <Text style={styles.apagarLabel}>Apagar minha conta</Text>
      )}
    </Pressable>
  );
}

// ── Primitivas de layout ────────────────────────────────────────────────────
function Secao({
  titulo,
  children,
}: {
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {titulo ? <Text style={styles.secaoTitulo}>{titulo}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function LinkRow({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      accessibilityRole="link"
    >
      <Text style={styles.rowTitulo}>{rotulo}</Text>
      <Text style={styles.seta}>›</Text>
    </Pressable>
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
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>🐾</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  voltar: { minWidth: 72, minHeight: touch.min, justifyContent: 'center' },
  voltarLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.caramelo },
  cabecalhoTitulo: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.text,
  },
  content: { padding: spacing.xl, gap: spacing.xl },

  secaoTitulo: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
  },

  field: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
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
    justifyContent: 'center',
  },
  inputDisabled: { backgroundColor: colors.bg },
  inputDisabledText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textTertiary,
  },

  avatarPick: { alignItems: 'center', gap: spacing.sm },
  avatarFallback: {
    backgroundColor: colors.verdeLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.verdeDark },

  primaryBtn: {
    height: 54,
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: { backgroundColor: colors.carameloPressed },
  primaryLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
  disabled: { opacity: 0.5 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
  },
  switchTexto: { flex: 1, gap: 2 },
  rowTitulo: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowDescricao: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  rowValor: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary,
  },

  raioBloco: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    minHeight: touch.chip,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipAtivo: { backgroundColor: colors.caramelo, borderColor: colors.caramelo },
  chipLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipLabelAtivo: { color: colors.onDark },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  seta: { fontFamily: fonts.body, fontSize: 22, color: colors.textWeak },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },

  bloqueadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
  },
  bloqueadoNome: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  desbloquearBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  linkLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.caramelo,
  },
  erro: { fontFamily: fonts.body, fontSize: 14, color: colors.alerta },
  pressed: { opacity: 0.6 },

  sairBtn: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  sairLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.alerta,
  },
  apagarBtn: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  apagarLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.alerta,
  },
});
