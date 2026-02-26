import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { useFeedingPoints } from '../hooks/useFeedingPoints';
import { PointCard } from '../components/PointCard';

export function PointsScreen() {
  const { points, isLoading, error } = useFeedingPoints();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: '#B91C1C', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentContainerStyle={{ padding: 12, gap: 10 }}
        data={points}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PointCard point={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.muted }}>Nenhum ponto cadastrado ainda.</Text>
          </View>
        }
      />
    </View>
  );
}
