// Rota /registro/:id (§6.10) — detalhe do registro empilhado sobre o feed.
import { useLocalSearchParams } from 'expo-router';
import { RegistroDetalheScreen } from '@/features/registro/RegistroDetalheScreen';

export default function RegistroDetalheRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <RegistroDetalheScreen id={id} />;
}
