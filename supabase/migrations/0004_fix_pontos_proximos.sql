-- Fix (#15): a função pontos_proximos deployada no hosted diverge do 0001 e
-- retorna TODOS os pontos, ignorando o raio (st_dwithin não aplicado). Sintoma:
-- com o centro em Palmas, o seed de SP aparecia no mapa; raio_m=1 devolvia 7.
--
-- 0001 usa `create function` (não idempotente): se a função já existia sem o
-- WHERE quando o migration rodou no hosted, a versão antiga permaneceu. Aqui
-- recriamos idempotente (`create or replace`) com o filtro correto, para o
-- banco convergir com a fonte independentemente do que está deployado.
--
-- geom é geography(Point,4326) → st_dwithin mede em METROS (raio_m direto).
-- Ordena por distância p/ o mapa ficar determinístico. Usa o gist já existente
-- (pontos_geom_idx) via st_dwithin.
create or replace function pontos_proximos(lat float8, lng float8, raio_m int default 3000)
returns setof pontos_com_status language sql stable as $$
  select s.*
  from pontos_com_status s
  join pontos p on p.id = s.id
  where st_dwithin(
    p.geom,
    st_setsrid(st_makepoint(lng, lat), 4326)::geography,
    raio_m
  )
  order by st_distance(
    p.geom,
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  );
$$;
