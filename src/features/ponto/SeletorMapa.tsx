// Mapa com pin fixo ao centro (§6.6). O usuário arrasta o mapa por baixo do
// pin; ao parar (onMapIdle), a coordenada do centro vira a posição escolhida.
// Usado no mini-mapa de 180 px e na versão em tela cheia ("Ajustar no mapa").
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Mapbox, { Camera, MapView } from '@rnmapbox/maps';

import { colors } from '@/theme';
import estiloCaramelo from '@/features/mapa/estilo-caramelo.json';
import type { Coord } from './editor';

// Garante o token mesmo quando o editor é aberto sem passar pelo MapaScreen.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);

const ESTILO_JSON = JSON.stringify(estiloCaramelo);
const ALTURA_PIN = 34;

type Props = {
  // Coordenada inicial. Trocar o valor recentraliza o mapa (via `key` no pai).
  seed: Coord;
  onChange: (coord: Coord) => void;
  style?: StyleProp<ViewStyle>;
  zoom?: number;
};

export function SeletorMapa({ seed, onChange, style, zoom = 16 }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleJSON={ESTILO_JSON}
        scaleBarEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        onMapIdle={(estado) => {
          const [lng, lat] = estado.properties.center;
          onChange({ lat, lng });
        }}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: [seed.lng, seed.lat],
            zoomLevel: zoom,
          }}
        />
      </MapView>

      {/* Pin fixo ao centro; pointerEvents none deixa o gesto chegar ao mapa. */}
      <View style={styles.pinArea} pointerEvents="none">
        <View style={styles.pinCorpo} />
        <View style={styles.pinPonta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.border },
  pinArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // sobe o pin para que a PONTA fique no centro exato do mapa
    marginBottom: ALTURA_PIN,
  },
  pinCorpo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.caramelo,
    borderWidth: 3,
    borderColor: colors.onDark,
  },
  pinPonta: {
    width: 3,
    height: ALTURA_PIN - 11,
    backgroundColor: colors.caramelo,
    marginTop: -2,
  },
});
