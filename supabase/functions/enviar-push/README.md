# enviar-push (WP14, §7.5)

Edge Function que transforma linhas de `notificacoes` em push pela Expo Push API.

## O que faz

1. Varre `notificacoes` com `push_status = 'pending'` criadas nas últimas 24h.
2. Para cada uma, aplica as regras da §7.5 (`limites.ts`):
   - teto de **5 push por usuário por dia** (fuso `PUSH_TZ`);
   - **silêncio 22h–7h**, exceto `pedido_ajuda` com `data_alvo` = hoje.
3. Monta título/corpo (`conteudoPara`) e o `data` cru `{ tipo, ...ids }`
   (`dadosDeRota`) e envia para todos os `device_tokens` do usuário. A rota §4.5
   **não** é computada aqui: por contrato T6 (#44) a tabela `tipo → rota` vive no
   app (`src/features/notificacoes/tipos.ts`), que resolve o destino no toque.
4. Marca o estado terminal e apaga tokens `DeviceNotRegistered`.

## Estado do push (`push_status`)

Cada linha de `notificacoes` carrega o rastreio de push:

- `pending` — na fila (default), varrida pela função.
- `sent` — enviada; `push_enviado_em` guarda o carimbo do horário.
- `failed` — falha terminal; `push_erro` guarda a mensagem, `push_tentativas`
  conta as tentativas. Sem retry silencioso.
- `skipped` — fora da janela de envio de 24h (backfill de linhas antigas).

A varredura é segura para concorrência: antes de enviar, cada linha é
**reivindicada** com um update condicional (`push_status = 'sent'` só se ainda
estiver `'pending'`), que também incrementa `push_tentativas`. Execuções
sobrepostas (cron + webhook, ou ticks concorrentes) não duplicam push; se o
envio falhar, a linha vira `'failed'` com a trilha do erro. Pode ser chamada
por cron ou por database webhook no INSERT de `notificacoes`.

## Secrets

| Nome | Origem | Default |
|---|---|---|
| `SUPABASE_URL` | plataforma | — |
| `SUPABASE_SERVICE_ROLE_KEY` | plataforma | — |
| `PUSH_TZ` | `supabase secrets set` | `America/Araguaina` |
| `EXPO_ACCESS_TOKEN` | `supabase secrets set` | vazio (opcional) |
| `EDGE_CRON_SECRET` | `supabase secrets set` | vazio (opcional) |

Quando `EDGE_CRON_SECRET` está setado, a função exige `Authorization: Bearer
<EDGE_CRON_SECRET>` e recusa 401 sem ele — necessário porque `verify_jwt=false`
(config.toml) deixaria o endpoint aberto. O mesmo token vive no Vault (`select
vault.create_secret(..., 'edge_cron_secret')`) e o heartbeat pg_cron o injeta no
header. Sem o secret (dev/local) não há gate.

## Deploy e agendamento

O gatilho é **versionado** na migration `0014_push_cron_trigger.sql` (WP14 R4
#56): um job pg_cron de 1 em 1 minuto faz `net.http_post` (pg_net) para
`/functions/v1/enviar-push` autenticando com o secret do Vault. pg_net é
fire-and-forget (dispara pós-COMMIT, resposta em `net._http_response`), então o
cron não vê o status HTTP — a idempotência da varredura (claim atômico
`pending→sent`) cobre um tick perdido no minuto seguinte.

Deploy da função e secrets (uma vez por ambiente):

```bash
supabase functions deploy enviar-push
supabase secrets set PUSH_TZ=America/Araguaina
supabase secrets set EDGE_CRON_SECRET=<mesmo token do Vault>
```

Provisionamento do Vault (HITL, valores sensíveis, não versionados) — ver o
cabeçalho de `0014_push_cron_trigger.sql`:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<mesmo token forte>',              'edge_cron_secret');
```

As extensões `pg_net` e `pg_cron` são provisionadas pela própria migration
(`create extension if not exists`). Alternativa a pg_cron: apontar um database
webhook de INSERT em `public.notificacoes` para a função (nudge opcional; o poll
permanece primário).

## Testes

A lógica pura (limites, silêncio, `data` cru de rota, conteúdo) é coberta por
`__tests__/limites.test.ts`; a tabela `tipo → rota` (§4.5) e seus casos de borda,
por `src/features/notificacoes/__tests__/deepLink.test.ts`. Ambos rodam no
`pnpm test` normal do projeto.
