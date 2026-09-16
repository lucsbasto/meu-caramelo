// Rota /ponto/novo (§6.6). Recebe lat/lng opcionais (toque longo no mapa ou
// estado vazio) e delega ao editor compartilhado.
import { useLocalSearchParams } from 'expo-router';
import { EditorPontoScreen } from '@/features/ponto/EditorPontoScreen';

export default function NovoPontoRoute() {
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const latN = lat != null ? Number(lat) : NaN;
  const lngN = lng != null ? Number(lng) : NaN;
  const coordInicial =
    Number.isFinite(latN) && Number.isFinite(lngN)
      ? { lat: latN, lng: lngN }
      : undefined;

  return <EditorPontoScreen modo="novo" coordInicial={coordInicial} />;
}
