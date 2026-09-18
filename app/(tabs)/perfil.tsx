import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radii, touch, fonts } from '@/theme';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query';
import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/features/auth/session';
import { signOut } from '@/features/auth/signOut';
import { abbreviateName } from '@/features/auth/abbreviate';
import { LoginWall } from '@/features/auth/LoginWall';
import { useMeusPontos, type PontoDaLista } from '@/features/ponto/useEditorPonto';

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

export default function PerfilScreen() {
  const { session, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  // Modo visitante: parede de login com o argumento do que se ganha (§6.12).
  if (!session || !user) {
    return (
      <LoginWall
        title="Seu perfil no bairro"
        reason="Entre para adotar pontos, registrar alimentações e acompanhar quem cuida perto de você."
        next="/perfil"
      />
    );
  }

  return <SignedInProfile userId={user.id} />;
}

function SignedInProfile({ userId }: { userId: string }) {
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });

  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Não deu para carregar seu perfil.</Text>
      </View>
    );
  }

  if (editing) {
    return (
      <EditProfile
        profile={profile}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Cabeçalho: avatar 72px, nome abreviado, bairro (§6.12). */}
        <View style={styles.header}>
          <Avatar url={profile.avatar_url} size={72} />
          <View style={styles.headerText}>
            <Text style={styles.name}>{abbreviateName(profile.nome)}</Text>
            <Text style={styles.bairro}>
              {profile.bairro ?? 'Bairro não informado'}
            </Text>
          </View>
          <Pressable
            onPress={() => setEditing(true)}
            hitSlop={8}
            style={styles.editBtn}
          >
            <Text style={styles.editLabel}>Editar</Text>
          </Pressable>
        </View>

        {/* Três estatísticas, zeradas em perfil novo (§6.12). */}
        <View style={styles.stats}>
          <Stat value={0} label="registros" />
          <Stat value={0} label="pontos mantidos" />
          <Stat value={0} label="dias seguidos" highlight />
        </View>

        {/* Meus pontos: pontos mantidos, cada um leva à edição (§6.6). */}
        <MeusPontos userId={userId} />

        {/* Sair da conta: remove o token de push deste aparelho antes de encerrar
            a sessão (WP14, §7.5). */}
        <SairDaConta />
      </ScrollView>
    </SafeAreaView>
  );
}

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
              e instanceof Error ? e.message : 'Não deu para sair agora.'
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
      style={({ pressed }) => [styles.sairBtn, pressed && styles.sairBtnPressed]}
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

function MeusPontos({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: pontos, isLoading, isError } = useMeusPontos(userId);

  return (
    <View style={styles.pontosSection}>
      <View style={styles.pontosHeader}>
        <Text style={styles.pontosTitle}>Meus pontos</Text>
        <Pressable
          onPress={() => router.push('/ponto/novo')}
          hitSlop={8}
          style={styles.pontosNovoBtn}
        >
          <Text style={styles.pontosNovoLabel}>+ Novo</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.caramelo} style={{ marginVertical: spacing.md }} />
      ) : isError ? (
        <Text style={styles.pontosErro}>Não deu para carregar seus pontos.</Text>
      ) : !pontos || pontos.length === 0 ? (
        // Perfil novo: convite, sem culpa (§6.12 Estados).
        <View style={styles.inviteCard}>
          <Text style={styles.inviteText}>
            Você ainda não mantém nenhum ponto. Cadastrar um ponto perto de você
            ajuda o bairro a não ficar sem cobertura.
          </Text>
        </View>
      ) : (
        <View style={styles.pontosLista}>
          {pontos.map((p) => (
            <LinhaPonto
              key={p.id}
              ponto={p}
              onPress={() => router.push(`/ponto/${p.id}/editar`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function LinhaPonto({
  ponto,
  onPress,
}: {
  ponto: PontoDaLista;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pontoLinha, pressed && styles.pontoLinhaPressed]}
      accessibilityRole="button"
    >
      <View style={styles.pontoInfo}>
        <Text style={styles.pontoNome}>{ponto.nome}</Text>
        {ponto.endereco ? (
          <Text style={styles.pontoEndereco} numberOfLines={1}>
            {ponto.endereco}
          </Text>
        ) : null}
        {!ponto.ativo && <Text style={styles.pontoInativo}>Desativado</Text>}
      </View>
      <Text style={styles.pontoSeta}>›</Text>
    </Pressable>
  );
}

function EditProfile({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone: () => void;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [bairro, setBairro] = useState(profile.bairro ?? '');
  // Preview local da foto escolhida. O upload para o Storage do Supabase e a
  // gravação da URL pública ficam para um follow-up (bucket não provisionado
  // neste WP); aqui a foto é opcional e só pré-visualizada.
  const [localAvatar, setLocalAvatar] = useState<string | null>(
    profile.avatar_url
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
      onDone();
    },
    onError: (err) => {
      Alert.alert(
        'Erro',
        err instanceof Error ? err.message : 'Não deu para salvar.'
      );
    },
  });

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permissão necessária',
        'Libere o acesso às fotos para escolher um avatar.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalAvatar(result.assets[0].uri);
    }
  }

  const canSave = nome.trim().length > 0 && !mutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.editTitle}>Editar perfil</Text>

        <Pressable onPress={pickPhoto} style={styles.avatarPick}>
          <Avatar url={localAvatar} size={96} />
          <Text style={styles.avatarPickLabel}>Trocar foto</Text>
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

        <Pressable onPress={onDone} hitSlop={8} style={styles.cancelBtn}>
          <Text style={styles.cancelLabel}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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

function Stat({
  value,
  label,
  highlight,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, highlight && styles.statHighlight]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
  },
  content: { padding: spacing.xl, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerText: { flex: 1, gap: spacing.xs },
  name: { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  bairro: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  editBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  editLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.caramelo,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { fontFamily: fonts.title, fontSize: 24, color: colors.text },
  statHighlight: { color: colors.caramelo },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  inviteCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  inviteText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  avatarFallback: {
    backgroundColor: colors.verdeLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.verdeDark },
  editTitle: { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  avatarPick: { alignItems: 'center', gap: spacing.sm },
  avatarPickLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.caramelo,
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
  },
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
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textTertiary,
  },
  disabled: { opacity: 0.5 },

  pontosSection: { gap: spacing.md },
  pontosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pontosTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  pontosNovoBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pontosNovoLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.caramelo,
  },
  pontosErro: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.alerta,
  },
  pontosLista: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  pontoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pontoLinhaPressed: { backgroundColor: colors.bg },
  pontoInfo: { flex: 1, gap: 2 },
  pontoNome: { fontFamily: fonts.body, fontSize: 16, fontWeight: '600', color: colors.text },
  pontoEndereco: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
  pontoInativo: { fontFamily: fonts.body, fontSize: 12, color: colors.alerta },
  pontoSeta: { fontFamily: fonts.body, fontSize: 22, color: colors.textWeak },

  sairBtn: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  sairBtnPressed: { opacity: 0.6 },
  sairLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.alerta,
  },
});
