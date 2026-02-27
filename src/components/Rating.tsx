import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  rating: number;
  ratingsCount: number;
};

export function Rating({ rating, ratingsCount }: Props) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }).map((_, index) => {
            if (index < fullStars) {
              return <Ionicons key={index} name="star" size={15} color="#d97706" />;
            }

            if (index === fullStars && hasHalf) {
              return <Ionicons key={index} name="star-half" size={15} color="#d97706" />;
            }

            return <Ionicons key={index} name="star-outline" size={15} color="#d97706" />;
          })}
        </View>

        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
      <Text style={styles.countText}>{ratingsCount} avaliacoes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e7dfcb',
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1c1917',
  },
  countText: {
    fontSize: 12,
    color: '#57534e',
  },
});
