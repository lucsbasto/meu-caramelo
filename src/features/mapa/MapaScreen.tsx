import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox, {
  Camera,
  CircleLayer,
  MapView,
  ShapeSource,
  UserLocation,
} from '@rnmapbox/maps';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import estiloCaramelo from './estilo-caramelo.json';
import { FiltroChips } from './FiltroChips';
import { PontoSheet } from './PontoSheet';
import { usePontos, type Centro } from './usePontos';
import { consumirFoco } from './foco';
import {
  aplicarFiltro,
  distanciaMetros,
  toFeatureCollection,
  type Filtro,
  type Ponto,
} from './pontos';

// Token público (pk.) — research #3. Sem download token de vetor: estilo é raster.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

// Centro de fallback quando não há GPS (permissão negada, indisponível ou
// coordenada inválida). Praça dos Girassóis, centro de Palmas-TO — cidade do
// piloto. Exportado para o editor de ponto reusar o mesmo fallback (§6.6 Estados).
export const CENTRO_PADRAO: Centro = { lat: -10.1836, lng: -48.3336 };
const ESTILO_JSON = JSON.stringify(estiloCaramelo);

export default function MapaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [userLoc, setUserLoc] = useState<Centro | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selecionado, setSelecionado] = useState<Ponto | null>(null);
  // Ponto pedido pela busca (§6.14) que ainda não chegou na lista atual: fica
  // pendente até a query do novo centro trazê-lo, aí abre a folha.
  const [pontoPendente, setPontoPendente] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);

  // Permissão "when in use" (§7.2) + posição inicial; fallback se negada
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!vivo) return;
      if (status !== 'granted') {
        setCentro(CENTRO_PADRAO);
        return;
      }
      try {
        // getCurrentPositionAsync pode pendurar indefinidamente quando não há fix
        // (emulador, GPS frio): sem um teto, o mapa nunca ganha centro. Corremos
        // contra um timeout para garantir que o fallback (Palmas) sempre entre.
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (!vivo) return;
        const c = pos && { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Sem posição (timeout) ou coordenada inválida perto de (0,0) — que jogaria
        // o mapa no oceano — cai no fallback em vez de deixar o mapa sem centro.
        if (!c || (Math.abs(c.lat) < 1 && Math.abs(c.lng) < 1)) {
          setCentro(CENTRO_PADRAO);
          return;
        }
        setUserLoc(c);
        setCentro(c);
      } catch {
        if (vivo) setCentro(CENTRO_PADRAO);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const { data: pontos = [], isLoading, isError } = usePontos(centro);

  const visiveis = useMemo(
    () => aplicarFiltro(pontos, filtro),
    [pontos, filtro]
  );
  const fc = useMemo(() => toFeatureCollection(visiveis), [visiveis]);

  const distanciaSelecionado = useMemo(() => {
    if (!selecionado || !userLoc) return null;
    return distanciaMetros(userLoc, selecionado);
  }, [selecionado, userLoc]);

  // Consome o pedido de foco da busca ao reganhar o foco da aba (§6.14). Centra
  // a câmera na coordenada; se veio um pontoId, aponta o centro da query pra lá
  // e deixa o ponto pendente até a lista trazê-lo (abaixo). Sem pontoId, só move.
  useFocusEffect(
    useCallback(() => {
      const foco = consumirFoco();
      if (!foco) return;
      setCentro({ lat: foco.lat, lng: foco.lng });
      cameraRef.current?.setCamera({
        centerCoordinate: [foco.lng, foco.lat],
        zoomLevel: 16,
        animationDuration: 600,
      });
      if (foco.pontoId) {
        setPontoPendente(foco.pontoId);
      } else {
        setSelecionado(null);
      }
    }, [])
  );

  // Quando o ponto pedido pela busca aparece na lista do novo centro, seleciona
  // (abre a folha) e limpa o pendente. Ajuste de estado derivado durante a
  // renderização (padrão recomendado do React), guardado para não repetir.
  if (pontoPendente) {
    const alvo = pontos.find((p) => p.id === pontoPendente);
    if (alvo) {
      if (alvo.id !== selecionado?.id) setSelecionado(alvo);
      setPontoPendente(null);
    } else if (!isLoading) {
      // Query do novo centro assentou sem o ponto (removido, fora do raio após
      // arredondamento, ou erro de RPC): desiste em vez de ficar preso pra
      // sempre. A câmera já centralizou; só a folha não abre.
      setPontoPendente(null);
    }
  }

  function onPressPin(e: {
    features: { properties: { [k: string]: unknown } | null }[];
  }) {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    const p = pontos.find((x) => x.id === id) ?? null;
    setSelecionado(p);
  }

  // Toque longo no mapa cria um ponto já com a coordenada pronta (§6.6).
  function onLongPress(e: { geometry: { coordinates: number[] } }) {
    const [lng, lat] = e.geometry.coordinates;
    router.push({
      pathname: '/ponto/novo',
      params: { lat: String(lat), lng: String(lng) },
    });
  }

  // FAB "+" (§6.7 terceira entrada): pré-seleciona o ponto mais próximo da
  // localização atual e vai direto ao registro. Sem localização/pontos, avisa
  // e não navega (caminho mais simples; troca manual do ponto é follow-up).
  function onRegistrarProximo() {
    const origem = userLoc ?? centro;
    if (pontos.length === 0 || !origem) {
      Alert.alert(
        'Sem ponto por perto',
        'Não encontramos um ponto próximo agora. Toque em um pin no mapa para registrar.'
      );
      return;
    }
    let maisProximo = pontos[0];
    let menor = distanciaMetros(origem, maisProximo);
    for (const p of pontos) {
      const d = distanciaMetros(origem, p);
      if (d < menor) {
        menor = d;
        maisProximo = p;
      }
    }
    router.push(`/ponto/${maisProximo.id}/registrar`);
  }

  // Estado vazio vira CTA para cadastrar o primeiro ponto (§6.6 Como se chega).
  function onCadastrarPrimeiro() {
    const c = centro ?? CENTRO_PADRAO;
    router.push({
      pathname: '/ponto/novo',
      params: { lat: String(c.lat), lng: String(c.lng) },
    });
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        styleJSON={ESTILO_JSON}
        scaleBarEnabled={false}
        onLongPress={onLongPress}
      >
        {centro && (
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [centro.lng, centro.lat],
              zoomLevel: 14,
            }}
          />
        )}
        {userLoc && <UserLocation visible />}
        <ShapeSource id="pontos" shape={fc} onPress={onPressPin}>
          <CircleLayer
            id="pinos"
            style={{
              circleColor: ['get', 'cor'],
              circleRadius: [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                6,
                16,
                12,
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: colors.surface,
              circleOpacity: 0.95,
            }}
          />
        </ShapeSource>
      </MapView>

      <SafeAreaView edges={['top']} style={styles.overlayTopo} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/busca')}
          accessibilityRole="button"
          accessibilityLabel="Buscar ponto ou endereço"
          style={styles.buscaBar}
        >
          <Text style={styles.buscaIcone}>🔍</Text>
          <Text style={styles.buscaPlaceholder}>Buscar ponto ou endereço</Text>
        </Pressable>
        <FiltroChips filtro={filtro} onChange={setFiltro} />
      </SafeAreaView>

      {(isLoading || isError) && (
        <View style={styles.aviso} pointerEvents="none">
          {isLoading ? (
            <ActivityIndicator color={colors.caramelo} />
          ) : (
            <Text style={styles.avisoTexto}>
              Não deu pra carregar os pontos.
            </Text>
          )}
        </View>
      )}

      {!isLoading && !isError && visiveis.length === 0 && (
        <View style={styles.avisoVazio}>
          <Text style={styles.avisoTexto}>Nenhum ponto por aqui ainda.</Text>
          <Pressable
            onPress={onCadastrarPrimeiro}
            style={({ pressed }) => [styles.ctaVazio, pressed && styles.ctaVazioPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaVazioTexto}>Cadastrar o primeiro ponto</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={onRegistrarProximo}
        accessibilityRole="button"
        accessibilityLabel="Registrar no ponto mais próximo"
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.xl },
          pressed && styles.fabPressed,
        ]}
      >
        <Text style={styles.fabTexto}>＋</Text>
      </Pressable>

      <PontoSheet
        ponto={selecionado}
        distanciaM={distanciaSelecionado}
        onClose={() => setSelecionado(null)}
        onVerPonto={(p) => {
          setSelecionado(null);
          router.push(`/ponto/${p.id}`);
        }}
        onAlimentar={(p) => {
          setSelecionado(null);
          router.push(`/ponto/${p.id}/registrar`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  mapa: { flex: 1 },
  overlayTopo: { position: 'absolute', top: 0, left: 0, right: 0 },
  buscaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    // sombra discreta (§6.3 anatomia): pílula branca flutuando sobre o mapa
    shadowColor: colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buscaIcone: { fontSize: 16 },
  buscaPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textWeak,
  },
  aviso: {
    position: 'absolute',
    top: '48%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avisoTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  avisoVazio: {
    position: 'absolute',
    top: '44%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaVazio: {
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaVazioPressed: { backgroundColor: colors.carameloPressed },
  ctaVazioTexto: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onDark,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
    // sombra discreta para destacar o botão sobre o mapa
    shadowColor: colors.text,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabPressed: { backgroundColor: colors.carameloPressed },
  fabTexto: { fontSize: 30, color: colors.onDark, marginTop: -2 },
});
