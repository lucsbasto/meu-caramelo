import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listFeedingPoints } from '../services/feedingPoints';
import { FeedingPoint } from '../types';

export function useFeedingPoints() {
  const [points, setPoints] = useState<FeedingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listFeedingPoints();
      setPoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pontos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('feeding-points-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feeding_points' },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return {
    points,
    isLoading,
    error,
    refresh
  };
}
