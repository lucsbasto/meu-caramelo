# Meu Caramelo

Mapa colaborativo de pontos de alimentação de animais de rua. Voluntários
registram quando alimentaram um ponto, e qualquer pessoa vê pelo mapa quais
pontos já foram atendidos hoje e quais ainda precisam — evitando desperdício e
garantindo que ninguém fique sem comer.

> Status: **em implementação**. Fase 1 (esqueleto) sendo montada. O produto está
> integralmente especificado em [`docs/`](docs/); esta base de código está
> começando a partir daquela especificação.

## O que o app prova

O MVP é um instrumento para medir três hipóteses (ver
[`docs/mvp-escopo.md`](docs/mvp-escopo.md)):

- **H1** — quem alimenta se dá ao trabalho de registrar (registro em < 15s).
- **H2** — saber que alguém já passou muda o comportamento.
- **H3** — existe gente disposta a assumir um ponto.

Piloto: um bairro, 4 semanas, meta de 20 voluntários ativos.

## Stack

- **App:** Expo (dev client) + Expo Router + TypeScript
- **Mapa:** `@rnmapbox/maps` com o style `mapbox/estilo-caramelo.json`
- **Backend:** Supabase (Postgres + PostGIS, Auth, Realtime, Edge Functions)
- **Estado remoto:** TanStack Query + Realtime do Supabase

`@rnmapbox/maps` é nativo, então **Expo Go não funciona** — é preciso um dev
client (EAS Build).

## Estrutura

```
app/                 rotas Expo Router (tabs: mapa / feed / perfil)
src/
  features/          código por domínio (auth, pontos, registros, mapa, ...)
  components/        componentes recorrentes (design §5.5)
  lib/               supabase client, tanstack query, tipos do banco
  theme/             cores, tipografia, raios, espaçamento (design §5)
supabase/
  migrations/        schema + RLS + view + rpc
  seed.sql           dados de desenvolvimento (usuário + 3 pontos)
docs/                especificação, escopo do MVP, design, patrocínio
design/              artboards do mockup (.dc.html) — referência
mapbox/              style caramelo + tela de mapa de referência
```

## Rodando o projeto

Pré-requisitos: Node 20+, [Supabase CLI](https://supabase.com/docs/guides/cli),
conta [Expo/EAS](https://expo.dev) e um token do [Mapbox](https://mapbox.com).

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env      # preencha url/anon key do Supabase e token do Mapbox

# 3. banco (Supabase local)
supabase start
supabase db reset         # aplica migrations + seed

# 4. build do dev client e start (dispositivo/emulador)
npx expo run:android      # ou: npx expo run:ios
npm start                 # depois, para o servidor de dev
```

Se as versões nativas reclamarem, alinhe com `npx expo install --fix`.

## Roadmap

Construção em 6 fases (detalhe em [`docs/mvp-escopo.md`](docs/mvp-escopo.md) §5).
As fases 1–3 são o caminho crítico.

- [ ] **Fase 1 — esqueleto:** projeto Expo, auth, schema com RLS, mapa com pontos reais
- [ ] **Fase 2 — núcleo:** criar ponto, detalhe, registrar alimentação, status derivado
- [ ] **Fase 3 — mantenedor:** adoção, edição, co-mantenedores
- [ ] **Fase 4 — comunidade:** feed, pedidos de ajuda, comentários, reações
- [ ] **Fase 5 — notificações:** job de prazo, push, preferências
- [ ] **Fase 6 — piloto:** onboarding, moderação, seed de 10 pontos no bairro

## Privacidade

Ponto de alimentação é lugar público — nunca a frente da casa de alguém.
Coordenadas são arredondadas (~50 m) na exibição pública. O histórico de
registros de uma pessoa não é público (protetoras sofrem retaliação). Ver
[`docs/mvp-escopo.md`](docs/mvp-escopo.md) §6.

## Documentação

- [`docs/meu-caramelo-especificacao.md`](docs/meu-caramelo-especificacao.md) — produto e telas
- [`docs/mvp-escopo.md`](docs/mvp-escopo.md) — recorte, schema SQL, fases, riscos
- [`docs/design-do-app.md`](docs/design-do-app.md) — sistema visual e telas
- [`docs/patrocinio.md`](docs/patrocinio.md) — modelo de patrocínio (pós-MVP)

## Licença

A definir.
