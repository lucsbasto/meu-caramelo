# Meu Caramelo — modelo de patrocínio

Patrocínio é **do aplicativo**, não do ponto, e vários patrocinadores convivem. O modelo segue a lógica do Waze: a marca aparece onde ela é um **lugar físico útil** (pin no mapa), e o resto do patrocínio ocupa espaços fixos e escassos, nunca o mapa inteiro.

Desenhado na página "Patrocínio (modelo Waze)" do canvas, em 5 peças: mapa com apoiadores, folha do apoiador, meta do bairro, tela Quem apoia, e a tabela de vagas e rodízio.

## Três níveis

| Nível | Vagas | O que ganha |
|---|---|---|
| **Mantenedor da cidade** | 1 por cidade | Pin no mapa, meta do bairro com o nome dela, topo do Quem apoia, splash. Única marca dentro do fluxo de alimentar. |
| **Apoiador** | até 4 | Pin no mapa nos endereços reais, linha no Quem apoia, entra no rodízio da meta do bairro. |
| **Parceiro local** | sem limite | Chip no Quem apoia e no rodapé do perfil. Porta de entrada barata do pet shop da esquina — é o que dá volume. |

## Os seis espaços

| Espaço | Quantos ao mesmo tempo | Como rotaciona | Regra que protege o app |
|---|---|---|---|
| Pin no mapa | Todos os endereços reais | Não rotaciona — é lugar físico | Pin **quadrado**, nunca redondo, para não competir com ponto de alimentação. Camada desligável num toque. |
| Folha do apoiador | 1, a que o usuário tocou | Só abre no toque | Botão escuro, nunca caramelo: a cor do "Alimentar" não se vende. |
| Meta do bairro | 1 por bairro, por semana | Rodízio semanal entre mantenedor e apoiadores | A barra mostra o que foi entregue; marca que não cumpre sai do rodízio. |
| Tela "Quem apoia" | Todos | Ordenada por contribuição, nunca por preço | Números auditáveis: kg, castrações, pontos atendidos. |
| Rodapé do perfil | Faixa com todos os logos | Estática | Fora do caminho de qualquer tarefa. |
| Splash de abertura | 1 por semana | Rodízio semanal, só níveis 1 e 2 | 1,5 s, sem botão. Não aparece se o app abriu por notificação de urgência. |

## Meta do bairro — a peça central

"A cada 100 registros no Centro esta semana, a Boa Pata doa 50 kg para os pontos sem mantenedor." Barra de progresso coletiva, avatares de quem participou, prazo.

É a melhor peça do conjunto porque converte patrocínio em ação da comunidade em vez de espaço publicitário: a marca ganha visibilidade proporcional ao que entrega, o voluntário ganha um motivo a mais para registrar, e os pontos órfãos — o problema real do app — recebem ração.

## As quatro linhas que não se cruzam

1. Patrocínio nunca muda quais pontos aparecem nem a ordem deles.
2. Nenhuma marca entra em alerta de ponto sem comida.
3. A camada de apoiadores é desligável, e fica desligada se o usuário desligar.
4. Nenhum dado pessoal de voluntário vai para patrocinador — só números agregados.

## Ideias ainda não desenhadas

- **Resgate patrocinado:** clínica veterinária banca N atendimentos/mês; o card "animal ferido" no feed vira um pedido encaminhável.
- **Conquista patrocinada:** badge entregue por uma marca ("Sentinela 30 dias · Boa Pata") com recompensa real (cupom, kg de ração para o ponto do voluntário).
- **Relatório do patrocinador:** página pública, fora do app, com o que a marca entregou — material de venda e prestação de contas ao mesmo tempo.
- **Adoção de bairro:** empresa banca todos os pontos órfãos de um bairro por um trimestre.
- **Ponto de coleta:** endereço do apoiador vira ponto de doação de ração no mapa (já aparece na folha do apoiador).

## Em aberto

- Preço e contrapartida de cada nível
- Quem aprova um patrocinador (curadoria: pet shop sim, empresa com histórico de maus-tratos não)
- Se o splash de abertura vale o incômodo — é o espaço mais vendável e o mais intrusivo
- Marcas usadas nos mockups (Boa Pata, Vet Aurora, Mercado São Jorge, Pet Shop Rex, Padaria Central) são fictícias
