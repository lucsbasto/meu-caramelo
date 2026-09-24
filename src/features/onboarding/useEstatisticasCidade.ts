// Busca os três números do onboarding (§6.1). Endpoint público agregado, SEM
// autenticação e SEM depender de permissão de localização — os números são prova
// social e precisam aparecer já na primeira abertura, antes de qualquer prompt.
// No piloto (uma cidade só, Fase 6) o agregado global já é "a cidade", então a
// chamada vai direto; `p_cidade` fica reservado para o recorte multi-cidade
// futuro (ver a migration 0008). Em QUALQUER falha — sem rede, resposta inválida
// ou os três zerados — o hook devolve `null` e o bloco some (nunca zero, nunca
// esqueleto — §6.1 Dados/Por quê).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  type EstatisticasCidade,
  normalizarEstatisticas,
} from './estatisticas';

// Cast no ponto de fronteira: libera `.rpc()` de uma função que os tipos
// gerados ainda não enxergam (mesmo padrão de useMantenedores).
const db = supabase as unknown as {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

async function buscarEstatisticas(): Promise<EstatisticasCidade | null> {
  const { data, error } = await db.rpc('estatisticas_cidade', {
    p_cidade: null,
  });
  if (error) return null;

  return normalizarEstatisticas(data);
}

export function useEstatisticasCidade() {
  const query = useQuery<EstatisticasCidade | null>({
    queryKey: ['estatisticas-cidade'],
    queryFn: buscarEstatisticas,
    // O bloco é enfeite de prova social: uma falha nunca deve travar nem
    // reprocessar em loop. Sem retry, cache generoso.
    retry: false,
    staleTime: 5 * 60_000,
  });

  // Enquanto carrega ou em erro, `estatisticas` é null → o bloco não aparece.
  return { estatisticas: query.data ?? null, carregando: query.isLoading };
}
