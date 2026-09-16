import type { Database } from '@/lib/database.types';
import {
  statusColor,
  statusFromHoras,
  type PontoStatus,
} from '@/theme';

// Linha crua da RPC pontos_proximos (= view pontos_com_status)
export type PontoRow =
  Database['public']['Functions']['pontos_proximos']['Returns'][number];

// Ponto já normalizado para a UI do mapa
export type Ponto = {
  id: string;
  nome: string;
  endereco: string | null;
  fotoUrl: string | null;
  lat: number;
  lng: number;
  horasDesdeUltima: number | null;
  temMantenedor: boolean;
  status: PontoStatus;
  cor: string;
};

// §7.6 — exibição pública arredonda a coordenada (~50 m ≈ 0.00045°)
const PASSO_PRIVACIDADE = 0.00045;
export function arredondarCoord(v: number): number {
  return Math.round(v / PASSO_PRIVACIDADE) * PASSO_PRIVACIDADE;
}

export function normalizarPonto(row: PontoRow): Ponto | null {
  if (row.id == null || row.lat == null || row.lng == null) return null;
  const temMantenedor = row.mantenedor_id != null;
  const status = statusFromHoras(row.horas_desde_ultima, temMantenedor);
  return {
    id: row.id,
    nome: row.nome ?? 'Ponto sem nome',
    endereco: row.endereco,
    fotoUrl: row.foto_url,
    // arredonda já na normalização: toda exibição (pin + folha) é pública
    lat: arredondarCoord(row.lat),
    lng: arredondarCoord(row.lng),
    horasDesdeUltima: row.horas_desde_ultima,
    temMantenedor,
    status,
    cor: statusColor[status],
  };
}

// GeoJSON para o ShapeSource; cor data-driven vai nas properties (research #3)
export type PontoFeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id: string;
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; status: PontoStatus; cor: string };
  }[];
};

export function toFeatureCollection(pontos: Ponto[]): PontoFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pontos.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, status: p.status, cor: p.cor },
    })),
  };
}

// Filtros da barra de chips (§6.3)
export type Filtro = 'todos' | 'precisa' | 'ok';

export function aplicarFiltro(pontos: Ponto[], filtro: Filtro): Ponto[] {
  if (filtro === 'todos') return pontos;
  if (filtro === 'ok') return pontos.filter((p) => p.status === 'ok');
  // "precisa hoje" = precisa + urgente (órfão não tem quem alimente)
  return pontos.filter(
    (p) => p.status === 'precisa' || p.status === 'urgente'
  );
}

// Distância aproximada usuário -> ponto (Haversine, metros)
export function distanciaMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatarDistancia(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

// "há 2 h" / "há 3 dias" / "sem registro" a partir das horas da view
export function formatarTempo(horas: number | null): string {
  if (horas == null) return 'sem registro';
  if (horas < 1) return 'há menos de 1 h';
  if (horas < 24) return `há ${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

export const rotuloStatus: Record<PontoStatus, string> = {
  ok: 'Alimentado',
  precisa: 'Precisa hoje',
  urgente: 'Urgente',
  orfao: 'Sem mantenedor',
};
