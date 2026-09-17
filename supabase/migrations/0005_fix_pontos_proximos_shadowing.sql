-- Fix real (#15): a função pontos_proximos retornava TODOS os pontos mesmo com
-- WHERE st_dwithin presente. Causa raiz = colisão de nomes, não divergência de
-- deploy (a fonte 0001 já estava quebrada; a 0004 copiou o mesmo bug).
--
-- Os parâmetros lat/lng têm o MESMO nome de colunas da view pontos_com_status
-- (st_y as lat, st_x as lng em 0001). Em função SQL, quando um identificador
-- casa com coluna E parâmetro, a COLUNA vence. Então `st_makepoint(lng, lat)`
-- usava s.lng/s.lat (as coords da própria linha), comparando cada ponto com ele
-- mesmo → distância 0 → passa em qualquer raio (até raio_m=1) e o order by
-- ficava todo 0. Prova: `select st_dwithin(...)` cru dava 0; via função dava 7.
--
-- Correção: referência POSICIONAL ($1=lat, $2=lng, $3=raio_m). `$n` sempre é o
-- argumento da função, nunca uma coluna — elimina a ambiguidade sem mudar a API
-- de nomes (PostgREST/cliente continuam chamando lat/lng/raio_m).
create or replace function pontos_proximos(lat float8, lng float8, raio_m int default 3000)
returns setof pontos_com_status language sql stable as $$
  select s.*
  from pontos_com_status s
  join pontos p on p.id = s.id
  where st_dwithin(
    p.geom,
    st_setsrid(st_makepoint($2, $1), 4326)::geography,
    $3
  )
  order by st_distance(
    p.geom,
    st_setsrid(st_makepoint($2, $1), 4326)::geography
  );
$$;
