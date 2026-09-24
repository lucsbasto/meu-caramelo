// Feed da comunidade (§6.8): query paginada por recência + realtime só para
// pedidos de ajuda novos. A ordem é estritamente cronológica — sem relevância.

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { Centro } from '@/features/mapa/usePontos';
import { supabase } from '@/lib/supabase';
import {
  type EscopoFeed,
  type ItemFeed,
  normalizarItemFeed,
  PAGINA_FEED,
  RAIO_FEED_M,
} from './feed';

// Cursor de keyset: (criado_em, id) do último item da página desempata itens
// com o mesmo instante, para nenhum sumir na borda (null = primeira página).
type Cursor = { antes: string; antesId: string } | null;

function chaveFeed(escopo: EscopoFeed, centro: Centro | null) {
  // Arredonda o centro para não refazer a query a cada micro-movimento do GPS,
  // igual ao mapa. "Seguindo" ignora o raio, então não depende do centro.
  const r = (n: number) => n.toFixed(3);
  const local =
    escopo === 'seguindo' || !centro
      ? 'sem-centro'
      : `${r(centro.lat)},${r(centro.lng)}`;
  return ['feed', escopo, local] as const;
}

async function buscarPagina(
  escopo: EscopoFeed,
  centro: Centro | null,
  antes: Cursor,
): Promise<ItemFeed[]> {
  // "Seguindo" ignora o raio; sem centro, usa (0,0) — não é lido nesse escopo.
  const origem = centro ?? { lat: 0, lng: 0 };
  const { data, error } = await supabase.rpc('feed_proximo', {
    lat: origem.lat,
    lng: origem.lng,
    raio_m: RAIO_FEED_M,
    limite: PAGINA_FEED,
    escopo,
    ...(antes ? { antes: antes.antes, antes_id: antes.antesId } : {}),
  });
  if (error) throw error;
  return (data ?? []).map(normalizarItemFeed);
}

export function useFeed(escopo: EscopoFeed, centro: Centro | null) {
  const queryClient = useQueryClient();

  // "Seguindo" funciona sem centro; "Perto"/"Pedidos" precisam do raio.
  const habilitado = escopo === 'seguindo' || centro != null;

  const query = useInfiniteQuery({
    queryKey: chaveFeed(escopo, centro),
    queryFn: ({ pageParam }) => buscarPagina(escopo, centro, pageParam),
    initialPageParam: null as Cursor,
    // Próxima página começa antes do item mais antigo desta; página incompleta
    // significa fim da lista.
    getNextPageParam: (ultimaPagina): Cursor | undefined => {
      if (ultimaPagina.length < PAGINA_FEED) return undefined;
      const ultimo = ultimaPagina[ultimaPagina.length - 1];
      return ultimo
        ? { antes: ultimo.criadoEm, antesId: ultimo.id }
        : undefined;
    },
    enabled: habilitado,
  });

  // Realtime: um pedido de ajuda novo invalida o feed para reaparecer no topo.
  // Só pedidos_ajuda entram em realtime (§6.8 / §2).
  useEffect(() => {
    const canal = supabase
      .channel('comunidade:pedidos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos_ajuda' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [queryClient]);

  const itens = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  return { ...query, itens };
}
