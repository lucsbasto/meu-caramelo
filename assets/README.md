# Assets — Meu Caramelo

Abra **`galeria.html`** no navegador para ver tudo de uma vez.

```
assets/
├── galeria.html          ← todos os ícones, pins e cores numa página
├── tokens.json           ← cores, tipografia, raios, alvos de toque, regra de status
├── tokens.ts             ← o mesmo, tipado, para importar no app
├── icones/               ← 36 ícones .svg + index.tsx (react-native-svg) + catalogo.json
├── mapa/                 ← marcadores prontos do mapa
├── marca/                ← símbolo e assinatura horizontal
└── ilustracoes/          ← ilustração do onboarding
```

## Ícones

Grid 24×24, traço 1,9, pontas e junções arredondadas. Todos usam `currentColor` — **a cor vem de quem usa, nunca do arquivo**. É o que permite o mesmo `tigela.svg` ser caramelo no botão, branco no pin e cinza quando desabilitado.

No app, importe do `index.tsx`:

```tsx
import { IconeTigela, IconePin } from './assets/icones';
import { cores } from './assets/tokens';

<IconeTigela size={20} color={cores.sobreEscuro} />
```

Tamanhos em uso: 13 (dentro de selo) · 17–19 (linha, chip) · 20–23 (botão, aba) · 26 (conquista).

## Marcadores do mapa

Todos os pins de ponto são **a mesma patinha branca**. O marcador carrega duas informações independentes:

- **Preenchimento = comida.** Verde cheio · âmbar precisa hoje · vermelho vazio.
- **Borda = responsabilidade.** Anel caramelo quando o ponto tem mantenedor, anel branco quando está sem dono.

| Arquivo | Preenchimento | Borda | Significado |
|---|---|---|---|
| `pin-ok.svg` | verde `#3E8F5E` | caramelo | cheio, com dono |
| `pin-precisa.svg` | âmbar `#E0A93A` | caramelo | passou de 4 h, com dono |
| `pin-urgente.svg` | vermelho `#C1452F` | caramelo | vazio, com dono |
| `pin-ok-sem-dono.svg` | verde | branca | cheio, sem mantenedor |
| `pin-precisa-sem-dono.svg` | âmbar | branca | passou de 4 h, sem mantenedor |
| `pin-urgente-sem-dono.svg` | vermelho | branca | **vazio e sem dono** — o pin mais urgente do mapa |
| `pin-selecionado.svg` | âmbar, 18% maior | caramelo | pin tocado |
| `pin-apoiador.svg` | branco, borda verde, **quadrado** | — | apoiador (fora do MVP) |
| `posicao-usuario.svg` | caramelo com halo | — | onde você está |

Cada um vem em 56×56 com os anéis já desenhados e folga para a sombra. Entre o preenchimento e o anel caramelo há um fio branco de 2 px — sem ele, o âmbar encosta no caramelo e os dois viram uma mancha só. No `@rnmapbox/maps`, registre como imagem do marcador ou use o SVG direto em `MarkerView`.

## Tokens

Nunca escreva hex solto no código: importe de `tokens.ts`. Se uma cor não está lá, ela não faz parte do sistema — ou é um caso novo que precisa entrar no arquivo primeiro.

## O que ainda falta

Estes não dá para gerar por aqui e precisam de ferramenta de imagem:

- **Ícone do app** — 1024×1024 PNG. O `marca/simbolo.svg` serve de base: exporte em PNG e gere os tamanhos com `expo-app-icon` ou equivalente.
- **Splash screen** — fundo `#FCF6EE` com o símbolo centralizado.
- **Imagem de compartilhamento** (Open Graph) — 1200×630, para quando um ponto for compartilhado por link.
- **Fotos reais** — todas as fotos de ponto e de animal nos mockups são placeholders vetoriais.
- **Fontes** — Bricolage Grotesque e Instrument Sans vêm do Google Fonts. No app, embarque os `.ttf` com `expo-font` em vez de baixar em tempo de execução.
