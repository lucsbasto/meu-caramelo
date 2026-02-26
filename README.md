# Meu Caramelo MVP (React Native + Supabase)

Este MVP foi desenhado para **aprender mobile na prática** sem complexidade desnecessária.

## Objetivo do MVP

Permitir que voluntários:
- vejam pontos de alimentação no mapa;
- consultem lista de pontos e status.

## Arquitetura (e por que)

### 1) Expo + React Native (TypeScript)
- **Decisão**: usar Expo gerenciado.
- **Por quê**: reduz atrito de ambiente nativo no início. Você aprende UI, estado, navegação e dados primeiro.

### 2) React Navigation (abas)
- **Decisão**: 2 tabs (`Mapa`, `Pontos`).
- **Por quê**: como o app está em modo leitura, o fluxo é focado em monitoramento.

### 3) Supabase como único backend
- **Decisão**: tabela única `feeding_points` com RLS apenas de leitura para `anon`.
- **Por quê**: modelagem mínima para validar produto rápido e já aprender banco + políticas.

### 4) Camadas simples (`services` + `hooks` + `screens`)
- **Decisão**:
  - `services`: chamadas ao Supabase
  - `hooks`: estado e realtime
  - `screens/components`: UI
- **Por quê**: separa responsabilidades sem superarquitetar.

### 5) Realtime por `postgres_changes`
- **Decisão**: toda mudança na tabela dispara `refresh`.
- **Por quê**: colaboração é o centro do produto; voluntários precisam ver atualização quase em tempo real.

## Estrutura

- `App.tsx`: providers + navegação
- `src/navigation/AppNavigator.tsx`: abas
- `src/screens/*`: telas
- `src/hooks/useFeedingPoints.ts`: estado + realtime
- `src/services/feedingPoints.ts`: CRUD básico
- `src/lib/supabase.ts`: client
- `supabase/schema.sql`: banco + políticas

## Setup local

1. Instale dependências:
   ```bash
   npm install
   ```

2. Crie `.env` a partir do exemplo:
   ```bash
   cp .env.example .env
   ```

3. Preencha:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

4. No Supabase SQL Editor, rode `supabase/schema.sql` para aplicar as políticas de leitura.

5. Rode o app:
   ```bash
   npm run start
   ```

## Próximos passos de aprendizado (ordem recomendada)

1. **Autenticação** para controlar quem pode criar/editar pontos no futuro.
2. **Geolocalização real** para centralizar o mapa no usuário.
3. **Filtros no mapa/lista** por status.
4. **Histórico de atualizações** (tabela `feeding_point_updates`).
5. **Gamificação leve** (contribuições por voluntário).

## Observação de produto

Esse MVP já valida a tese principal: **coordenação comunitária descentralizada** para reduzir fome e desidratação de animais de rua.
