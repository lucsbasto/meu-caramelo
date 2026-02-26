create extension if not exists pgcrypto;

create table if not exists public.feeding_points (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  status text not null default 'ok' check (
    status in ('ok', 'needs_water', 'needs_food', 'needs_maintenance')
  ),
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feeding_points_updated_at_idx
  on public.feeding_points (updated_at desc);

alter table public.feeding_points enable row level security;

-- Modo leitura: usuários anônimos apenas visualizam os pontos.
create policy "anon can read feeding points"
  on public.feeding_points
  for select
  to anon
  using (true);

drop policy if exists "anon can insert feeding points" on public.feeding_points;
drop policy if exists "anon can update feeding points" on public.feeding_points;
