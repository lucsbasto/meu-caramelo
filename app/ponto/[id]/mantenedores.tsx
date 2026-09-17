// Rota /ponto/:id/mantenedores (§7.4). Irmã de [id]/editar.tsx; delega à tela.
import { useLocalSearchParams } from 'expo-router';
import { MantenedoresScreen } from '@/features/ponto/MantenedoresScreen';

export default function MantenedoresRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <MantenedoresScreen id={id} />;
}
