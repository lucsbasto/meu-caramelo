// Edge Function `enviar-push` (WP14, §7.5).
//
// Varre as linhas pendentes de `notificacoes` (push_enviado_em is null),
// aplica o teto diário e o silêncio noturno (limites.ts), dispara push pela
// Expo Push API para os device_tokens do usuário e marca as enviadas.
//
// Roda com service role (lê notificacoes/device_tokens de todos os usuários e
// escreve push_enviado_em — a RLS não se aplica). Invoque por cron/agendador
// (ex.: a cada minuto) ou por database webhook no INSERT de `notificacoes`;
// como a varredura é idempotente, o gatilho é indiferente.
//
// Secrets esperados: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injetados pela
// plataforma), PUSH_TZ (default America/Araguaina), EXPO_ACCESS_TOKEN (opcional).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  conteudoPara,
  dataLocal,
  linkPara,
  podeEnviar,
  type Payload,
} from './limites.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const JANELA_MS = 24 * 60 * 60 * 1000; // só empurra push recente, nunca velho
const LOTE = 200;

type NotifPendente = {
  id: string;
  user_id: string;
  tipo: string;
  payload: Payload;
  criado_em: string;
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
  const tz = Deno.env.get('PUSH_TZ') ?? 'America/Araguaina';
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const agora = new Date();
  const hoje = dataLocal(agora, tz);
  const desde = new Date(agora.getTime() - JANELA_MS).toISOString();

  const { data: pendentes, error } = await supabase
    .from('notificacoes')
    .select('id, user_id, tipo, payload, criado_em')
    .is('push_enviado_em', null)
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
      ignorados++;
      // Silêncio noturno: fica pendente e reavaliamos numa varredura seguinte
      // (o dia local abre antes de a janela de 24h expirar). Teto diário: pode
      // envelhecer além da janela e nunca ser enviado — de propósito, para não
      // entregar push velho no dia seguinte.
      continue;
    }

    const tokens = await tokensDe(n.user_id);
    if (tokens.length === 0) {
      ignorados++;
      continue;
    }

    // Claim atômico ANTES do envio: marca push_enviado_em só se ainda estiver
    // null. Se outra execução (cron + webhook, ou ticks sobrepostos) já pegou a
    // linha, o update não afeta nada e pulamos — evita push duplicado.
    const marcadoEm = new Date().toISOString();
    const { data: claim } = await supabase
      .from('notificacoes')
      .update({ push_enviado_em: marcadoEm })
      .eq('id', n.id)
      .is('push_enviado_em', null)
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
      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(mensagens),
      });
      const corpoResp = await resp.json().catch(() => null);

      // Best-effort: remove tokens mortos que a Expo já sinalize no ticket de
      // envio (DeviceNotRegistered). A confirmação definitiva vem no recibo
      // assíncrono (getPushNotificationReceiptsAsync) — polling de recibo fica
      // para follow-up; enquanto isso, um token morto some quando o envio
      // seguinte falhar todos os tickets e a linha for devolvida à fila.
      const tickets = Array.isArray(corpoResp?.data) ? corpoResp.data : [];
      for (let i = 0; i < tickets.length; i++) {
        const err = tickets[i]?.details?.error;
        if (err === 'DeviceNotRegistered' && tokens[i]) {
          await supabase.from('device_tokens').delete().eq('token', tokens[i]);
        }
      }

      // Sucesso = HTTP ok e ao menos um ticket aceito. Caso contrário devolve a
      // linha à fila (unclaim) para reprocessar; a janela de 24h limita o retry.
      const algumOk =
        tickets.length === 0
          ? resp.ok
          : tickets.some((t: { status?: string }) => t?.status === 'ok');

      if (resp.ok && algumOk) {
        enviadasHoje.set(n.user_id, jaHoje + 1);
        enviados++;
      } else {
        await supabase
          .from('notificacoes')
          .update({ push_enviado_em: null })
          .eq('id', n.id);
        ignorados++;
      }
    } catch (e) {
      console.error('[enviar-push] falha ao enviar', n.id, e);
      // Erro de rede: devolve a linha à fila.
      await supabase
        .from('notificacoes')
        .update({ push_enviado_em: null })
        .eq('id', n.id);
      ignorados++;
    }
  }

  return json({ pendentes: pendentes?.length ?? 0, enviados, ignorados });
});
