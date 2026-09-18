# enviar-push (WP14, §7.5)

Edge Function que transforma linhas de `notificacoes` em push pela Expo Push API.

## O que faz

1. Varre `notificacoes` com `push_enviado_em is null` criadas nas últimas 24h.
2. Para cada uma, aplica as regras da §7.5 (`limites.ts`):
   - teto de **5 push por usuário por dia** (fuso `PUSH_TZ`);
   - **silêncio 22h–7h**, exceto `pedido_ajuda` com `data_alvo` = hoje.
3. Monta título/corpo (`conteudoPara`) e o deep link `data.link` (§4.5, `linkPara`)
   e envia para todos os `device_tokens` do usuário.
4. Marca `push_enviado_em` nas enviadas e apaga tokens `DeviceNotRegistered`.

A varredura é segura para concorrência: antes de enviar, cada linha é
**reivindicada** com um update condicional (`push_enviado_em` só se ainda for
`null`). Execuções sobrepostas (cron + webhook, ou ticks concorrentes) não
duplicam push; se o envio falhar, a linha volta para a fila. Pode ser chamada
por cron ou por database webhook no INSERT de `notificacoes`.

## Secrets

| Nome | Origem | Default |
|---|---|---|
| `SUPABASE_URL` | plataforma | — |
| `SUPABASE_SERVICE_ROLE_KEY` | plataforma | — |
| `PUSH_TZ` | `supabase secrets set` | `America/Araguaina` |
| `EXPO_ACCESS_TOKEN` | `supabase secrets set` | vazio (opcional) |

## Deploy e agendamento

```bash
supabase functions deploy enviar-push
supabase secrets set PUSH_TZ=America/Araguaina
```

Agende de 1 em 1 minuto (pg_cron + pg_net) ou aponte um database webhook de
INSERT em `public.notificacoes` para a função.

## Testes

A lógica pura (limites, silêncio, deep link, conteúdo) é coberta por
`__tests__/limites.test.ts`, que roda no `pnpm test` normal do projeto.
