export * from './colors';

// Formas e espaçamento — design-do-app.md §5.3
export const radii = {
  control: 12,
  card: 18,
  sheet: 24,
  pill: 999,
} as const;

// Alvos de toque — §5.4
export const touch = {
  min: 44,
  chip: 40,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Tipografia — §5.2 (carregar as fontes com expo-font antes de usar)
export const fonts = {
  title: 'BricolageGrotesque',
  body: 'InstrumentSans',
} as const;
