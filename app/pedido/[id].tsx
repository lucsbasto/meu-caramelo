// Rota /pedido/:id (§6.13) — destino do deep link de pedido_ajuda /
// cobertura_confirmada (§4.5). Tela mínima; detalhe completo fica no WP13.
import { useLocalSearchParams } from 'expo-router';
import { PedidoAjudaScreen } from '@/features/pedido/PedidoAjudaScreen';

export default function PedidoAjudaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <PedidoAjudaScreen id={id} />;
}
