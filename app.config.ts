import type { ExpoConfig } from 'expo/config';

// Config dinâmico. O token de download do SDK nativo do Mapbox (sk.,
// scope DOWNLOADS:READ) é lido em build time da env RNMAPBOX_MAPS_DOWNLOAD_TOKEN
// pelo próprio plugin @rnmapbox/maps — não passamos mais via prop
// RNMapboxMapsDownloadToken (deprecada). Local: .env. EAS: env var/secret do profile.
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
    'expo-web-browser',
    // Login social nativo do Google (WP3). Lê os client ids via env.
    '@react-native-google-signin/google-signin',
    [
      'expo-location',
      { locationWhenInUsePermission: 'Mostrar pontos perto de você.' },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: '11.23.1',
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
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  },
};

export default config;
