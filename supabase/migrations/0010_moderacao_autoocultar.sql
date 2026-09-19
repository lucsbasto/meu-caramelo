-- Meu Caramelo — Moderação: auto-ocultar por denúncias (§7.7 / §6.8 / §6.10)
-- Regra do produto: conteúdo denunciado por gente suficiente some da vista de
-- todo mundo até alguém revisar — sem apagar nada. Aqui isso vira:
--   1) uma coluna `oculto` em registros/comentários/pontos (default false);
--   2) um gatilho que, a cada denúncia nova, conta os DENUNCIANTES DISTINTOS do
--      alvo e liga `oculto` quando chega a 3;
--   3) as políticas de leitura passam a esconder o que está `oculto`.
-- Como o service role (painel do Supabase) ignora a RLS, a moderação continua
-- enxergando tudo — "ocultam até revisão" acontece via painel, não por delete.

-- 1) Coluna de ocultação. `if not exists` mantém idempotente caso o hosted já
-- tenha divergido (mesma cautela dos fixes 0004/0005).
alter table registros   add column if not exists oculto boolean not null default false;
alter table comentarios add column if not exists oculto boolean not null default false;
alter table pontos      add column if not exists oculto boolean not null default false;

-- 1b) Endurecer `denuncias`: o alvo_tipo só pode ser um dos três conhecidos (o
-- gatilho abaixo confia nisso), e uma pessoa denuncia um mesmo alvo só uma vez —
-- assim a contagem de DISTINCT denunciantes é honesta e a tabela não cresce sem
-- limite por denúncia repetida. Guardas `if not exists` mantêm idempotente.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'denuncias_alvo_tipo_chk') then
    alter table denuncias add constraint denuncias_alvo_tipo_chk
      check (alvo_tipo in ('registro', 'comentario', 'ponto'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'denuncias_uma_por_alvo') then
    alter table denuncias add constraint denuncias_uma_por_alvo
      unique (autor_id, alvo_tipo, alvo_id);
  end if;
end $$;

-- 2) Auto-ocultar ao atingir 3 denunciantes distintos.
-- SECURITY DEFINER de propósito: quem denuncia não é dono nem mantenedor do
-- alvo, então a RLS de update recusaria o UPDATE — o gatilho roda como dono da
-- função para poder ligar `oculto`. `set search_path = public` fecha a função.
-- Conta DISTINCT autor_id de propósito: uma mesma pessoa denunciando 3x não
-- pode ocultar conteúdo sozinha; são necessárias 3 contas diferentes.
-- Idempotente: religar `oculto = true` no que já está oculto não faz mal.
create or replace function denuncias_autoocultar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  denunciantes int;
begin
  select count(distinct d.autor_id) into denunciantes
  from denuncias d
  where d.alvo_tipo = new.alvo_tipo and d.alvo_id = new.alvo_id;

  if denunciantes >= 3 then
    case new.alvo_tipo
      when 'registro' then
        update registros   set oculto = true where id = new.alvo_id;
      when 'comentario' then
        update comentarios set oculto = true where id = new.alvo_id;
      when 'ponto' then
        update pontos       set oculto = true where id = new.alvo_id;
      else
        null; -- alvo_tipo já é travado pelo CHECK; `else` evita CASE_NOT_FOUND
    end case;
  end if;

  return new;
end;
$$;

drop trigger if exists denuncias_autoocultar_tg on denuncias;
create trigger denuncias_autoocultar_tg
  after insert on denuncias
  for each row execute function denuncias_autoocultar();

-- 3) Ler passa a respeitar `oculto`. Recriamos as políticas de select de
-- registros/comentários trocando `using (true)` por `using (not oculto)`: como
-- `feed_proximo` roda como o chamador (não é definer) e todo detalhe lê por
-- estas tabelas, o conteúdo oculto some de todas as telas de uma vez.
drop policy if exists registros_select on registros;
create policy registros_select on registros for select using (not oculto);

drop policy if exists coment_select on comentarios;
create policy coment_select on comentarios for select using (not oculto);

-- A view pontos_com_status NÃO é security_invoker (a RLS de pontos não passa por
-- ela), então o filtro de `oculto` precisa entrar no corpo dela. Recriada
-- idêntica ao 0001, só somando `and not p.oculto` ao WHERE — 0004/0005 mexeram
-- só em pontos_proximos, então recriar a view aqui é seguro.
create or replace view pontos_com_status as
select p.id, p.nome, p.endereco, p.foto_url, p.ativo,
       st_x(p.geom::geometry) as lng,
       st_y(p.geom::geometry) as lat,
       m.user_id as mantenedor_id,
       extract(epoch from now() - max(r.criado_em)) / 3600 as horas_desde_ultima
