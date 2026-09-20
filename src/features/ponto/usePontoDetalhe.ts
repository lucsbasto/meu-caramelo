// Queries do detalhe do ponto (§6.4) + realtime: INSERT/DELETE em `registros`
// filtrado por ponto_id invalida as três listas que dependem dele.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/lib/database.types';
import { PAPEL_PRINCIPAL } from './editor';
import {
  normalizarPontoDetalhe,
  type EstatisticasMes,
  type Mantenedor,
  type PontoDetalhe,
  type PontoFoto,
  type RegistroPonto,
} from './dados';

const QTD_REGISTROS_TELA = 3;

export function chavePonto(id: string) {
  return ['ponto', id] as const;
}
export function chaveFotos(id: string) {
  return ['ponto', id, 'fotos'] as const;
}
export function chaveMantenedores(id: string) {
  return ['ponto', id, 'mantenedores'] as const;
}
function chaveRegistros(id: string) {
  return ['ponto', id, 'registros'] as const;
}
function chaveEstatisticas(id: string) {
  return ['ponto', id, 'estatisticas'] as const;
}

async function buscarPonto(id: string): Promise<PontoDetalhe | null> {
  const { data, error } = await supabase
    .from('pontos_com_status')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizarPontoDetalhe(data) : null;
}

// Galeria do ponto (§6.4). A tabela `ponto_fotos` ainda não está nos tipos
// gerados do Supabase — fronteira tipada estreita, mesmo padrão de
// `useSairMantenedor`, para não editar `database.types.ts` na mão.
type FotoRow = { id: string; url: string; ordem: number | null };
const dbFotos = supabase as unknown as {
  from: (t: 'ponto_fotos') => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (
          col: string,
          o: { ascending: boolean }
        ) => {
          order: (
            col: string,
            o: { ascending: boolean }
          ) => Promise<{ data: FotoRow[] | null; error: unknown }>;
        };
      };
    };
  };
};

export async function buscarFotosPonto(id: string): Promise<PontoFoto[]> {
  const { data, error } = await dbFotos
    .from('ponto_fotos')
    .select('id, url, ordem')
    .eq('ponto_id', id)
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    url: f.url,
    ordem: f.ordem ?? 0,
  }));
}

export async function buscarMantenedores(id: string): Promise<Mantenedor[]> {
  const { data, error } = await supabase
    .from('ponto_mantenedores')
    .select('user_id, papel, criado_em, profiles(nome, avatar_url)')
    .eq('ponto_id', id)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    userId: m.user_id,
    papel: m.papel,
    criadoEm: m.criado_em,
    nome: m.profiles?.nome ?? 'Vizinho',
    avatarUrl: m.profiles?.avatar_url ?? null,
  }));
}

async function buscarRegistros(id: string): Promise<RegistroPonto[]> {
  const { data, error } = await supabase
    .from('registros')
    .select(
      'id, user_id, criado_em, caes, gatos, quantidade_kg, observacao, tipos, profiles(nome, avatar_url)'
    )
    .eq('ponto_id', id)
    .order('criado_em', { ascending: false })
    .limit(QTD_REGISTROS_TELA);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    criadoEm: r.criado_em,
    caes: r.caes,
    gatos: r.gatos,
    quantidadeKg: r.quantidade_kg,
    observacao: r.observacao,
    tipos: r.tipos ?? [],
    autorNome: r.profiles?.nome ?? 'Vizinho',
    autorAvatarUrl: r.profiles?.avatar_url ?? null,
  }));
}

// Agregados do mês contados no cliente — volume do piloto é pequeno
// (instrução do WP), então não há RPC dedicada ainda.
async function buscarEstatisticasMes(id: string): Promise<EstatisticasMes> {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('registros')
    .select('user_id')
    .eq('ponto_id', id)
    .gte('criado_em', inicioMes.toISOString());
  if (error) throw error;

  const linhas = data ?? [];
  const voluntarios = new Set(linhas.map((r) => r.user_id)).size;
  return { totalRegistros: linhas.length, voluntarios };
}

export function usePontoDetalhe(id: string | undefined) {
  const queryClient = useQueryClient();

  const ponto = useQuery({
    queryKey: id ? chavePonto(id) : ['ponto', 'sem-id'],
    queryFn: () => buscarPonto(id as string),
    enabled: id != null,
  });
  const fotos = useQuery({
    queryKey: id ? chaveFotos(id) : ['ponto', 'sem-id', 'fotos'],
    queryFn: () => buscarFotosPonto(id as string),
    enabled: id != null,
  });
  const mantenedores = useQuery({
    queryKey: id ? chaveMantenedores(id) : ['ponto', 'sem-id', 'mantenedores'],
    queryFn: () => buscarMantenedores(id as string),
    enabled: id != null,
  });
  const registros = useQuery({
    queryKey: id ? chaveRegistros(id) : ['ponto', 'sem-id', 'registros'],
    queryFn: () => buscarRegistros(id as string),
    enabled: id != null,
  });
  const estatisticas = useQuery({
    queryKey: id ? chaveEstatisticas(id) : ['ponto', 'sem-id', 'estatisticas'],
    queryFn: () => buscarEstatisticasMes(id as string),
    enabled: id != null,
  });

  useEffect(() => {
    if (!id) return;

    function invalidarTudo() {
      queryClient.invalidateQueries({ queryKey: chaveRegistros(id as string) });
      queryClient.invalidateQueries({ queryKey: chaveEstatisticas(id as string) });
      // horas_desde_ultima (status/estatística de tempo) depende do último registro
      queryClient.invalidateQueries({ queryKey: chavePonto(id as string) });
    }

    const canal = supabase
      .channel(`ponto:${id}:registros`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registros',
          filter: `ponto_id=eq.${id}`,
        },
        invalidarTudo
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'registros',
          filter: `ponto_id=eq.${id}`,
        },
        invalidarTudo
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [id, queryClient]);

  return { ponto, fotos, mantenedores, registros, estatisticas };
}

