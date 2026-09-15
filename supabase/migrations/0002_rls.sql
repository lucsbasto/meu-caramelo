-- Meu Caramelo — RLS (mvp-escopo.md §3)
-- Regra curta: todo mundo lê, só autenticado escreve, só dono/mantenedor edita.

alter table profiles           enable row level security;
alter table pontos             enable row level security;
alter table ponto_mantenedores enable row level security;
alter table registros          enable row level security;
alter table pedidos_ajuda      enable row level security;
alter table comentarios        enable row level security;
alter table reacoes            enable row level security;
alter table pontos_seguidos    enable row level security;
alter table notificacoes       enable row level security;
alter table device_tokens      enable row level security;
alter table denuncias          enable row level security;
alter table bloqueios          enable row level security;

-- helper: usuário é mantenedor do ponto?
create function e_mantenedor(p_ponto uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from ponto_mantenedores
    where ponto_id = p_ponto and user_id = auth.uid()
  );
$$;

-- profiles
create policy profiles_select on profiles for select using (true);
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid());

-- pontos
create policy pontos_select on pontos for select using (ativo or criado_por = auth.uid());
create policy pontos_insert on pontos for insert with check (criado_por = auth.uid());
create policy pontos_update on pontos for update using (e_mantenedor(id));

-- ponto_mantenedores: mantenedor gere co-mantenedores; usuário adota ponto órfão via insert do próprio
create policy pm_select on ponto_mantenedores for select using (true);
create policy pm_insert on ponto_mantenedores for insert
  with check (user_id = auth.uid() or e_mantenedor(ponto_id));
create policy pm_delete on ponto_mantenedores for delete
  using (user_id = auth.uid() or e_mantenedor(ponto_id));

-- registros: público lê; autor insere; autor OU mantenedor edita/remove
create policy registros_select on registros for select using (true);
create policy registros_insert on registros for insert with check (user_id = auth.uid());
create policy registros_update on registros for update
  using (user_id = auth.uid() or e_mantenedor(ponto_id));
create policy registros_delete on registros for delete
  using (user_id = auth.uid() or e_mantenedor(ponto_id));

-- pedidos_ajuda
create policy pedidos_select on pedidos_ajuda for select using (true);
create policy pedidos_insert on pedidos_ajuda for insert with check (autor_id = auth.uid());
create policy pedidos_update on pedidos_ajuda for update
  using (autor_id = auth.uid() or e_mantenedor(ponto_id) or coberto_por = auth.uid());

-- comentarios
create policy coment_select on comentarios for select using (true);
create policy coment_insert on comentarios for insert with check (autor_id = auth.uid());
create policy coment_delete on comentarios for delete using (autor_id = auth.uid());

-- reacoes
create policy reacoes_select on reacoes for select using (true);
create policy reacoes_insert on reacoes for insert with check (user_id = auth.uid());
create policy reacoes_delete on reacoes for delete using (user_id = auth.uid());

-- pontos_seguidos (só o próprio)
create policy seguidos_all on pontos_seguidos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notificacoes / device_tokens / bloqueios: só o próprio
create policy notif_all on notificacoes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tokens_all on device_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bloqueios_all on bloqueios for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- denuncias: insert autenticado, select nenhum (só service role)
create policy denuncias_insert on denuncias for insert with check (autor_id = auth.uid());
