# Meu Caramelo — escopo do MVP

**Recorte:** núcleo + comunidade. **Stack:** Expo (dev client) + Supabase.
Ranking, conquistas e patrocínio ficam desenhados mas **não entram** — todos dependem de base de usuários que o MVP ainda não tem.

---

## 1. O que o MVP precisa provar

O app só existe se três coisas forem verdade. O MVP é um instrumento para medir isso, não um produto completo.

| # | Hipótese | Como medir no piloto |
|---|---|---|
| H1 | Quem alimenta se dá ao trabalho de registrar | ≥ 3 registros por semana por voluntário ativo |
| H2 | Saber que alguém já passou muda o comportamento | ≥ 40% das aberturas do app terminam em consulta a um ponto sem registrar (a pessoa checou e não precisou ir) |
| H3 | Existe gente disposta a assumir um ponto | ≥ 50% dos pontos com mantenedor em 4 semanas |

**Piloto:** um bairro, 4 semanas, meta de 20 voluntários ativos e retenção D7 ≥ 30%.

Se H1 falhar, nada mais importa — registrar precisa custar menos de 15 segundos.

---

## 2. Escopo funcional

### Entra

**Conta e acesso**
- Ver o mapa e os pontos **sem login**. Login só é exigido para registrar, criar ponto ou postar.
- Supabase Auth: magic link por e-mail + Google. Sem senha.
- Perfil mínimo: nome, foto opcional, bairro.

**Mapa**
- Mapa Mapbox com o style caramelo, centrado na localização.
- Pins por status derivado do último registro: ok hoje (< 4 h), precisa hoje (4–12 h), urgente (> 12 h).
- Filtros: todos / precisa hoje / ok hoje.
- Folha inferior ao tocar num pin: nome, endereço, distância, tempo desde o último registro, mantenedor, "Ver ponto" e "Alimentar".
- Busca por endereço (geocoding do Mapbox) e por nome de ponto.

**Pontos**
- Criar ponto: nome, endereço (ou toque no mapa), foto opcional. Quem cria vira mantenedor.
- Detalhe: foto, status, estatísticas, mantenedor, histórico de registros.
- Editar e desativar: só mantenedor.
- Ponto órfão mostra "Adotar este ponto"; qualquer usuário logado pode adotar.
- Co-mantenedores por convite do mantenedor principal (link, sem fluxo de aprovação).

**Registro de alimentação**
- Tipo (ração, água, comida caseira, petisco, remédio) — múltipla escolha.
- Quantidade em kg, contagem de cães e gatos, observação, foto opcional.
- Tudo opcional menos o tipo: registro mínimo em dois toques.
- Aparece no ponto e no feed imediatamente (realtime).

**Comunidade**
- Feed por proximidade: registros, pedidos de ajuda e eventos de uma linha.
- Pedido de ajuda: texto, data-alvo, botão "Quero cobrir". Quem cobre fica registrado.
- Comentários e uma reação (coração) nos registros.
- Seguir um ponto.

**Notificações**
- Push (expo-notifications) para: ponto que você segue passou do prazo, pedido de ajuda perto de você, alguém comentou no seu registro, seu ponto foi alimentado.
- Tela de notificações agrupada por Hoje / Esta semana.
- Preferências por tipo, em Configurações.

**Moderação mínima**
- Reportar registro, comentário ou ponto.
- Mantenedor pode remover registro errado do ponto dele.
- Bloquear usuário (some do seu feed).
- Fila de denúncias vista pelo admin no painel do Supabase — sem UI própria no MVP.

### Fica fora (e por quê)

| Item | Motivo |
|---|---|
| Ranking e conquistas | Só fazem sentido com dezenas de usuários ativos; adicionam pressão antes de existir hábito |
| Patrocínio | Não se vende inventário sem audiência; o modelo já está desenhado para quando houver |
| Cadastro de animais fixos | Já cortado — vira complexidade de ficha e foto sem retorno no piloto |
| Escala / agenda do ponto | O pedido de ajuda cobre 80% do problema com 10% do trabalho |
| Chat | Comentário no registro basta; DM traz moderação e segurança que não dá para bancar agora |
| Web | O uso é na rua, com o celular na mão |
| Multi-cidade | O piloto é um bairro. Nada no schema impede depois |

---

## 3. Modelo de dados (Supabase)

