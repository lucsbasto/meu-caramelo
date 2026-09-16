// Rota /ponto/:id/registrar (§6.7). Irmã de [id]/editar.tsx; delega à tela.
import { useLocalSearchParams } from 'expo-router';
import { RegistrarAlimentacaoScreen } from '@/features/ponto/RegistrarAlimentacaoScreen';

export default function RegistrarRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <RegistrarAlimentacaoScreen id={id} />;
}
