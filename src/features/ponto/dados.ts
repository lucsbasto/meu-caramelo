// Tipos + normalização + formatadores puros do detalhe do ponto (§6.4).
import type { Database, Tables } from '@/lib/database.types';
import { arredondarCoord, formatarTempo } from '@/features/mapa/pontos';
import { statusFromHoras, type PontoStatus } from '@/theme';

export type PontoDetalheRow = Database['public']['Views']['pontos_com_status']['Row'];

export type PontoDetalhe = {
  id: string;
  nome: string;
  endereco: string | null;
  fotoUrl: string | null;
  lat: number;
  lng: number;
  horasDesdeUltima: number | null;
  mantenedorId: string | null;
  ativo: boolean;
  status: PontoStatus;
};

export function normalizarPontoDetalhe(row: PontoDetalheRow): PontoDetalhe | null {
  if (row.id == null || row.lat == null || row.lng == null) return null;
  const temMantenedor = row.mantenedor_id != null;
  return {
    id: row.id,
    nome: row.nome ?? 'Ponto sem nome',
    endereco: row.endereco,
    fotoUrl: row.foto_url,
    // arredonda já na normalização: exibição pública e "Como chegar" usam
    // sempre a coordenada aproximada (§7.6).
    lat: arredondarCoord(row.lat),
    lng: arredondarCoord(row.lng),
    horasDesdeUltima: row.horas_desde_ultima,
    mantenedorId: row.mantenedor_id,
    ativo: row.ativo ?? true,
    status: statusFromHoras(row.horas_desde_ultima, temMantenedor),
  };
}

export type Papel = Tables<'ponto_mantenedores'>['papel'];

export type Mantenedor = {
  userId: string;
  papel: Papel;
  criadoEm: string;
  nome: string;
  avatarUrl: string | null;
};

export type RegistroPonto = {
  id: string;
  userId: string;
  criadoEm: string;
  caes: number | null;
  gatos: number | null;
  quantidadeKg: number | null;
  observacao: string | null;
  tipos: string[];
  autorNome: string;
  autorAvatarUrl: string | null;
};

export type EstatisticasMes = {
  totalRegistros: number;
  voluntarios: number;
};

// Reúsa a régua de tempo do mapa para que os cortes sejam os mesmos em toda a UI.
export function formatarTempoRegistro(criadoEm: string): string {
  const horas = (Date.now() - new Date(criadoEm).getTime()) / 3_600_000;
  return formatarTempo(horas);
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Desde quando o mantenedor cuida do ponto (§6.4).
export function formatarDesde(criadoEm: string): string {
  return `desde ${MESES[new Date(criadoEm).getMonth()]}`;
}

const ROTULOS_TIPO: Record<string, string> = {
  racao: 'Ração',
  agua: 'Água',
  caseira: 'Comida caseira',
  petisco: 'Petisco',
  remedio: 'Remédio',
};

// Prioriza contagem de cães/gatos (mais concreta); cai para os tipos do
// registro quando não há contagem, para nunca deixar a linha em branco.
export function formatarConteudoRegistro(r: {
  caes: number | null;
  gatos: number | null;
  tipos: string[];
}): string {
  const partes: string[] = [];
  if (r.caes) partes.push(`${r.caes} ${r.caes === 1 ? 'cão' : 'cães'}`);
  if (r.gatos) partes.push(`${r.gatos} ${r.gatos === 1 ? 'gato' : 'gatos'}`);
  if (partes.length > 0) return partes.join(' · ');

  const rotulos = r.tipos.map((t) => ROTULOS_TIPO[t] ?? t);
  return rotulos.length > 0 ? rotulos.join(' · ') : 'Registro de alimentação';
}

// Regra do card de mantenedores: só principal/co removem registro alheio,
// o autor sempre pode remover o próprio (§6.4 Regras).
export function podeRemoverRegistro(
  registro: { userId: string },
  usuarioId: string | null,
  mantenedores: Mantenedor[]
): boolean {
  if (!usuarioId) return false;
  if (registro.userId === usuarioId) return true;
  return mantenedores.some((m) => m.userId === usuarioId);
}
