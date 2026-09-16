-- Seed de desenvolvimento (roda com `supabase db reset`).
-- 1 usuário demo + 3 pontos com registros em tempos diferentes,
-- para exercitar os status ok / precisa / urgente no mapa (WP4).

-- usuário demo (auth) — só para dev local
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo@meucaramelo.app', extensions.crypt('demo1234', extensions.gen_salt('bf')),
  now(), now(), now()
) on conflict (id) do nothing;

insert into profiles (id, nome, bairro)
values ('00000000-0000-0000-0000-000000000001', 'Marina Demo', 'Vila Madalena')
on conflict (id) do nothing;

-- 3 pontos (coords de São Paulo, ~Vila Madalena)
insert into pontos (id, nome, endereco, geom, criado_por) values
  ('10000000-0000-0000-0000-000000000001', 'Praça do Cachorrão', 'R. Aspicuelta',
   st_setsrid(st_makepoint(-46.6900, -23.5560), 4326), '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Esquina da Padaria', 'R. Fradique Coutinho',
   st_setsrid(st_makepoint(-46.6870, -23.5605), 4326), '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'Viela do Beco', 'R. Girassol',
   st_setsrid(st_makepoint(-46.6925, -23.5588), 4326), '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ponto 1 e 2 com mantenedor; ponto 3 fica órfão (status cinza)
insert into ponto_mantenedores (ponto_id, user_id, papel) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'principal'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'principal')
on conflict do nothing;

-- registros: ponto 1 = ok (<4h), ponto 2 = urgente (>12h), ponto 3 = sem registro
insert into registros (ponto_id, user_id, tipos, quantidade_kg, caes, gatos, criado_em) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   array['racao','agua']::tipo_item[], 1.5, 3, 1, now() - interval '2 hours'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   array['racao']::tipo_item[], 2.0, 5, 0, now() - interval '18 hours');
