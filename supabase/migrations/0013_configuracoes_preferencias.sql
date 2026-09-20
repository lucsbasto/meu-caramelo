-- Meu Caramelo — WP17: Configurações + preferências de notificação (§6.13, §7.5, §7.6)
-- Este WP entrega a persistência: preferências de notificação por tipo, seletor
-- de raio e o "apagar minha conta" que anonimiza o histórico. O gating de push
-- (#21) e dos jobs/gatilhos (#28) e o uso do raio no feed (#20) chegam depois;
-- aqui só criamos o armazenamento e a RPC de exclusão.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Preferências por usuário (§6.13 — um interruptor por tipo + raio).
--    Ausência de linha = tudo ligado, raio padrão (bairro). Persistidas por
--    upsert quando a pessoa mexe em algo.
-- ─────────────────────────────────────────────────────────────────────────────
create table preferencias (
  user_id uuid primary key references profiles(id) on delete cascade,
  -- Um interruptor por tipo de notificação (§6.13). Default ligado: ninguém
  -- perde o aviso que importa (ponto vencido) sem escolher desligar.
  notif_ponto_vencido    boolean not null default true,
  notif_pedido_ajuda     boolean not null default true,
  notif_registro_seguido boolean not null default true,
  notif_comentario       boolean not null default true,
  notif_ponto_novo       boolean not null default true,
  -- Raio do escopo "Perto de mim" (§6.13): 1000 · 3000 · 5000 metros, ou
  -- null = "bairro todo" (sem corte por distância). Casa com raio_m das RPCs.
  raio_m int,
  atualizado_em timestamptz not null default now(),
  constraint preferencias_raio_valido check (raio_m is null or raio_m in (1000, 3000, 5000))
);

alter table preferencias enable row level security;

-- Só o próprio dono lê e escreve suas preferências (mesmo molde de
-- notificacoes/device_tokens/bloqueios, §7.6).
create policy preferencias_all on preferencias for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Anonimização no apagar conta (§6.13, §7.6).
--    O histórico do ponto é preservado: ao remover o perfil, a autoria vira
--    nula e a UI mostra "Voluntário removido". Para isso as FKs de autoria
--    passam de NO ACTION (que bloquearia a exclusão) para SET NULL.
-- ─────────────────────────────────────────────────────────────────────────────
alter table registros      alter column user_id  drop not null;
alter table registros      drop constraint registros_user_id_fkey;
alter table registros      add  constraint registros_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

alter table pontos         alter column criado_por drop not null;
alter table pontos         drop constraint pontos_criado_por_fkey;
alter table pontos         add  constraint pontos_criado_por_fkey
  foreign key (criado_por) references profiles(id) on delete set null;

alter table pedidos_ajuda  alter column autor_id drop not null;
alter table pedidos_ajuda  drop constraint pedidos_ajuda_autor_id_fkey;
alter table pedidos_ajuda  add  constraint pedidos_ajuda_autor_id_fkey
  foreign key (autor_id) references profiles(id) on delete set null;

-- coberto_por já é nullable; só troca a ação para set null.
alter table pedidos_ajuda  drop constraint pedidos_ajuda_coberto_por_fkey;
alter table pedidos_ajuda  add  constraint pedidos_ajuda_coberto_por_fkey
  foreign key (coberto_por) references profiles(id) on delete set null;

alter table comentarios    alter column autor_id drop not null;
alter table comentarios    drop constraint comentarios_autor_id_fkey;
alter table comentarios    add  constraint comentarios_autor_id_fkey
  foreign key (autor_id) references profiles(id) on delete set null;

alter table denuncias      alter column autor_id drop not null;
alter table denuncias      drop constraint denuncias_autor_id_fkey;
alter table denuncias      add  constraint denuncias_autor_id_fkey
  foreign key (autor_id) references profiles(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC apagar_minha_conta (§6.13).
--    Remove o perfil da pessoa. O cascade em profiles apaga os dados pessoais
--    (preferências, bloqueios, seguidos, reações, tokens, notificações), e as
--    autorias viram nulas (set null acima), preservando o histórico do ponto
--    atribuído a "Voluntário removido".
--    Fica no schema `public`: apagar a linha de `profiles` não exige acesso ao
--    schema `auth`, evitando depender de privilégio sobre auth.users. A conta de
--    auth em si (a identidade) só é purgada por uma Edge Function com service
--    role — follow-up; aqui os dados já saem e a sessão é encerrada no cliente.
-- ─────────────────────────────────────────────────────────────────────────────
create function apagar_minha_conta()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  -- Uma só remoção: o cascade de profiles limpa os dados pessoais e o set null
  -- anonimiza as autorias, preservando o histórico do ponto.
  delete from profiles where id = v_uid;
end;
$$;

revoke execute on function apagar_minha_conta() from public;
grant  execute on function apagar_minha_conta() to authenticated;
