-- Meu Caramelo — galeria de fotos do ponto (§6.4/§6.6): várias imagens por ponto
-- exibidas em carrossel no detalhe. `pontos.foto_url` permanece como CAPA (mapa,
-- feed e registro seguem lendo uma única imagem); a galeria vive nesta tabela.

create table ponto_fotos (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos(id) on delete cascade,
  url text not null,
  ordem int not null default 0,
  criado_por uuid not null references profiles(id),
  criado_em timestamptz not null default now()
);
-- Ordena a galeria de forma estável: primeiro por `ordem`, desempate por criação.
create index ponto_fotos_ponto_idx on ponto_fotos (ponto_id, ordem, criado_em);

-- RLS (mesma régua do resto: todo mundo lê, só mantenedor do ponto escreve).
alter table ponto_fotos enable row level security;

create policy ponto_fotos_select on ponto_fotos for select using (true);
create policy ponto_fotos_insert on ponto_fotos for insert
  with check (criado_por = auth.uid() and e_mantenedor(ponto_id));
create policy ponto_fotos_update on ponto_fotos for update
  using (e_mantenedor(ponto_id));
create policy ponto_fotos_delete on ponto_fotos for delete
  using (e_mantenedor(ponto_id));

-- Backfill: cada ponto que já tem capa entra na galeria como a primeira foto,
-- para o carrossel nunca começar vazio onde já existia imagem.
insert into ponto_fotos (ponto_id, url, ordem, criado_por)
select id, foto_url, 0, criado_por
from pontos
where foto_url is not null;
