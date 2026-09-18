// Canal de "foco pendente" entre a busca (§6.14) e o mapa. A tela /busca é
// empilhada sobre o mapa; ao escolher um ponto/endereço ela grava aqui e volta
// (router.back()). O mapa, ao reganhar foco, consome o pedido e move a câmera.
// Store externo mínimo (estado de módulo one-shot), sem dep nova e sem
// serializar coordenadas em params de rota. O mapa consome via consumirFoco()
// ao reganhar foco — não há assinatura reativa porque o pedido só é lido nesse
// momento.

export type Foco = { lat: number; lng: number; pontoId?: string } | null;

let estado: Foco = null;

// Registra um pedido de foco (câmera vai para lá; com pontoId, também seleciona).
export function setFoco(f: Foco): void {
  estado = f;
}

// Lê e limpa o pedido pendente (one-shot): o mapa chama ao reganhar foco.
export function consumirFoco(): Foco {
  const atual = estado;
  estado = null;
  return atual;
}
