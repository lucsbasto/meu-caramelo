# Meu Caramelo — design do app

Mockup no Claude Design (canvas multi-artboard, editável e exportável em PNG/PDF), em duas páginas: **Fluxo do app** (10 telas) e **Patrocínio — 3 opções**.

Os arquivos dos artboards estão em `design/` — cada `.dc.html` é uma tela, `canvas.json` é o layout, e `meu-caramelo-app.html` é o canvas inteiro (abre no navegador).

## Telas

1. **Onboarding** — hero ilustrado, números da comunidade, criar conta / já tenho conta
2. **Mapa** — tela inicial; busca flutuante, chips de filtro, pins por status, folha do ponto selecionado (com o mantenedor), tab bar com FAB de registro rápido
3. **Detalhe do ponto** — foto, status, 3 estatísticas, card do mantenedor, histórico de quem passou, CTA fixo
4. **Ponto sem mantenedor** — estado órfão: bloco explicando os poderes e CTA "Adotar este ponto"
5. **Registrar alimentação** — ponto, tipo de alimento em chips, quantidade, animais atendidos, foto e observação
6. **Feed da comunidade** — três tipos de card: registro, pedido de ajuda ("Quero cobrir") e evento de uma linha
7. **Ranking** — pódio, posição do usuário com o que falta para subir, lista, conquistas *(fora do MVP)*
8. **Conquistas** — 9 badges em três eixos, com progresso nas bloqueadas *(fora do MVP)*
9. **Perfil** — estatísticas, posição no ranking, faixa de conquistas, menu
10. **Notificações** — agrupadas por Hoje / Esta semana

## Sistema visual

- Fundo `#FCF6EE` · superfície `#FFFFFF` · borda `#EBDFD0`
- Texto `#2B1D12` · secundário `#6B5645` · terciário `#8A7460` · fraco `#A08F7C` · sobre escuro `#FFF7EC`
- Caramelo `#B9702F` (pressionado `#8F521C`) · verde `#3E8F5E` (par claro `#E4EFE7`/`#2F6B48`) · alerta `#C1452F` (par claro `#F9E7E2`)
- Tipografia: **Bricolage Grotesque** (títulos) + **Instrument Sans** (texto)
- Raios: 12 controles · 16–20 cartões · 22–26 folhas · 999 pílulas
- Alvos de toque: 44 px em botões, linhas e tab bar; 40 px nos chips de filtro
- Sem barra de status nem teclado falsos nos mockups — esse espaço fica para o sistema

## Status dos pontos

| Status | Tempo desde o último registro | Cor do pin |
|---|---|---|
| Ok hoje | < 4 h | verde `#3E8F5E` |
| Precisa hoje | 4–12 h | caramelo `#B9702F` |
| Urgente | > 12 h | vermelho `#C1452F` |

O filtro "Precisa hoje" no mapa cobre caramelo + vermelho. Ponto órfão fica cinza `#A08F7C`, sobrepondo o status.

## Mantenedor do ponto

- Um mantenedor principal + co-mantenedores. A coroa escura no avatar é a marca visual.
- Quem cria o ponto já é mantenedor; ponto sem dono mostra "Adotar este ponto".
- Poderes no MVP: editar nome, endereço e fotos; corrigir ou remover registro errado; convidar co-mantenedores.
- Animais fixos ficaram fora do MVP — a contagem de animais é por registro, não um cadastro do ponto.

## Mapa (Mapbox)

O canvas de design não faz requisição de rede, então o mapa nos artboards é desenhado à mão como referência. O mapa real está em `mapbox/`:

- `estilo-caramelo.json` — style Mapbox (source `mapbox-streets-v8`) na paleta do app: vias em branco quente, rodovia em âmbar, parques verde-oliva, água azul dessaturado, rótulos em marrom
- `mapa-preview.html` — abre no navegador com um token público do Mapbox e mostra o mapa real com a mesma interface do mockup
- `MapaScreen.tsx` — `@rnmapbox/maps` com `styleJSON`, markers por status e subscription realtime do Supabase

## Em aberto

- Mockups são estáticos; um protótipo clicável ainda não foi feito
- Fotos de animais e de pontos são placeholders
- Números (142 pontos, 610 voluntários, posições do ranking) são ilustrativos
