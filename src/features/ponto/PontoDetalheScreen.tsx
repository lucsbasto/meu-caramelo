// Tela de detalhe do ponto (§6.4): cabeçalho visual, painel branco com
// estatísticas/mantenedor/últimos registros, e barra de ação fixa.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { colors, fonts, radii, spacing, statusColor, touch } from '@/theme';
import { distanciaMetros, formatarDistancia, rotuloStatus } from '@/features/mapa/pontos';
import { useAuth } from '@/features/auth/session';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { abbreviateName } from '@/features/auth/abbreviate';
import {
  formatarConteudoRegistro,
  formatarDesde,
  formatarTempoRegistro,
  podeRemoverRegistro,
  type Mantenedor,
  type PontoDetalhe,
  type RegistroPonto,
} from './dados';
import { useRemoverRegistro, usePontoDetalhe } from './usePontoDetalhe';
import { useSeguir } from './useSeguir';

const ALTURA_CABECALHO = 252;
const RAIO_PAINEL = 26;
const SOBREPOSICAO = 20;

type Props = { id: string };

export function PontoDetalheScreen({ id }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { ponto, mantenedores, registros, estatisticas } = usePontoDetalhe(id);
  const seguir = useSeguir(id, user?.id ?? null);
  const removerRegistro = useRemoverRegistro(id);
  const minhaLocalizacao = useLocalizacaoDiscreta();

  if (ponto.isLoading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  if (ponto.isError || !ponto.data) {
    return (
      <View style={styles.centro}>
        <Text style={styles.erroTexto}>Não deu para carregar este ponto.</Text>
      </View>
    );
  }

  const p = ponto.data;
  const distanciaM = minhaLocalizacao ? distanciaMetros(minhaLocalizacao, p) : null;

  function onVoltar() {
    router.back();
  }

  function onSeguir() {
    if (!requireAuth('Para seguir este ponto e receber avisos, entre na sua conta.', `/ponto/${id}`)) {
      return;
    }
    seguir.toggle();
  }

  async function onCompartilhar() {
    try {
      await Share.share({ message: `${p.nome} — acompanhe em Meu Caramelo.` });
    } catch {
      // toque cancelado ou folha nativa indisponível: sem ação necessária
    }
  }

  function onComoChegar() {
    abrirComoChegar(p.lat, p.lng);
  }

  function onRegistrar() {
    if (!requireAuth('Para registrar uma alimentação, entre na sua conta.', `/ponto/${id}`)) {
      return;
    }
    router.push(`/ponto/${id}/registrar`);
  }

  function onRemoverRegistro(registro: RegistroPonto) {
    Alert.alert('Remover registro', 'Remover este registro de alimentação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => removerRegistro.mutate(registro.id),
      },
    ]);
  }

  function emBreve() {
    Alert.alert('Em breve', 'Essa área ainda não existe no app.');
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <Cabecalho
          ponto={p}
          seguindo={seguir.seguindo}
          onVoltar={onVoltar}
          onSeguir={onSeguir}
          onCompartilhar={onCompartilhar}
        />

        <View style={styles.painel}>
          <View style={styles.linhaTitulo}>
            <Text style={styles.titulo}>{p.nome}</Text>
            <SeloStatus status={p.status} />
          </View>

          {p.endereco ? (
            <Text style={styles.endereco}>
              📍 {p.endereco}
              {distanciaM != null ? ` · ${formatarDistancia(distanciaM)}` : ''}
            </Text>
          ) : null}

          {!p.ativo && (
            <View style={styles.faixaDesativado}>
              <Text style={styles.faixaDesativadoTexto}>
                Este ponto foi desativado por quem o mantinha
              </Text>
            </View>
          )}

          <Estatisticas
            horasDesdeUltima={p.horasDesdeUltima}
            voluntarios={estatisticas.data?.voluntarios ?? null}
            totalRegistros={estatisticas.data?.totalRegistros ?? null}
            carregando={estatisticas.isLoading}
            erro={estatisticas.isError}
          />

          {p.mantenedorId ? (
            mantenedores.isError ? (
              <Text style={styles.secaoErro}>Não deu para carregar quem mantém este ponto.</Text>
            ) : mantenedores.isLoading ? (
              <ActivityIndicator color={colors.caramelo} style={{ marginVertical: spacing.sm }} />
            ) : (
              <CartaoMantenedor
                mantenedores={mantenedores.data ?? []}
                usuarioId={user?.id ?? null}
                onPress={emBreve}
                onEditar={emBreve}
              />
            )
          ) : (
            <BlocoAdocao />
          )}

          <RegistrosSecao
            registros={registros.data ?? []}
            carregando={registros.isLoading}
            erro={registros.isError}
            usuarioId={user?.id ?? null}
            mantenedores={mantenedores.data ?? []}
            onLinhaPress={emBreve}
            onVerTudo={emBreve}
            onRemover={onRemoverRegistro}
          />
        </View>
      </ScrollView>

      <BarraAcao ativo={p.ativo} onComoChegar={onComoChegar} onRegistrar={onRegistrar} />
    </View>
  );
}

