import { Text, View } from 'react-native';
import { statusColors, statusLabels } from '../constants/theme';
import { PointStatus } from '../types';

type Props = {
  status: PointStatus;
};

export function PointStatusBadge({ status }: Props) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: statusColors[status],
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
        {statusLabels[status]}
      </Text>
    </View>
  );
}
