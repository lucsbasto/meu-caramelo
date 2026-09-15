import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '@/theme';

// WP4: substituir por features/mapa (base em mapbox/MapaScreen.tsx)
export default function MapaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa</Text>
      <Text style={styles.sub}>
        Placeholder da Fase 1. WP4 liga o @rnmapbox/maps e os pins por status.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { fontFamily: fonts.title, fontSize: 28, color: colors.text },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
