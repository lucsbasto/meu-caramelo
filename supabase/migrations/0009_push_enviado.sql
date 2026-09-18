-- WP14 (§7.5) — marca de envio do push para as linhas de `notificacoes`.
-- A Edge Function `enviar-push` varre as pendentes (push_enviado_em is null),
-- aplica o teto diário e o silêncio noturno, dispara pela Expo Push API e grava
-- o horário de envio para não reenviar.

alter table notificacoes
  add column if not exists push_enviado_em timestamptz;

-- Índice parcial: a varredura de pendentes filtra por push_enviado_em is null.
create index if not exists notif_push_pendente_idx
  on notificacoes (criado_em)
  where push_enviado_em is null;
