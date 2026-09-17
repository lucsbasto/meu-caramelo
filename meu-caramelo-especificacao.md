# Meu Caramelo — Documentação de Produto e Telas

> **O que é este documento.** A descrição completa do aplicativo: cada tela, cada funcionalidade, cada regra, e o motivo de cada decisão. Ele serve de fonte para escrever a spec de implementação e de documentação viva do produto.
>
> **O que este documento não é.** Não é a spec técnica. Não traz assinatura de componente, nome de arquivo, biblioteca de estado nem contrato de API. Onde a decisão é de produto, ela está aqui e é vinculante. Onde a decisão é de implementação, o documento diz o que precisa ser verdade e deixa o "como" para quem escrever a spec.
>
> **Como ler.** Cada tela segue o mesmo molde: objetivo, como se chega, anatomia de cima para baixo, dados consumidos, interações, estados, regras de negócio e um bloco **Por quê** com as decisões e o que foi descartado. O bloco **Por quê** é a parte que não pode ser perdida numa reescrita: ele é o que impede que uma decisão cara seja desfeita por engano seis meses depois.

**Versão:** 1.0 · **Escopo do MVP:** núcleo + comunidade · **Stack:** Expo (dev client) + Supabase + Mapbox

---

## Sumário

1. [Visão do produto](#1-visão-do-produto)
2. [Princípios de design](#2-princípios-de-design)
3. [Conceitos do domínio](#3-conceitos-do-domínio)
4. [Arquitetura de navegação](#4-arquitetura-de-navegação)
5. [Sistema visual](#5-sistema-visual)
6. [Telas do MVP](#6-telas-do-mvp)
7. [Funcionalidades transversais](#7-funcionalidades-transversais)
8. [Telas desenhadas fora do MVP](#8-telas-desenhadas-fora-do-mvp)
9. [Tom de voz e microcopy](#9-tom-de-voz-e-microcopy)
10. [Perguntas em aberto](#10-perguntas-em-aberto)

---

## 1. Visão do produto

### 1.1 O problema

Em qualquer bairro brasileiro existe um conjunto de pessoas que alimenta animais em situação de rua. Elas não se conhecem, não se coordenam e não têm como saber o que as outras fizeram. O resultado é previsível e acontece todo dia:

- **Desperdício.** Três pessoas passam no mesmo ponto na mesma manhã; a ração estraga ao sol e atrai rato.
- **Buraco.** Ninguém passa por dois dias porque cada um achou que outro tinha ido.
- **Sobrecarga.** Uma pessoa banca um ponto sozinha, adoece ou viaja, e o ponto simplesmente para.
- **Invisibilidade.** Quem quer ajudar não sabe onde ajudar, e quem já ajuda não consegue pedir socorro para um dia específico.

O trabalho existe. O que não existe é a informação compartilhada sobre ele.

### 1.2 O que o app é

Um registro compartilhado, em mapa, de pontos de alimentação de animais de rua — quem passou, quando, e o que deixou.

O aplicativo não alimenta nenhum animal. Ele faz uma coisa só: transforma um esforço invisível e descoordenado em informação que as pessoas do bairro podem ver. Tudo mais no produto existe para sustentar esse registro.

### 1.3 O que o app não é

Declarar isto por escrito evita metade das discussões de escopo futuras.

| Não é | Por quê |
|---|---|
| Rede social de pets | O feed existe para coordenar trabalho, não para acumular seguidores. Sem perfil público de vaidade, sem contador de seguidores. |
| Plataforma de adoção | Adoção é outro produto, com outro fluxo, outra responsabilidade legal e outra comunidade. |
| Sistema de denúncia de maus-tratos | Denúncia exige canal oficial e responsabilidade que o app não tem como assumir. O app pode *apontar* para o canal certo, nunca substituí-lo. |
| Serviço de resgate | Resgate exige logística, veterinário e dinheiro. O app pode sinalizar um animal ferido; quem resgata é gente. |
| Marketplace de ração | Compra, pagamento e entrega trazem responsabilidade de e-commerce por um ganho marginal. |

### 1.4 Quem usa

**A protetora.** Alimenta de três a dez pontos, quase sempre sozinha, quase sempre do próprio bolso, quase sempre há anos. É a usuária mais valiosa e a mais cansada. O app ganha ou perde com ela: se para ela o registro for burocracia, ela não usa e ninguém mais tem o que ler.
*O que ela precisa:* registrar em segundos, sem tirar a mão da coleira; saber que não precisa ir hoje porque alguém já foi; conseguir pedir cobertura quando viaja.

**O vizinho ocasional.** Vê os bichos da praça, às vezes leva comida, não se considera "protetor". É a maior fatia de crescimento possível.
*O que ele precisa:* descobrir que existe um ponto perto; entender em dez segundos o que é útil levar; sentir que a contribuição dele conta mesmo sendo esporádica.

**O curioso.** Baixou porque viu no Instagram, não alimenta nada ainda.
*O que ele precisa:* ver o mapa sem cadastro, entender a ideia sem ler um texto, e encontrar um ponto que precisa hoje.

### 1.5 As três hipóteses que o MVP mede

O MVP é instrumento de medição, não produto acabado.

| # | Hipótese | Se falhar |
|---|---|---|
| **H1** | Quem alimenta se dá ao trabalho de registrar | Nada mais importa. Sem registro não há dado, e sem dado o app é um mapa estático. |
| **H2** | Saber que alguém já passou muda o comportamento | O app vira diário pessoal em vez de ferramenta de coordenação. |
| **H3** | Existe gente disposta a assumir um ponto | Os pontos ficam órfãos e a qualidade do dado apodrece. |

H1 é a mais frágil e a que mais restringe o design: é por causa dela que registrar tem que custar menos de 15 segundos e que quase todo campo do formulário é opcional.

---

## 2. Princípios de design

Sete regras que explicam decisões que se repetem no documento inteiro. Quando houver dúvida numa tela não prevista aqui, decida por elas.

**P1 — O mapa é o produto.** O app abre no mapa, sempre, sem dashboard, sem tela de boas-vindas, sem resumo. A primeira informação que a pessoa vê é onde tem bicho com fome perto dela. Qualquer tela que se proponha a vir antes do mapa precisa justificar por que vale atrasar isso.

**P2 — Registrar é sagrado, o resto é acessório.** O caminho para registrar uma alimentação é o mais curto do app, tem o maior alvo de toque, a cor mais forte, e está a um toque de qualquer tela principal. Nenhuma outra ação pode competir visualmente com ele. A cor caramelo `#B9702F` pertence a esse fluxo e não é usada para mais nada de destaque.

**P3 — Estado antes de identidade.** O que importa numa tela é *o estado do ponto* (alguém passou? quando?), não *quem* fez. Nome e avatar aparecem para dar confiança e crédito, nunca como métrica de reputação. Isso é o que separa este app de uma rede social e o que mantém o foco no animal.

**P4 — Culpa nunca é mecanismo.** O app não diz "você não passou hoje", não mostra sequência quebrada com cara de derrota, não usa vermelho para o comportamento do usuário. Vermelho é para o estado do ponto, nunca para a pessoa. Quem alimenta animal de rua já carrega culpa suficiente; um app que aumenta isso é desinstalado numa semana.

**P5 — Vazio não é erro.** Um bairro sem pontos, um ponto sem registros e um feed sem posts são estados normais no começo da vida do produto — e o começo é justamente quando o app precisa convencer. Toda tela tem um estado vazio desenhado, com uma ação que resolve o vazio.

**P6 — Nada de barra de status nem teclado falso.** Nos mockups, o espaço do sistema operacional fica livre. Na implementação, respeite *safe area* de verdade. Fake chrome desenhado por cima da barra do sistema é o erro visual mais comum em mockup de app e sempre aparece duplicado no aparelho real.

**P7 — Privacidade é decisão de produto, não de compliance.** Quem alimenta animal de rua é hostilizado por vizinho com frequência, e um mapa de pontos é também um mapa de quem passa ali todo dia. As decisões de exibição de nome, de coordenada e de histórico estão neste documento como regra de produto, não como nota de rodapé jurídica.

---

## 3. Conceitos do domínio

Vocabulário fechado. Usar exatamente estes termos no código, na interface e nas conversas evita que "local", "lugar", "spot" e "ponto" virem quatro coisas.

**Ponto (de alimentação).** Um lugar público onde animais de rua são alimentados com alguma regularidade. Tem nome, endereço aproximado, coordenada e foto opcional. É a entidade central do app. *Ponto não é endereço residencial* — ver regra em §7.6.

**Registro.** O ato de alimentar, anotado por quem alimentou. Pertence a um ponto e a uma pessoa, tem data e hora, e descreve o que foi deixado. É o evento que alimenta todo o resto do sistema: status, feed, notificação e (depois) conquista.

**Status do ponto.** Uma classificação derivada — nunca digitada — do tempo desde o último registro. Três valores: `ok hoje`, `precisa hoje`, `urgente`. É o que dá cor ao pin no mapa. Ver §7.3.

**Mantenedor.** A pessoa responsável por um ponto: mantém o cadastro correto, corrige registro errado e é a referência de quem cuida dali. Um por ponto. Ver §7.4.

**Co-mantenedor.** Pessoa convidada pelo mantenedor, com os mesmos poderes de edição, sem ser "o rosto" do ponto. Quantos forem necessários. Existe para o ponto não morrer quando o mantenedor viaja.

**Ponto órfão.** Ponto sem mantenedor — porque nunca teve ou porque o mantenedor saiu. Mostra um convite de adoção. É um estado a ser combatido pelo produto, não um estado neutro.

**Pedido de ajuda.** Um mantenedor ou voluntário avisa que não vai conseguir cobrir um ponto num dia específico. Tem texto, data-alvo e status.

**Cobertura.** Alguém aceitar um pedido de ajuda. Gera compromisso social, não obrigação no sistema — o app não pune quem não cumpre.

**Voluntário.** Qualquer pessoa cadastrada. Não há papel "usuário comum" versus "protetora": a diferença entre as pessoas é o que elas fizeram, não um cargo.

---

## 4. Arquitetura de navegação

### 4.1 Estrutura

Quatro abas fixas e um botão central de ação. A barra de abas fica visível em todas as telas de primeiro nível e some nas telas empilhadas (push) e nos modais.

```
Tab bar
├── Mapa            ← aba inicial, sempre
├── Comunidade      ← feed
├── [ + ]           ← botão central: registrar alimentação
├── Ranking         ← fora do MVP; a aba só aparece quando existir
└── Perfil
```

No MVP, com o Ranking fora, a barra tem **três abas** (Mapa, Comunidade, Perfil) mais o botão central. A posição do botão central não muda quando o Ranking entrar — ele permanece no meio, e o Ranking ocupa a terceira posição à direita.

### 4.2 Telas empilhadas (push)

Abrem por cima, com botão de voltar, e escondem a barra de abas:

- Detalhe do ponto
- Criar ponto / Editar ponto
- Registrar alimentação
- Notificações
- Configurações
- Perfil público de outra pessoa
- Conquistas *(fora do MVP)*

### 4.3 Modais e folhas

- **Folha inferior do mapa** (*bottom sheet*): resumo do ponto selecionado. Não é navegação — é uma camada sobre o mapa.
- **Folha de confirmação:** ações destrutivas (remover registro, desativar ponto, sair da conta).
- **Folha de compartilhamento:** nativa do sistema.

### 4.4 Mapa de fluxos

**Fluxo principal — alimentar um ponto conhecido**
`Mapa → toca no pin → folha → "Alimentar" → Registrar → confirma → volta ao Mapa com o pin já verde`

Quatro toques do abrir do app até o registro salvo. Este é o caminho que precisa ficar abaixo de 15 segundos.

**Fluxo de descoberta — novo usuário**
`Onboarding → Mapa (sem login) → toca num pin → folha → "Ver ponto" → Detalhe → "Registrar alimentação" → parede de login → Login → Registrar`

A parede de login aparece o mais tarde possível, só quando a pessoa vai escrever algo.

**Fluxo de adoção**
`Mapa → pin cinza → folha → "Ver ponto" → Ponto órfão → "Adotar este ponto" → confirmação → Detalhe do ponto, agora com você como mantenedor`

**Fluxo de cobertura**
`Notificação push → Feed → card de pedido de ajuda → "Quero cobrir" → confirmação → no dia, notificação de lembrete`

### 4.5 Deep links

Toda notificação abre a tela final, nunca a home. Os destinos que precisam existir:

| Link | Abre |
|---|---|
| `/ponto/:id` | Detalhe do ponto |
| `/ponto/:id/registrar` | Registrar alimentação já com o ponto escolhido |
| `/registro/:id` | Detalhe do registro com os comentários |
| `/pedido/:id` | Card do pedido de ajuda no feed |
| `/convite/:token` | Aceite de convite de co-mantenedor |

**Por quê.** Push que abre na home obriga a pessoa a caçar o que gerou o aviso e queima a única chance de atenção que a notificação comprou.

---

## 5. Sistema visual

### 5.1 Cores

| Papel | Valor | Uso |
|---|---|---|
| Fundo | `#FCF6EE` | Fundo de todas as telas |
| Superfície | `#FFFFFF` | Cartões, folhas, barras |
| Borda | `#EBDFD0` | Divisórias e contornos de cartão |
| Texto principal | `#2B1D12` | Títulos e corpo |
| Texto secundário | `#6B5645` | Apoio, descrições |
| Texto terciário | `#8A7460` | Metadados |
| Texto fraco | `#A08F7C` | Rótulos de seção, ícones inativos |
| Sobre escuro/caramelo | `#FFF7EC` | Texto e ícone sobre fundo escuro ou caramelo |
| **Caramelo** | `#B9702F` | Ação principal, status "precisa hoje", elementos ativos |
| Caramelo pressionado | `#8F521C` | Estado pressionado |
| Caramelo claro | `#FBECDA` | Fundo de destaque suave |
| **Verde** | `#3E8F5E` | Status "ok hoje", confirmação |
| Verde par claro | `#E4EFE7` / `#2F6B48` | Fundo e texto de selo positivo |
| **Alerta** | `#C1452F` | Status "urgente", pedido de ajuda, ponto não lido |
| Alerta par claro | `#F9E7E2` | Fundo de selo de alerta |
| Escuro | `#2B1D12` | Cartão de destaque, botão secundário forte |

**Por quê essa paleta.** O nome do app é uma referência ao vira-lata caramelo, e o caramelo quente carrega acolhimento sem infantilizar — a alternativa óbvia (verde de ONG) é genérica e já ocupada por dezenas de apps de causa. A restrição a dois acentos (caramelo e verde) mais um alerta impede que a interface vire semáforo: com quatro ou cinco cores de destaque, nada é destaque.

**Regra de ouro da cor:** caramelo pertence ao fluxo de alimentar. Nenhum botão de patrocinador, de compartilhar, de seguir ou de configuração usa caramelo cheio.

### 5.2 Tipografia

| Papel | Fonte | Tamanhos |
|---|---|---|
| Títulos | **Bricolage Grotesque** 700 | 26 (título de aba) · 25 (título de ponto) · 20 (título empilhado) · 16–18 (título de seção) |
| Corpo e interface | **Instrument Sans** 400/600/700 | 14,5 (botão) · 14 (corpo) · 13 (apoio) · 12–12,5 (metadado) · 11 (rótulo maiúsculo) |
| Números de destaque | Bricolage Grotesque 700 | 20–26 |

Rótulo de seção: 11 px, peso 700, caixa alta, `letter-spacing` 0.06em, cor texto fraco.

**Por quê.** Bricolage Grotesque tem personalidade sem ser decorativa e dá ao app uma voz que Inter e Roboto não dão — as duas fontes que fazem qualquer produto parecer o mesmo produto. Instrument Sans ao lado resolve legibilidade em corpo pequeno, que é onde o app passa a maior parte do tempo. Ambas carregam bem via Google Fonts e têm fallback com métricas próximas.

### 5.3 Formas e espaçamento

- **Raios:** 12 px em controles pequenos · 16–20 px em cartões · 22–26 px em folhas · 999 px em pílulas e avatares.
- **Espaçamento base:** múltiplos de 4, com respiro maior (16–22) entre seções e menor (8–12) dentro de um agrupamento.
- **Sombras:** apenas em elementos flutuantes sobre o mapa e em folhas inferiores. Cartões em fundo bege usam borda, nunca sombra — sombra sobre fundo quente suja.

### 5.4 Alvos de toque

| Elemento | Mínimo |
|---|---|
| Botão, linha de lista, item de aba | 44 px de altura |
| Chip de filtro | 40 px |
| Pin do mapa | 34–52 px (afordância de mapa, avaliada pela área tocável real, não pelo desenho) |

**Por quê 44 px.** É o piso recomendado pelas duas plataformas e, mais importante aqui, o app é usado em pé, na rua, muitas vezes com uma mão só e a outra segurando saco de ração ou guia de cachorro. Alvo pequeno neste contexto não é desconforto, é erro de toque.

### 5.5 Componentes recorrentes

**Cartão de ponto (folha do mapa).** Miniatura 62 px, nome, endereço com distância, selos de estado, dois botões. Usado no mapa e na busca.

**Linha de registro.** Avatar 42 px, nome, descrição do que foi deixado, tempo relativo à direita. Usada no detalhe do ponto e no perfil.

**Selo de estado.** Pílula de 24–28 px com ponto colorido de 8 px e texto de 11,5–12 px. Três variantes: ok hoje, precisa hoje, urgente.

**Cartão de feed.** Cabeçalho (avatar, nome, ponto, tempo, selo), corpo de texto, foto opcional, barra de ações.

**Selo de mantenedor.** Coroa escura de 19–26 px sobreposta ao canto inferior direito do avatar. Aparece no detalhe do ponto, no feed e no perfil. É a marca visual única do papel — não há texto "mantenedor" repetido a cada aparição.

**Estado vazio.** Ilustração simples ou ícone grande, uma frase de explicação, um botão de ação. Nunca só texto cinza.

---

## 6. Telas do MVP

### 6.1 Onboarding

**Rota:** `/onboarding` · **Tipo:** primeira execução, tela cheia · **Escopo:** MVP

#### Objetivo
Explicar o app em cinco segundos e sair da frente.

#### Como se chega
Primeira abertura depois da instalação. Nunca mais, a menos que a pessoa saia da conta e apague os dados. Não há carrossel de três telas.

#### Anatomia
1. **Bloco superior caramelo** (400 px, cantos inferiores arredondados em 40 px) com ilustração vetorial: silhueta de cachorro ao lado de uma tigela, skyline simples de fundo, duas patas decorativas com opacidade baixa. Sobre a ilustração, no canto superior esquerdo, a marca: ícone de pata 32 px em quadrado claro + "Meu Caramelo".
2. **Título** (27 px, Bricolage 700, duas linhas): "Nenhum caramelo com fome no seu bairro."
3. **Subtítulo** (14,5 px): o que o app faz, em uma frase — marcar pontos, registrar o que deixou, ver quem já passou.
4. **Três números** separados por divisórias verticais finas: pontos ativos, alimentados hoje, voluntários.
5. **Botão primário caramelo** (54 px): "Criar minha conta".
6. **Botão secundário branco com borda** (54 px): "Já tenho conta".
7. **Texto legal** (11 px): aceite de termos e privacidade, com dois links.

#### Dados
Os três números vêm de um endpoint público agregado por cidade, sem autenticação. Se a chamada falhar ou a cidade não for detectada, o bloco de números **some** — não mostra zero nem esqueleto.

#### Interações
| Toque | Resultado |
|---|---|
| Criar minha conta | Login, modo cadastro |
| Já tenho conta | Login, modo entrada |
| Termos / Privacidade | Navegador do sistema |
| Deslizar para cima | Nada. A tela não rola. |

#### Estados
- **Sem rede:** os números somem; os botões continuam funcionando e a falha aparece só na tela de login.
- **Cidade não detectada:** números somem; nada mais muda.

#### Regras
- Não existe botão "pular" nem "ver o mapa sem entrar" nesta tela. **Correção deliberada em relação ao desenho inicial:** como o mapa é navegável sem login (§7.1), a entrada como visitante acontece na tela de login, não aqui — ver a decisão em 6.2.
- A ilustração é vetorial e original. Nada de foto de banco de imagens: foto de cachorro genérico contradiz a proposta de ser o bairro da pessoa.

#### Por quê
**Uma tela, não um carrossel.** Carrossel de onboarding tem taxa de conclusão baixa e atrasa o mapa, que é o argumento de venda real do produto (P1). Uma tela com um título honesto e dois botões converte melhor e custa menos de manter.

**Os números têm função, não são enfeite.** "142 pontos ativos · 38 alimentados hoje · 610 voluntários" é prova social e, ao mesmo tempo, explicação do modelo: dá para entender o produto inteiro só de ler os rótulos. É por isso que eles somem em vez de mostrar zero — no dia do lançamento, "0 voluntários" é o argumento contrário.

**Duas ações, não três.** O desenho anterior tinha "Criar minha conta", "Entrar com e-mail" e um link "Já tem conta? Fazer login" — duas das três queriam dizer a mesma coisa. Ambiguidade no primeiro toque do app é o pior lugar possível para ela.

---

### 6.2 Login e cadastro

**Rota:** `/login` · **Tipo:** empilhada · **Escopo:** MVP

#### Objetivo
Autenticar com o menor atrito possível e deixar claro que dá para olhar sem entrar.

#### Como se chega
- Do onboarding, pelos dois botões.
- De qualquer ação que exija identidade (a "parede de login"): registrar, criar ponto, adotar, comentar, reagir, seguir, cobrir pedido.

#### Anatomia
1. Cabeçalho com voltar e título "Entrar".
2. Frase de contexto que muda conforme a origem. Vindo da parede de login, cita a ação: "Para registrar esta alimentação, precisamos saber quem é você."
3. **Botão Google** (54 px, branco com borda, logo à esquerda).
4. **Botão Apple** (54 px, preto) — obrigatório no iOS quando há login social de terceiros.
5. Divisória "ou".
6. **Campo de e-mail** + botão "Enviar link de acesso".
7. Estado pós-envio: o campo é substituído por uma confirmação — "Enviamos um link para lucas@…", botão "Reenviar" desabilitado por 60 s e "Trocar e-mail".
8. **Link discreto no rodapé:** "Só quero ver o mapa" — leva ao mapa em modo visitante.

#### Dados
Supabase Auth: OAuth (Google, Apple) e magic link por e-mail. No primeiro acesso cria-se `profiles` com nome vindo do provedor ou derivado do e-mail, editável depois.

#### Interações
| Toque | Resultado |
|---|---|
| Google / Apple | Fluxo nativo; volta para a tela de origem da parede de login, não para a home |
| Enviar link | Valida formato, envia, troca para o estado de confirmação |
| Reenviar | Habilitado após 60 s |
| Só quero ver o mapa | Mapa em modo visitante |

#### Estados
- **Carregando:** botão vira indicador; os demais ficam desabilitados.
- **E-mail inválido:** mensagem abaixo do campo, sem sacudir a tela.
- **Sem rede:** faixa "Sem conexão" no topo; botões desabilitados.
- **Link expirado** (abertura tardia): mensagem explicando e botão de novo envio.

#### Regras
- Sem senha. Não há "esqueci minha senha", nem força de senha, nem confirmação de senha.
- O retorno é sempre para a tela que originou a parede, com o estado preservado. Se a pessoa tinha preenchido o registro pela metade, o rascunho volta preenchido.
- Nome exibido é sempre **primeiro nome + inicial do sobrenome** (§7.6).

#### Por quê
**Sem senha, por decisão de produto.** Senha gera recuperação, suporte, vazamento e abandono no cadastro. O público inclui pessoas de 50 e 60 anos que alimentam animais há décadas e não vão lidar bem com requisito de caractere especial.

**Parede de login o mais tarde possível.** Pedir cadastro antes de mostrar valor é a forma mais confiável de perder o usuário curioso. O mapa é o argumento; o cadastro é a consequência de querer participar.

**Preservar o rascunho é obrigatório.** Perder um registro por causa da parede de login mataria exatamente a hipótese H1. Quem perdeu o que digitou uma vez não digita de novo.

---

### 6.3 Mapa

**Rota:** `/` · **Tipo:** aba inicial · **Escopo:** MVP

#### Objetivo
Responder, em menos de três segundos após abrir: **onde perto de mim tem animal que precisa hoje?**

#### Como se chega
É a tela inicial. Abrir o app, tocar na aba Mapa, ou voltar de qualquer fluxo concluído.

#### Anatomia
De baixo para cima em camadas:

1. **Mapa Mapbox** ocupando a tela inteira, com o style caramelo (`estilo-caramelo.json`): vias em branco quente, arteriais em âmbar, parques verde-oliva, água azul dessaturado, rótulos em marrom. Centrado na localização, zoom inicial ~15,2.
2. **Pins de ponto**, circulares, 38–48 px, com a patinha branca no centro. O pin carrega **duas informações independentes**:
   - **Preenchimento — o estado da comida:** verde `#3E8F5E` cheio (menos de 4 h) · âmbar `#E0A93A` precisa hoje (4 a 12 h) · vermelho `#C1452F` vazio (mais de 12 h, ou nunca).
   - **Borda — se o ponto tem dono:** anel caramelo `#B9702F` de 3 px quando há mantenedor; anel branco de 3 px quando o ponto está sem dono.
   Entre o preenchimento e o anel caramelo há um fio branco de 2 px, para o âmbar não encostar no caramelo.
   O pin selecionado cresce para 52 px e ganha um rótulo escuro acima com nome e distância.
3. **Indicador de posição** do usuário: ponto caramelo com halo translúcido e seta de direção.
4. **Barra de busca flutuante** (48 px, pílula branca com sombra) mais **botão de notificações** com marcador vermelho quando há não lidas.
5. **Linha de chips de filtro** (40 px): "Todos" · "Precisa hoje" · "Ok hoje". O chip ativo é escuro.
6. **Controles à direita**, empilhados acima da folha: alternar camadas do mapa e recentralizar.
7. **Folha inferior** do ponto selecionado: alça, miniatura 62 px, nome, endereço com distância, selos (tempo desde o último registro; mantenedor com miniavatar), botões "Ver ponto" e "Alimentar".
8. **Barra de abas** (92 px) e **botão central** de registro (60 px, escuro, borda branca de 4 px) sobreposto a ela.

#### Dados
- `pontos_proximos(lat, lng, raio)` — RPC com filtro geográfico. Nunca carregar a cidade inteira.
- Recarrega ao terminar o movimento do mapa (com *debounce*), não a cada quadro.
- Assinatura realtime de novos registros: um registro recebido atualiza a cor do pin sem recarregar a lista.

#### Interações
| Ação | Resultado |
|---|---|
| Toque no pin | Seleciona, centraliza com deslocamento vertical para caber a folha, abre a folha |
| Toque no mapa vazio | Fecha a folha |
| Arrastar a folha para baixo | Fecha |
| Toque em "Ver ponto" | Detalhe do ponto |
| Toque em "Alimentar" | Registrar, com o ponto já escolhido |
| Toque no chip | Filtra os pins; o mapa não se move |
| Toque na busca | Tela de busca com histórico e resultados de endereço |
| Toque no botão central `+` | Registrar, com o ponto mais próximo pré-selecionado e trocável |
| Toque longo no mapa | Criar ponto naquela coordenada |
| Toque no sino | Notificações |

#### Estados
- **Permissão de localização não concedida:** o mapa abre na última posição conhecida ou no centro da cidade, com uma faixa discreta "Ative a localização para ver os pontos perto de você" e um botão que abre os ajustes. O app continua utilizável.
- **Permissão negada permanentemente:** a faixa passa a explicar como reativar nos ajustes e não reaparece mais que uma vez por sessão.
- **Nenhum ponto no raio:** estado vazio sobre o mapa — "Nenhum ponto cadastrado por aqui ainda" com o botão "Cadastrar o primeiro ponto". Este é o estado mais provável na semana de lançamento e o mais importante de acertar.
- **Carregando:** os pins entram com transição curta; sem tela de esqueleto cobrindo o mapa.
- **Sem rede:** usa o último conjunto de pontos em cache, com faixa "Mostrando dados de ..." e o horário.
- **Modo visitante:** tudo funciona; "Alimentar" e `+` levam à parede de login.

#### Regras
- O filtro "Precisa hoje" cobre **caramelo e vermelho** — é a pergunta prática "onde preciso ir?", não uma classificação exata.
- O status é sempre derivado (§7.3); nunca há botão de "marcar como alimentado" fora do fluxo de registro.
- O mapa nunca recentraliza sozinho depois que o usuário o moveu, exceto se ele tocar em recentralizar.

#### Por quê
**Abrir no mapa sem intermediários.** É P1. Um resumo, um "bom dia" ou uma lista antes do mapa transformam uma consulta de dez segundos numa navegação.

**Duas camadas de informação num pin só.** Preenchimento é comida, borda é responsabilidade — e as duas se leem ao mesmo tempo, sem legenda. A versão anterior pintava o ponto órfão de cinza inteiro, o que apagava a informação mais urgente: um ponto órfão E vazio ficava indistinguível de um ponto órfão recém-alimentado. Separando as camadas, "sem dono e com fome" vira o pin mais chamativo do mapa, que é exatamente o que ele deveria ser.

**Só a cor muda, o desenho nunca.** Todos os pins são a mesma patinha; o status é a cor de fundo. A leitura precisa acontecer de relance, com o celular a meio braço, no sol — e cor resolve isso sozinha. Trocar o glifo por status (confirmação no verde, exclamação no vermelho) parecia mais informativo e não era: obrigava a aprender três desenhos, e nenhum deles dizia "aqui tem bicho" tão rápido quanto a pata. A forma constante também é o que permite ao pin do apoiador ser **quadrado** e nunca ser confundido com ponto de alimentação.

**Ponto órfão em cinza sobrepõe o status.** Parece perda de informação, mas é intencional: "ninguém é responsável por este lugar" é um problema mais acionável do que "faz seis horas que não passa alguém", e é o recrutamento que o produto mais precisa fazer.

**O botão central duplica o fluxo de alimentar.** A folha já tem "Alimentar". O botão central existe para quem **já está no ponto** e abre o app só para anotar — que é o comportamento mais valioso do app inteiro. Vale a redundância.

**Realtime só na cor do pin.** É a única atualização que muda uma decisão em tempo real (não ir a um ponto que alguém acabou de atender). Assinar mais tabelas custa cota e bateria sem mudar nada que o usuário faria diferente.

---

### 6.4 Detalhe do ponto

**Rota:** `/ponto/:id` · **Tipo:** empilhada · **Escopo:** MVP

#### Objetivo
Dar o quadro completo de um ponto — estado, quem cuida, o que aconteceu — e levar ao registro.

#### Como se chega
Da folha do mapa, do feed, da busca, de "Meus pontos" no perfil, de notificação (deep link).

#### Anatomia
1. **Cabeçalho visual** de 252 px com a foto do ponto, ou um padrão vetorial bege quando não há foto. Sobrepostos: voltar (44 px), favoritar/seguir, compartilhar, e o contador de fotos no canto inferior direito.
2. **Painel branco** com cantos superiores arredondados (26 px) sobrepondo a foto em 20 px:
   - **Título** (25 px) e **selo de status** alinhado à direita.
   - **Endereço com distância**, precedido de ícone de pin.
   - **Três estatísticas** em cartões iguais: horas desde o último registro · voluntários no mês · registros no mês.
   - **Cartão do mantenedor:** avatar 46 px com coroa, rótulo "MANTENEDORA", nome, "desde maio · 2 co-mantenedores", avatares empilhados dos co-mantenedores e seta. Se o ponto for órfão, esta área é substituída pelo bloco de adoção (6.5).
   - **"Quem passou por aqui"** com "Ver tudo": até três linhas de registro (avatar, nome, o que deixou, tempo relativo), separadas por divisórias.
3. **Barra de ação fixa** no rodapé: botão quadrado "Como chegar" (54 px) e botão caramelo "Registrar alimentação" ocupando o resto.

#### Dados
- Ponto e status pela view `pontos_com_status`.
- Mantenedor principal e co-mantenedores.
- Últimos registros com paginação (3 na tela, o resto em "Ver tudo").
- Agregados do mês: contagem distinta de voluntários e total de registros.

#### Interações
| Ação | Resultado |
|---|---|
| Registrar alimentação | Registrar, com o ponto fixado |
| Como chegar | App de mapas do sistema, com a coordenada aproximada |
| Cartão do mantenedor | Perfil público dele |
| Linha de registro | Detalhe do registro com comentários |
| Ver tudo | Lista paginada do histórico |
| Seguir (coração) | Passa a receber notificação deste ponto |
| Compartilhar | Folha nativa com link |
| Cabeçalho (toque) | Galeria de fotos em tela cheia |

#### Estados
- **Sem registro nenhum:** as estatísticas mostram travessão, e "Quem passou por aqui" vira estado vazio: "Ninguém registrou aqui ainda. Se você alimentar, será o primeiro." O botão de registrar ganha ainda mais peso.
- **Sem foto:** padrão vetorial bege com pata em marca-d'água; o contador some.
- **Ponto desativado:** faixa cinza "Este ponto foi desativado por quem o mantinha" e o botão de registrar some.
- **Você é o mantenedor:** o cartão de mantenedor mostra "Você" e ganha um botão de editar; cada linha de registro passa a permitir remoção por deslize.
- **Modo visitante:** tudo visível; registrar e seguir levam à parede de login.

#### Regras
- "Quem passou por aqui" mostra **três** entradas. Quatro ou mais empurram a ação principal para fora da tela.
- Só mantenedor e co-mantenedor removem registro alheio; o autor sempre pode remover o próprio.
- "Como chegar" usa a coordenada **arredondada** (§7.6), suficiente para chegar à esquina certa.

#### Por quê
**Estatística de tempo em primeiro lugar.** "6 h desde o último registro" é o dado que muda a decisão de ir ou não. Total de registros do mês é contexto; tempo é ação.

**Cartão do mantenedor com peso visual.** Dar rosto ao ponto é o que faz a adoção parecer desejável para quem ainda não é mantenedor — é recrutamento passivo. A coroa é a única marca do papel, repetida em todo lugar, para que o significado se aprenda uma vez.

**"Animais do ponto" foi removido.** O desenho inicial tinha cadastro de animais fixos com nome e foto. Fora do MVP por decisão de escopo: vira ficha, foto, atualização e luto — muito trabalho para o piloto. A contagem de animais continua existindo **por registro** ("4 gatos · 2 cães"), que é informação mais barata e igualmente útil.

**Voluntários no mês no lugar de animais fixos.** O espaço liberado recebeu uma métrica que serve ao produto: um ponto com sete voluntários está saudável; com um, está a uma viagem de virar órfão.

---

### 6.5 Ponto sem mantenedor (adoção)

**Rota:** `/ponto/:id` com `mantenedor_id` nulo · **Tipo:** variação da 6.4 · **Escopo:** MVP

#### Objetivo
Transformar um ponto abandonado em ponto com dono — o movimento que mais sustenta a qualidade do dado a longo prazo.

#### Como se chega
Mesmos caminhos do detalhe. O pin cinza no mapa é o principal chamariz.

#### Anatomia
Idêntica a 6.4, com três diferenças:

1. **Selo de status** vira cinza: "Sem mantenedor".
2. **No lugar do cartão de mantenedor**, um bloco caramelo claro com borda âmbar:
   - Coroa em círculo caramelo + título "Este ponto não tem mantenedor".
   - Linha: "Quem adota vira o rosto do ponto e pode:"
   - Três itens com marca de confirmação: editar nome, endereço e fotos · corrigir ou remover registro errado · convidar co-mantenedores.
3. **Barra de ação:** o botão quadrado passa a ser "registrar" (tigela) e o botão principal caramelo vira **"Adotar este ponto"** com o ícone de coroa.

#### Interações
| Ação | Resultado |
|---|---|
| Adotar este ponto | Confirmação em folha, depois adoção imediata; a tela recarrega já com você como mantenedor e um aviso breve |
| Botão quadrado (tigela) | Registrar — continua possível alimentar sem adotar |

#### Estados
- **Modo visitante:** adotar leva à parede de login, que volta para cá e completa a adoção.
- **Adoção concorrente:** se outra pessoa adotou entre a abertura e o toque, a tela mostra "Este ponto acabou de ser adotado por Marina C." e recarrega no estado normal. Sem erro técnico na cara do usuário.

#### Regras
- Qualquer pessoa autenticada pode adotar, sem histórico mínimo nem aprovação.
- Adotar é reversível: o mantenedor pode sair do papel a qualquer momento nas configurações do ponto, e o ponto volta a órfão.
- Registrar continua disponível sem adotar. Adoção nunca é pedágio para alimentar.

#### Por quê
**Adoção sem barreira, de propósito.** As alternativas consideradas foram exigir N registros prévios no ponto ou aprovação da comunidade. Ambas protegem contra um abuso que ainda não existe e custam exatamente aquilo que falta no lançamento: gente assumindo ponto. Como o ato é reversível e auditável, o risco é barato e a fricção seria cara. Se aparecer abuso no piloto, a regra volta à mesa — e a decisão terá dado real por trás.

**Listar os poderes antes do botão.** Adoção é compromisso social; a pessoa precisa saber o que está aceitando. Três itens concretos convertem melhor que a palavra "responsável", e ao mesmo tempo filtram quem só queria um selo.

**Botão de registrar continua lá.** Se adotar fosse a única ação, o ponto órfão ficaria menos alimentado que os outros — o oposto do objetivo.

---

### 6.6 Criar e editar ponto

**Rota:** `/ponto/novo` e `/ponto/:id/editar` · **Tipo:** empilhada · **Escopo:** MVP

#### Objetivo
Cadastrar um lugar em menos de um minuto, com coordenada correta e sem expor a casa de ninguém.

#### Como se chega
- Toque longo no mapa (já com a coordenada).
- Estado vazio do mapa ("Cadastrar o primeiro ponto").
- "Meus pontos" no perfil.
- Edição: pelo cartão de mantenedor, se você for mantenedor ou co-mantenedor.

#### Anatomia
1. Cabeçalho: voltar, título ("Novo ponto" / "Editar ponto") e "Salvar" desabilitado até o mínimo válido.
2. **Mini-mapa** de 180 px com o pin arrastável ao centro e o botão "Ajustar no mapa" para abrir em tela cheia.
3. **Endereço** preenchido por geocodificação reversa, editável.
4. **Nome do ponto** — campo obrigatório, com dica: "Como as pessoas do bairro chamam esse lugar. Ex.: Praça da Matriz, Viaduto da Rodoviária."
5. **Foto** — um quadro tracejado de 98 px; câmera ou galeria, opcional.
6. **Aviso de privacidade**, sempre visível, não é caixa de aceite: "Marque só lugares públicos. Não cadastre a frente da casa de alguém, nem a sua."
7. **Botão salvar** fixo no rodapé.
8. Em modo edição, ao final: "Desativar ponto" em vermelho discreto e "Sair de mantenedor".

#### Dados
Grava em `pontos`, com `criado_por` e uma linha em `ponto_mantenedores` com papel `principal` para quem criou. Foto redimensionada no aparelho para ~1600 px / 80% antes do upload.

#### Interações
| Ação | Resultado |
|---|---|
| Arrastar o pin | Atualiza a coordenada e refaz a geocodificação reversa |
| Ajustar no mapa | Mapa cheio com pin fixo ao centro e botão "Usar esta posição" |
| Salvar (novo) | Cria, fecha e abre o detalhe do ponto novo |
| Salvar (edição) | Atualiza e volta |
| Desativar ponto | Confirmação com aviso de que o histórico é preservado |
| Sair de mantenedor | Confirmação; se não houver co-mantenedor, o ponto vira órfão e isso é dito na confirmação |

#### Estados
- **Sem permissão de localização:** o mini-mapa abre no centro da cidade e o campo de endereço ganha busca.
- **Ponto muito próximo de outro** (menos de 30 m): aviso não bloqueante — "Existe 'Praça da Matriz' a 18 m daqui. É o mesmo lugar?" com "Ver o existente" e "Cadastrar mesmo assim".
- **Falha no upload da foto:** o ponto é salvo sem foto, com aviso e opção de tentar de novo. Nunca perder o cadastro por causa da imagem.
- **Salvando:** botão vira indicador; a tela não pode ser fechada.

#### Regras
- Mínimo válido: nome + coordenada. Endereço e foto são opcionais.
- Desativar preserva os registros; o ponto some do mapa e o detalhe fica acessível por link direto.
- Só mantenedor e co-mantenedor editam.

#### Por quê
**Verificação de duplicata como aviso, não como bloqueio.** Dois pontos legítimos podem estar a 20 m (dois lados de uma praça). Bloquear geraria mais frustração do que o custo de mesclar duplicata depois, que é trabalho de moderação barato.

**Aviso de privacidade como texto fixo, não como caixa de aceite.** Caixa de aceite é clicada sem leitura e serve para transferir culpa. O texto permanente na tela tem chance real de ser lido — e o objetivo aqui é que a pessoa não cadastre a casa da vizinha, não que a gente fique coberto.

**Desativar em vez de apagar.** Os registros são o histórico de trabalho de várias pessoas. Apagar um ponto apagaria o trabalho delas junto.

---

### 6.7 Registrar alimentação

**Rota:** `/ponto/:id/registrar` · **Tipo:** empilhada · **Escopo:** MVP · **Tela mais importante do app**

#### Objetivo
Anotar o que foi deixado em menos de 15 segundos, de pé, com uma mão.

#### Como se chega
Botão "Alimentar" na folha do mapa · botão do detalhe do ponto · botão central `+` da barra de abas (com o ponto mais próximo pré-selecionado).

#### Anatomia
1. Cabeçalho: voltar e "Registrar alimentação".
2. **Cartão do ponto escolhido** — ícone, nome, endereço e botão "Trocar" (pílula caramelo clara de 44 px).
3. **"O QUE VOCÊ DEIXOU"** — chips de múltipla escolha, 44 px: Ração (ícone de tigela) · Água (gota) · Comida caseira · Petisco · Remédio. O chip selecionado é caramelo cheio.
4. **"QUANTIDADE"** — cartão com − e + de 44 px e o valor grande ao centro em kg, passo de 0,5. Só aparece quando "Ração" ou "Comida caseira" está selecionado.
5. **"ANIMAIS ATENDIDOS"** — dois cartões lado a lado, Cães e Gatos, cada um com − / número / +.
6. **"FOTO E OBSERVAÇÃO"** — quadro tracejado de 98 px para a foto e campo de texto ao lado.
7. **Botão fixo no rodapé:** "Confirmar registro" com marca de confirmação.

#### Dados
Insere em `registros` com `user_id` do usuário autenticado. Todos os campos além de `tipos` são opcionais.

#### Interações
| Ação | Resultado |
|---|---|
| Chip | Alterna seleção; múltipla escolha |
| − / + | Ajusta quantidade ou contagem; toque longo acelera |
| Trocar | Folha com pontos próximos e busca |
| Foto | Folha: Câmera / Galeria |
| Confirmar | Salva, fecha e volta à origem com um aviso curto |

#### Estados
- **Nada selecionado:** "Confirmar" desabilitado com texto de apoio "Escolha ao menos o que você deixou".
- **Salvando:** botão vira indicador; a tela fica bloqueada.
- **Sucesso:** volta à tela de origem com um aviso breve no topo — **e é aqui que o app devolve o valor da hipótese H2**: se você foi o primeiro do dia, "Você foi o primeiro hoje"; se não, "Marina passou às 7h — bom reforço".
- **Falha de rede:** o registro **não é perdido**. Fica como rascunho local e a tela mostra "Sem conexão. Guardamos seu registro e enviamos assim que voltar", com o envio automático em segundo plano.
- **Foto falhou:** salva sem a foto, avisa, oferece nova tentativa.

#### Regras
- Obrigatório: ao menos um tipo. Nada mais.
- Sem limite de registros por dia por pessoa no mesmo ponto — duas pessoas de fato podem passar na mesma manhã, e é exatamente isso que o app quer revelar.
- A observação tem 280 caracteres, com contador só a partir de 240.
- Registro é editável pelo autor por 30 minutos e removível a qualquer momento por ele ou pelo mantenedor.

#### Por quê
**Tudo opcional menos o tipo.** É a decisão mais importante da tela e a que sustenta H1. Formulário com campo obrigatório de quantidade e contagem faz a pessoa desistir na terceira vez — e a terceira vez é justamente quando o hábito se formaria. Um registro só com "Ração" já responde à pergunta que o app precisa responder: alguém passou aqui hoje.

**Chips em vez de lista suspensa.** Lista suspensa exige abrir, rolar, escolher e fechar. Chip é um toque, e todas as opções ficam visíveis — importante para quem nunca usou.

**Contadores separados para cães e gatos.** É a informação que protetoras usam para dimensionar quanto levar, e sai de graça no momento em que ela já está olhando os bichos. Um campo único "quantos animais" perderia a distinção que muda a compra de ração.

**A quantidade só aparece quando faz sentido.** Perguntar "quantos kg" para quem só trocou a água é ruído. Campo condicional custa uma linha de lógica e economiza um passo em boa parte dos registros.

**Fila offline é obrigatória aqui e em nenhum outro lugar.** O uso acontece na rua, às vezes em garagem, viaduto, lugar sem sinal. Perder um registro por causa de rede é perder o usuário. Toda leitura do app pode falhar graciosamente; esta escrita, não.

**A mensagem de sucesso é a recompensa.** É o único ponto do app em que a pessoa recebe algo de volta imediatamente pelo trabalho de registrar. "Você foi o primeiro hoje" custa uma consulta e é o que faz o registro parecer útil em vez de burocrático.

---

### 6.8 Feed da comunidade

**Rota:** `/comunidade` · **Tipo:** aba · **Escopo:** MVP

#### Objetivo
Mostrar que existe gente do outro lado e ser o canal onde os pedidos de ajuda encontram quem pode cobrir.

#### Como se chega
Aba Comunidade, ou notificação de comentário e pedido de ajuda.

#### Anatomia
1. Cabeçalho com título "Comunidade" e botão de notificações com marcador.
2. **Chips de escopo** (40 px): "Perto de mim" (ativo) · "Seguindo" · "Pedidos de ajuda".
3. **Lista de cartões** em três formatos:

   **Cartão de registro** — cabeçalho com avatar 40 px, nome, "Ponto · há 6 h", selo verde "Alimentou"; texto da observação; foto opcional (118 px de altura); barra de ações com coração, comentários e compartilhar.

   **Cartão de pedido de ajuda** — faixa vermelha de 4 px no topo, selo "Pediu ajuda", texto, e dois botões: "Quero cobrir" (caramelo) e "Ver ponto".

   **Evento de uma linha** — cartão baixo, só avatar e frase ("João P. alimentou 2 cães · Praça da Matriz · ontem"). É o formato dos registros sem texto nem foto.

#### Dados
Registros, pedidos e eventos do raio do usuário, ordenados por recência, paginados. Reações e contagem de comentários agregadas. Realtime só para pedidos de ajuda novos.

#### Interações
| Ação | Resultado |
|---|---|
| Cartão | Detalhe do registro com comentários |
| Coração | Reage/desfaz, otimista na interface |
| Comentários | Detalhe do registro com o campo focado |
| Quero cobrir | Confirmação; o pedido passa a "coberto" e o autor é notificado |
| Nome ou avatar | Perfil público |
| Puxar para baixo | Recarrega |

#### Estados
- **Vazio ("Perto de mim"):** "Ainda não há movimento por aqui. Seja o primeiro a registrar." com botão de registrar.
- **Vazio ("Seguindo"):** explica o que é seguir e leva ao mapa.
- **Carregando:** três cartões em esqueleto.
- **Bloqueado:** conteúdo de quem você bloqueou não aparece, sem lacuna nem aviso.
- **Modo visitante:** feed visível; reagir, comentar e cobrir levam à parede de login.

#### Regras
- Ordem estritamente cronológica. **Sem algoritmo de relevância.**
- Uma reação só (coração). Sem contador de seguidores em lugar nenhum.
- Pedido de ajuda com data-alvo vencida vira "expirado" e sai da aba de pedidos.
- Comentário e observação passam por filtro básico de palavrão e podem ser denunciados.

#### Por quê
**Ordem cronológica, ponto final.** Algoritmo de relevância otimiza tempo de tela, e tempo de tela não é o objetivo deste produto. Cronológico é previsível, auditável e barato — e faz o pedido de ajuda de hoje aparecer hoje.

**Três formatos, não um.** Um feed onde tudo tem o mesmo peso faz um pedido de ajuda urgente desaparecer no meio de registros rotineiros. A faixa vermelha e o botão de ação dão ao pedido a hierarquia que ele merece. O evento de uma linha existe para que registros sem texto não ocupem o mesmo espaço de um relato com foto — é o que mantém o feed denso e rolável.

**Uma reação, sem seguidores.** É a fronteira que impede o produto de virar rede social (P3). Contador de seguidores criaria incentivo para produzir conteúdo em vez de alimentar bicho.

**"Quero cobrir" é o botão mais valioso do feed.** É o único lugar do app onde uma pessoa assume um compromisso com outra. Por isso ele é caramelo, apesar de a cor caramelo pertencer ao fluxo de alimentar: cobrir *é* alimentar, só que combinado antes.

---

### 6.9 Pedido de ajuda (criação)

**Rota:** `/ponto/:id/ajuda` · **Tipo:** folha · **Escopo:** MVP

#### Objetivo
Avisar, em três toques, que um ponto vai ficar descoberto num dia.

#### Como se chega
Detalhe do ponto (menu do topo) ou cartão do ponto no perfil.

#### Anatomia
Folha inferior, não tela cheia:
1. Título "Pedir ajuda" e o nome do ponto.
2. **Quando** — chips rápidos: Hoje · Amanhã · Escolher data.
3. **Recado** — campo de texto com sugestão: "Viajo amanhã e ninguém cobre esse ponto na quinta. São 5 cães fixos."
4. Aviso: "Vamos avisar quem segue este ponto e quem alimentou aqui no último mês."
5. Botão "Publicar pedido".

#### Dados
Insere em `pedidos_ajuda` com status `aberto`. Dispara notificação para seguidores do ponto e para quem registrou ali nos últimos 30 dias.

#### Interações
Publicar fecha a folha, mostra aviso curto de confirmação e o pedido aparece no topo do feed.

#### Estados
- **Já existe pedido aberto para a data:** a folha mostra o pedido existente e oferece "Ver pedido" em vez de duplicar.
- **Sem rede:** botão desabilitado com explicação; o pedido não entra em fila offline — diferente do registro, um pedido atrasado pode chegar depois da data e perder o sentido.

#### Regras
- Qualquer voluntário pode pedir ajuda, não só o mantenedor.
- Um pedido aberto por ponto por data.
- Ao ser coberto, o autor recebe notificação e o pedido muda de status; quem cobriu recebe lembrete no dia.
- Ninguém é punido por não cumprir a cobertura. Não há histórico público de cobertura descumprida.

#### Por quê
**Folha em vez de tela.** Pedir ajuda é reação a uma circunstância ("vou viajar"), não uma tarefa planejada. Folha comunica leveza e mantém o contexto do ponto visível atrás.

**Sem punição por descumprir.** Registrar quem prometeu e não foi criaria um placar de vergonha e afastaria justamente quem se dispõe. O custo do descumprimento já é sentido pelo ponto; o app não precisa somar constrangimento (P4).

**Sem fila offline aqui, ao contrário do registro.** Registro descreve o passado e vale a qualquer momento; pedido descreve o futuro e envelhece. Enviar um pedido represado dois dias depois é pior do que não enviar.

---

### 6.10 Detalhe do registro

**Rota:** `/registro/:id` · **Tipo:** empilhada · **Escopo:** MVP

#### Objetivo
Ler um registro por inteiro e conversar sobre ele.

#### Como se chega
Cartão do feed, linha do histórico do ponto, notificação de comentário.

#### Anatomia
1. Cabeçalho com voltar e menu de três pontos (denunciar; remover, se você tem permissão).
2. **Cabeçalho do registro:** avatar, nome, ponto (link) e data e hora completa ("ontem às 7h10").
3. **O que foi deixado:** linha de selos — tipos, quantidade, cães e gatos.
4. **Foto** em largura total, se houver.
5. **Observação** completa.
6. **Barra de ações:** coração com contagem, comentários, compartilhar.
7. **Lista de comentários** com avatar, nome, texto e tempo relativo.
8. **Campo de comentário** fixo no rodapé.

#### Estados
- **Sem comentários:** "Nenhum comentário ainda."
- **Registro removido:** "Este registro foi removido" e nada mais.
- **Modo visitante:** leitura livre; comentar e reagir levam à parede de login.

#### Regras
- Comentário editável por 5 minutos, removível pelo autor e pelo mantenedor do ponto.
- Denunciar move para a fila de moderação sem esconder o conteúdo imediatamente.
- A data aparece completa aqui, ao contrário do relativo usado nas listas.

#### Por quê
**Data absoluta nesta tela.** Em lista, "há 6 h" é o que importa. Aqui a pessoa muitas vezes está checando um fato ("foi mesmo ontem de manhã?"), e o relativo atrapalha.

---

### 6.11 Notificações

**Rota:** `/notificacoes` · **Tipo:** empilhada · **Escopo:** MVP

#### Objetivo
Reunir o que aconteceu enquanto o app estava fechado, com o urgente em primeiro lugar.

#### Como se chega
Sino do mapa ou do feed; linha "Notificações" no perfil.

#### Anatomia
1. Cabeçalho: voltar, "Notificações", ação "Marcar todas como lidas".
2. **Grupos** com rótulo maiúsculo: HOJE · ESTA SEMANA · ANTES.
3. **Linhas** de 40 px de ícone + texto + tempo + marcador de não lida (9 px, vermelho):
   - **Urgente** — fundo caramelo claro, ícone vermelho de atenção: "Praça da Matriz está há 6 h sem registro. Você costuma passar por lá de manhã."
   - **Pedido de ajuda** — avatar de quem pediu.
   - **Registro em ponto que você segue** — ícone verde de confirmação.
   - **Comentário** — avatar de quem comentou.
   - **Ponto novo perto de você** — ícone de pin.

#### Dados
Tabela `notificacoes` do usuário, paginada. A leitura marca como lida em lote ao sair da tela.

#### Interações
Cada linha abre o destino por deep link. "Marcar todas como lidas" limpa os marcadores sem navegar.

#### Estados
- **Vazio:** "Nada por aqui ainda. Quando alguém alimentar um ponto que você segue, você vê aqui."
- **Push desativado:** faixa no topo — "As notificações estão desligadas no seu celular" com botão para os ajustes. Aparece uma vez por semana, no máximo.

#### Regras
- Só a notificação de **ponto vencido** tem fundo destacado. Mais de um tipo destacado anula o destaque.
- Agrupamento: cinco registros no mesmo ponto no mesmo dia viram uma linha ("5 pessoas alimentaram a Praça da Matriz hoje").
- A notificação de ponto vencido é enviada **uma vez por ponto por dia**, no máximo.

#### Por quê
**Texto personalizado no aviso de urgência.** "Você costuma passar por lá de manhã" transforma um alerta genérico em algo dirigido — e a frase só é usada quando o dado existe (a pessoa tem registros naquele ponto nesse horário). Sem o dado, o texto é neutro.

**Teto de uma notificação por ponto por dia.** É o principal mecanismo contra desinstalação. Quem mantém cinco pontos receberia cinco avisos por dia com um teto frouxo — e desligaria tudo na primeira semana.

---

### 6.12 Perfil

**Rota:** `/perfil` (próprio) e `/perfil/:id` (público) · **Tipo:** aba / empilhada · **Escopo:** MVP

#### Objetivo
No próprio: acesso aos seus pontos, histórico e ajustes. No público: confiança — quem é essa pessoa que mantém o ponto.

#### Anatomia (próprio)
1. **Cabeçalho:** avatar 72 px com coroa se for mantenedor, nome, "Centro · mantenedor de 2 pontos", botão de editar.
2. **Três estatísticas:** registros · pontos mantidos · dias seguidos (este em caramelo).
3. **Cartão escuro de ranking** — *fora do MVP; só aparece quando o ranking existir.*
4. **Faixa de conquistas** — *fora do MVP.*
5. **Menu:** Meus pontos · Histórico de registros · Notificações (com contador) · Configurações.

No MVP, sem os itens 3 e 4, o menu ganha uma quarta linha: **Pedidos de ajuda que cobri**.

#### Anatomia (público)
Avatar, nome abreviado, bairro, "mantém 2 pontos", e a lista de pontos que mantém. **Não mostra** o histórico de registros da pessoa, nem estatísticas de frequência, nem dias seguidos.

#### Estados
- **Perfil novo:** as estatísticas mostram zero e o menu traz um convite — "Você ainda não mantém nenhum ponto. Adotar um ponto perto de você ajuda o bairro a não ficar sem cobertura."
- **Modo visitante:** a aba Perfil mostra a parede de login com o argumento do que se ganha ao entrar.

#### Regras
- **"Dias seguidos" nunca é apresentado como perda.** Quando a sequência quebra, o número volta a 1 sem comentário, sem "você perdeu sua sequência", sem chama apagada (P4).
- Nome sempre abreviado (§7.6).
- O perfil público não expõe rotina. É a regra de privacidade mais importante do app.

#### Por quê
**O histórico de registros de uma pessoa não é público, o do ponto é.** É a decisão de privacidade central. O histórico do *ponto* é o produto; o histórico da *pessoa* é um mapa de quando e onde ela está toda semana — informação perigosa nas mãos de um vizinho hostil, e vizinho hostil é o problema real de quem alimenta animal de rua.

**A faixa de conquistas substituiu o gráfico de sete dias.** O gráfico era decorativo e, pior, tinha potencial de culpa (barras baixas = dias que você não foi). Quando as conquistas entrarem, o espaço passa a mostrar progresso em vez de ausência.

---

### 6.13 Configurações

**Rota:** `/configuracoes` · **Tipo:** empilhada · **Escopo:** MVP

#### Anatomia
1. **Conta** — nome, foto, e-mail (não editável), bairro.
2. **Notificações** — um interruptor por tipo: ponto vencido · pedido de ajuda perto · registro em ponto seguido · comentário · ponto novo perto. Mais um seletor de raio (1 km · 3 km · 5 km · bairro todo).
3. **Privacidade** — "Quem pode ver meu perfil" (informativo no MVP) e link para a política.
4. **Bloqueados** — lista com opção de desbloquear.
5. **Sobre** — versão, termos, privacidade, contato.
6. **Sair da conta** e **Apagar minha conta**.

#### Regras
- Apagar a conta remove o perfil e anonimiza os registros ("Voluntário removido"), preservando o histórico do ponto. A confirmação diz isso com essas palavras.
- O raio das notificações vale também para o escopo "Perto de mim" do feed.

#### Por quê
**Interruptor por tipo, não um só.** Com um interruptor geral, a pessoa incomodada com o aviso de comentário desliga tudo — e perde o aviso de ponto vencido, que é o único que o produto realmente precisa entregar.

**Anonimizar em vez de apagar registros.** Apagar os registros de quem sai destruiria o histórico do ponto, que é trabalho coletivo. Anonimizar respeita o direito da pessoa sem apagar a memória do lugar.

---

### 6.14 Busca

**Rota:** `/busca` · **Tipo:** empilhada sobre o mapa · **Escopo:** MVP

#### Anatomia
Campo no topo (foco automático, teclado aberto), lista abaixo: histórico recente quando vazio; ao digitar, **Pontos** primeiro (nome, endereço, distância, selo de status) e **Endereços** depois (geocodificação do Mapbox).

#### Interações
Ponto → centraliza o mapa nele e abre a folha. Endereço → move o mapa para lá sem selecionar nada.

#### Estados
- **Sem resultado:** "Nenhum ponto com esse nome. Quer cadastrar um aqui?" com botão de criar.

#### Por quê
**Pontos antes de endereços.** Quem busca quase sempre procura um lugar que já conhece pelo apelido do bairro, não uma rua. Inverter a ordem faria o resultado útil ficar abaixo da dobra.

---

## 7. Funcionalidades transversais

### 7.1 Acesso sem conta (modo visitante)

Tudo que é **leitura** funciona sem login: mapa, pins, folha do ponto, detalhe do ponto, feed, detalhe do registro, busca e perfil público.

Exige login: registrar, criar ponto, adotar, editar, comentar, reagir, seguir, cobrir pedido, pedir ajuda.

A parede de login sempre diz o que a pessoa está prestes a fazer e volta para o ponto exato de onde saiu, com o rascunho preservado.

**Por quê.** O app é uma utilidade pública antes de ser uma comunidade. Um vizinho que quer só saber se os gatos da praça comeram hoje não deveria precisar de conta — e é justamente ele quem, três visitas depois, vira voluntário.

### 7.2 Localização

- Permissão **when in use**, pedida na primeira abertura do mapa com uma frase de contexto antes do diálogo do sistema.
- Sem permissão, o app funciona centrado na cidade.
- **Nada de localização em segundo plano** no MVP: assusta, drena bateria e não é necessário.
- A posição do usuário **nunca é gravada** no servidor. É usada no aparelho para ordenar e calcular distância, e descartada.

### 7.3 Status derivado do ponto

| Status | Condição | Preenchimento do pin |
|---|---|---|
| Cheio | último registro há menos de 4 h | verde `#3E8F5E` |
| Precisa hoje | entre 4 h e 12 h | âmbar `#E0A93A` |
| Vazio | mais de 12 h, ou nenhum registro | vermelho `#C1452F` |

A responsabilidade é uma camada separada, na **borda** do pin: anel caramelo `#B9702F` quando o ponto tem mantenedor, anel branco quando está sem dono. As duas dimensões são independentes — existe ponto cheio sem dono e ponto vazio com dono. Arquivos prontos em `assets/mapa/` (`pin-ok`, `pin-precisa`, `pin-urgente` e as três variantes `-sem-dono`).

Calculado por view no banco, nunca no cliente, para que app, notificação e job usem o mesmo número.

**Por quê esses cortes.** São um chute informado, escolhido para ser barato de corrigir: quatro horas cobre o intervalo entre a alimentação da manhã e a da tarde, e doze horas significa que um ciclo inteiro foi pulado. Os valores devem ser **configuráveis por ponto** numa versão futura — um ponto com cinco cães fixos e outro com um gato esporádico não têm o mesmo ritmo. No MVP são globais, e ajustá-los depois de olhar os dados do piloto é uma tarefa esperada, não um conserto.

### 7.4 Mantenedor e co-mantenedor

**Quem vira:** quem cria o ponto, automaticamente; quem adota um ponto órfão; quem aceita convite (vira co-mantenedor).

**Poderes no MVP:**
- Editar nome, endereço, coordenada e fotos.
- Remover registro errado ou abusivo do ponto.
- Convidar e remover co-mantenedores (só o principal).
- Desativar o ponto (só o principal).

**Fora do MVP:** escala e agenda, moderação de comentários, alerta prioritário antes do alerta público.

**Convite:** link com token, validade de 7 dias, aceite com um toque. Sem fluxo de aprovação.

**Saída:** o principal pode sair. Se houver co-mantenedor, o mais antigo é promovido automaticamente e avisado. Se não houver, o ponto vira órfão.

**Por quê promover automaticamente.** A alternativa — deixar órfão sempre — descartaria gente que já demonstrou compromisso e que está ali justamente para esse caso.

### 7.5 Notificações e jobs

**Tipos e gatilhos**

| Tipo | Gatilho | Quem recebe |
|---|---|---|
| Ponto vencido | job de hora em hora | quem segue o ponto e o mantenedor |
| Pedido de ajuda | criação do pedido | seguidores do ponto e quem registrou ali nos últimos 30 dias |
| Registro em ponto seguido | inserção do registro | seguidores, menos o autor |
| Comentário | inserção do comentário | autor do registro |
| Ponto novo por perto | criação do ponto | usuários com o raio compatível, no máximo um por dia |
| Cobertura confirmada | aceite do pedido | autor do pedido |
| Lembrete de cobertura | manhã da data-alvo | quem se comprometeu |

**Limites:** uma por ponto por dia para ponto vencido; no máximo cinco push por usuário por dia no total; nada entre 22h e 7h, exceto pedido de ajuda com data para hoje.

**Por quê o teto e o silêncio noturno.** A notificação é o principal motor de retorno do app e também a principal causa de desinstalação. Um teto explícito no documento evita que cada nova funcionalidade adicione "só mais um" aviso.

### 7.6 Privacidade e segurança

Estas são regras de produto, obrigatórias:

1. **Nome exibido = primeiro nome + inicial.** "Marina C." Nunca nome completo, nunca @usuário.
2. **Coordenada arredondada a ~50 m** na exibição pública e no "Como chegar". A precisão cheia existe no banco só para cálculo de distância.
3. **Histórico de registros de uma pessoa não é público.** O histórico do ponto é.
4. **Ponto é lugar público.** Aviso permanente no cadastro; ponto em endereço residencial é removível por denúncia.
5. **Localização do usuário não é gravada.**
6. **Sem tracker, sem SDK de publicidade, sem analytics de terceiros** no MVP. Só métricas próprias e agregadas.
7. **Apagar a conta** anonimiza os registros e preserva o histórico do ponto.

**Por quê tanto cuidado.** Quem alimenta animal de rua enfrenta hostilidade de vizinhos com frequência — de bilhete na porta a ameaça. Um mapa que cruzasse "este ponto é alimentado às 7h" com "Marina Cardoso alimenta este ponto todo dia às 7h" entregaria a rotina de uma pessoa a quem quisesse achá-la. O ganho de produto em expor isso é cosmético; o risco é real.

### 7.7 Moderação

- **Denunciar** registro, comentário ou ponto, com motivo opcional.
- **Bloquear** usuário: o conteúdo dele some do seu feed, sem aviso a ele.
- **Mantenedor** remove registro errado no ponto dele.
- **Fila de denúncias** vista pelo administrador direto no painel do Supabase — sem interface própria no MVP.
- Três denúncias no mesmo conteúdo o ocultam automaticamente até a revisão.

**Por quê sem painel de moderação no MVP.** Com um bairro e dezenas de usuários, o volume cabe numa consulta SQL. Construir painel antes de existir demanda é o tipo de trabalho que atrasa o lançamento e costuma ser jogado fora.

### 7.8 Estados de erro e vazio — regra geral

| Situação | Comportamento |
|---|---|
| Sem rede, leitura | Mostra cache com faixa e horário da última atualização |
| Sem rede, escrita de registro | Fila local e envio automático |
| Sem rede, outras escritas | Botão desabilitado com explicação |
| Erro do servidor | Mensagem humana + "Tentar de novo". Nunca código de erro cru |
| Lista vazia | Sempre com frase de contexto e uma ação |
| Carregando | Esqueleto em listas; indicador em botões. Nunca tela de bloqueio inteira |

---

## 8. Telas desenhadas fora do MVP

Estão desenhadas e documentadas para não se perder a decisão, mas **não entram na primeira versão**. Cada uma depende de base de usuários que o MVP ainda não tem.

### 8.1 Ranking

Aba com pódio dos três primeiros, cartão da sua posição com o que falta para subir, lista dos demais e as suas conquistas.

**Regra central:** o ranking existe para cobrir buracos de agenda, não para competir. Por isso o cartão do usuário destaca "faltam 4 registros para o top 10" em vez de exibir a distância para o primeiro colocado.

**Por que fora do MVP.** Com dez usuários, um ranking é constrangedor — mostra que três pessoas fazem tudo. E ranking mal calibrado empurra para o comportamento errado: registrar mais, não alimentar melhor.

### 8.2 Conquistas

Nove conquistas em três eixos: **Constância** (Primeira tigela · Rotina 7 dias · Sentinela 30 dias), **Cuidado** (Nunca sem água · Relato completo · Olho atento), **Comunidade** (Deu cobertura · Mantenedor · Guardião do bairro).

Toda conquista deriva de evento que o app já grava — não exige tabela nova além de uma view de contagem. Conquista bloqueada **mostra progresso** ("12 / 20"), nunca só um cadeado: o número é o que puxa de volta.

**Por que fora do MVP.** Gamificação antes de existir hábito premia comportamento que ainda não se formou. Primeiro descobrir se as pessoas registram (H1); depois reforçar.

### 8.3 Patrocínio

Modelo completo em `claude/patrocinio.md`. Em resumo: patrocínio **do app**, vários patrocinadores, em três níveis (mantenedor da cidade, apoiador, parceiro local) e seis espaços com teto e rodízio. A peça central é a **meta do bairro** — "a cada 100 registros no Centro esta semana, a marca doa 50 kg para os pontos sem mantenedor" —, que converte patrocínio em ação coletiva.

Quatro linhas que não se cruzam, mesmo depois que o patrocínio entrar:
1. Patrocínio nunca muda quais pontos aparecem nem a ordem deles.
2. Nenhuma marca entra em alerta de ponto sem comida.
3. A camada de apoiadores é desligável.
4. Nenhum dado pessoal vai para patrocinador — só números agregados.

**Por que fora do MVP.** Não se vende inventário sem audiência.

---

## 9. Tom de voz e microcopy

**Como o app fala:** direto, caloroso, sem infantilizar. Frase curta. Voz ativa. Sem emoji na interface — a paleta e as ilustrações já dão o calor.

**Regras**

| Faça | Não faça |
|---|---|
| "Ninguém registrou aqui hoje" | "Ops! Parece que ainda não temos registros 🐾" |
| "Você foi o primeiro hoje" | "Parabéns, herói dos animais!" |
| "Sem conexão. Guardamos seu registro." | "Erro 503 ao sincronizar" |
| "Marque só lugares públicos." | "Ao prosseguir, você declara estar ciente..." |
| "Este ponto não tem mantenedor" | "Ponto órfão" *(termo interno, não vai para a tela)* |

**Termos na interface:** ponto · registrar · alimentar · mantenedor · co-mantenedor · pedido de ajuda · cobrir · voluntário.
**Termos que ficam só no código:** órfão · status · derivado · payload.

**Números e datas:** relativo em listas ("há 6 h", "ontem"), absoluto em detalhe ("ontem às 7h10"). Vírgula decimal ("1,5 kg"). Unidade sempre junto do número.

---

## 10. Perguntas em aberto

Decisões que o piloto precisa responder. Estão aqui para não serem esquecidas nem decididas por acidente dentro de um pull request.

1. **Os cortes de status (4 h / 12 h) servem para todo tipo de ponto?** Provavelmente não. Avaliar tornar configurável por ponto após quatro semanas de dados.
2. **Adoção sem barreira aguenta o primeiro abuso?** Monitorar adoção seguida de inatividade. Se acontecer, considerar exigir um registro prévio no ponto.
3. **O aviso de ponto vencido incomoda?** Medir taxa de desativação do tipo nas configurações. Se passar de 30%, o teto diário está frouxo.
4. **Quantos pontos uma pessoa mantém confortavelmente?** Se a média passar de cinco, provavelmente falta gente e sobra responsabilidade — sinal para o produto empurrar mais adoção.
5. **A contagem de cães e gatos é usada?** Se a maior parte dos registros deixar zero nos dois, o campo sai da tela.
6. **A foto vale o custo?** Storage e upload têm preço. Se menos de 20% dos registros levarem foto, considerar tornar a foto exclusiva do relato de animal ferido.
7. **Vale a pena um modo "só olhar" permanente?** Se boa parte do uso for visitante que nunca cria conta, isso é um sinal de produto, não uma falha de conversão.

---

## Apêndices

- **`claude/mvp-escopo.md`** — recorte do MVP, schema SQL completo com RLS, fases de construção, riscos e critérios de lançamento.
- **`claude/design-do-app.md`** — sistema visual e resumo das telas.
- **`claude/patrocinio.md`** — modelo de patrocínio completo.
- **Canvas de design** — 10 telas do fluxo e 5 peças de patrocínio, com anotações.
- **`estilo-caramelo.json`** — style Mapbox na paleta do app.
- **`mapa-preview.html`** — mapa real no navegador, com token próprio.
- **`MapaScreen.tsx`** — referência de integração `@rnmapbox/maps` + Supabase realtime.
