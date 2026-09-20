// Tipos + lógica pura das Configurações (§6.13). Mantém a tela e o hook finos:
// aqui ficam os defaults das preferências, as opções de raio e os textos de
// confirmação — tudo testável sem Supabase nem React.

// Preferências de notificação por tipo (§6.13). As chaves espelham as colunas
// da tabela `preferencias`; o rótulo é o que a pessoa lê no interruptor.
export type ChaveNotificacao =
  | 'notif_ponto_vencido'
  | 'notif_pedido_ajuda'
  | 'notif_registro_seguido'
  | 'notif_comentario'
  | 'notif_ponto_novo';

export type Notificacoes = Record<ChaveNotificacao, boolean>;

// Raio do escopo "Perto de mim" (§6.13). `null` = "bairro todo" (sem corte por
// distância). Os metros casam com o raio_m das RPCs de proximidade.
export type RaioM = 1000 | 3000 | 5000 | null;

export type Preferencias = Notificacoes & { raio_m: RaioM };

// Linha crua da tabela `preferencias` (colunas nullable até os tipos gerados
// conhecerem a tabela; por isso o shape é tolerante).
export type PreferenciasRow = Partial<Notificacoes> & {
  user_id?: string;
  raio_m?: number | null;
};

// Ordem e rótulos dos interruptores, do mais importante ao menos (§6.13). O
// "ponto vencido" vem primeiro de propósito: é o aviso que ninguém deve perder.
export const NOTIFICACOES: { chave: ChaveNotificacao; rotulo: string; descricao: string }[] = [
  {
    chave: 'notif_ponto_vencido',
    rotulo: 'Ponto vencido',
    descricao: 'Quando um ponto que você cuida passa do tempo sem alimentação.',
  },
  {
    chave: 'notif_pedido_ajuda',
    rotulo: 'Pedido de ajuda perto',
    descricao: 'Quando alguém perto pede ajuda para cobrir um ponto.',
  },
  {
    chave: 'notif_registro_seguido',
    rotulo: 'Registro em ponto seguido',
    descricao: 'Quando alguém alimenta um ponto que você segue.',
  },
  {
    chave: 'notif_comentario',
    rotulo: 'Comentário',
    descricao: 'Quando comentam num registro seu.',
  },
  {
    chave: 'notif_ponto_novo',
    rotulo: 'Ponto novo perto',
    descricao: 'Quando cadastram um ponto novo na sua região.',
  },
];

// Opções do seletor de raio (§6.13): 1 km · 3 km · 5 km · bairro todo.
export const RAIOS: { valor: RaioM; rotulo: string }[] = [
  { valor: 1000, rotulo: '1 km' },
  { valor: 3000, rotulo: '3 km' },
  { valor: 5000, rotulo: '5 km' },
  { valor: null, rotulo: 'Bairro todo' },
];

// Default: tudo ligado, raio de bairro. É o que vale quando não há linha de
// preferências ainda (ninguém perde aviso sem ter escolhido desligar).
export const PREFERENCIAS_PADRAO: Preferencias = {
  notif_ponto_vencido: true,
  notif_pedido_ajuda: true,
  notif_registro_seguido: true,
  notif_comentario: true,
  notif_ponto_novo: true,
  raio_m: null,
};

const CHAVES_NOTIF: ChaveNotificacao[] = NOTIFICACOES.map((n) => n.chave);

function raioValido(m: number | null | undefined): RaioM {
  if (m === 1000 || m === 3000 || m === 5000) return m;
  return null;
}

// Row do banco -> preferências completas, preenchendo o que falta com o padrão.
// Uma pessoa sem linha (row null/undefined) recebe tudo ligado.
export function preferenciasDeRow(row: PreferenciasRow | null | undefined): Preferencias {
  if (!row) return { ...PREFERENCIAS_PADRAO };
  const prefs = { ...PREFERENCIAS_PADRAO };
  for (const chave of CHAVES_NOTIF) {
    if (typeof row[chave] === 'boolean') prefs[chave] = row[chave] as boolean;
  }
  prefs.raio_m = raioValido(row.raio_m);
  return prefs;
}

// Preferências -> payload de upsert (inclui user_id, sem atualizado_em, que o
// banco carimba). Serve para gravar o estado inteiro de uma vez.
export function rowDePreferencias(userId: string, prefs: Preferencias): PreferenciasRow & { user_id: string } {
  return {
    user_id: userId,
    notif_ponto_vencido: prefs.notif_ponto_vencido,
    notif_pedido_ajuda: prefs.notif_pedido_ajuda,
    notif_registro_seguido: prefs.notif_registro_seguido,
    notif_comentario: prefs.notif_comentario,
    notif_ponto_novo: prefs.notif_ponto_novo,
    raio_m: prefs.raio_m,
  };
}

// Rótulo do raio atual, para exibir o valor selecionado.
export function rotuloRaio(m: RaioM): string {
  return RAIOS.find((r) => r.valor === m)?.rotulo ?? 'Bairro todo';
}

// Texto exato da confirmação de apagar conta (§6.13): diz, com essas palavras,
// que os registros viram "Voluntário removido" e o histórico do ponto fica.
export const APAGAR_CONTA_TITULO = 'Apagar minha conta';
export const APAGAR_CONTA_MENSAGEM =
  'Sua conta será removida e seus registros passam a aparecer como "Voluntário removido". ' +
  'O histórico dos pontos é preservado. Esta ação não pode ser desfeita.';
