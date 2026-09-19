// Moderação (§7.7): denunciar (com motivo opcional) e bloquear autor. Os hooks
// vivem aqui porque feed, detalhe do registro e detalhe do ponto oferecem as
// mesmas ações — um só lugar evita três cópias divergentes. Denúncia é insert
// autenticado (RLS: só service role lê); o gatilho 0010 auto-oculta ao 3º
// denunciante distinto. Bloquear insere em `bloqueios` e o feed_proximo já
// filtra os bloqueados no servidor, então basta invalidar a chave do feed.
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/lib/database.types';

export type AlvoDenuncia = 'registro' | 'comentario' | 'ponto';

// Motivos canônicos (§7.7 — "com motivo opcional"). "Outro" e o cancelar viram
// motivo `null`: a denúncia vale mesmo sem categoria, sem abrir campo de texto.
const MOTIVOS = ['Spam', 'Conteúdo impróprio', 'Informação falsa', 'Outro'] as const;

// Action sheet de motivos: escolher um motivo confirma a denúncia (chama
// `onEscolher`); "Cancelar" aborta sem chamar. "Outro" segue sem motivo (null).
export function perguntarMotivoDenuncia(onEscolher: (motivo: string | null) => void) {
  const opcoes: {
    text: string;
    style?: 'cancel' | 'destructive';
    onPress?: () => void;
  }[] = MOTIVOS.map((m) => ({
    text: m,
    onPress: () => onEscolher(m === 'Outro' ? null : m),
  }));
  opcoes.push({ text: 'Cancelar', style: 'cancel' });
  Alert.alert('Por que você está denunciando?', undefined, opcoes);
}

// Denúncia genérica: o alvo (registro/comentário/ponto) e o id vêm de quem
// chama. `motivo` é opcional e nulável (§7.7). Insert autenticado; a RLS
// bloqueia o select (só service role vê as denúncias). Denunciar de novo o mesmo
// alvo não é erro — a unique (autor_id, alvo_tipo, alvo_id) do 0010 dispara 23505
// e é ignorada de propósito (uma denúncia por pessoa/alvo; a segunda é no-op).
export function useDenunciar() {
  return useMutation({
    mutationFn: async ({
      alvoTipo,
      alvoId,
      userId,
      motivo,
    }: {
      alvoTipo: AlvoDenuncia;
      alvoId: string;
      userId: string;
      motivo?: string | null;
    }) => {
      const row: TablesInsert<'denuncias'> = {
        alvo_tipo: alvoTipo,
        alvo_id: alvoId,
        autor_id: userId,
        ...(motivo ? { motivo } : {}),
      };
      const { error } = await supabase.from('denuncias').insert(row);
      if (error && error.code !== '23505') throw error;
    },
  });
}

// Bloquear um autor: some com o conteúdo dele do feed (o feed_proximo já filtra
// bloqueados no servidor, §6.8). Bloquear de novo quem já está bloqueado não é
// erro — a violação de PK (23505) é ignorada de propósito.
export function useBloquear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      bloqueadoId,
    }: {
      userId: string;
      bloqueadoId: string;
    }) => {
      const row: TablesInsert<'bloqueios'> = {
        user_id: userId,
        bloqueado_id: bloqueadoId,
      };
      const { error } = await supabase.from('bloqueios').insert(row);
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => {
      // O autor bloqueado precisa sumir do feed já filtrado no servidor.
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
