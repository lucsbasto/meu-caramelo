-- Meu Caramelo — schema inicial (mvp-escopo.md §3)
-- extensões
create extension if not exists postgis;
create extension if not exists pg_cron;

-- perfis
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  avatar_url text,
  bairro text,
  criado_em timestamptz not null default now()
);

-- pontos de alimentação
create table pontos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text,
  geom geography(Point, 4326) not null,
  foto_url text,
  criado_por uuid not null references profiles(id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index pontos_geom_idx on pontos using gist (geom);

-- mantenedores (principal + co)
create type papel_mantenedor as enum ('principal', 'co');
create table ponto_mantenedores (
  ponto_id uuid references pontos(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  papel papel_mantenedor not null,
  criado_em timestamptz not null default now(),
  primary key (ponto_id, user_id)
);
create unique index um_principal_por_ponto
  on ponto_mantenedores (ponto_id) where papel = 'principal';

-- registros de alimentação
create type tipo_item as enum ('racao','agua','caseira','petisco','remedio');
create table registros (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos(id) on delete cascade,
  user_id  uuid not null references profiles(id),
  tipos tipo_item[] not null,
  quantidade_kg numeric(5,2),
  caes smallint default 0,
  gatos smallint default 0,
  observacao text,
  foto_url text,
  criado_em timestamptz not null default now()
);
create index registros_ponto_idx on registros (ponto_id, criado_em desc);

-- pedidos de ajuda
create type status_pedido as enum ('aberto','coberto','expirado');
create table pedidos_ajuda (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  texto text not null,
  data_alvo date,
  status status_pedido not null default 'aberto',
  coberto_por uuid references profiles(id),
  criado_em timestamptz not null default now()
);

-- interações
create table comentarios (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references registros(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  texto text not null,
  criado_em timestamptz not null default now()
);
create table reacoes (
  registro_id uuid references registros(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (registro_id, user_id)
);
create table pontos_seguidos (
  user_id uuid references profiles(id) on delete cascade,
  ponto_id uuid references pontos(id) on delete cascade,
  primary key (user_id, ponto_id)
);

-- notificações e push
create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tipo text not null,
  payload jsonb not null,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index notif_user_idx on notificacoes (user_id, criado_em desc);

create table device_tokens (
  user_id uuid references profiles(id) on delete cascade,
  token text primary key,
  plataforma text,
  atualizado_em timestamptz not null default now()
);

-- moderação
create table denuncias (
  id uuid primary key default gen_random_uuid(),
  alvo_tipo text not null,          -- 'registro' | 'comentario' | 'ponto'
  alvo_id uuid not null,
  autor_id uuid not null references profiles(id),
  motivo text,
  criado_em timestamptz not null default now()
);
create table bloqueios (
  user_id uuid references profiles(id) on delete cascade,
  bloqueado_id uuid references profiles(id) on delete cascade,
  primary key (user_id, bloqueado_id)
);

-- View de status (a que o mapa consome)
create view pontos_com_status as
select p.id, p.nome, p.endereco, p.foto_url, p.ativo,
       st_x(p.geom::geometry) as lng,
       st_y(p.geom::geometry) as lat,
       m.user_id as mantenedor_id,
       extract(epoch from now() - max(r.criado_em)) / 3600 as horas_desde_ultima
from pontos p
left join registros r on r.ponto_id = p.id
left join ponto_mantenedores m on m.ponto_id = p.id and m.papel = 'principal'
where p.ativo
group by p.id, m.user_id;

-- RPC de proximidade (não puxa a cidade inteira para o cliente)
create function pontos_proximos(lat float8, lng float8, raio_m int default 3000)
returns setof pontos_com_status language sql stable as $$
  select s.*
  from pontos_com_status s
  join pontos p on p.id = s.id
  where st_dwithin(
    p.geom,
    st_setsrid(st_makepoint(lng, lat), 4326)::geography,
    raio_m
  );
$$;
