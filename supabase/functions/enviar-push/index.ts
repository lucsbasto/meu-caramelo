// Edge Function `enviar-push` (WP14, §7.5).
//
// Varre as linhas pendentes de `notificacoes` (push_status = 'pending'),
// aplica o teto diário e o silêncio noturno (limites.ts), dispara push pela
// Expo Push API para os device_tokens do usuário e marca o estado terminal:
// 'sent' no sucesso, 'failed' (com `push_erro` e `push_tentativas`) na falha.
//
// Roda com service role (lê notificacoes/device_tokens de todos os usuários e
// escreve push_status/push_enviado_em — a RLS não se aplica). Invoque por
// cron/agendador (ex.: a cada minuto) ou por database webhook no INSERT de
// `notificacoes`; como a varredura é idempotente, o gatilho é indiferente.
//
// Secrets esperados: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injetados pela
// plataforma), PUSH_TZ (default America/Sao_Paulo), EXPO_ACCESS_TOKEN (opcional).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  conteudoPara,
  dadosDeRota,
  dataLocal,
  dividirEmLotes,
  LOTE_EXPO_MAX,
  podeEnviar,
  PUSH_TZ_PADRAO,
  type Payload,
} from './limites.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const JANELA_MS = 24 * 60 * 60 * 1000; // só empurra push recente, nunca velho
// Linhas de `notificacoes` varridas por invocação (throughput por tick do cron).
// NÃO é o teto de 100 mensagens/request da Expo — esse é aplicado por linha via
// dividirEmLotes(LOTE_EXPO_MAX), então uma linha com >100 tokens é fatiada.
const LOTE = 200;

