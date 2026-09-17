-- Meu Caramelo — Feed da comunidade (§6.8, WP11)
-- Uma RPC que unifica registros e pedidos de ajuda do raio do usuário em ordem
-- estritamente cronológica (sem algoritmo de relevância), paginada por keyset.

-- feed_proximo: itens do feed ordenados por recência.
--   escopo:
--     'perto'    -> registros + pedidos abertos dentro do raio (padrão)
--     'pedidos'  -> só pedidos abertos dentro do raio
--     'seguindo' -> itens de pontos que o usuário segue (ignora o raio)
--   Keyset (antes, antes_id): devolve itens anteriores a (criado_em, id) — o par
--   desempata itens com o mesmo instante, para nenhum sumir na borda da página.
-- Sem SECURITY DEFINER de propósito: as subqueries em `bloqueios` e
-- `pontos_seguidos` correm como o chamador, então a RLS já as restringe ao
-- próprio usuário (§6.8 — bloqueados somem; "seguindo" usa os seus seguidos).
create function feed_proximo(
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

-- Realtime só para pedidos de ajuda novos (§6.8 / §2). registros já entram no
-- feed via refetch; a subscription do feed acompanha apenas pedidos_ajuda.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'pedidos_ajuda'
     )
  then
    execute 'alter publication supabase_realtime add table pedidos_ajuda';
  end if;
end $$;
