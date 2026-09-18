// Tipos + normalização + formatadores puros do detalhe do registro (§6.10).
import type { Tables } from '@/lib/database.types';
import { abbreviateName } from '@/features/auth/abbreviate';

// Linha crua do registro com o autor (profiles) e o ponto (pontos) embutidos.
export type RegistroDetalheRow = Tables<'registros'> & {
  profiles: { nome: string; avatar_url: string | null } | null;
  pontos: { nome: string } | null;
};

export type RegistroDetalhe = {
  id: string;
  pontoId: string;
  pontoNome: string;
  userId: string;
  autorNome: string; // já abreviado (§7.6)
  autorAvatarUrl: string | null;
  criadoEm: string;
  caes: number | null;
  gatos: number | null;
  quantidadeKg: number | null;
  tipos: string[];
  observacao: string | null;
  fotoUrl: string | null;
};

export function normalizarRegistroDetalhe(row: RegistroDetalheRow): RegistroDetalhe {
  return {
    id: row.id,
    pontoId: row.ponto_id,
    pontoNome: row.pontos?.nome ?? 'Ponto',
    userId: row.user_id,
    autorNome: abbreviateName(row.profiles?.nome ?? 'Vizinho'),
    autorAvatarUrl: row.profiles?.avatar_url ?? null,
    criadoEm: row.criado_em,
    caes: row.caes,
    gatos: row.gatos,
    quantidadeKg: row.quantidade_kg,
    tipos: row.tipos ?? [],
    observacao: row.observacao,
    fotoUrl: row.foto_url,
  };
}

// Linha crua do comentário com o autor embutido.
export type ComentarioRow = Tables<'comentarios'> & {
  profiles: { nome: string; avatar_url: string | null } | null;
};

export type Comentario = {
  id: string;
  autorId: string;
  autorNome: string; // já abreviado (§7.6)
  autorAvatarUrl: string | null;
  texto: string;
  criadoEm: string;
};

export function normalizarComentario(row: ComentarioRow): Comentario {
  return {
    id: row.id,
    autorId: row.autor_id,
    autorNome: abbreviateName(row.profiles?.nome ?? 'Vizinho'),
    autorAvatarUrl: row.profiles?.avatar_url ?? null,
    texto: row.texto,
    criadoEm: row.criado_em,
  };
}

// Estado do coração do registro (§6.10): contagem + se o usuário atual reagiu.
export type EstadoReacao = {
  count: number;
  euReagi: boolean;
};

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function horaMinuto(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}h${m}`;
}

function inicioDoDia(x: Date): number {
  const c = new Date(x);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

// Data/hora ABSOLUTA do registro (§6.10): ao contrário das listas (tempo
// relativo), a tela de detalhe mostra o momento cheio. "hoje às 7h10" ·
// "ontem às 7h10" · "12 de março às 7h10". `agora` é injetável para teste.
export function formatarDataHoraCompleta(criadoEm: string, agora: Date = new Date()): string {
  const d = new Date(criadoEm);
  const hm = horaMinuto(d);
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(d)) / 86_400_000);
  if (dias === 0) return `hoje às ${hm}`;
  if (dias === 1) return `ontem às ${hm}`;
  return `${d.getDate()} de ${MESES[d.getMonth()]} às ${hm}`;
}

// Tempo relativo do comentário (§6.10): "agora" · "há 6 h" · "ontem" · "há 3 dias".
export function formatarTempoComentario(criadoEm: string, agora: Date = new Date()): string {
  const horas = (agora.getTime() - new Date(criadoEm).getTime()) / 3_600_000;
  if (horas < 1) return 'agora';
  if (horas < 24) return `há ${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
