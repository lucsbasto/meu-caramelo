-- Meu Caramelo — Pedido de ajuda + cobertura (§6.9 / §6.8, WP13)
-- A tabela `pedidos_ajuda`, sua RLS e o feed já existem (0001/0002/0007). Aqui
-- entram as duas regras que faltavam para o compromisso social funcionar:
--   1. um único pedido ABERTO por ponto por data (bloqueia a duplicata);
--   2. cobrir um pedido — que a RLS de UPDATE não permite a um voluntário
--      qualquer (o `using` exige já ser autor/mantenedor/coberto_por), então a
--      transição aberto -> coberto vive numa RPC SECURITY DEFINER que também
--      notifica o autor (§7.5 "Cobertura confirmada").

-- 1. Duplicata: no máximo um pedido aberto por (ponto, data). A unique parcial
-- só vigia linhas `aberto`; cobertos/expirados não contam.
-- NULLs em data_alvo são distintos no índice e escapariam da dedupe, então um
-- CHECK exige data em todo pedido ABERTO — assim a unique parcial cobre 100%
-- dos abertos, mesmo vindo de outro cliente que não a folha (§6.9).
alter table pedidos_ajuda
  add constraint pedidos_aberto_exige_data
  check (status <> 'aberto' or data_alvo is not null);

create unique index if not exists pedidos_ajuda_um_aberto_por_data
  on pedidos_ajuda (ponto_id, data_alvo)
  where status = 'aberto';

-- 2. cobrir_pedido: transição atômica aberto -> coberto por um voluntário.
-- SECURITY DEFINER de propósito — contorna a RLS de UPDATE (que barra quem
-- ainda não é autor/mantenedor/coberto_por) mas aplica as próprias regras:
-- o pedido precisa existir, estar aberto e não ser do próprio usuário.
create function cobrir_pedido(p_pedido uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_autor uuid;
  v_status status_pedido;
  v_ponto uuid;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  -- `for update` serializa cobertores concorrentes: o segundo vê 'coberto'.
  select autor_id, status, ponto_id
    into v_autor, v_status, v_ponto
  from pedidos_ajuda
  where id = p_pedido
  for update;

  if v_autor is null then
    raise exception 'pedido_invalido' using errcode = 'P0001';
  end if;
  if v_autor = v_uid then
    raise exception 'proprio_pedido' using errcode = 'P0001';
  end if;
  if v_status <> 'aberto' then
    raise exception 'ja_coberto' using errcode = 'P0001';
  end if;

  update pedidos_ajuda
    set status = 'coberto', coberto_por = v_uid
  where id = p_pedido;

  -- Autor é avisado (§7.5 "Cobertura confirmada"). O lembrete no dia para quem
  -- cobriu é o #28 (jobs de notificação), fora deste WP.
  insert into notificacoes (user_id, tipo, payload)
  values (
    v_autor,
    'cobertura_confirmada',
    jsonb_build_object('pedido_id', p_pedido, 'ponto_id', v_ponto, 'coberto_por', v_uid)
  );

  return 'coberto';
end;
$$;

-- Postgres concede EXECUTE ao PUBLIC por padrão; revoga antes de conceder só a
-- authenticated (defesa em profundidade — anon já é barrado por auth_required).
revoke execute on function cobrir_pedido(uuid) from public;
grant execute on function cobrir_pedido(uuid) to authenticated;
