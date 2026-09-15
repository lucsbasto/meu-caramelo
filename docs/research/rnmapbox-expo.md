# Integração `@rnmapbox/maps` no Expo SDK 52 (dev client, New Architecture)

Pesquisa para a issue #3. Alvo: Expo SDK 52 / React Native 0.76 / New Architecture, usando
`styleJSON` com o style JSON custom (`mapbox/estilo-caramelo.json`) e marcadores por status.

Contexto atual do repo (`package.json`): `expo ~52.0.0`, `react-native 0.76.0`,
`react 18.3.1`, `@rnmapbox/maps ^10.1.33`.

---

## 1. Versão compatível (Expo SDK 52 / RN 0.76 / New Architecture)

- **Manter a linha v10.x do pacote JS `@rnmapbox/maps`.** O pacote JS ainda está na série
  **v10** (última publicada: **10.3.5**). "v11" na documentação refere-se ao *Mapbox Maps SDK
  nativo* v11, **não** ao pacote npm. O pacote v10.2+ já usa o Mapbox Maps SDK nativo `11.0.*`
  por padrão.
- **Suporte a New Architecture (Fabric)** existe desde a **10.1.0** ("fabric support") e vem
  recebendo correções contínuas (ex.: `fix(PointAnnotation): fix nested children not rendering
  on New Architecture (Fabric)`). RN 0.76 / Expo 52 funcionam com a linha 10.x atual.
- **Ação recomendada:** trocar o pin `^10.1.33` por uma versão fixa e recente da linha 10.x
  para pegar as correções de New Arch — **`"@rnmapbox/maps": "10.3.5"`** (o caret `^10.1.33`
  hoje já resolveria para 10.3.x, mas fixar evita surpresas de build). **Não é necessário
  mudar de Expo SDK** — SDK 52 é adequado.
- Não funciona no Expo Go (precisa de código nativo) — por isso o **dev client** já usado
  (`expo start --dev-client`) está correto.
- New Architecture é ligada por padrão no SDK 52; manter `newArchEnabled` (default) ligado.

Fontes: <https://github.com/rnmapbox/maps> · <https://www.npmjs.com/package/@rnmapbox/maps> ·
<https://rnmapbox.github.io/docs/install> · <https://expo.dev/changelog/2024-11-12-sdk-52> ·
<https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture>

## 2. Config plugin + token de download

- **Token de download NÃO é mais necessário.** A doc oficial de instalação afirma:
  *"mapbox lifted auth requirement from downloads so MAPBOX_DOWNLOADS_TOKEN is no longer
  needed"*. O mantenedor recomenda **remover** `RNMapboxMapsDownloadToken` /
  `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` das configs.
- **Bloco recomendado no `app.json`** (mínimo, sem download token):

```json
{
  "expo": {
    "plugins": [
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsVersion": "11.8.0"
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Mostrar sua localização no mapa."
        }
      ]
    ]
  }
}
```

- `RNMapboxMapsVersion` sobrescreve/fixa a versão do **SDK nativo Mapbox v11** (opcional; se
  omitido usa o default do pacote). Fixar dá builds reprodutíveis.
- **EAS secret vs app.json:** como o download token não é mais exigido, o mais limpo é
  **não passar token de download**. Caso um cenário legado ainda exija (ex.: SDK privado
  antigo), NÃO faça hardcode do `sk.` no `app.json`; use `app.config.js` lendo de env e um
  EAS secret:
  ```js
  // app.config.js
  ["@rnmapbox/maps", { RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN }]
  ```
  ```bash
  eas secret:create --scope project --name MAPBOX_DOWNLOAD_TOKEN --value sk.ey...
  ```
  O token `sk.` precisa do escopo **DOWNLOADS:READ** (segredo — nunca commitar).
- **Token público em runtime (obrigatório):** o `pk.ey...` (Default Public Token) usado por
  `Mapbox.setAccessToken(...)`. No Expo precisa do prefixo `EXPO_PUBLIC_` para chegar ao
  bundle — o código já usa `EXPO_PUBLIC_MAPBOX_TOKEN`, o que está correto. Esse token é o que
  autoriza os recursos `mapbox://` do style (tiles, glyphs, sprite).

Fontes: <https://github.com/rnmapbox/maps/blob/main/plugin/install.md> ·
<https://raw.githubusercontent.com/rnmapbox/maps/main/android/install.md> ·
<https://github.com/rnmapbox/maps/discussions/4064> · <https://rnmapbox.github.io/docs/install>

## 3. `styleJSON` com style JSON custom

- **Sim, `styleJSON` aceita um style Mapbox GL Style Spec v8 cru**, passado como **string**.
  O `mapbox/estilo-caramelo.json` (`"version": 8`, source vetorial
  `mapbox://mapbox.mapbox-streets-v8`) é exatamente esse formato e é usado como-está.
- **Uso correto:** `styleJSON={JSON.stringify(estiloCaramelo)}` — a prop recebe a string do
  JSON (o `MapaScreen.tsx` já faz isso). Não é preciso publicar o style no Mapbox Studio;
  dá para migrar para `styleURL` depois.
