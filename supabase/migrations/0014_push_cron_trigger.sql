-- WP14 R4 (§7.5, ticket #56) — versiona o gatilho da Edge Function `enviar-push`.
--
-- O shipped (commit 1ad274e) tem a EF mas nada a aciona no repo: só uma nota no
-- README ("agende pg_cron + pg_net"). Esta migration torna o disparo automático
-- e versionado, como travado no T2 (#40) e T10 (#52):
--
--   pg_cron heartbeat de minuto → net.http_post → /functions/v1/enviar-push
--
-- Autenticação cron→EF por secret no Vault (a EF está com verify_jwt=false em
-- config.toml, pois a chamada é de serviço e não carrega JWT de usuário).
--
-- pg_net é FIRE-AND-FORGET: net.http_post dispara pós-COMMIT, retorna um
-- request_id e grava a resposta em net._http_response (~6h de retenção); o cron
-- NÃO vê o status HTTP. Isso é aceitável porque a varredura da EF é idempotente
-- (claim atômico pending→sent com SKIP LOCKED), então um tick perdido é coberto
-- pelo próximo minuto sem duplicar push.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PROVISIONAMENTO HITL (uma vez por ambiente, NÃO versionável — valores sensíveis)
--
-- Os secrets do Vault são criados fora do controle de versão. Antes deste job
-- rodar, o operador cria dois secrets nomeados no Vault do projeto:
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret(
--     '<token forte aleatório>',            'edge_cron_secret');
--
-- O mesmo `edge_cron_secret` é injetado na EF para ela conferir o header:
--   supabase secrets set EDGE_CRON_SECRET=<mesmo token>
--
-- Deploy da função:
--   supabase functions deploy enviar-push
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensões. Em Supabase hospedado podem também ser habilitadas pelo Dashboard;
-- `if not exists` mantém a migration idempotente e reexecutável.
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- (Re)agenda o heartbeat de forma idempotente. cron.schedule faz upsert por
-- jobname em pg_cron recente, mas removemos primeiro para não depender da versão
-- e para que uma mudança de comando/agenda seja limpa numa reexecução.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'enviar-push-heartbeat') then
    perform cron.unschedule('enviar-push-heartbeat');
  end if;
end $$;

select cron.schedule(
  'enviar-push-heartbeat',
  '* * * * *',
  $job$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'project_url'
    ) || '/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'edge_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $job$
);
