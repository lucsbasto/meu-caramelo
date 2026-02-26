import { Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { FeedingPoint } from '../types';
import { PointStatusBadge } from './PointStatusBadge';

type Props = {
  point: FeedingPoint;
};

export function PointCard({ point }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        gap: 10
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>
          {point.title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
        </Text>
      </View>

      {point.notes ? (
        <Text style={{ color: colors.text, fontSize: 14 }}>{point.notes}</Text>
      ) : null}

      <PointStatusBadge status={point.status} />
    </View>
  );
}
