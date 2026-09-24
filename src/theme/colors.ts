// Paleta Meu Caramelo — ver design-do-app.md §5.1
export const colors = {
  bg: '#FCF6EE',
  surface: '#FFFFFF',
  border: '#EBDFD0',

  text: '#2B1D12',
  textSecondary: '#6B5645',
  textTertiary: '#8A7460',
  textWeak: '#A08F7C',
  onDark: '#FFF7EC',

  caramelo: '#B9702F',
  carameloPressed: '#8F521C',
  // Amber border of the orphan-point adoption block (§6.5).
  amber: '#E0A45E',

  verde: '#3E8F5E',
  verdeLightBg: '#E4EFE7',
  verdeDark: '#2F6B48',

  alerta: '#C1452F',
  alertaLightBg: '#F9E7E2',
} as const;

// Status do ponto derivado das horas desde o último registro (design-do-app.md)
export type PontoStatus = 'ok' | 'precisa' | 'urgente' | 'orfao';

export const statusColor: Record<PontoStatus, string> = {
  ok: colors.verde, // < 4h
  precisa: colors.caramelo, // 4-12h
  urgente: colors.alerta, // > 12h
  orfao: colors.textWeak, // sobrepõe status
};

export function statusFromHoras(
  horas: number | null,
  temMantenedor: boolean,
): PontoStatus {
  if (!temMantenedor) return 'orfao';
  if (horas == null) return 'urgente';
  if (horas < 4) return 'ok';
  if (horas < 12) return 'precisa';
  return 'urgente';
}