from pontos p
left join registros r on r.ponto_id = p.id and not r.oculto
left join ponto_mantenedores m on m.ponto_id = p.id and m.papel = 'principal'
where p.ativo and not p.oculto
group by p.id, m.user_id;

-- feed_proximo já herda o `not oculto` dos registros pela RLS (roda como o
-- chamador). Recriada byte-idêntica ao 0007, só somando `where not r.oculto` ao
-- ramo de registros como defesa em profundidade.
create or replace function feed_proximo(
  lat float8,
  lng float8,
  raio_m int default 3000,
  limite int default 20,
  antes timestamptz default null,
  antes_id uuid default null,
  escopo text default 'perto'
)
returns table (
  item_tipo text,
  item_id uuid,
  criado_em timestamptz,
  ponto_id uuid,
  ponto_nome text,
  autor_id uuid,
  autor_nome text,
  autor_avatar_url text,
  conteudo text,
  foto_url text,
  caes smallint,
  gatos smallint,
  tipos tipo_item[],
  reacoes_count int,
  comentarios_count int,
  pedido_status status_pedido,
  data_alvo date
)
language sql stable as $$
  -- As contagens de reação/comentário ficam FORA da página: só as ≤ `limite`
  -- linhas já filtradas por raio/escopo pagam a agregação, não a tabela inteira.
  select
    base.item_tipo,
    base.item_id,
    base.criado_em,
    base.ponto_id,
    base.ponto_nome,
    base.autor_id,
    base.autor_nome,
    base.autor_avatar_url,
    base.conteudo,
    base.foto_url,
    base.caes,
    base.gatos,
    base.tipos,
    (select count(*) from reacoes x where x.registro_id = base.item_id)::int,
    (select count(*) from comentarios c where c.registro_id = base.item_id)::int,
    base.pedido_status,
    base.data_alvo
  from (
    with itens as (
      -- registros: conteúdo = observação
      select
        'registro'::text as item_tipo,
        r.id as item_id,
        r.criado_em,
        r.ponto_id,
        r.user_id as autor_id,
        r.observacao as conteudo,
        r.foto_url,
        r.caes,
        r.gatos,
        r.tipos,
        null::status_pedido as pedido_status,
        null::date as data_alvo
      from registros r
      where not r.oculto
      union all
      -- pedidos de ajuda: só os abertos (vencido/coberto sai da lista, §6.8 Regras)
      select
        'pedido'::text,
        pa.id,
        pa.criado_em,
        pa.ponto_id,
        pa.autor_id,
        pa.texto,
        null,
        null::smallint,
        null::smallint,
        null::tipo_item[],
        pa.status,
        pa.data_alvo
      from pedidos_ajuda pa
      where pa.status = 'aberto'
    )
    select
      i.item_tipo,
      i.item_id,
      i.criado_em,
      i.ponto_id,
      p.nome as ponto_nome,
      i.autor_id,
      prof.nome as autor_nome,
      prof.avatar_url as autor_avatar_url,
      i.conteudo,
      i.foto_url,
      i.caes,
      i.gatos,
      i.tipos,
      i.pedido_status,
      i.data_alvo
    from itens i
    join pontos p on p.id = i.ponto_id and p.ativo
    join profiles prof on prof.id = i.autor_id
    where (
        antes is null
        or i.criado_em < antes
        or (i.criado_em = antes and antes_id is not null and i.item_id < antes_id)
      )
      -- bloqueados somem sem deixar lacuna (§6.8); RLS restringe a auth.uid()
      and i.autor_id not in (
        select bloqueado_id from bloqueios where user_id = auth.uid()
      )
      and (
        case escopo
          when 'seguindo' then i.ponto_id in (
            select ponto_id from pontos_seguidos where user_id = auth.uid()
          )
          else st_dwithin(
            p.geom,
            st_setsrid(st_makepoint(lng, lat), 4326)::geography,
            raio_m
          )
        end
      )
      and (escopo <> 'pedidos' or i.item_tipo = 'pedido')
    order by i.criado_em desc, i.item_id desc
    limit limite
  ) base
  order by base.criado_em desc, base.item_id desc;
$$;
