-- Pontos de teste em Palmas-TO (WP7). Idempotente.
-- Rodar no Supabase Dashboard -> SQL Editor (roda como postgres, ignora RLS).
-- criado_por = perfil "Marina Demo" (já existe no banco pelo seed).
-- Cada ponto recebe mantenedor (Marina) para NÃO ficar órfão; sem registro
-- inicial, então começam como "urgente" (pin vermelho) e viram "ok" (verde)
-- quando você registrar uma alimentação — bom para validar a recolor do pin.

insert into pontos (id, nome, endereco, geom, criado_por) values
  ('10000000-0000-0000-0000-000000000101', 'PETZ Palmas', 'Q. 101 Sul, Av. LO-3 — Plano Diretor Sul',
   st_setsrid(st_makepoint(-48.334397, -10.191560), 4326), '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000102', 'Quartetto (405 Norte)', 'Q. 405 Norte, Alameda 6 — Plano Diretor Norte',
   st_setsrid(st_makepoint(-48.346305, -10.163222), 4326), '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000103', 'Havan Palmas', 'ARSO 41, Alameda 04 — Plano Diretor Sul',
   st_setsrid(st_makepoint(-48.337798, -10.205546), 4326), '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000104', 'Cobasi Palmas', 'ARNO 12 (105 Norte), Alameda das Aroeiras — Plano Diretor Norte',
   st_setsrid(st_makepoint(-48.345200, -10.180800), 4326), '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into ponto_mantenedores (ponto_id, user_id, papel) values
  ('10000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'principal'),
  ('10000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'principal'),
  ('10000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'principal'),
  ('10000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'principal')
on conflict do nothing;
