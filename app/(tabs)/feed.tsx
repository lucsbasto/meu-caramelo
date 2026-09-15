import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '@/theme';

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.sub}>Fase 4 — comunidade.</Text>
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
    marginTop: spacing.sm,
  },
});
