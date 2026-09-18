// Geocodificação direta do Mapbox para a seção "Endereços" da busca (§6.14).
// Não há endpoint HTTP de geocoding em outro lugar do app; este é o único.
// Usa o token público (EXPO_PUBLIC_MAPBOX_TOKEN), enviesa por proximidade do
// centro atual e limita ao Brasil / português. Request cancelado vira lista
// vazia; falha real (token, rede, 5xx) propaga pro useQuery tratar como erro.
import type { Centro } from '@/features/mapa/usePontos';

export type Endereco = {
  id: string;
  nome: string;
  endereco: string;
  lat: number;
  lng: number;
};

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Recorte do que consumimos de cada feature do Geocoding v5.
type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
};

export async function buscarEnderecos(
  query: string,
  centro: Centro,
  signal?: AbortSignal
): Promise<Endereco[]> {
  const q = query.trim();
  // <2 chars ou sem token não vale bater na rede.
  if (!TOKEN || q.length < 2) return [];
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${encodeURIComponent(TOKEN)}&country=br&language=pt&limit=5` +
      `&proximity=${centro.lng},${centro.lat}&types=address,place,poi`;
    const resp = await fetch(url, { signal });
    // Falha real (401 token, 429, 5xx) NÃO pode virar lista vazia: isso mostra
    // "nenhum resultado, cadastrar aqui" enganando o usuário e escondendo bug de
    // token. Propaga pro useQuery distinguir erro de vazio.
    if (!resp.ok) {
      throw new Error(`Geocoding falhou: HTTP ${resp.status}`);
    }
    const json = (await resp.json()) as { features?: MapboxFeature[] };
    return (json.features ?? []).map((f) => ({
      id: f.id,
      nome: f.text,
      endereco: f.place_name,
      lng: f.center[0],
      lat: f.center[1],
    }));
  } catch (e) {
    // Request cancelado (stale): silencioso. Erro real: propaga.
    if (e instanceof Error && e.name === 'AbortError') return [];
    throw e;
  }
}
