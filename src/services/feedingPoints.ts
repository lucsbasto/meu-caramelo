import { supabase } from '../lib/supabase';
import { FeedingPoint } from '../types';

const TABLE = 'feeding_points';

export async function listFeedingPoints(): Promise<FeedingPoint[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
