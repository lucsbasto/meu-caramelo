-- Meu Caramelo — Estatísticas públicas do onboarding (§6.1, WP18)
-- Os três números da primeira tela (pontos ativos · alimentados hoje ·
-- voluntários) vêm deste endpoint público, agregado e SEM autenticação. É prova
-- social; por isso o cliente esconde o bloco quando a chamada falha (nunca zero,
-- nunca esqueleto — §6.1 Dados/Por quê).

-- SECURITY DEFINER: anon não lê as tabelas sob RLS, mas pode ver os agregados.
-- A função só devolve contagens — nenhuma linha, nenhum dado pessoal.
--
-- p_cidade: reservado. O piloto roda numa cidade só (Fase 6), então os
--   agregados globais já são "a cidade". Recortar por cidade de verdade exige
--   fronteiras geográficas que o schema ainda não modela — fica para quando o
--   piloto virar multi-cidade. O parâmetro entra agora para o contrato do
--   cliente não mudar depois.
-- "hoje": dia civil no fuso do piloto (Palmas/TO, America/Araguaina).
-- create or replace (idempotente) — convenção do repo desde 0004.
create or replace function estatisticas_cidade(p_cidade text default null)
returns table (
  pontos_ativos bigint,
  alimentados_hoje bigint,
  voluntarios bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from pontos where ativo) as pontos_ativos,
    (
      select count(distinct r.ponto_id)
      from registros r
      where (r.criado_em at time zone 'America/Araguaina')::date
            = (now() at time zone 'America/Araguaina')::date
    ) as alimentados_hoje,
    (select count(distinct r.user_id) from registros r) as voluntarios;
$$;

comment on function estatisticas_cidade(text) is
  'Agregados públicos do onboarding (§6.1): pontos ativos, alimentados hoje, voluntários. Sem auth; p_cidade reservado para recorte futuro por cidade.';

grant execute on function estatisticas_cidade(text) to anon;
grant execute on function estatisticas_cidade(text) to authenticated;
