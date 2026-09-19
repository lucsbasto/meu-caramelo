-- WP14 R1 (§7.5, ticket #53) — migra o rastreio de push da coluna única
-- `push_enviado_em` para um estado grosso `push_status`. Expand-contract: a
-- Edge Function `enviar-push` continua funcionando durante toda a migração.
-- `push_enviado_em` permanece como carimbo do horário de envio (preenchido junto
-- com `sent`); esta fatia NÃO o remove.
--
-- Estados: 'pending' (na fila), 'sent' (enviado), 'failed' (falha terminal com
-- trilha de erro), 'skipped' (fora da janela de envio de 24h — decisão do mapa
-- T4 #42: "antigas → skipped").

alter table notificacoes
  add column if not exists push_status text not null default 'pending';

alter table notificacoes
  add column if not exists push_tentativas int not null default 0;

alter table notificacoes
  add column if not exists push_erro text;

-- CHECK restringindo push_status aos 4 estados válidos. Guardado para ser
-- idempotente: as migrações podem ser reexecutadas e o `add constraint` cru
-- erraria com "constraint já existe".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notif_push_status_chk'
  ) then
    alter table notificacoes
      add constraint notif_push_status_chk
      check (push_status in ('pending', 'sent', 'failed', 'skipped'));
  end if;
end $$;

-- Backfill único no apply:
--   enviadas (push_enviado_em not null)            → 'sent'
--   pendentes antigas (null e criado_em < -24h)    → 'skipped' (fora da janela)
--   pendentes recentes (null e criado_em >= -24h)  → ficam no default 'pending'
update notificacoes
  set push_status = 'sent'
  where push_enviado_em is not null
    and push_status = 'pending';

update notificacoes
  set push_status = 'skipped'
  where push_enviado_em is null
    and criado_em < now() - interval '24 hours'
    and push_status = 'pending';

-- Índice parcial da varredura: agora filtra por push_status = 'pending'.
-- Recria substituindo o antigo índice sobre push_enviado_em is null.
drop index if exists notif_push_pendente_idx;
create index if not exists notif_push_pendente_idx
  on notificacoes (criado_em)
  where push_status = 'pending';
