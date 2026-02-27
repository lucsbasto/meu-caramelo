import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

type Props = {
  liked: boolean;
  favorited: boolean;
  likesCount: number;
  commentsCount: number;
  onToggleLike: () => void;
  onToggleFavorite: () => void;
};

export function SocialActions({
  liked,
  favorited,
  likesCount,
  commentsCount,
  onToggleLike,
  onToggleFavorite,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable style={[styles.iconButton, liked ? styles.iconButtonActive : null]} onPress={onToggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#b91c1c' : '#111827'} />
        </Pressable>

        <Pressable
          style={[styles.iconButton, favorited ? styles.iconButtonActive : null]}
          onPress={onToggleFavorite}
        >
          <Ionicons
            name={favorited ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={favorited ? '#1d4ed8' : '#111827'}
          />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={() => void Share.share({ message: 'Ponto de alimentacao para pets' })}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#111827" />
        </Pressable>

        <Pressable style={styles.iconButton} onPress={() => Alert.alert('Reporte enviado', 'Obrigado pelo feedback.') }>
          <Ionicons name="alert-circle-outline" size={20} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{likesCount} curtidas</Text>
        <Text style={styles.metaText}>{commentsCount} comentarios</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginHorizontal: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd5c2',
    borderRadius: 14,
    backgroundColor: '#fffef9',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#e7dfcb',
    backgroundColor: '#f7f2e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    borderColor: '#b8b09a',
    backgroundColor: '#efe9d7',
  },
  metaRow: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#efe7d4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#44403c',
    fontWeight: '600',
  },
});