- **Gotchas:**
  - Os `mapbox://` do style (source `mapbox.mapbox-streets-v8`, `glyphs mapbox://fonts/...`,
    `sprite mapbox://sprites/...`) exigem um **token público `pk.` válido** via
    `Mapbox.setAccessToken(...)` **antes** de renderizar o mapa, senão tiles/fontes/sprite
    não carregam.
  - `styleURL` e `styleJSON` são mutuamente exclusivos — usar só `styleJSON`.
  - A doc da prop referencia a "TileJSON spec", mas na prática o valor esperado é o
    **style spec v8** completo (como o arquivo do projeto), não um TileJSON.

Fontes: <https://github.com/rnmapbox/maps/blob/main/docs/MapView.md> ·
<https://docs.mapbox.com/style-spec/reference/root/>

## 4. Marcadores por status: `ShapeSource` + `CircleLayer` vs `PointAnnotation`

- **Recomendação oficial (doc do `PointAnnotation`):**
  *"Consider using ShapeSource and SymbolLayer instead, if you have many points and static
  images, they'll offer much better performance"* e *"If you need interactive views please use
  MarkerView because PointAnnotation will render children onto a bitmap"*.
- **Para este caso (pins de status coloridos com updates em realtime via Supabase): usar
  `ShapeSource` + `CircleLayer`** (opcionalmente `+ SymbolLayer` para o ícone de pata).
  - Melhor performance: os pontos vivem no motor nativo do mapa; atualizar é só trocar a
    `FeatureCollection` (GeoJSON) — ideal para o canal realtime que muda o status de um ponto.
  - A cor por status vira uma *data-driven expression* no `circle-color` lendo uma propriedade
    `status` de cada feature (evita re-render de N componentes React).
  - Interação: `onPress` no `ShapeSource` retorna a feature tocada (para abrir a folha do
    ponto), sem precisar de um componente por marcador.
- **`PointAnnotation`/`MarkerView` por-ponto** (abordagem atual do `MapaScreen.tsx`) só se
  justifica para poucos marcadores com UI custom interativa; não escala bem e no New Arch
  (Fabric) `MarkerView`/`PointAnnotation` tiveram correções de layout/render recentes.

Fontes: <https://raw.githubusercontent.com/rnmapbox/maps/main/docs/PointAnnotation.md> ·
<https://github.com/rnmapbox/maps/issues/266>

## 5. Correções para o `MapaScreen.tsx` de referência

1. **Marcadores → migrar de `MarkerView` (um por ponto) para `ShapeSource` + `CircleLayer`.**
   Montar uma `FeatureCollection` a partir de `visiveis`, com `properties.status`; usar
   expressão `["match", ["get","status"], ...]` para `circle-color` e `onPress` do
   `ShapeSource` para selecionar o ponto. É a mudança de maior impacto (performance +
   realtime + compatibilidade com New Arch).
2. **Comentário de instalação desatualizado:** o cabeçalho menciona o token no
   `app.json/plugin` para downloads — o **download token não é mais necessário**. Manter só a
   nota do token público `pk.` via `EXPO_PUBLIC_MAPBOX_TOKEN` + `Mapbox.setAccessToken`.
3. **Garantir `setAccessToken` antes do render** (já está no top-level do módulo — ok);
   confirmar que `EXPO_PUBLIC_MAPBOX_TOKEN` é um token **público `pk.`**, não `sk.`.
4. **Import não usado:** `MarkerView` deixa de ser necessário após a migração; `PointAnnotation`
   não é usado. Ajustar imports para `MapView, Camera, ShapeSource, CircleLayer, UserLocation`
   (+ `SymbolLayer` se for renderizar o ícone de pata nativamente).
5. **Realtime:** o `INSERT` handler zera `horas_desde_ultima` localmente (ok para o pin), mas
   ao usar `ShapeSource` basta recomputar a `FeatureCollection` no `useMemo` — o mapa nativo
   reflete a mudança sem recriar componentes.
6. **Pin de versão:** alinhar `package.json` para `@rnmapbox/maps` `10.3.5` (ver seção 1).

Fontes: código atual `mapbox/MapaScreen.tsx`, `mapbox/estilo-caramelo.json`, `package.json` +
docs oficiais citadas acima.

---

### Resumo de decisões

- Pacote: **`@rnmapbox/maps` 10.3.5** (linha v10 do JS; SDK nativo Mapbox v11) — compatível com
  Expo SDK 52 / RN 0.76 / New Arch. Não mudar de SDK.
- Config: plugin `@rnmapbox/maps` no `app.json` com `RNMapboxMapsVersion` (native v11).
  **Sem download token** (não mais exigido). Token público `pk.` via `EXPO_PUBLIC_MAPBOX_TOKEN`.
- `styleJSON`: aceita o style v8 cru como string — uso atual correto; precisa do token `pk.`.
- Marcadores: **`ShapeSource` + `CircleLayer`** (data-driven color por status), não
  `PointAnnotation`/`MarkerView` por-ponto.
