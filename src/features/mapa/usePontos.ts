import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { normalizarPonto, type Ponto } from './pontos';

const RAIO_M = 3000;

export type Centro = { lat: number; lng: number };

function chave(centro: Centro) {
  // arredonda a chave para não refazer a query a cada micro-movimento do GPS
  const r = (n: number) => n.toFixed(3);
  return ['pontos', r(centro.lat), r(centro.lng)] as const;
}

async function buscarPontos(centro: Centro): Promise<Ponto[]> {
  const { data, error } = await supabase.rpc('pontos_proximos', {
    lat: centro.lat,
    lng: centro.lng,
    raio_m: RAIO_M,
  });
  if (error) throw error;
  return (data ?? [])
    .map(normalizarPonto)
    .filter((p): p is Ponto => p !== null);
}

/**
 * Pontos próximos + subscription realtime: cada INSERT em `registros`
 * invalida a query, então a cor do pin acompanha a última alimentação (§6.3).
 */
export function usePontos(centro: Centro | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: centro ? chave(centro) : ['pontos', 'sem-centro'],
    queryFn: () => buscarPontos(centro as Centro),
    enabled: centro != null,
  });

  useEffect(() => {
    const canal = supabase
      .channel('mapa:registros')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registros' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pontos'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [queryClient]);

  return query;
}
