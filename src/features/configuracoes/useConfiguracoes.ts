import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query';
import { signOut } from '@/features/auth/signOut';
import { nomeAutor } from '@/features/auth/abbreviate';
import {
  type Preferencias,
  type PreferenciasRow,
  preferenciasDeRow,
  rowDePreferencias,
} from './configuracoes';

// A tabela `preferencias` e a RPC `apagar_minha_conta` ainda não constam nos
// tipos gerados (database.types); casamos no limite, como já se faz para tabelas
// novas em useMantenedores (§ workaround conhecido do projeto).
const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

// ── Preferências de notificação + raio (§6.13) ──────────────────────────────

async function fetchPreferencias(userId: string): Promise<Preferencias> {
  const { data, error } = await db
    .from('preferencias')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return preferenciasDeRow(data as PreferenciasRow | null);
}

export function usePreferencias(userId: string) {
  return useQuery({
    queryKey: ['preferencias', userId],
    queryFn: () => fetchPreferencias(userId),
  });
}

export function useSalvarPreferencias(userId: string) {
  return useMutation({
    mutationFn: async (prefs: Preferencias) => {
      const { error } = await db
        .from('preferencias')
        .upsert(rowDePreferencias(userId, prefs), { onConflict: 'user_id' });
      if (error) throw error;
    },
    // Grava o estado inteiro; mantém o cache coerente de imediato. Cancela um
    // refetch em voo e guarda o valor anterior para reverter se o upsert falhar.
    onMutate: async (prefs: Preferencias) => {
      await queryClient.cancelQueries({ queryKey: ['preferencias', userId] });
      const anterior = queryClient.getQueryData<Preferencias>(['preferencias', userId]);
      queryClient.setQueryData(['preferencias', userId], prefs);
      return { anterior };
    },
    onError: (_err, _prefs, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(['preferencias', userId], ctx.anterior);
      queryClient.invalidateQueries({ queryKey: ['preferencias', userId] });
    },
  });
}

// ── Bloqueados (§6.13, usa a tabela bloqueios) ──────────────────────────────

export type Bloqueado = {
  id: string;
  nome: string; // já exibível
  avatarUrl: string | null;
};

type BloqueioRow = {
  bloqueado_id: string;
  bloqueados: { nome: string | null; avatar_url: string | null } | null;
};

async function fetchBloqueados(userId: string): Promise<Bloqueado[]> {
  // Embed desambiguado pela FK bloqueado_id (bloqueios referencia profiles duas
  // vezes: user_id e bloqueado_id).
  const { data, error } = await db
    .from('bloqueios')
    .select('bloqueado_id, bloqueados:profiles!bloqueios_bloqueado_id_fkey(nome, avatar_url)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data as BloqueioRow[]).map((row) => ({
    id: row.bloqueado_id,
    nome: nomeAutor(row.bloqueados?.nome),
    avatarUrl: row.bloqueados?.avatar_url ?? null,
  }));
}

export function useBloqueados(userId: string) {
  return useQuery({
    queryKey: ['bloqueados', userId],
    queryFn: () => fetchBloqueados(userId),
  });
}

export function useDesbloquear(userId: string) {
  return useMutation({
    mutationFn: async (bloqueadoId: string) => {
      const { error } = await db
        .from('bloqueios')
        .delete()
        .eq('user_id', userId)
        .eq('bloqueado_id', bloqueadoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloqueados', userId] });
    },
  });
}

// ── Apagar conta (§6.13) ────────────────────────────────────────────────────
// Anonimiza o histórico (autoria vira nula -> "Voluntário removido") e remove o
// perfil pela RPC; depois encerra a sessão neste aparelho.
export function useApagarConta() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc('apagar_minha_conta');
      if (error) throw error;
      await signOut();
      queryClient.clear();
    },
  });
}
