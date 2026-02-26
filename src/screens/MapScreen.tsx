import { ActivityIndicator, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, statusColors } from '../constants/theme';
import { useFeedingPoints } from '../hooks/useFeedingPoints';

const defaultRegion = {
  latitude: -23.55052,
  longitude: -46.633308,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

export function MapScreen() {
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
    <MapView style={{ flex: 1 }} initialRegion={defaultRegion}>
      {points.map((point) => (
        <Marker
          key={point.id}
          coordinate={{ latitude: point.latitude, longitude: point.longitude }}
          title={point.title}
          description={point.notes ?? undefined}
          pinColor={statusColors[point.status]}
        />
      ))}
    </MapView>
  );
}
