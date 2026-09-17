-- Meu Caramelo — WP9: convite de co-mantenedor + saida/promocao (§7.4)

create table convites_mantenedor (
  token uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos(id) on delete cascade,
  criado_por uuid not null references profiles(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_em timestamptz,
  usado_por uuid references profiles(id)
);
create index convites_ponto_idx on convites_mantenedor (ponto_id);

alter table convites_mantenedor enable row level security;

-- helper: usuario e o mantenedor PRINCIPAL do ponto?
create function e_principal(p_ponto uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from ponto_mantenedores
    where ponto_id = p_ponto and user_id = auth.uid() and papel = 'principal'
  );
$$;

-- So o principal cria/le/apaga convites do seu ponto.
create policy convites_select on convites_mantenedor for select
  using (e_principal(ponto_id));
create policy convites_insert on convites_mantenedor for insert
  with check (criado_por = auth.uid() and e_principal(ponto_id));
create policy convites_delete on convites_mantenedor for delete
  using (e_principal(ponto_id));

-- Fecha a brecha de auto-insercao como 'co': co-mantenedor so entra via RPC
-- de aceite (security definer). Continua permitida a adocao de orfao como
-- 'principal' (WP8) e o principal gerir linhas do seu ponto.
drop policy pm_insert on ponto_mantenedores;
create policy pm_insert on ponto_mantenedores for insert
  with check (
    (user_id = auth.uid() and papel = 'principal')
    or e_principal(ponto_id)
  );

-- Remocao: o proprio co-mantenedor sai; o principal remove co-mantenedores.
-- A saida do principal passa pela RPC sair_mantenedor (promove/orfana).
drop policy pm_delete on ponto_mantenedores;
create policy pm_delete on ponto_mantenedores for delete
  using (
    (user_id = auth.uid() and papel = 'co')
    or (papel = 'co' and e_principal(ponto_id))
  );

-- Aceite de convite: valida token (nao usado, nao expirado) e vira co-mantenedor.
create function aceitar_convite(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ponto uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select ponto_id into v_ponto
  from convites_mantenedor
  where token = p_token and usado_em is null and expira_em > now()
  for update;

  if v_ponto is null then
    raise exception 'convite_invalido' using errcode = 'P0001';
  end if;

  insert into ponto_mantenedores (ponto_id, user_id, papel)
  values (v_ponto, v_uid, 'co')
  on conflict (ponto_id, user_id) do nothing;

  update convites_mantenedor
  set usado_em = now(), usado_por = v_uid
  where token = p_token;

  return v_ponto;
end;
$$;

-- Saida de mantenedor: co sai; principal promove co mais antigo ou orfana.
create function sair_mantenedor(p_ponto uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_papel papel_mantenedor;
  v_novo uuid;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select papel into v_papel from ponto_mantenedores
  where ponto_id = p_ponto and user_id = v_uid for update;

  if v_papel is null then
    raise exception 'nao_mantenedor' using errcode = 'P0001';
  end if;

  if v_papel = 'co' then
    delete from ponto_mantenedores where ponto_id = p_ponto and user_id = v_uid;
    return 'saiu_co';
  end if;

  select user_id into v_novo from ponto_mantenedores
  where ponto_id = p_ponto and papel = 'co'
  order by criado_em asc, user_id asc
  limit 1 for update;

  delete from ponto_mantenedores where ponto_id = p_ponto and user_id = v_uid;

  if v_novo is null then
    return 'orfao';
  end if;

  update ponto_mantenedores set papel = 'principal'
  where ponto_id = p_ponto and user_id = v_novo;

  insert into notificacoes (user_id, tipo, payload)
  values (v_novo, 'promovido_principal', jsonb_build_object('ponto_id', p_ponto));

  return 'promovido';
end;
$$;

-- Postgres concede EXECUTE ao PUBLIC por padrão; revoga antes de conceder só a
-- authenticated (defesa em profundidade — anon já é barrado por auth_required).
revoke execute on function e_principal(uuid), aceitar_convite(uuid), sair_mantenedor(uuid) from public;
grant execute on function e_principal(uuid) to authenticated;
grant execute on function aceitar_convite(uuid) to authenticated;
grant execute on function sair_mantenedor(uuid) to authenticated;