// Sinaliza que o delete não afetou nenhuma linha: o registro já tinha sido
// removido por outra pessoa, ou a permissão do usuário venceu e a RLS recusou
// silenciosamente (delete recusado casa 0 linhas, sem erro). A tela mostra o
// aviso amigável de §6.10 em vez de fingir que removeu.
export class RegistroNaoRemovidoError extends Error {
  constructor() {
    super('Nenhum registro foi removido.');
    this.name = 'RegistroNaoRemovidoError';
  }
}

function invalidarRegistros(queryClient: QueryClient, pontoId: string) {
  queryClient.invalidateQueries({ queryKey: chaveRegistros(pontoId) });
  queryClient.invalidateQueries({ queryKey: chaveEstatisticas(pontoId) });
  // status derivado depende do último registro
  queryClient.invalidateQueries({ queryKey: chavePonto(pontoId) });
}

export function useRemoverRegistro(pontoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registroId: string) => {
      // RLS é a autoridade: a UI só mostra o botão quando o toque é permitido.
      // O .select() devolve as linhas apagadas — um delete que casa 0 linhas
      // (registro já removido, ou RLS negando por permissão vencida) NÃO é erro
      // do Postgres, então precisamos detectar e sinalizar (§6.10 Estados).
      const { data, error } = await supabase
        .from('registros')
        .delete()
        .eq('id', registroId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new RegistroNaoRemovidoError();
    },
    onSuccess: () => invalidarRegistros(queryClient, pontoId),
    onError: (erro) => {
      // Removido por outro / negado: ressincroniza a lista com a verdade do
      // servidor (a linha some se de fato já não existe). Falha real recarrega
      // igual — a lista fica consistente de qualquer forma.
      if (erro instanceof RegistroNaoRemovidoError) {
        invalidarRegistros(queryClient, pontoId);
      }
    },
  });
}

// Name of the partial unique index `um_principal_por_ponto`: when two adoptions
// race for the same point, Postgres rejects the second one with code 23505.
const PRINCIPAL_INDEX = 'um_principal_por_ponto';

// Signals that the adoption lost the race (someone else became principal first).
// It is a distinct error from a real failure so the caller shows a friendly
// message instead of a technical one, reloading the screen in the normal state.
export class ConcurrentAdoptionError extends Error {
  constructor() {
    super('This point was just adopted by someone else.');
    this.name = 'ConcurrentAdoptionError';
  }
}

// Reloads point + maintainers so the screen leaves the orphan state and shows
// the new principal (whether it is you or whoever won the race).
function invalidateAdoption(queryClient: QueryClient, pontoId: string) {
  queryClient.invalidateQueries({ queryKey: chavePonto(pontoId) });
  queryClient.invalidateQueries({ queryKey: chaveMantenedores(pontoId) });
}

// Orphan-point adoption (§6.5): inserts the authenticated user's principal row.
// Uses a plain `.insert()` (not upsert): the race MUST hit the partial unique
// index so we can tell "someone won the race" apart from a network failure.
export function useAdoptPoint(pontoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const row: TablesInsert<'ponto_mantenedores'> = {
        ponto_id: pontoId,
        user_id: userId,
        papel: PAPEL_PRINCIPAL,
      };
      // RLS allows inserting your own principal row (user_id = auth.uid()).
      const { error } = await supabase.from('ponto_mantenedores').insert(row);
      if (error) {
        // Only a violation of the partial unique index means "someone won the
        // race". A bare 23505 (e.g. PK collision because you already have a row
        // on this point) is NOT a race and must not claim another person
        // adopted it — let it flow to the generic reload/error path.
        if (error.message.includes(PRINCIPAL_INDEX)) {
          throw new ConcurrentAdoptionError();
        }
        throw error;
      }
    },
    onSuccess: () => {
      invalidateAdoption(queryClient, pontoId);
    },
    onError: (error) => {
      // Lost race: the winning row already exists — reload to reveal the new
      // maintainer. A real failure flows to the caller to handle as an error.
      if (error instanceof ConcurrentAdoptionError) {
        invalidateAdoption(queryClient, pontoId);
      }
    },
  });
}
