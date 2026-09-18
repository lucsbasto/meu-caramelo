// Rota /busca (§6.14), empilhada sobre o mapa. Wrapper fino que delega à tela
// de busca em src/features (mesmo padrão de ponto/[id]/index.tsx).
import { BuscaScreen } from '@/features/busca/BuscaScreen';

export default function BuscaRoute() {
  return <BuscaScreen />;
}
