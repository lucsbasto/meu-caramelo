// Aba Comunidade — feed por proximidade (§6.8). Cabeçalho + chips de escopo +
// lista cronológica com três formatos de cartão, realtime de pedidos, estados
// de vazio/carregando e parede de login para ações de visitante.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { CENTRO_PADRAO } from '@/features/mapa/MapaScreen';
import type { Centro } from '@/features/mapa/usePontos';
import { useFeed } from './useFeed';
import {
  formatarTempoFeed,
  fraseEvento,
  type EscopoFeed,
  type ItemFeed,
} from './feed';

const CHIPS: { escopo: EscopoFeed; rotulo: string }[] = [
  { escopo: 'perto', rotulo: 'Perto de mim' },
  { escopo: 'seguindo', rotulo: 'Seguindo' },
  { escopo: 'pedidos', rotulo: 'Pedidos de ajuda' },
];

export default function ComunidadeScreen() {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const centro = useCentroAtual();
  const [escopo, setEscopo] = useState<EscopoFeed>('perto');

  const feed = useFeed(escopo, centro);
  const {
    itens,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = feed;

  // "Perto"/"Pedidos" ficam com a query desabilitada até o GPS resolver o centro
  // — nesse intervalo isLoading é false. Trata como carregando para mostrar o
  // esqueleto em vez de piscar o estado vazio (§6.8 Estados).
  const aguardandoCentro = escopo !== 'seguindo' && centro == null;
  const carregando = isLoading || aguardandoCentro;

  function abrirPonto(item: ItemFeed) {
    router.push(`/ponto/${item.pontoId}`);
  }

  // Registro e evento levam ao detalhe do registro (§6.10); pedido não tem
  // detalhe próprio e continua abrindo o ponto.
  function abrirRegistro(item: ItemFeed) {
    router.push(`/registro/${item.id}`);
  }

  function onNotificacoes() {
    Alert.alert('Em breve', 'As notificações chegam num próximo passo.');
  }

  function onRegistrar() {
    // Estado vazio de "Perto de mim": leva a registrar (§6.8 Estados).
    if (!requireAuth('Para registrar uma alimentação, entre na sua conta.', '/feed')) {
      return;
    }
    router.push('/');
  }

  function onVerMapa() {
    router.push('/');
  }

  async function onCompartilhar(item: ItemFeed) {
    try {
      await Share.share({
        message: `${item.pontoNome} — acompanhe em Meu Caramelo.`,
      });
    } catch {
      // folha nativa cancelada/indisponível: sem ação
    }
  }

  // Coração e comentários plenos vivem no detalhe do registro (§6.10): a ação
  // exige login (parede de §7.1) e abre a tela onde se reage e comenta.
  function onInteragir(item: ItemFeed) {
    if (!requireAuth('Para reagir e comentar, entre na sua conta.', `/registro/${item.id}`)) {
      return;
    }
    abrirRegistro(item);
  }

  // "Quero cobrir": o fluxo de cobrir é o #27; aqui garante login e sinaliza.
  function onCobrir(item: ItemFeed) {
    if (!requireAuth('Para cobrir este pedido, entre na sua conta.', '/feed')) {
      return;
    }
    Alert.alert('Em breve', 'Combinar quem cobre o pedido chega num próximo passo.');
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.tituloCabecalho}>Comunidade</Text>
        <Pressable
          onPress={onNotificacoes}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          style={({ pressed }) => [styles.sino, pressed && styles.pressed]}
        >
          <Text style={styles.sinoIcone}>🔔</Text>
        </Pressable>
      </View>

      <Chips escopo={escopo} onChange={setEscopo} />

      {carregando ? (
        <Esqueleto />
      ) : isError ? (
        <Aviso texto="Não deu para carregar o feed. Puxe para baixo e tente de novo." />
      ) : itens.length === 0 ? (
        <Vazio
          escopo={escopo}
          onRegistrar={onRegistrar}
          onVerMapa={onVerMapa}
        />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(item) => `${item.tipo}:${item.id}`}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Cartao
              item={item}
              onAbrir={() => abrirRegistro(item)}
              onVerPonto={() => abrirPonto(item)}
              onInteragir={() => onInteragir(item)}
              onCompartilhar={() => onCompartilhar(item)}
              onCobrir={() => onCobrir(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.caramelo}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.caramelo}
                style={{ marginVertical: spacing.lg }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// Posição atual só para o raio do feed; nunca vai ao servidor (§7.2). Usa a
// permissão já concedida no mapa e cai no fallback de Palmas se não houver.
function useCentroAtual(): Centro | null {
  const [centro, setCentro] = useState<Centro | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!vivo) return;
      if (status !== 'granted') {
        setCentro(CENTRO_PADRAO);
        return;
      }
      try {
        const pos = await Location.getLastKnownPositionAsync();
        if (!vivo) return;
        const c = pos && { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!c || (Math.abs(c.lat) < 1 && Math.abs(c.lng) < 1)) {
          setCentro(CENTRO_PADRAO);
          return;
        }
        setCentro(c);
      } catch {
        if (vivo) setCentro(CENTRO_PADRAO);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return centro;
}

function Chips({
  escopo,
  onChange,
}: {
  escopo: EscopoFeed;
  onChange: (e: EscopoFeed) => void;
}) {
  return (
    <View style={styles.chips}>
      {CHIPS.map(({ escopo: valor, rotulo }) => {
        const ativo = valor === escopo;
        return (
          <Pressable
            key={valor}
            onPress={() => onChange(valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            style={({ pressed }) => [
              styles.chip,
              ativo && styles.chipAtivo,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
              {rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Cartao({
  item,
  onAbrir,
  onVerPonto,
  onInteragir,
  onCompartilhar,
  onCobrir,
}: {
  item: ItemFeed;
  onAbrir: () => void;
  onVerPonto: () => void;
  onInteragir: () => void;
  onCompartilhar: () => void;
  onCobrir: () => void;
}) {
  if (item.formato === 'pedido') {
    return <CartaoPedido item={item} onVerPonto={onVerPonto} onCobrir={onCobrir} />;
  }
  if (item.formato === 'evento') {
    return <CartaoEvento item={item} onAbrir={onAbrir} />;
  }
  return (
    <CartaoRegistro
      item={item}
      onAbrir={onAbrir}
      onInteragir={onInteragir}
      onCompartilhar={onCompartilhar}
    />
  );
}

function CartaoRegistro({
  item,
  onAbrir,
  onInteragir,
  onCompartilhar,
}: {
  item: ItemFeed;
  onAbrir: () => void;
  onInteragir: () => void;
  onCompartilhar: () => void;
}) {
  return (
    <Pressable
      onPress={onAbrir}
      style={({ pressed }) => [styles.cartao, pressed && styles.pressed]}
    >
      <CabecalhoAutor item={item} selo="Alimentou" seloCor={colors.verde} />

      {item.texto ? <Text style={styles.texto}>{item.texto}</Text> : null}

      {item.fotoUrl ? (
        <Image source={{ uri: item.fotoUrl }} style={styles.foto} />
      ) : null}

      <View style={styles.acoes}>
        <AcaoContador
          rotulo="♡"
          valor={item.reacoesCount}
          aria="Reagir"
          onPress={onInteragir}
        />
        <AcaoContador
          rotulo="💬"
          valor={item.comentariosCount}
          aria="Comentar"
          onPress={onInteragir}
        />
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
    </Pressable>
  );
}

function CartaoPedido({
  item,
  onVerPonto,
  onCobrir,
}: {
  item: ItemFeed;
  onVerPonto: () => void;
  onCobrir: () => void;
}) {
  return (
    <View style={styles.cartao}>
      <View style={styles.faixaPedido} />
      <CabecalhoAutor item={item} selo="Pediu ajuda" seloCor={colors.alerta} />

      {item.texto ? <Text style={styles.texto}>{item.texto}</Text> : null}

      <View style={styles.botoesPedido}>
        <Pressable
          onPress={onCobrir}
          accessibilityRole="button"
          accessibilityLabel="Quero cobrir"
          style={({ pressed }) => [
            styles.botaoCobrir,
            pressed && styles.botaoCobrirPressed,
          ]}
        >
          <Text style={styles.botaoCobrirTexto}>Quero cobrir</Text>
        </Pressable>
        <Pressable
          onPress={onVerPonto}
          accessibilityRole="button"
          accessibilityLabel="Ver ponto"
          style={({ pressed }) => [styles.botaoVerPonto, pressed && styles.pressed]}
        >
          <Text style={styles.botaoVerPontoTexto}>Ver ponto</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CartaoEvento({ item, onAbrir }: { item: ItemFeed; onAbrir: () => void }) {
  return (
    <Pressable
      onPress={onAbrir}
      style={({ pressed }) => [styles.cartaoEvento, pressed && styles.pressed]}
    >
      <Avatar url={item.autorAvatarUrl} size={32} />
      <Text style={styles.eventoTexto} numberOfLines={2}>
        {fraseEvento(item)}
        <Text style={styles.eventoTempo}>{`  ·  ${formatarTempoFeed(item.criadoEm)}`}</Text>
      </Text>
    </Pressable>
  );
}

function CabecalhoAutor({
  item,
  selo,
  seloCor,
}: {
  item: ItemFeed;
  selo: string;
  seloCor: string;
}) {
  return (
    <View style={styles.cabecalhoAutor}>
      <Avatar url={item.autorAvatarUrl} size={40} />
      <View style={styles.autorInfo}>
        <Text style={styles.autorNome}>{item.autorNome}</Text>
        <Text style={styles.autorMeta}>
          {`${item.pontoNome} · ${formatarTempoFeed(item.criadoEm)}`}
        </Text>
      </View>
      <View style={[styles.selo, { backgroundColor: `${seloCor}22` }]}>
        <View style={[styles.seloPonto, { backgroundColor: seloCor }]} />
        <Text style={[styles.seloTexto, { color: seloCor }]}>{selo}</Text>
      </View>
    </View>
  );
}

function AcaoContador({
  rotulo,
  valor,
  aria,
  onPress,
}: {
  rotulo: string;
  valor: number;
  aria: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={aria}
      style={({ pressed }) => [styles.acao, pressed && styles.pressed]}
    >
      <Text style={styles.acaoIcone}>{rotulo}</Text>
      {valor > 0 ? <Text style={styles.acaoContador}>{valor}</Text> : null}
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

// Três cartões em esqueleto durante o carregamento (§6.8 Estados).
function Esqueleto() {
  return (
    <View style={styles.lista}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.cartao}>
          <View style={styles.cabecalhoAutor}>
            <View style={[styles.avatarFallback, styles.skelAvatar]} />
            <View style={styles.autorInfo}>
              <View style={[styles.skelLinha, { width: '40%' }]} />
              <View style={[styles.skelLinha, { width: '60%' }]} />
            </View>
          </View>
          <View style={[styles.skelLinha, { width: '90%' }]} />
          <View style={[styles.skelBloco]} />
        </View>
      ))}
    </View>
  );
}

function Vazio({
  escopo,
  onRegistrar,
  onVerMapa,
}: {
  escopo: EscopoFeed;
  onRegistrar: () => void;
  onVerMapa: () => void;
}) {
  if (escopo === 'seguindo') {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTitulo}>Você ainda não segue nenhum ponto</Text>
        <Text style={styles.vazioTexto}>
          Seguir um ponto no mapa traz os registros dele para cá.
        </Text>
        <BotaoVazio rotulo="Ver o mapa" onPress={onVerMapa} />
      </View>
    );
  }
  if (escopo === 'pedidos') {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTitulo}>Nenhum pedido de ajuda por perto</Text>
        <Text style={styles.vazioTexto}>
          Quando alguém pedir ajuda por aqui, aparece nesta aba.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.vazio}>
      <Text style={styles.vazioTitulo}>Ainda não há movimento por aqui</Text>
      <Text style={styles.vazioTexto}>Seja o primeiro a registrar.</Text>
      <BotaoVazio rotulo="Registrar alimentação" onPress={onRegistrar} />
    </View>
  );
}

function BotaoVazio({ rotulo, onPress }: { rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.botaoVazio, pressed && styles.botaoCobrirPressed]}
    >
      <Text style={styles.botaoVazioTexto}>{rotulo}</Text>
    </Pressable>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <View style={styles.vazio}>
      <Text style={styles.vazioTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tituloCabecalho: { fontFamily: fonts.title, fontSize: 26, color: colors.text },
  sino: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinoIcone: { fontSize: 22 },

  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  chip: {
    height: touch.chip,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: colors.caramelo, borderColor: colors.caramelo },
  chipTexto: { fontFamily: fonts.body, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextoAtivo: { color: colors.onDark },

  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  cartaoEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.7 },

  faixaPedido: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.alerta,
  },

  cabecalhoAutor: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  autorInfo: { flex: 1, gap: 2 },
  autorNome: { fontFamily: fonts.body, fontSize: 14, fontWeight: '700', color: colors.text },
  autorMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  seloPonto: { width: 7, height: 7, borderRadius: 4 },
  seloTexto: { fontFamily: fonts.body, fontSize: 11, fontWeight: '700' },

  texto: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  foto: { width: '100%', height: 118, borderRadius: radii.control, backgroundColor: colors.border },

  acoes: { flexDirection: 'row', gap: spacing.xl, paddingTop: spacing.xs },
  acao: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  acaoIcone: { fontSize: 18, color: colors.textSecondary },
  acaoContador: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },

  botoesPedido: { flexDirection: 'row', gap: spacing.sm },
  botaoCobrir: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCobrirPressed: { backgroundColor: colors.carameloPressed },
  botaoCobrirTexto: { fontFamily: fonts.body, fontSize: 15, fontWeight: '600', color: colors.onDark },
  botaoVerPonto: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoVerPontoTexto: { fontFamily: fonts.body, fontSize: 15, fontWeight: '600', color: colors.text },

  eventoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  eventoTempo: { color: colors.textTertiary },

  avatarFallback: {
    backgroundColor: colors.verdeLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skelAvatar: { width: 40, height: 40, borderRadius: 20 },
  skelLinha: { height: 10, borderRadius: 5, backgroundColor: colors.border },
  skelBloco: { height: 60, borderRadius: radii.control, backgroundColor: colors.border },

  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  vazioTitulo: { fontFamily: fonts.title, fontSize: 18, color: colors.text, textAlign: 'center' },
  vazioTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  botaoVazio: {
    marginTop: spacing.md,
    minHeight: touch.min,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoVazioTexto: { fontFamily: fonts.body, fontSize: 15, fontWeight: '600', color: colors.onDark },
});
