---
title: WP14 Push Dev Client Build
aliases: [push dev build, eas dev client, fcm apns setup, expo push credentials, wp14 r6, push e2e]
summary: HITL checklist p/ provar push ponta a ponta em device real. EAS dev build + credenciais FCM V1 + APNs. Expo Go nao serve.
tags: [dev-flow/tooling]
created: 2026-09-22
template: ai-note
status: seed
---

# WP14 Push Dev Client Build

Prova de ponta a ponta em aparelho real: linha `pending` em `notificacoes` -> cron -> Edge Function `enviar-push` -> push no iOS/Android -> toque abre a tela alvo. Slice **HITL**: exige contas pagas do usuario. Ticket #58 / mapa #38 / WP #21.

## Pre-check (agente, ja pronto)

| Item | Estado |
|------|--------|
| `expo-dev-client` | instalado (~57.0.19) |
| `expo-device` | instalado (^57.0.2) |
| `expo-notifications` (dep + plugin) | instalado; plugin unico em `app.config.ts` (era duplicado, corrigido) |
| EAS `projectId` | `844a44e7-3786-4dc6-b608-cac9e0e02d9c` em `app.config.ts` |
| `eas.json` profile `development` | pronto (`developmentClient: true`, `distribution: internal`, iOS `simulator: false`) |
| Registro de token | `usePushRegistration` (T7 #45); upsert em `device_tokens` |
| Pipeline server | EF `enviar-push` + cron versionado (migration 0014, R4 #56) |

## Passos HITL (usuario)

Ordem importa. Nada disto o agente faz sozinho: precisa das contas Apple/Google e do `eas build` na maquina do usuario.

### 1. Contas + CLI

- Conta **Apple Developer** paga (99 USD/ano) — obrigatoria p/ APNs e build iOS.
- Projeto **Firebase** (Google) p/ FCM V1 no Android.
- `npm i -g eas-cli` e `eas login` (conta EAS owner `meucaramelo`).

### 2. Credenciais Android — FCM V1

- Firebase Console -> projeto -> Project settings -> Service accounts -> **Generate new private key** -> baixa o JSON (service account).
- `eas credentials` -> platform Android -> profile `development` -> **Google Service Account Key (FCM V1)** -> upload do JSON.
- Bate com o T1 #39: Expo envia via FCM V1, nao legacy.

### 3. Credenciais iOS — APNs

- `eas credentials` -> platform iOS -> profile `development`.
- Deixa o EAS **gerir a APNs Key** (recomendado): ele cria/registra no Apple Developer com a sessao logada.
- Bundle id ja fixo: `com.meucaramelo.app`.

### 4. Secret do Expo (server-side, ja pode existir)

Env `EXPO_ACCESS_TOKEN` na Edge Function autentica os envios (T1 #39). So precisa se ainda nao setado:

```
npx supabase secrets set EXPO_ACCESS_TOKEN=<token>
```

Token em expo.dev -> Account -> Access Tokens. Service role e `EDGE_CRON_SECRET` sao setup do R4 (#56), fora deste ticket.

### 5. Build

```
eas build --profile development --platform android
eas build --profile development --platform ios
```

Instala o dev client (QR/link do EAS) no aparelho fisico. **Expo Go nao serve** — push nativo exige dev client.

### 6. Validacao e2e

- Abre o app, faz login -> confirma linha em `device_tokens` com `token` = `ExponentPushToken[...]` real (nao `null`, nao Expo Go).
- Insere linha de teste:

```sql
insert into notificacoes (user_id, tipo, payload)
values ('<user_id>', 'comentario', '{"registro_id":"<id>"}'::jsonb);
```

- Em ~1 min: cron -> EF marca `push_status='sent'`, push chega no aparelho.
- **Toque** na notificacao abre a tela alvo (tabela `tipo->rota` em `src/features/notificacoes/tipos.ts`, T6/R3).
- Testar iOS e Android.

## Gotchas

- Silencio 22h-07h (TZ America/Sao_Paulo) => `push_status='skipped'`, **push nao chega** (T5 #43). Testar em horario diurno.
- Teto 5 `sent`/dia/usuario => 6o push do dia vira `skipped`.
- Foreground: **sem banner do SO**, toast in-app; so o **toque** navega (T8/R5).
- Cold start deslogado: navegacao segurada ate router+auth prontos, flush pos-login (T8).
- `pg_net` fire-and-forget: cron nao ve status HTTP; idempotencia da varredura cobre (R4).

## Aceite (#58)

- [ ] Build development iOS + Android com FCM V1 + APNs.
- [ ] Dev client registra `ExponentPushToken[...]` em `device_tokens`.
- [ ] Notificacao de teste chega no iOS e no Android.
- [ ] Toque abre a tela alvo.
- [ ] Passos HITL documentados (este doc).

## Related

[[Dev Flow MOC]] · [[Agent Routing]]
