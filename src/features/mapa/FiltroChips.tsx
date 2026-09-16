import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, spacing, touch } from '@/theme';
import type { Filtro } from './pontos';

const OPCOES: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'precisa', rotulo: 'Precisa hoje' },
  { valor: 'ok', rotulo: 'OK hoje' },
];

type Props = {
  filtro: Filtro;
  onChange: (f: Filtro) => void;
};

export function FiltroChips({ filtro, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.linha}
    >
      {OPCOES.map((op) => {
        const ativo = op.valor === filtro;
        return (
          <Pressable
            key={op.valor}
            onPress={() => onChange(op.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            style={[styles.chip, ativo && styles.chipAtivo]}
          >
            <Text style={[styles.texto, ativo && styles.textoAtivo]}>
              {op.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  linha: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    minHeight: touch.chip,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAtivo: {
    backgroundColor: colors.caramelo,
    borderColor: colors.caramelo,
  },
  texto: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  textoAtivo: { color: colors.onDark },
});
