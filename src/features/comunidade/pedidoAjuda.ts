// Helpers puros do pedido de ajuda (§6.9) e da cobertura (§6.8): tradução dos
// chips "Quando" para a data-alvo, validação do formulário e mensagens de erro
// amigáveis das mutations. Sem React nem supabase — testável isoladamente.

// Chips rápidos de "Quando" (§6.9): Hoje · Amanhã · Escolher data.
export type QuandoChip = 'hoje' | 'amanha' | 'escolher';

// Limite do recado. O campo já vem com uma sugestão; um teto curto mantém o
// pedido objetivo e cabe no cartão do feed sem truncar demais.
export const TEXTO_MAX = 280;

// Sugestão pré-preenchida do recado (§6.9 Anatomia item 3).
export const TEXTO_SUGESTAO =
  'Viajo amanhã e ninguém cobre esse ponto na quinta. São 5 cães fixos.';

// Aviso fixo da folha (§6.9 Anatomia item 4).
export const AVISO_ALCANCE =
  'Vamos avisar quem segue este ponto e quem alimentou aqui no último mês.';

// Data local no formato `YYYY-MM-DD` (coluna `date` de pedidos_ajuda). Usa a
// data LOCAL, não UTC: "hoje" para o usuário é o dia do relógio dele, e um
// toISOString() poderia recuar/avançar um dia perto da meia-noite.
function paraISODate(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Resolve o chip "Quando" numa data-alvo `YYYY-MM-DD`. "escolher" sem data
// escolhida ainda devolve null — a validação barra o envio.
export function dataAlvoISO(
  chip: QuandoChip,
  escolhida: Date | null,
  agora: Date = new Date(),
): string | null {
  if (chip === 'hoje') return paraISODate(agora);
  if (chip === 'amanha') {
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    return paraISODate(amanha);
  }
  return escolhida ? paraISODate(escolhida) : null;
}

// Validação do formulário antes de publicar. `texto` é NOT NULL no banco e a
// data-alvo é obrigatória (sem data o pedido não tem sentido, §6.9).
export type ValidacaoPedido = { ok: true } | { ok: false; erro: string };

export function validarPedido(entrada: {
  texto: string;
  dataISO: string | null;
}): ValidacaoPedido {
  if (!entrada.dataISO) {
    return {
      ok: false,
      erro: 'Escolha o dia em que o ponto vai ficar descoberto.',
    };
  }
  if (entrada.texto.trim().length === 0) {
    return { ok: false, erro: 'Escreva um recado para quem pode cobrir.' };
  }
  if (entrada.texto.length > TEXTO_MAX) {
    return { ok: false, erro: `O recado passa de ${TEXTO_MAX} caracteres.` };
  }
  return { ok: true };
}

// Extrai o texto cru de um erro do supabase/Postgres (message + code) para
// casar por substring — os tipos gerados não conhecem as RPCs/constraints novas.
function textoErro(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; code?: unknown; details?: unknown };
    return [e.message, e.code, e.details]
      .filter((v) => typeof v === 'string')
      .join(' ');
  }
  return error instanceof Error ? error.message : String(error ?? '');
}

// A falha de rede não vira fila offline (§6.9): um pedido atrasado perde o
// sentido. Reconhece o erro de fetch do supabase-js para avisar sem enfileirar.
export function ehErroDeRede(error: unknown): boolean {
  const msg = textoErro(error).toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('fetch failed')
  );
}

// Mensagem amigável ao publicar um pedido (§6.9). A violação da unique parcial
// (um aberto por ponto por data) chega como 23505 — vira o aviso de duplicata.
export function mensagemErroCriar(error: unknown): string {
  const msg = textoErro(error);
  if (msg.includes('23505') || msg.includes('pedidos_ajuda_um_aberto')) {
    return 'Já existe um pedido aberto para esta data.';
  }
  if (ehErroDeRede(error)) {
    return 'Sem rede agora. O pedido não fica em fila — tente quando tiver conexão.';
  }
  return 'Não deu para publicar o pedido agora. Tente de novo.';
}

// Mensagem amigável ao cobrir um pedido (§6.8). Cobre os erros levantados pela
// RPC cobrir_pedido além da falha de rede.
export function mensagemErroCobrir(error: unknown): string {
  const msg = textoErro(error);
  if (msg.includes('ja_coberto')) {
    return 'Alguém já assumiu esse pedido antes de você.';
  }
  if (msg.includes('proprio_pedido')) {
    return 'Você não pode cobrir o seu próprio pedido.';
  }
  if (msg.includes('pedido_invalido')) {
    return 'Este pedido não está mais disponível.';
  }
  if (msg.includes('auth_required')) {
    return 'Entre na sua conta para cobrir este pedido.';
  }
  if (ehErroDeRede(error)) {
    return 'Sem rede agora. Tente cobrir quando tiver conexão.';
  }
  return 'Não deu para cobrir o pedido agora. Tente de novo.';
}
