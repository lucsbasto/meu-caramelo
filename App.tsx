import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar as RNStatusBar,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from './src/lib/supabase';

type PointStatus = 'ok' | 'needs_water' | 'needs_food' | 'needs_maintenance';
type NavTab = 'home' | 'search' | 'favorites' | 'profile';

type FeedingPoint = {
  id: string;
  title: string;
  status: PointStatus;
  latitude: number;
  longitude: number;
  created_at: string;
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

const NAVBAR_HEIGHT = 82;

export default function App() {
  const [points, setPoints] = useState<FeedingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

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

  const addDummyPoint = useCallback(async () => {
    setAdding(true);
    setError(null);

    const randomOffset = () => (Math.random() - 0.5) * 0.02;

    const { error: insertError } = await supabase.from('feeding_points').insert({
      title: `Comedouro ${new Date().toLocaleTimeString()}`,
      status: 'ok',
      latitude: -23.55052 + randomOffset(),
      longitude: -46.633308 + randomOffset(),
      notes: 'Criado pelo app MVP',
    });

    if (insertError) {
      setError(insertError.message);
      setAdding(false);
      return;
    }

    await loadPoints();
    setAdding(false);
  }, [loadPoints]);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <MapView
        style={styles.map}
        region={mapRegion}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        onMapReady={() => console.log('Map ready')}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.title}
            description={`status: ${point.status}`}
          />
        ))}
      </MapView>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Carregando comedouros...</Text>
        </View>
      ) : null}

      <View style={styles.navbar}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;

          return (
            <Pressable key={item.key} style={styles.navItem} onPress={() => setActiveTab(item.key)}>
              <Ionicons name={isActive ? item.iconActive : item.icon} size={21} color={isActive ? '#ffffff' : '#d7e1d9'} />
              {isActive ? <View style={styles.activeDot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  header: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#b00020',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#475569',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  navbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: NAVBAR_HEIGHT,
    backgroundColor: '#031f14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  navItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
});


