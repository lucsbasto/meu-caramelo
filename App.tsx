import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from './src/lib/supabase';
import { BottomSheetPointDetails, PointDetailsData, PointSheetComment } from './src/components/BottomSheetPointDetails';

type PointStatus = 'ok' | 'needs_water' | 'needs_food' | 'needs_maintenance';
type NavTab = 'home' | 'search' | 'favorites' | 'profile';
type PointType = 'food' | 'water' | 'both';

type FeedingPoint = {
  id: string;
  title: string;
  status: PointStatus;
  latitude: number;
  longitude: number;
  created_at: string;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION = {
  latitude: -23.55052,
  longitude: -46.633308,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const NAV_ITEMS: Array<{
  key: NavTab;
  icon: 'home-outline' | 'search-outline' | 'heart-outline' | 'person-outline';
  iconActive: 'home' | 'search' | 'heart' | 'person';
}> = [
  { key: 'home', icon: 'home-outline', iconActive: 'home' },
  { key: 'search', icon: 'search-outline', iconActive: 'search' },
  { key: 'favorites', icon: 'heart-outline', iconActive: 'heart' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person' },
];

const NAVBAR_HEIGHT = 86;

const STATUS_TO_DETAILS: Record<PointStatus, PointDetailsData['status']> = {
  ok: 'full',
  needs_food: 'empty',
  needs_water: 'empty',
  needs_maintenance: 'maintenance',
};

const STATUS_TO_TYPE: Record<PointStatus, PointType> = {
  ok: 'both',
  needs_food: 'food',
  needs_water: 'water',
  needs_maintenance: 'both',
};

const STATUS_TO_DB: Record<PointDetailsData['status'], PointStatus> = {
  full: 'ok',
  empty: 'needs_food',
  maintenance: 'needs_maintenance',
};

const SAMPLE_COMMENTS: PointSheetComment[] = [
  {
    id: 'c1',
    username: 'caramelo_lovers',
    text: 'Lugar muito limpo e sempre com agua fresca.',
    timestamp: '2 h',
  },
  {
    id: 'c2',
    username: 'adote_um_amigo',
    text: 'Passei aqui hoje cedo, estava cheio.',
    timestamp: '5 h',
  },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceKm = (from: UserLocation, to: UserLocation) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getCurrentPosition = async (): Promise<UserLocation | null> => {
  const geo = (globalThis as any)?.navigator?.geolocation;
  if (!geo?.getCurrentPosition) {
    return null;
  }

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position: any) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
};

const buildImages = (pointId: string) => {
  return [
    `https://picsum.photos/seed/${pointId}-1/900/600`,
    `https://picsum.photos/seed/${pointId}-2/900/600`,
    `https://picsum.photos/seed/${pointId}-3/900/600`,
  ];
};

const getMarkerColor = (status: PointStatus) => {
  if (status === 'ok') {
    return '#166534';
  }
  if (status === 'needs_maintenance') {
    return '#92400e';
  }
  return '#b91c1c';
};

const getMarkerIconName = (
  type: PointType,
  status: PointStatus,
): React.ComponentProps<typeof Ionicons>['name'] => {
  const isFilled = status === 'ok';

  if (type === 'food') {
    return isFilled ? 'fast-food' : 'fast-food-outline';
  }
  if (type === 'water') {
    return isFilled ? 'water' : 'water-outline';
  }

  return isFilled ? 'restaurant' : 'restaurant-outline';
};

export default function App() {
  const [points, setPoints] = useState<FeedingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [commentsByPoint, setCommentsByPoint] = useState<Record<string, PointSheetComment[]>>({});

  const loadPoints = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('feeding_points')
      .select('id, title, status, latitude, longitude, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setPoints([]);
    } else {
      setPoints((data ?? []) as FeedingPoint[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  useEffect(() => {
    void getCurrentPosition().then(setUserLocation);
  }, []);

  const mapRegion = useMemo(() => {
    if (points.length === 0) {
      return DEFAULT_REGION;
    }

    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [points]);

  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId],
  );

  const selectedPointDetails = useMemo<PointDetailsData | null>(() => {
    if (!selectedPoint) {
      return null;
    }

    const defaultDistance = userLocation
      ? distanceKm(userLocation, {
          latitude: selectedPoint.latitude,
          longitude: selectedPoint.longitude,
        })
      : null;

    return {
      id: selectedPoint.id,
      title: selectedPoint.title,
      type: STATUS_TO_TYPE[selectedPoint.status],
      status: STATUS_TO_DETAILS[selectedPoint.status],
      distanceKm: defaultDistance,
      rating: 4.3,
      ratingsCount: 127,
      likesCount: 64,
      commentsCount:
        commentsByPoint[selectedPoint.id]?.length ?? SAMPLE_COMMENTS.length,
      images: buildImages(selectedPoint.id),
    };
  }, [commentsByPoint, selectedPoint, userLocation]);

  const handleRefill = useCallback(async (pointId: string) => {
    const { error: updateError } = await supabase
      .from('feeding_points')
      .update({ status: STATUS_TO_DB.full })
      .eq('id', pointId);

    if (updateError) {
      Alert.alert('Erro', 'Nao foi possivel atualizar o status.');
      return;
    }

    setPoints((current) =>
      current.map((point) =>
        point.id === pointId ? { ...point, status: STATUS_TO_DB.full } : point,
      ),
    );
  }, []);

  const handleAddComment = useCallback((pointId: string, text: string) => {
    const normalized = text.trim();
    if (!normalized) {
      return;
    }

    const newComment: PointSheetComment = {
      id: `${pointId}-${Date.now()}`,
      username: 'you',
      text: normalized,
      timestamp: 'agora',
    };

    setCommentsByPoint((current) => {
      const base = current[pointId] ?? SAMPLE_COMMENTS;
      return {
        ...current,
        [pointId]: [newComment, ...base],
      };
    });
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <MapView
        style={styles.map}
        region={mapRegion}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.title}
            description={`status: ${point.status}`}
            onPress={() => setSelectedPointId(point.id)}
          >
            <View style={[styles.markerOuter, { borderColor: getMarkerColor(point.status) }]}>
              <View style={[styles.markerInner, { backgroundColor: getMarkerColor(point.status) }]}>
                <Ionicons
                  name={getMarkerIconName(STATUS_TO_TYPE[point.status], point.status)}
                  size={16}
                  color="#fef7e5"
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#0f3f2f" />
          <Text style={styles.stateText}>Carregando comedouros...</Text>
        </View>
      ) : null}

      <View style={styles.navbar}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;

          return (
            <Pressable key={item.key} style={[styles.navItem, isActive ? styles.navItemActive : null]} onPress={() => setActiveTab(item.key)}>
              <Ionicons name={isActive ? item.iconActive : item.icon} size={20} color={isActive ? '#fef7e5' : '#e7e5e4'} />
              {isActive ? <View style={styles.activeDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <BottomSheetPointDetails
        point={selectedPointDetails}
        comments={selectedPoint ? commentsByPoint[selectedPoint.id] ?? SAMPLE_COMMENTS : []}
        onClose={() => setSelectedPointId(null)}
        onRefill={handleRefill}
        onAddComment={handleAddComment}
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ebe7d8',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  markerOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fffef9',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPill: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(15,63,47,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(250,241,210,0.45)',
  },
  headerTitle: {
    color: '#fef7e5',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#e7e5e4',
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    position: 'absolute',
    top: 80,
    left: 14,
    right: 14,
    color: '#b91c1c',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateText: {
    color: '#292524',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  navbar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 12,
    height: NAVBAR_HEIGHT,
    backgroundColor: 'rgba(19,27,24,0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(244,232,194,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  navItem: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(244,232,194,0.18)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fef7e5',
  },
});

