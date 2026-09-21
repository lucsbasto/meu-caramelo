-- Meu Caramelo — WP15: Jobs e gatilhos de notificação (§7.5 / §6.11)
-- A entrega de push (WP14) já existe: a Edge Function `enviar-push` drena as
-- linhas pendentes de `notificacoes` respeitando os limites, e o disparo dessa
-- função (heartbeat pg_cron → net.http_post) é versionado no WP14 R4 (#56/PR#72).
-- O que faltava — e é o que este WP entrega — é QUEM gera essas linhas:
-- os 5 produtores de notificação (2 jobs pg_cron + 3 triggers de tabela).
-- As preferências do usuário (`preferencias`, WP17) gatam cada geração.
-- Fora deste WP: o disparo da EF (é do WP14 R4/#72), `ponto_novo_por_perto`
-- (vira notificação local no app) e os já existentes `cobertura_confirmada`
-- (0012) e `promovido_principal` (0006).
--
-- Todos os geradores são SECURITY DEFINER (inserem em `notificacoes`, contornando
-- a RLS só-dono como o `cobrir_pedido` de 0012 já faz) e os triggers engolem
-- exceções (`exception when others`) para nunca bloquear a ação principal.
-- O gate de preferência é sempre `coalesce(pref.<coluna>, true)`: ausência de
-- linha = tudo ligado (design de 0013).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ponto vencido — job de hora em hora (§7.5).
--    Mantenedor principal + seguidores de cada ponto "vencido". Vencido = 12h+
--    sem registro (ou nunca registrado), espelhando statusFromHoras (urgente >=
--    12h) em src/theme/colors.ts. Teto §6.11: 1/ponto/dia por destinatário.
--    Texto personalizado quando a pessoa já cuidou daquele ponto; neutro (texto
--    padrão da EF) quando não.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function gerar_ponto_vencido()
returns void language plpgsql security definer set search_path = public as $$
begin
  with vencidos as (
    select s.id as ponto_id, s.mantenedor_id
    from pontos_com_status s
    where s.mantenedor_id is not null
      and (s.horas_desde_ultima is null or s.horas_desde_ultima >= 12)
  ),
  destinatarios as (
    select ponto_id, mantenedor_id as user_id from vencidos
    union
    select v.ponto_id, ps.user_id
    from vencidos v
    join pontos_seguidos ps on ps.ponto_id = v.ponto_id
  )
  insert into notificacoes (user_id, tipo, payload)
  select
    d.user_id,
    'ponto_vencido',
    jsonb_build_object('ponto_id', d.ponto_id)
    || case
         when exists (
           select 1 from registros r
           where r.ponto_id = d.ponto_id and r.user_id = d.user_id
         )
         then jsonb_build_object(
           'corpo',
           'Um ponto que você cuida está sem registro faz tempo. Pode dar uma passada?'
         )
         else '{}'::jsonb
       end
  from destinatarios d
  left join preferencias pr on pr.user_id = d.user_id
  where d.user_id is not null
    and coalesce(pr.notif_ponto_vencido, true)
    and not exists (
      select 1 from notificacoes n
      where n.tipo = 'ponto_vencido'
        and n.user_id = d.user_id
        and n.payload->>'ponto_id' = d.ponto_id::text
        and n.criado_em::date = current_date
    );
end;
$$;
revoke execute on function gerar_ponto_vencido() from public;

select cron.schedule('gerar-ponto-vencido', '0 * * * *', $$ select gerar_ponto_vencido(); $$);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Lembrete de cobertura — job da manhã (§7.5).
--    Quem se comprometeu (coberto_por) é lembrado no dia da data-alvo. Sem gate
--    de preferência: é consequência do próprio compromisso. Teto 1/pedido/dia.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function gerar_lembrete_cobertura()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notificacoes (user_id, tipo, payload)
  select p.coberto_por, 'lembrete_cobertura',
         jsonb_build_object('pedido_id', p.id, 'ponto_id', p.ponto_id)
  from pedidos_ajuda p
  where p.status = 'coberto'
    and p.coberto_por is not null
    and p.data_alvo = current_date
    and not exists (
      select 1 from notificacoes n
      where n.tipo = 'lembrete_cobertura'
        and n.user_id = p.coberto_por
        and n.payload->>'pedido_id' = p.id::text
        and n.criado_em::date = current_date
    );
end;
$$;
revoke execute on function gerar_lembrete_cobertura() from public;

select cron.schedule('gerar-lembrete-cobertura', '0 8 * * *', $$ select gerar_lembrete_cobertura(); $$);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Pedido de ajuda — trigger na criação (§7.5).
--    Seguidores do ponto + quem registrou ali nos últimos 30 dias, menos o autor.
--    `data_alvo` vai no payload para a exceção de silêncio noturno da EF
--    (pedido para hoje fura o silêncio).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function gerar_notif_pedido_ajuda()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notificacoes (user_id, tipo, payload)
  select dest.user_id, 'pedido_ajuda',
         jsonb_build_object(
           'pedido_id', new.id,
           'ponto_id', new.ponto_id,
           'data_alvo', new.data_alvo
         )
  from (
    select ps.user_id
    from pontos_seguidos ps
    where ps.ponto_id = new.ponto_id
    union
    select r.user_id
    from registros r
    where r.ponto_id = new.ponto_id
      and r.user_id is not null
      and r.criado_em >= now() - interval '30 days'
  ) dest
  left join preferencias pr on pr.user_id = dest.user_id
  where dest.user_id is not null
    and dest.user_id is distinct from new.autor_id
    and coalesce(pr.notif_pedido_ajuda, true);
  return new;
exception when others then
  return new;
end;
$$;

create trigger pedidos_ajuda_notif
  after insert on pedidos_ajuda
  for each row execute function gerar_notif_pedido_ajuda();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Registro em ponto seguido — trigger na inserção (§7.5 / §6.11).
--    Seguidores do ponto, menos o autor. Agrupamento §6.11 realizado como dedupe
--    1/ponto/dia por seguidor (uma linha por dia, sem spam).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function gerar_notif_registro_seguido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notificacoes (user_id, tipo, payload)
  select ps.user_id, 'registro_em_ponto_seguido',
         jsonb_build_object('registro_id', new.id, 'ponto_id', new.ponto_id)
  from pontos_seguidos ps
  left join preferencias pr on pr.user_id = ps.user_id
  where ps.ponto_id = new.ponto_id
    and ps.user_id is distinct from new.user_id
    and coalesce(pr.notif_registro_seguido, true)
    and not exists (
      select 1 from notificacoes n
      where n.tipo = 'registro_em_ponto_seguido'
        and n.user_id = ps.user_id
        and n.payload->>'ponto_id' = new.ponto_id::text
        and n.criado_em::date = current_date
    );
  return new;
exception when others then
  return new;
end;
$$;

create trigger registros_notif
  after insert on registros
  for each row execute function gerar_notif_registro_seguido();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Comentário — trigger na inserção (§7.5).
--    Avisa o autor do registro comentado; nunca o próprio comentarista.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function gerar_notif_comentario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_autor_registro uuid;
begin
  select r.user_id into v_autor_registro
  from registros r where r.id = new.registro_id;

  if v_autor_registro is null
     or v_autor_registro is not distinct from new.autor_id then
    return new;
  end if;

  -- Gate: só pula se houver preferência explicitamente desligada.
  if not exists (
    select 1 from preferencias pr
    where pr.user_id = v_autor_registro and pr.notif_comentario = false
  ) then
    insert into notificacoes (user_id, tipo, payload)
    values (
      v_autor_registro,
      'comentario',
      jsonb_build_object('registro_id', new.registro_id)
    );
  end if;

  return new;
exception when others then
  return new;
end;
$$;

create trigger comentarios_notif
  after insert on comentarios
  for each row execute function gerar_notif_comentario();

-- O disparo da Edge Function (heartbeat pg_cron + net.http_post) NÃO fica aqui:
-- é versionado no WP14 R4 (#56/PR#72). Estes produtores só gravam em
-- `notificacoes`; a varredura idempotente da EF, acionada pelo cron, entrega.
