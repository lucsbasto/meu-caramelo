// Mutations/queries de mantenedores (§7.4 / §6.6): convidar co-mantenedor,
// remover co, sair (co ou principal com promoção/órfão) e aceitar convite.
// Os tipos gerados em database.types.ts ainda não conhecem `convites_mantenedor`
// nem as RPCs novas (regen contra o hosted é follow-up), então casteamos na
// fronteira do supabase — igual às notas dos WPs anteriores.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/session';
import type { Mantenedor } from './dados';
import type { ResultadoSaida } from './convites';
import {
  buscarMantenedores,
  chaveMantenedores,
  chavePonto,
} from './usePontoDetalhe';

// Cast único no ponto de fronteira: libera .rpc()/.from() das tabelas e funções
// que os tipos gerados ainda não enxergam.
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => any;
};

// Lista de mantenedores para a tela dedicada — reusa a mesma query/chave do
// detalhe, então as duas telas compartilham cache e invalidação.
export function useMantenedores(pontoId: string) {
  return useQuery<Mantenedor[]>({
    queryKey: chaveMantenedores(pontoId),
    queryFn: () => buscarMantenedores(pontoId),
  });
}

// Cria um convite e devolve o token. O link/Share é montado no chamador
// (linkConvite). Não mexe em mantenedores, então não invalida nada.
export function useCriarConvite(pontoId: string) {
  const { user } = useAuth();

  return useMutation<string, Error>({
    mutationFn: async () => {
      const userId = user?.id;
      if (!userId) throw new Error('auth_required');
      const { data, error } = await db
        .from('convites_mantenedor')
        .insert({ ponto_id: pontoId, criado_por: userId })
        .select('token')
        .single();
      if (error) throw error;
      return (data as { token: string }).token;
    },
  });
}

// Principal remove um co-mantenedor (RLS autoriza). Recarrega a lista e o ponto.
export function useRemoverCoMantenedor(pontoId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (coUserId: string) => {
      const { error } = await db
        .from('ponto_mantenedores')
        .delete()
        .eq('ponto_id', pontoId)
        .eq('user_id', coUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chaveMantenedores(pontoId) });
      queryClient.invalidateQueries({ queryKey: chavePonto(pontoId) });
    },
  });
}

// Saída de mantenedor via RPC: co sai; principal promove o co mais antigo ou
// deixa o ponto órfão. Devolve o texto do resultado para a tela avisar certo.
export function useSairMantenedor(pontoId: string) {
  const queryClient = useQueryClient();

  return useMutation<ResultadoSaida, Error>({
    mutationFn: async () => {
      const { data, error } = await db.rpc('sair_mantenedor', {
        p_ponto: pontoId,
      });
      if (error) throw error;
      return data as ResultadoSaida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chaveMantenedores(pontoId) });
      queryClient.invalidateQueries({ queryKey: chavePonto(pontoId) });
    },
  });
}

// Aceite de convite via RPC: valida o token e vira co-mantenedor. Devolve o
// ponto_id para redirecionar. Erros amigáveis via convites.ts no chamador.
export function useAceitarConvite() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (token: string) => {
      const { data, error } = await db.rpc('aceitar_convite', {
        p_token: token,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (pontoId) => {
      // Recarrega o ponto recém co-mantido: sem isto, o staleTime de 30 s pode
      // mostrar o detalhe sem o novo co por até meio minuto.
      queryClient.invalidateQueries({ queryKey: chaveMantenedores(pontoId) });
      queryClient.invalidateQueries({ queryKey: chavePonto(pontoId) });
    },
  });
}