```sql
-- extensões
create extension if not exists postgis;
create extension if not exists pg_cron;

-- perfis
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  avatar_url text,
  bairro text,
  criado_em timestamptz not null default now()
);

-- pontos de alimentação
create table pontos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text,
  geom geography(Point, 4326) not null,
  foto_url text,
  criado_por uuid not null references profiles(id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index pontos_geom_idx on pontos using gist (geom);

-- mantenedores (principal + co)
create type papel_mantenedor as enum ('principal', 'co');
create table ponto_mantenedores (
  ponto_id uuid references pontos(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  papel papel_mantenedor not null,
  criado_em timestamptz not null default now(),
  primary key (ponto_id, user_id)
);
create unique index um_principal_por_ponto
  on ponto_mantenedores (ponto_id) where papel = 'principal';

-- registros de alimentação
create type tipo_item as enum ('racao','agua','caseira','petisco','remedio');
create table registros (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos(id) on delete cascade,
  user_id  uuid not null references profiles(id),
  tipos tipo_item[] not null,
  quantidade_kg numeric(5,2),
  caes smallint default 0,
  gatos smallint default 0,
  observacao text,
  foto_url text,
  criado_em timestamptz not null default now()
);
create index registros_ponto_idx on registros (ponto_id, criado_em desc);

-- pedidos de ajuda
create type status_pedido as enum ('aberto','coberto','expirado');
create table pedidos_ajuda (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  texto text not null,
  data_alvo date,
  status status_pedido not null default 'aberto',
  coberto_por uuid references profiles(id),
  criado_em timestamptz not null default now()
);

-- interações
create table comentarios (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references registros(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  texto text not null,
  criado_em timestamptz not null default now()
);
create table reacoes (
  registro_id uuid references registros(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (registro_id, user_id)
);
create table pontos_seguidos (
  user_id uuid references profiles(id) on delete cascade,
  ponto_id uuid references pontos(id) on delete cascade,
  primary key (user_id, ponto_id)
);

-- notificações e push
create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tipo text not null,
  payload jsonb not null,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index notif_user_idx on notificacoes (user_id, criado_em desc);

create table device_tokens (
  user_id uuid references profiles(id) on delete cascade,
  token text primary key,
  plataforma text,
  atualizado_em timestamptz not null default now()
);

-- moderação
create table denuncias (
  id uuid primary key default gen_random_uuid(),
  alvo_tipo text not null,          -- 'registro' | 'comentario' | 'ponto'
  alvo_id uuid not null,
  autor_id uuid not null references profiles(id),
  motivo text,
  criado_em timestamptz not null default now()
);
create table bloqueios (
  user_id uuid references profiles(id) on delete cascade,
  bloqueado_id uuid references profiles(id) on delete cascade,
  primary key (user_id, bloqueado_id)
);
```

**View de status** (a que o mapa consome):

```sql
create view pontos_com_status as
select p.id, p.nome, p.endereco, p.foto_url, p.ativo,
       st_x(p.geom::geometry) as lng,
       st_y(p.geom::geometry) as lat,
       m.user_id as mantenedor_id,
       extract(epoch from now() - max(r.criado_em)) / 3600 as horas_desde_ultima
from pontos p
left join registros r on r.ponto_id = p.id
left join ponto_mantenedores m on m.ponto_id = p.id and m.papel = 'principal'
where p.ativo
group by p.id, m.user_id;
```

**RPC de proximidade** (não puxar a cidade inteira para o cliente):

```sql
create function pontos_proximos(lat float8, lng float8, raio_m int default 3000)
returns setof pontos_com_status language sql stable as $$
  select * from pontos_com_status
  where st_dwithin(
    st_setsrid(st_makepoint(lng, lat), 4326)::geography,
    st_setsrid(st_makepoint(lng, lat), 4326)::geography, raio_m
  );
$$;
```

**RLS — a regra curta:** todo mundo lê, só autenticado escreve, e só o dono ou o mantenedor edita.

- `pontos`: `select` público em ativos; `insert` autenticado; `update` só quem está em `ponto_mantenedores`.
- `registros`: `select` público; `insert` com `user_id = auth.uid()`; `update`/`delete` do autor **ou** de mantenedor do ponto.
- `profiles`: `select` público dos campos públicos; `update` só o próprio.
- `notificacoes`, `device_tokens`, `bloqueios`: só o próprio usuário, em tudo.
- `denuncias`: `insert` autenticado, `select` nenhum (só service role).

**Realtime:** inscrição em `registros` (INSERT) e `pedidos_ajuda` (INSERT/UPDATE). Nada mais — realtime em tabela errada é o que estoura cota.

**Jobs:** `pg_cron` de hora em hora varre `pontos_com_status` e cria notificação para quem segue pontos acima do prazo. Uma Edge Function consome `notificacoes` novas e dispara push via Expo.

---

