import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  images: string[];
};

const ITEM_WIDTH = Dimensions.get('window').width;

export function ImageCarousel({ images }: Props) {
  const [index, setIndex] = useState(0);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(contentOffsetX / ITEM_WIDTH);
    setIndex(Math.max(0, Math.min(images.length - 1, nextIndex)));
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        pagingEnabled
        data={images}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />}
        getItemLayout={(_, itemIndex) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * itemIndex, index: itemIndex })}
      />

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>{index + 1}/{images.length}</Text>
      </View>

      <View style={styles.dotsRow}>
        {images.map((imageUri, dotIndex) => (
          <View key={imageUri} style={[styles.dot, dotIndex === index ? styles.dotActive : null]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 236,
    backgroundColor: '#ddd6c4',
  },
  image: {
    width: ITEM_WIDTH,
    height: 236,
  },
  overlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(23,23,23,0.55)',
  },
  overlayText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#fff8dd',
  },
});
