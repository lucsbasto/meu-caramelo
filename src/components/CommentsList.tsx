import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PointSheetComment } from './BottomSheetPointDetails';

type Props = {
  pointId: string;
  comments: PointSheetComment[];
  onAddComment: (pointId: string, text: string) => void;
};

export function CommentsList({ pointId, comments, onAddComment }: Props) {
  const [draft, setDraft] = useState('');

  const sortedComments = useMemo(() => comments, [comments]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comentarios</Text>

      <View style={styles.list}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {sortedComments.map((item) => (
            <View key={item.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          placeholder="Adicione um comentario"
          placeholderTextColor="#8b8b85"
        />
        <Pressable
          style={styles.submitButton}
          onPress={() => {
            onAddComment(pointId, draft);
            setDraft('');
          }}
        >
          <Text style={styles.submitText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd5c2',
    backgroundColor: '#fffef9',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c1917',
    marginBottom: 8,
  },
  list: {
    maxHeight: 206,
  },
  listContent: {
    paddingBottom: 2,
  },
  commentItem: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecdc',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#292524',
  },
  commentText: {
    fontSize: 13,
    color: '#3f3f46',
  },
  timestamp: {
    fontSize: 11,
    color: '#8b8b85',
  },
  inputRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd5c2',
    borderRadius: 12,
    height: 41,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#f9f5e8',
  },
  submitButton: {
    height: 41,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#0f3f2f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#fef7e5',
    fontSize: 13,
    fontWeight: '700',
  },
});