// Posição do usuário só para exibir distância; nunca é enviada ao servidor
// (§7.2). Não pede permissão aqui — só usa se já concedida em outra tela.
function useLocalizacaoDiscreta() {
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const pos = await Location.getLastKnownPositionAsync();
        if (!vivo || !pos) return;
        setCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // sem posição conhecida: segue sem distância
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return coord;
}

function abrirComoChegar(lat: number, lng: number) {
  const url = Platform.select({
    ios: `maps:0,0?q=${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  if (url) {
    Linking.openURL(url).catch(() => Alert.alert('Não foi possível abrir o mapa'));
  }
}

function Cabecalho({
  ponto,
  seguindo,
  onVoltar,
  onSeguir,
  onCompartilhar,
}: {
  ponto: PontoDetalhe;
  seguindo: boolean;
  onVoltar: () => void;
  onSeguir: () => void;
  onCompartilhar: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.cabecalho}>
      {ponto.fotoUrl ? (
        <Image source={{ uri: ponto.fotoUrl }} style={styles.cabecalhoFoto} />
      ) : (
        <View style={styles.cabecalhoVazio}>
          <Text style={styles.cabecalhoPata}>🐾</Text>
        </View>
      )}

      <View style={[styles.cabecalhoBotoes, { top: insets.top + spacing.sm }]}>
        <BotaoCirculo aria="Voltar" onPress={onVoltar}>
          <Text style={styles.iconeBotao}>‹</Text>
        </BotaoCirculo>

        <View style={styles.cabecalhoBotoesDireita}>
          <BotaoCirculo aria={seguindo ? 'Deixar de seguir' : 'Seguir'} onPress={onSeguir}>
            <Text style={[styles.iconeBotao, seguindo && styles.iconeSeguindo]}>
              {seguindo ? '♥' : '♡'}
            </Text>
          </BotaoCirculo>
          <BotaoCirculo aria="Compartilhar" onPress={onCompartilhar}>
            <Text style={styles.iconeBotao}>⤴</Text>
          </BotaoCirculo>
        </View>
      </View>
    </View>
  );
}

function BotaoCirculo({
  aria,
  onPress,
  children,
}: {
  aria: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={aria}
      onPress={onPress}
      style={({ pressed }) => [styles.botaoCirculo, pressed && styles.botaoCirculoPressed]}
    >
      {children}
    </Pressable>
  );
}

function SeloStatus({ status }: { status: PontoDetalhe['status'] }) {
  return (
    <View style={[styles.selo, { backgroundColor: `${statusColor[status]}22` }]}>
      <View style={[styles.seloPonto, { backgroundColor: statusColor[status] }]} />
      <Text style={[styles.seloTexto, { color: statusColor[status] }]}>
        {rotuloStatus[status]}
      </Text>
    </View>
  );
}

function Estatisticas({
  horasDesdeUltima,
  voluntarios,
  totalRegistros,
  carregando,
  erro,
}: {
  horasDesdeUltima: number | null;
  voluntarios: number | null;
  totalRegistros: number | null;
  carregando: boolean;
  erro: boolean;
}) {
  const valorHoras = horasDesdeUltima == null ? '—' : `${Math.floor(horasDesdeUltima)} h`;
  // "…" carregando, "erro" falha de rede, "—" sem dado — três estados distintos
  const valorMes = (valor: number | null) =>
    erro ? 'erro' : carregando ? '…' : valor == null ? '—' : String(valor);
  const valorVoluntarios = valorMes(voluntarios);
  const valorRegistros = valorMes(totalRegistros);

  return (
    <View style={styles.estatisticas}>
      <CartaoEstatistica valor={valorHoras} rotulo="desde o último registro" />
      <CartaoEstatistica valor={valorVoluntarios} rotulo="voluntários no mês" />
      <CartaoEstatistica valor={valorRegistros} rotulo="registros no mês" />
    </View>
  );
}

function CartaoEstatistica({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.cartaoEstatistica}>
      <Text style={styles.cartaoEstatisticaValor}>{valor}</Text>
      <Text style={styles.cartaoEstatisticaRotulo}>{rotulo}</Text>
    </View>
  );
}

function CartaoMantenedor({
  mantenedores,
  usuarioId,
  onPress,
  onEditar,
}: {
  mantenedores: Mantenedor[];
  usuarioId: string | null;
  onPress: () => void;
  onEditar: () => void;
}) {
  const principal = mantenedores.find((m) => m.papel === 'principal') ?? mantenedores[0];
  if (!principal) return null;

  // "Você" e o botão editar são do principal, não de qualquer co-mantenedor
  const souOPrincipal = usuarioId != null && principal.userId === usuarioId;
  const coMantenedores = mantenedores.filter((m) => m.userId !== principal.userId);
  const nomeExibido = souOPrincipal ? 'Você' : abbreviateName(principal.nome);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cartaoMantenedor, pressed && styles.cartaoPressed]}
    >
      <View style={styles.avatarComCoroa}>
        <Avatar url={principal.avatarUrl} size={46} />
        <Text style={styles.coroa}>👑</Text>
      </View>

      <View style={styles.mantenedorInfo}>
        <Text style={styles.mantenedorRotulo}>MANTENEDORA</Text>
        <Text style={styles.mantenedorNome}>{nomeExibido}</Text>
        <Text style={styles.mantenedorDesde}>
          {formatarDesde(principal.criadoEm)}
          {coMantenedores.length > 0
            ? ` · ${coMantenedores.length} co-mantenedor${coMantenedores.length > 1 ? 'es' : ''}`
            : ''}
        </Text>
      </View>

      {souOPrincipal ? (
        <Pressable
          onPress={onEditar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Editar ponto"
        >
          <Text style={styles.iconeEditar}>✎</Text>
        </Pressable>
      ) : (
        <Text style={styles.iconeSeta}>›</Text>
      )}
    </Pressable>
  );
}

// Ponto órfão: placeholder visual da adoção. A ação de adotar é Fase 3 (§6.5).
function BlocoAdocao() {
  return (
    <View style={styles.blocoAdocao}>
      <Text style={styles.blocoAdocaoTitulo}>Este ponto está sem mantenedor</Text>
      <Text style={styles.blocoAdocaoTexto}>
        Alguém cuidava daqui e não pôde continuar. Adotar chega em breve.
      </Text>
    </View>
  );
}

function RegistrosSecao({
  registros,
  carregando,
  erro,
  usuarioId,
  mantenedores,
  onLinhaPress,
  onVerTudo,
  onRemover,
}: {
  registros: RegistroPonto[];
  carregando: boolean;
  erro: boolean;
  usuarioId: string | null;
  mantenedores: Mantenedor[];
  onLinhaPress: () => void;
  onVerTudo: () => void;
  onRemover: (registro: RegistroPonto) => void;
}) {
  return (
    <View style={styles.secaoRegistros}>
      <View style={styles.secaoRegistrosCabecalho}>
        <Text style={styles.secaoTitulo}>Quem passou por aqui</Text>
        <Pressable onPress={onVerTudo} hitSlop={8}>
          <Text style={styles.verTudo}>Ver tudo</Text>
        </Pressable>
      </View>

      {carregando ? (
        <ActivityIndicator color={colors.caramelo} style={{ marginVertical: spacing.lg }} />
      ) : erro ? (
        <Text style={styles.secaoErro}>Não deu para carregar os registros.</Text>
      ) : registros.length === 0 ? (
        <Text style={styles.registrosVazio}>
          Ninguém registrou aqui ainda. Se você alimentar, será o primeiro.
        </Text>
      ) : (
        registros.map((registro, i) => (
          <LinhaRegistro
            key={registro.id}
            registro={registro}
            ultima={i === registros.length - 1}
            podeRemover={podeRemoverRegistro(registro, usuarioId, mantenedores)}
            onPress={onLinhaPress}
            onRemover={() => onRemover(registro)}
          />
        ))
      )}
    </View>
  );
}

function LinhaRegistro({
  registro,
  ultima,
  podeRemover,
  onPress,
  onRemover,
}: {
  registro: RegistroPonto;
  ultima: boolean;
  podeRemover: boolean;
  onPress: () => void;
  onRemover: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={podeRemover ? onRemover : undefined}
      style={[styles.linhaRegistro, !ultima && styles.linhaRegistroDivisoria]}
    >
      <Avatar url={registro.autorAvatarUrl} size={36} />
      <View style={styles.linhaRegistroInfo}>
        <Text style={styles.linhaRegistroNome}>{abbreviateName(registro.autorNome)}</Text>
        <Text style={styles.linhaRegistroConteudo}>{formatarConteudoRegistro(registro)}</Text>
      </View>
      <Text style={styles.linhaRegistroTempo}>{formatarTempoRegistro(registro.criadoEm)}</Text>
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
      <Text style={{ fontSize: size * 0.45 }}>🐾</Text>
    </View>
  );
}

function BarraAcao({
  ativo,
  onComoChegar,
  onRegistrar,
}: {
  ativo: boolean;
  onComoChegar: () => void;
  onRegistrar: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barraAcao, { paddingBottom: insets.bottom + spacing.md }]}>
      <Pressable
        onPress={onComoChegar}
        accessibilityRole="button"
        style={({ pressed }) => [styles.botaoComoChegar, pressed && styles.cartaoPressed]}
      >
        <Text style={styles.botaoComoChegarTexto}>Como{'\n'}chegar</Text>
      </Pressable>

      {ativo && (
        <Pressable
          onPress={onRegistrar}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.botaoRegistrar,
            pressed && styles.botaoRegistrarPressed,
          ]}
        >
          <Text style={styles.botaoRegistrarTexto}>Registrar alimentação</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1, paddingBottom: 140 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  erroTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },

  cabecalho: { height: ALTURA_CABECALHO, backgroundColor: colors.border },
  cabecalhoFoto: { width: '100%', height: '100%' },
  cabecalhoVazio: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  cabecalhoPata: { fontSize: 72, opacity: 0.35 },
  cabecalhoBotoes: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cabecalhoBotoesDireita: { flexDirection: 'row', gap: spacing.sm },
  botaoCirculo: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    backgroundColor: 'rgba(43,29,18,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCirculoPressed: { backgroundColor: 'rgba(43,29,18,0.65)' },
  iconeBotao: { fontSize: 20, color: colors.onDark, fontFamily: fonts.body },
  iconeSeguindo: { color: colors.alerta },

  painel: {
    marginTop: -SOBREPOSICAO,
    backgroundColor: colors.surface,
    borderTopLeftRadius: RAIO_PAINEL,
    borderTopRightRadius: RAIO_PAINEL,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { flex: 1, fontFamily: fonts.title, fontSize: 25, color: colors.text },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  seloPonto: { width: 8, height: 8, borderRadius: 4 },
  seloTexto: { fontFamily: fonts.body, fontSize: 12, fontWeight: '600' },

  endereco: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },

  faixaDesativado: {
    backgroundColor: colors.border,
    borderRadius: radii.control,
    padding: spacing.md,
  },
  faixaDesativadoTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  estatisticas: { flexDirection: 'row', gap: spacing.sm },
  cartaoEstatistica: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderRadius: radii.control,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  cartaoEstatisticaValor: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  cartaoEstatisticaRotulo: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  cartaoMantenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  cartaoPressed: { opacity: 0.7 },
  avatarComCoroa: { position: 'relative' },
  coroa: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 16,
  },
  mantenedorInfo: { flex: 1, gap: 2 },
  mantenedorRotulo: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textWeak,
  },
  mantenedorNome: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  mantenedorDesde: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  iconeSeta: { fontSize: 22, color: colors.textWeak },
  iconeEditar: { fontSize: 18, color: colors.caramelo },

  blocoAdocao: {
    backgroundColor: colors.verdeLightBg,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  blocoAdocaoTitulo: { fontFamily: fonts.title, fontSize: 16, color: colors.verdeDark },
  blocoAdocaoTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  secaoRegistros: { gap: spacing.sm },
  secaoRegistrosCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secaoTitulo: { fontFamily: fonts.title, fontSize: 17, color: colors.text },
  verTudo: { fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.caramelo },
  registrosVazio: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  secaoErro: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.alerta,
    paddingVertical: spacing.sm,
  },

  linhaRegistro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  linhaRegistroDivisoria: { borderBottomWidth: 1, borderBottomColor: colors.border },
  linhaRegistroInfo: { flex: 1, gap: 2 },
  linhaRegistroNome: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.text },
  linhaRegistroConteudo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  linhaRegistroTempo: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  avatarFallback: {
    backgroundColor: colors.verdeLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  barraAcao: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  botaoComoChegar: {
    width: 54,
    height: 54,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoComoChegarTexto: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
  },
  botaoRegistrar: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoRegistrarPressed: { backgroundColor: colors.carameloPressed },
  botaoRegistrarTexto: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
});
