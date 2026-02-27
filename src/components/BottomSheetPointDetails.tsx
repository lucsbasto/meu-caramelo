import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageCarousel } from './ImageCarousel';
import { Rating } from './Rating';
import { SocialActions } from './SocialActions';
import { CommentsList } from './CommentsList';

export type PointType = 'food' | 'water' | 'both';
export type PointStatus = 'full' | 'empty' | 'maintenance';

export type PointDetailsData = {
  id: string;
  title: string;
  type: PointType;
  status: PointStatus;
  distanceKm: number | null;
  rating: number;
  ratingsCount: number;
  likesCount: number;
  commentsCount: number;
  images: string[];
};

export type PointSheetComment = {
  id: string;
  username: string;
  text: string;
  timestamp: string;
};

type Props = {
  point: PointDetailsData | null;
  comments: PointSheetComment[];
  onClose: () => void;
  onRefill: (pointId: string) => void | Promise<void>;
  onAddComment: (pointId: string, text: string) => void;
};

const getStatusColor = (status: PointStatus) => {
  if (status === 'full') {
    return '#166534';
  }
  if (status === 'maintenance') {
    return '#92400e';
  }
  return '#b91c1c';
};

const getClosestSnapPoint = (value: number, snapPoints: number[]) => {
  return snapPoints.reduce((closest, current) =>
    Math.abs(current - value) < Math.abs(closest - value) ? current : closest,
  );
};

export function BottomSheetPointDetails({
  point,
  comments,
  onClose,
  onRefill,
  onAddComment,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const FULL_TOP = 0;
  const sheetHeight = Math.max(0, screenHeight - insets.top);
  const INITIAL_TOP = sheetHeight * 0.2;
  const CLOSED_TOP = sheetHeight + 20;
  const SNAP_POINTS = [FULL_TOP, INITIAL_TOP, CLOSED_TOP];

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const translateY = useRef(new Animated.Value(CLOSED_TOP)).current;
  const dragStart = useRef(CLOSED_TOP);

  const animateTo = (toValue: number) => {
    Animated.spring(translateY, {
      toValue,
      damping: 24,
      mass: 0.9,
      stiffness: 240,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && toValue === CLOSED_TOP && point) {
        onClose();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
        onPanResponderGrant: () => {
          translateY.stopAnimation((value) => {
            dragStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(FULL_TOP, Math.min(CLOSED_TOP, dragStart.current + gesture.dy));
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const projected = dragStart.current + gesture.dy + gesture.vy * 60;
          const snap = getClosestSnapPoint(projected, SNAP_POINTS);
          animateTo(snap);
        },
      }),
    [CLOSED_TOP, INITIAL_TOP],
  );

  useEffect(() => {
    if (!point) {
      animateTo(CLOSED_TOP);
      return;
    }

    setLiked(false);
    setFavorited(false);
    animateTo(INITIAL_TOP);
  }, [point?.id]);

  if (!point) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top, height: sheetHeight, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <ImageCarousel images={point.images} />

        <View style={styles.infoCard}>
          <Text style={styles.eyebrow}>Feeding Point</Text>
          <Text style={styles.title}>{point.title}</Text>

          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>tipo</Text>
              <Text style={styles.chipValue}>{point.type}</Text>
            </View>

            <View style={styles.chip}>
              <Text style={styles.chipLabel}>status</Text>
              <Text style={[styles.chipValue, { color: getStatusColor(point.status) }]}>{point.status}</Text>
            </View>

            <View style={styles.chip}>
              <Text style={styles.chipLabel}>distancia</Text>
              <Text style={styles.chipValue}>
                {point.distanceKm == null ? 'indisponivel' : `${point.distanceKm.toFixed(2)} km`}
              </Text>
            </View>
          </View>

          <Rating rating={point.rating} ratingsCount={point.ratingsCount} />
        </View>

        <SocialActions
          liked={liked}
          favorited={favorited}
          likesCount={point.likesCount + (liked ? 1 : 0)}
          commentsCount={point.commentsCount}
          onToggleLike={() => setLiked((prev) => !prev)}
          onToggleFavorite={() => setFavorited((prev) => !prev)}
        />

        <CommentsList comments={comments} pointId={point.id} onAddComment={onAddComment} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <Pressable style={styles.refillButton} onPress={() => void onRefill(point.id)}>
          <Text style={styles.refillText}>Refill</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#f8f6ef',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#d9d4c5',
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 16,
  },
  handleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#efeada',
  },
  handle: {
    width: 54,
    height: 6,
    borderRadius: 8,
    backgroundColor: '#b8b09a',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 12,
  },
  infoCard: {
    marginTop: 10,
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd5c2',
    backgroundColor: '#fffef9',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#78716c',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1917',
    marginTop: 2,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#f3efdf',
    borderWidth: 1,
    borderColor: '#e3dac4',
  },
  chipLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#78716c',
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd5c2',
    backgroundColor: '#f2ecdd',
  },
  refillButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0f3f2f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f3f2f',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  refillText: {
    color: '#fef7e5',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

