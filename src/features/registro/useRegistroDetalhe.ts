// Queries + mutações do detalhe do registro (§6.10) + realtime: INSERT/DELETE
// em `comentarios`/`reacoes` filtrado por registro_id invalida o que depende.

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
// Reusa a classe do ponto (§6.10 / #19): uma só classe evita que `instanceof`
// falhe entre módulos. Re-exportada para a tela importar de um lugar só.
import { RegistroNaoRemovidoError } from '@/features/ponto/usePontoDetalhe';
import type { TablesInsert } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import {
  type Comentario,
  type ComentarioRow,
  type EstadoReacao,
  normalizarComentario,
  normalizarRegistroDetalhe,
  type RegistroDetalhe,
  type RegistroDetalheRow,
} from './dados';

export function chaveRegistro(id: string) {
  return ['registro', id] as const;
}
export function chaveComentarios(id: string) {
  return ['registro', id, 'comentarios'] as const;
}
export function chaveReacoes(id: string, userId: string | null) {
  return ['registro', id, 'reacoes', userId] as const;
}

// `null` = registro não existe (removido, §6.10 Estados). `maybeSingle` não
// lança quando não há linha, então o estado vazio é um dado, não um erro.
async function buscarRegistro(id: string): Promise<RegistroDetalhe | null> {
  const { data, error } = await supabase
    .from('registros')
    .select(
      'id, ponto_id, user_id, criado_em, caes, gatos, quantidade_kg, observacao, foto_url, tipos, profiles(nome, avatar_url), pontos(nome)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizarRegistroDetalhe(data as RegistroDetalheRow) : null;
}

async function buscarComentarios(id: string): Promise<Comentario[]> {
  const { data, error } = await supabase
    .from('comentarios')
    .select(
      'id, registro_id, autor_id, texto, criado_em, profiles(nome, avatar_url)',
    )
    .eq('registro_id', id)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => normalizarComentario(r as ComentarioRow));
}

// Sem coluna de contagem em `reacoes` — o volume do piloto é pequeno (mesma
// instrução das estatísticas do ponto), então conta no cliente e deriva se o
// usuário atual reagiu na mesma leitura.
async function buscarReacoes(
  id: string,
  userId: string | null,
): Promise<EstadoReacao> {
  const { data, error } = await supabase
    .from('reacoes')
    .select('user_id')
    .eq('registro_id', id);
  if (error) throw error;
  const linhas = data ?? [];
  return {
    count: linhas.length,
    euReagi: userId != null && linhas.some((r) => r.user_id === userId),
  };
}

export function useRegistroDetalhe(id: string, userId: string | null) {
  const queryClient = useQueryClient();

  const registro = useQuery({
    queryKey: chaveRegistro(id),
    queryFn: () => buscarRegistro(id),
  });
  const comentarios = useQuery({
    queryKey: chaveComentarios(id),
    queryFn: () => buscarComentarios(id),
  });
  const reacoes = useQuery({
    queryKey: chaveReacoes(id, userId),
    queryFn: () => buscarReacoes(id, userId),
  });

  useEffect(() => {
    function invalidarComentarios() {
      queryClient.invalidateQueries({ queryKey: chaveComentarios(id) });
    }
    function invalidarReacoes() {
      queryClient.invalidateQueries({ queryKey: ['registro', id, 'reacoes'] });
    }
    function invalidarRegistro() {
      queryClient.invalidateQueries({ queryKey: chaveRegistro(id) });
    }

    const canal = supabase
      .channel(`registro:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
          filter: `registro_id=eq.${id}`,
        },
        invalidarComentarios,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reacoes',
          filter: `registro_id=eq.${id}`,
        },
        invalidarReacoes,
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'registros',
          filter: `id=eq.${id}`,
        },
        invalidarRegistro,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [id, queryClient]);

  return { registro, comentarios, reacoes };
}

// Toggle do coração (§6.10) — primeiro padrão OTIMISTA do app: pinta o coração
// e move a contagem na hora, com rollback se o servidor recusar. A RLS é a
// autoridade (insert/delete só da própria linha); a UI só antecipa o resultado.
export function useReagir(id: string, userId: string | null) {
  const queryClient = useQueryClient();
  const chave = chaveReacoes(id, userId);

  return useMutation({
    mutationFn: async (querReagir: boolean) => {
      if (!userId) throw new Error('Sem usuário autenticado.');
      if (querReagir) {
        const { error } = await supabase
          .from('reacoes')
          .insert({ registro_id: id, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reacoes')
          .delete()
          .eq('registro_id', id)
          .eq('user_id', userId);
        if (error) throw error;
      }
    },
    onMutate: async (querReagir) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const anterior = queryClient.getQueryData<EstadoReacao>(chave);
      const base = anterior ?? { count: 0, euReagi: false };
      // Não conta duas vezes: só mexe se o estado muda de fato.
      if (base.euReagi !== querReagir) {
        queryClient.setQueryData<EstadoReacao>(chave, {
          euReagi: querReagir,
          count: Math.max(0, base.count + (querReagir ? 1 : -1)),
        });
      }
      return { anterior };
    },
    onError: (_erro, _querReagir, contexto) => {
      // Recusa/rede: restaura o valor de antes do toque.
      if (contexto?.anterior !== undefined) {
        queryClient.setQueryData(chave, contexto.anterior);
      }
    },
    onSettled: () => {
      // Ressincroniza com a verdade do servidor (cobre corrida com outro device).
      queryClient.invalidateQueries({ queryKey: chave });
    },
  });
}

export function useComentar(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      texto,
    }: {
      userId: string;
      texto: string;
    }) => {
      const row: TablesInsert<'comentarios'> = {
        registro_id: id,
        autor_id: userId,
        texto: texto.trim(),
      };
      const { error } = await supabase.from('comentarios').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chaveComentarios(id) });
    },
  });
}

// Re-exporta para a tela importar erro e hooks do mesmo módulo.
export { RegistroNaoRemovidoError };

// Mesma semântica do remover-registro do ponto (§6.10 / #19): a RLS é a
// autoridade, e um delete que casa 0 linhas (já removido, ou permissão vencida)
// não é erro do Postgres — detectamos e sinalizamos para a tela mostrar o vazio.
// A diferença aqui é a invalidação: marcamos a chave do registro como removido.
function marcarRemovido(queryClient: QueryClient, id: string) {
  // O registro deixou de existir: o estado vazio (§6.10) vem de data === null.
  queryClient.setQueryData(chaveRegistro(id), null);
}

export function useRemoverRegistro(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('registros')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new RegistroNaoRemovidoError();
    },
    onSuccess: () => marcarRemovido(queryClient, id),
    onError: (erro) => {
      // Removido por outro / negado: a linha já não existe → mostra o vazio.
      if (erro instanceof RegistroNaoRemovidoError) {
        marcarRemovido(queryClient, id);
      }
    },
  });
}

// Denúncia (§6.10 — menu de três pontos). Insert autenticado; select é bloqueado
// pela RLS (só service role vê). Sem `motivo` estruturado neste WP.
export function useDenunciar(id: string) {
  return useMutation({
    mutationFn: async (userId: string) => {
      const row: TablesInsert<'denuncias'> = {
        alvo_tipo: 'registro',
        alvo_id: id,
        autor_id: userId,
      };
      const { error } = await supabase.from('denuncias').insert(row);
      if (error) throw error;
    },
  });
}
