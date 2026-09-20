// Tipos + normalização + formatadores puros do feed da comunidade (§6.8).
import type { Database } from '@/lib/database.types';
import { nomeAutor } from '@/features/auth/abbreviate';
import { formatarConteudoRegistro } from '@/features/ponto/dados';

// Raio padrão do escopo "Perto de mim". O seletor de raio (§6.13, aba
// Configurações) ainda não existe; quando existir, este valor vem da
// preferência do usuário. Mantido igual ao raio do mapa (usePontos).
export const RAIO_FEED_M = 3000;

// Tamanho da página do feed (§6.8 — paginado, ordem cronológica).
export const PAGINA_FEED = 20;

// Linha crua da RPC feed_proximo.
export type FeedRow =
  Database['public']['Functions']['feed_proximo']['Returns'][number];

// Escopo ativo dos chips (§6.8): "Perto de mim" · "Seguindo" · "Pedidos de ajuda".
export type EscopoFeed = 'perto' | 'seguindo' | 'pedidos';

// Formato do cartão (§6.8): registro completo, pedido de ajuda, ou evento de
// uma linha (registro sem texto nem foto).
export type FormatoCartao = 'registro' | 'pedido' | 'evento';

export type ItemFeed = {
  tipo: 'registro' | 'pedido';
  formato: FormatoCartao;
  id: string;
  criadoEm: string;
  pontoId: string;
  pontoNome: string;
  autorId: string;
  autorNome: string; // já abreviado (§7.6)
  autorAvatarUrl: string | null;
  texto: string | null;
  fotoUrl: string | null;
  caes: number | null;
  gatos: number | null;
  tipos: string[];
  reacoesCount: number;
  comentariosCount: number;
  dataAlvo: string | null;
  // Resumo curto do que foi alimentado ("2 cães · Praça"), usado no evento de
  // uma linha e como legenda do registro.
  resumo: string;
};

// Um registro vira "evento de uma linha" quando não tem nem observação nem foto:
// mantém o feed denso, sem um cartão alto para um registro sem relato (§6.8).
function decidirFormato(row: FeedRow): FormatoCartao {
  if (row.item_tipo === 'pedido') return 'pedido';
  const temTexto = (row.conteudo ?? '').trim().length > 0;
  const temFoto = (row.foto_url ?? '').length > 0;
  return temTexto || temFoto ? 'registro' : 'evento';
}

export function normalizarItemFeed(row: FeedRow): ItemFeed {
  const tipos = row.tipos ?? [];
  return {
    tipo: row.item_tipo === 'pedido' ? 'pedido' : 'registro',
    formato: decidirFormato(row),
    id: row.item_id,
    criadoEm: row.criado_em,
    pontoId: row.ponto_id,
    pontoNome: row.ponto_nome,
    autorId: row.autor_id,
    // Autor apagado aparece como "Voluntário removido" (§6.13). No feed isso só
    // vale de fato quando o feed_proximo passar a LEFT JOIN profiles — hoje é
    // INNER JOIN e a linha sem autor some; a troca acompanha o WP do feed (#20).
    autorNome: nomeAutor(row.autor_nome),
    autorAvatarUrl: row.autor_avatar_url,
    texto: row.conteudo,
    fotoUrl: row.foto_url,
    caes: row.caes,
    gatos: row.gatos,
    tipos,
    reacoesCount: row.reacoes_count ?? 0,
    comentariosCount: row.comentarios_count ?? 0,
    dataAlvo: row.data_alvo,
    resumo: formatarConteudoRegistro({
      caes: row.caes,
      gatos: row.gatos,
      tipos,
    }),
  };
}

// Régua de tempo do feed (§6.8): "agora" · "há 6 h" · "ontem" · "há 3 dias".
// Absoluta o suficiente para o feed cronológico, sem depender de i18n de datas.
export function formatarTempoFeed(criadoEm: string): string {
  const horas = (Date.now() - new Date(criadoEm).getTime()) / 3_600_000;
  if (horas < 1) return 'agora';
  if (horas < 24) return `há ${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

// Frase do evento de uma linha (§6.8): "João P. alimentou 2 cães · Praça · ontem".
// Usa o resumo (cães/gatos ou tipos) sempre que há algo concreto; só cai para
// "passou por aqui" quando o registro não trouxe nem contagem nem tipos.
export function fraseEvento(item: ItemFeed): string {
  const temAlgo = !!item.caes || !!item.gatos || item.tipos.length > 0;
  const alvo = temAlgo ? item.resumo : 'passou por aqui';
  return `${item.autorNome} · ${alvo} · ${item.pontoNome}`;
}
