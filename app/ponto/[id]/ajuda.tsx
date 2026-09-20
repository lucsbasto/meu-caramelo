// Rota /ponto/:id/ajuda (§6.9). Folha inferior; delega à tela.
import { useLocalSearchParams } from 'expo-router';
import { PedidoAjudaScreen } from '@/features/comunidade/PedidoAjudaScreen';

export default function AjudaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <PedidoAjudaScreen id={id} />;
}