## 4. Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Runtime | Expo com **dev client** | `@rnmapbox/maps` é nativo; Expo Go não serve. EAS Build resolve distribuição de teste |
| Mapa | `@rnmapbox/maps` + `estilo-caramelo.json` via `styleJSON` | Não depende de publicar style no Studio; troca para `styleURL` depois |
| Navegação | Expo Router | Deep link pronto para o push abrir o ponto certo |
| Estado remoto | TanStack Query + realtime do Supabase | Cache e revalidação sem escrever store |
| Fotos | `expo-image-manipulator` reduz para ~1600px/80% antes do upload | Foto de celular tem 4 MB; o custo de storage e de rede está aqui |
| Localização | `expo-location`, permissão *when in use* | Não pedir background no MVP — assusta e não é preciso |
| Push | `expo-notifications` + Edge Function | Sem servidor próprio |
| Offline | Só cache de leitura, mais fila local para o registro | Fila offline é obrigatória no registro (ver especificação §6.7); no resto, medir antes |

---

## 5. Ordem de construção

Cada fase termina com algo que dá para pôr na mão de alguém.

**Fase 1 — o esqueleto.** Projeto Expo, auth, schema com RLS, mapa renderizando pontos reais do banco. *Pronto quando:* você abre o app e vê os pontos que cadastrou no SQL.

**Fase 2 — o núcleo.** Criar ponto, detalhe, registrar alimentação, status derivado, histórico. *Pronto quando:* você alimenta um ponto de verdade e o pin muda de cor no celular de outra pessoa.

**Fase 3 — mantenedor.** Adoção de ponto órfão, edição, co-mantenedores, remoção de registro errado. *Pronto quando:* alguém que não criou o ponto consegue assumi-lo.

**Fase 4 — comunidade.** Feed por proximidade, pedidos de ajuda, comentários, reações, seguir ponto. *Pronto quando:* um pedido de ajuda é aberto e coberto por outra pessoa.

**Fase 5 — notificações.** Job de prazo, Edge Function de push, tela e preferências. *Pronto quando:* você recebe no celular que um ponto seu passou do prazo.

**Fase 6 — piloto.** Onboarding, reportar/bloquear, textos revisados, TestFlight e faixa interna do Play, 10 pontos semeados no bairro. *Pronto quando:* dez pessoas que você não conhece estão usando.

As fases 1–3 são o caminho crítico; 4 e 5 podem ser cortadas se o prazo apertar — o app continua útil sem elas, só menos vivo.

---

## 6. Segurança e privacidade

Isso não é detalhe de compliance, é o que pode machucar alguém.

- **Ponto é lugar público.** No cadastro, texto explícito: não marque a frente da casa de ninguém. Ponto em endereço residencial é passível de denúncia e remoção.
- **Coordenada arredondada** na exibição pública (~50 m). A precisão cheia fica no banco, para o cálculo de distância.
- **Protetoras sofrem retaliação.** Quem alimenta animal de rua é hostilizado por vizinho e, às vezes, ameaçado. O perfil mostra só primeiro nome e inicial, e o histórico de registros de uma pessoa não é público — só o do ponto.
- Nenhum dado de localização do usuário é gravado. A posição é usada no aparelho e descartada.
- Sem anúncio, sem tracker, sem SDK de terceiro no MVP.

---

## 7. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| **Mapa vazio no lançamento** — o app não vale nada com zero pontos | Alta | Semear 10–15 pontos com 5 protetoras antes de abrir, e cadastrá-los junto com elas |
| Registrar dá trabalho e não devolve nada na hora | Alta | Registro mínimo em dois toques; a tela devolve na hora "você é o primeiro hoje" ou "Marina passou às 7h" |
| Ponto marcado errado ou de sacanagem | Média | Mantenedor edita, qualquer um denuncia, admin remove |
| Custo do Mapbox | Média | Free tier cobre o piloto com folga; monitorar MAU antes de abrir outra cidade |
| Uma pessoa carrega o app sozinha e desiste | Média | É exatamente o que o pedido de ajuda e a adoção de ponto existem para evitar — e o que o piloto mede |

---

## 8. Quando o MVP está pronto para o piloto

- [ ] Fases 1 a 6 fechadas
- [ ] Um registro completo leva menos de 15 segundos com uma mão
- [ ] O mapa abre em menos de 3 segundos em 4G
- [ ] RLS testada com dois usuários: ninguém edita ponto que não mantém
- [ ] Push chega em iOS e Android
- [ ] 10 pontos reais cadastrados no bairro piloto
- [ ] Texto de privacidade no cadastro de ponto revisado
