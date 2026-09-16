import type { ExpoConfig } from 'expo/config';

// Config dinâmico: injeta o RNMapboxMapsDownloadToken (sk., scope DOWNLOADS:READ)
// em build time a partir do ambiente. Local: .env (RNMAPBOX_DOWNLOAD_TOKEN).
// EAS: definir como env var/secret do profile (eas env:create).
const config: ExpoConfig = {
  name: 'Meu Caramelo',
  slug: 'meu-caramelo',
  scheme: 'meucaramelo',
  owner: 'meucaramelo',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.meucaramelo.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'O Meu Caramelo usa sua localização para mostrar os pontos de alimentação perto de você. A posição fica no aparelho e não é gravada.',
    },
  },
  android: {
    package: 'com.meucaramelo.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      { locationWhenInUsePermission: 'Mostrar pontos perto de você.' },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: '11.23.1',
        RNMapboxMapsDownloadToken: process.env.RNMAPBOX_DOWNLOAD_TOKEN,
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '844a44e7-3786-4dc6-b608-cac9e0e02d9c',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    mapboxPublicToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  },
};

export default config;
