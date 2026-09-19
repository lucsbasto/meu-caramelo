// Edge Function `enviar-push` (WP14, §7.5).
//
// Varre as linhas pendentes de `notificacoes` (push_status = 'pending'),
// aplica o teto diário e o silêncio noturno (limites.ts), dispara push pela
// Expo Push API para os device_tokens do usuário e marca o estado terminal:
// 'sent' no sucesso, 'failed' (com `push_erro` e `push_tentativas`) na falha,
// 'skipped' quando o silêncio ou o teto barram a linha (terminal, nunca reenvia
// — sem enxurrada às 07h). Cada request à Expo leva no máximo 100 mensagens.
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
  dataLocal,
  emPedacos,
  linkPara,
  podeEnviar,
  PUSH_TZ_PADRAO,
  type Payload,
} from './limites.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const JANELA_MS = 24 * 60 * 60 * 1000; // só empurra push recente, nunca velho
const LOTE = 100; // linhas varridas por execução (≤100, alinhado ao limite da Expo)

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
  let descartados = 0;
  let falhas = 0;

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
      // Silêncio (sem a exceção pedido_ajuda de hoje) ou teto diário → estado
      // terminal 'skipped'. Nunca fica 'pending', então não há reenvio nem a
      // enxurrada das 07h (WP14 R2, mapa #38 / T5 #43). O update condicional a
      // 'pending' evita corrida com outra execução que já tenha pego a linha.
      const { data: descarte } = await supabase
        .from('notificacoes')
        .update({ push_status: 'skipped', push_erro: decisao.motivo })
        .eq('id', n.id)
        .eq('push_status', 'pending')
        .select('id');
      // Só conta se ESTE run transicionou a linha; sob concorrência (cron +
      // webhook) o update pode acertar 0 linhas — aí a outra execução já cuidou.
      if (descarte && descarte.length > 0) descartados++;
      else ignorados++;
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
    const link = linkPara(n.tipo, n.payload ?? {});
    const mensagens = tokens.map((to) => ({
      to,
      title: titulo,
      body: corpo,
      sound: 'default',
      channelId: 'default',
      data: link ? { link } : {},
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

    try {
      // A Expo aceita no máximo 100 mensagens por request (T1 #39). Quando o
      // usuário tem mais de 100 tokens, fatiamos e enviamos em pedaços ≤100,
      // agregando o resultado. `offset` mapeia o índice do ticket de volta ao
      // token global para poder remover DeviceNotRegistered no lugar certo.
      let respOkTodos = true;
      let houveTickets = false;
      let algumTicketOk = false;
      let msgErro: string | null = null;
      let offset = 0;

      for (const pedaco of emPedacos(mensagens)) {
        const resp = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(pedaco),
        });
        const corpoResp = await resp.json().catch(() => null);

        // Best-effort: remove tokens mortos que a Expo já sinalize no ticket de
        // envio (DeviceNotRegistered). A confirmação definitiva vem no recibo
        // assíncrono (getPushNotificationReceiptsAsync) — polling de recibo fica
        // para follow-up.
        const tickets = Array.isArray(corpoResp?.data) ? corpoResp.data : [];
        for (let i = 0; i < tickets.length; i++) {
          const err = tickets[i]?.details?.error;
          const token = tokens[offset + i];
          if (err === 'DeviceNotRegistered' && token) {
            await supabase.from('device_tokens').delete().eq('token', token);
          }
        }

        if (!resp.ok) respOkTodos = false;
        if (tickets.length > 0) {
          houveTickets = true;
          if (tickets.some((t: { status?: string }) => t?.status === 'ok')) {
            algumTicketOk = true;
          }
        }
        if ((!resp.ok || tickets.length === 0) && msgErro === null) {
          msgErro =
            corpoResp?.errors?.[0]?.message ??
            corpoResp?.message ??
            `HTTP ${resp.status}`;
        }

        offset += pedaco.length;
      }

      // Sucesso = todos os requests HTTP ok e ao menos um ticket aceito (ou,
      // sem tickets, apenas o HTTP ok). Caso contrário marca 'failed' com a
      // trilha de erro (estado terminal, sem retry silencioso).
      const algumOk = houveTickets ? algumTicketOk : respOkTodos;

      if (respOkTodos && algumOk) {
        enviadasHoje.set(n.user_id, jaHoje + 1);
        enviados++;
      } else {
        const msg = msgErro ?? 'falha no envio';
        await supabase
          .from('notificacoes')
          .update({ push_status: 'failed', push_erro: String(msg).slice(0, 500) })
          .eq('id', n.id);
        falhas++;
      }
    } catch (e) {
      console.error('[enviar-push] falha ao enviar', n.id, e);
      // Erro de rede: falha terminal com a mensagem do erro.
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from('notificacoes')
        .update({ push_status: 'failed', push_erro: msg.slice(0, 500) })
        .eq('id', n.id);
      falhas++;
    }
  }

  return json({
    pendentes: pendentes?.length ?? 0,
    enviados,
    descartados,
    falhas,
    ignorados,
  });
});