type NotifPendente = {
  id: string;
  user_id: string;
  tipo: string;
  payload: Payload;
  criado_em: string;
  push_tentativas: number;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return json({ erro: 'faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }
  const tz = Deno.env.get('PUSH_TZ') ?? PUSH_TZ_PADRAO;
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const agora = new Date();
  const hoje = dataLocal(agora, tz);
  const desde = new Date(agora.getTime() - JANELA_MS).toISOString();

  const { data: pendentes, error } = await supabase
    .from('notificacoes')
    .select('id, user_id, tipo, payload, criado_em, push_tentativas')
    .eq('push_status', 'pending')
    .gte('criado_em', desde)
    .order('criado_em', { ascending: true })
    .limit(LOTE);

  if (error) return json({ erro: error.message }, 500);

  const enviadasHoje = new Map<string, number>();
  const tokensPorUsuario = new Map<string, string[]>();

  // Conta os push já enviados HOJE (fuso local) para o usuário. Janela de 36h
  // no filtro cobre a borda do fuso; o dia exato é decidido por dataLocal.
  async function contarHoje(userId: string): Promise<number> {
    const cache = enviadasHoje.get(userId);
    if (cache !== undefined) return cache;
    const { data } = await supabase
      .from('notificacoes')
      .select('push_enviado_em')
      .eq('user_id', userId)
      .eq('push_status', 'sent')
      .gte('push_enviado_em', new Date(agora.getTime() - 36 * 3600 * 1000).toISOString());
    const n = (data ?? []).filter(
      (r) =>
        typeof r.push_enviado_em === 'string' &&
        dataLocal(new Date(r.push_enviado_em), tz) === hoje
    ).length;
    enviadasHoje.set(userId, n);
    return n;
  }

  async function tokensDe(userId: string): Promise<string[]> {
    const cache = tokensPorUsuario.get(userId);
    if (cache !== undefined) return cache;
    const { data } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', userId);
    const tokens = (data ?? []).map((r) => r.token as string);
    tokensPorUsuario.set(userId, tokens);
    return tokens;
  }

  let enviados = 0;
  let ignorados = 0;

  for (const n of (pendentes ?? []) as NotifPendente[]) {
    const jaHoje = await contarHoje(n.user_id);
    const decisao = podeEnviar({
      agora,
      tz,
      tipo: n.tipo,
      payload: n.payload ?? {},
      enviadasHoje: jaHoje,
    });
    if (!decisao.enviar) {
      // §7.5 (T5 #43): silêncio noturno (sem a exceção pedido_ajuda/hoje) e teto
      // diário são DESCARTE terminal — marca 'skipped', nunca deixa 'pending'.
      // Deixar pendente reavaliaria a linha e despejaria em massa às 07h (fim do
      // silêncio) ou reteria backlog; o mapa travou descartar, não adiar. Claim
      // atômico (só se ainda 'pending') evita corrida com ticks sobrepostos.
      await supabase
        .from('notificacoes')
        .update({ push_status: 'skipped', push_erro: decisao.motivo })
        .eq('id', n.id)
        .eq('push_status', 'pending');
      ignorados++;
      continue;
    }

    const tokens = await tokensDe(n.user_id);
    if (tokens.length === 0) {
      ignorados++;
      continue;
    }

    // Claim atômico ANTES do envio: move 'pending' → 'sent' (otimista) só se a
    // linha ainda estiver 'pending', carimba push_enviado_em e incrementa a
    // tentativa. Se outra execução (cron + webhook, ou ticks sobrepostos) já
    // pegou a linha, o update não afeta nada e pulamos — evita push duplicado.
    const marcadoEm = new Date().toISOString();
    const { data: claim } = await supabase
      .from('notificacoes')
      .update({
        push_status: 'sent',
        push_enviado_em: marcadoEm,
        push_tentativas: (n.push_tentativas ?? 0) + 1,
      })
      .eq('id', n.id)
      .eq('push_status', 'pending')
      .select('id');
    if (!claim || claim.length === 0) {
      ignorados++;
      continue;
    }

    const { titulo, corpo } = conteudoPara(n.tipo, n.payload ?? {});
    // Contrato T6 (#44): envia `{ tipo, ...ids }` cru; a rota §4.5 é resolvida no
    // app a partir da tabela canônica (sem link pré-computado aqui).
    const data = dadosDeRota(n.tipo, n.payload ?? {});
    // Par mensagem+token para manter o alinhamento de índice ao fatiar: o prune
    // de DeviceNotRegistered casa tickets[i] com o token que gerou a mensagem.
    const pares = tokens.map((to) => ({
      token: to,
      mensagem: {
        to,
        title: titulo,
        body: corpo,
        sound: 'default',
        channelId: 'default',
        data,
      },
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

    // A Expo aceita no máximo 100 mensagens por request; envia em lotes de até
    // LOTE_EXPO_MAX. Sucesso da linha = ao menos um ticket aceito em qualquer
    // lote; se nenhum lote emplacar, marca 'failed' terminal com a trilha.
    let algumOk = false;
    let erroTrilha: string | null = null;
    for (const lote of dividirEmLotes(pares, LOTE_EXPO_MAX)) {
      try {
        const resp = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(lote.map((p) => p.mensagem)),
        });
        const corpoResp = await resp.json().catch(() => null);

        // Best-effort: remove tokens mortos que a Expo sinalize no ticket de
        // envio (DeviceNotRegistered). A confirmação definitiva vem no recibo
        // assíncrono (getPushNotificationReceiptsAsync) — fica para follow-up.
        const tickets = Array.isArray(corpoResp?.data) ? corpoResp.data : [];
        for (let i = 0; i < tickets.length; i++) {
          const err = tickets[i]?.details?.error;
          if (err === 'DeviceNotRegistered' && lote[i]) {
            await supabase
              .from('device_tokens')
              .delete()
              .eq('token', lote[i].token);
          }
        }

        const loteOk =
          tickets.length === 0
            ? resp.ok
            : tickets.some((t: { status?: string }) => t?.status === 'ok');
        if (resp.ok && loteOk) {
          algumOk = true;
        } else {
          erroTrilha =
            corpoResp?.errors?.[0]?.message ??
            corpoResp?.message ??
            `HTTP ${resp.status}`;
        }
      } catch (e) {
        console.error('[enviar-push] falha ao enviar', n.id, e);
        erroTrilha = e instanceof Error ? e.message : String(e);
      }
    }

    if (algumOk) {
      enviadasHoje.set(n.user_id, jaHoje + 1);
      enviados++;
    } else {
      // Nenhum lote emplacou: falha terminal, sem retry silencioso. Zera o
      // push_enviado_em que o claim otimista carimbou — nada foi entregue, então
      // o carimbo não deve sobreviver como se fosse hora de envio.
      await supabase
        .from('notificacoes')
        .update({
          push_status: 'failed',
          push_enviado_em: null,
          push_erro: String(erroTrilha ?? 'sem ticket aceito').slice(0, 500),
        })
        .eq('id', n.id);
      ignorados++;
    }
  }

  return json({ pendentes: pendentes?.length ?? 0, enviados, ignorados });
});
