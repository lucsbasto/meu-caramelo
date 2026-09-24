// Seguir/deixar de seguir um ponto (coração do cabeçalho, §6.4).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function chave(pontoId: string, userId: string | null) {
  return ['ponto', pontoId, 'seguindo', userId] as const;
}

async function buscarSeguindo(
  pontoId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('pontos_seguidos')
    .select('ponto_id')
    .eq('ponto_id', pontoId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

export function useSeguir(pontoId: string, userId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: chave(pontoId, userId),
    queryFn: () => buscarSeguindo(pontoId, userId as string),
    enabled: userId != null,
  });

  const mutation = useMutation({
    mutationFn: async (seguir: boolean) => {
      if (!userId) throw new Error('Sem usuário autenticado.');
      if (seguir) {
        const { error } = await supabase
          .from('pontos_seguidos')
          .insert({ ponto_id: pontoId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pontos_seguidos')
          .delete()
          .eq('ponto_id', pontoId)
          .eq('user_id', userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chave(pontoId, userId) });
    },
  });

  return {
    seguindo: query.data ?? false,
    isLoading: query.isLoading,
    isPending: mutation.isPending,
    toggle: () => mutation.mutate(!(query.data ?? false)),
  };
}
