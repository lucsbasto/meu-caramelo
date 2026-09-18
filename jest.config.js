/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // pnpm guarda os pacotes reais em node_modules/.pnpm/<nome@versao>/...; o jest
  // resolve os arquivos por esse caminho real, então o allowlist tem de casar o
  // segmento logo após .pnpm/ (nomes com escopo usam "+" no lugar da "/").
  transformIgnorePatterns: [
    "node_modules/.pnpm/(?!((jest-)?react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry\\+react-native|native-base|react-native-svg|@rnmapbox|@react-native-google-signin))",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.types.ts",
    "!src/lib/database.types.ts",
  ],
};
