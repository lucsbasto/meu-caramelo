import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox, {
  Camera,
  CircleLayer,
  MapView,
  ShapeSource,
  UserLocation,
} from '@rnmapbox/maps';

import { colors, fonts, spacing } from '@/theme';
import estiloCaramelo from './estilo-caramelo.json';
import { FiltroChips } from './FiltroChips';
import { PontoSheet } from './PontoSheet';
import { usePontos, type Centro } from './usePontos';
import {
  aplicarFiltro,
  distanciaMetros,
  toFeatureCollection,
  type Filtro,
  type Ponto,
} from './pontos';

// Token público (pk.) — research #3. Sem download token de vetor: estilo é raster.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

// Centro de fallback quando a localização é negada (Vila Madalena, área do seed).
// Exportado para o editor de ponto reusar o mesmo fallback (§6.6 Estados).
export const CENTRO_PADRAO: Centro = { lat: -23.5585, lng: -46.6905 };
const ESTILO_JSON = JSON.stringify(estiloCaramelo);

export default function MapaScreen() {
  const router = useRouter();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [userLoc, setUserLoc] = useState<Centro | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selecionado, setSelecionado] = useState<Ponto | null>(null);

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
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!vivo) return;
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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

  function onPressPin(e: {
    features: { properties: { [k: string]: unknown } | null }[];
  }) {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    const p = pontos.find((x) => x.id === id) ?? null;
    setSelecionado(p);
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        styleJSON={ESTILO_JSON}
        scaleBarEnabled={false}
      >
        {centro && (
          <Camera
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
        </View>
      )}

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
});
