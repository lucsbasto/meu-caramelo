// Rota /ponto/:id (§6.4). Pasta [id]/index.tsx para o WP7 poder criar
// [id]/registrar.tsx como irmão depois.
import { useLocalSearchParams } from 'expo-router';
import { PontoDetalheScreen } from '@/features/ponto/PontoDetalheScreen';

export default function PontoDetalheRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <PontoDetalheScreen id={id} />;
}
