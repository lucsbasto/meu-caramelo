// Rota /ponto/:id/editar (§6.6). Irmã de [id]/index.tsx; delega ao editor.
import { useLocalSearchParams } from 'expo-router';
import { EditorPontoScreen } from '@/features/ponto/EditorPontoScreen';

export default function EditarPontoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <EditorPontoScreen modo="editar" id={id} />;
}
