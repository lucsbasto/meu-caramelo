// Regras puras da §7.5 (limites e silêncio noturno), isoladas de qualquer API do
// Deno/Supabase para poderem ser testadas com jest e reutilizadas pelo runtime
// da Edge Function (index.ts).
//
// A rota do deep link NÃO é computada aqui: por contrato T6 (#44) a EF envia
// `data = { tipo, ...ids }` cru e a tabela `tipo → rota` vive no app
// (src/features/notificacoes/tipos.ts). O vocabulário de `tipo` abaixo espelha o
// da const canônica do app.

export type Payload = Record<string, unknown>;

// Fuso fixo do MVP (BR) — fork travado no mapa #38: silêncio noturno e virada
// do dia usam America/Sao_Paulo, sem tz por usuário. `PUSH_TZ` sobrescreve.
export const PUSH_TZ_PADRAO = 'America/Sao_Paulo';

// Expo Push API aceita no máximo 100 mensagens por request (T1 #39). O envio
// divide os destinatários em lotes deste tamanho para nunca estourar o limite.
export const LOTE_EXPO_MAX = 100;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

// Divide um array em pedaços de no máximo `tamanho`, preservando a ordem — usado
// para respeitar o teto de 100 mensagens por request da Expo Push API. O último
// pedaço pode ser menor; um array vazio produz nenhum lote.
export function dividirEmLotes<T>(itens: T[], tamanho: number): T[][] {
  if (!Number.isInteger(tamanho) || tamanho < 1) {
    throw new Error('tamanho do lote deve ser inteiro >= 1');
  }
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

// Hora local (0–23) em um fuso, sem depender de libs externas.
export function horaLocal(data: Date, tz: string): number {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(data);
  return Number(s);
}

// Data local no formato YYYY-MM-DD em um fuso.
export function dataLocal(data: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

// Campos de id que a EF copia do `payload` para o `data` cru da mensagem (sem
// JOIN). O app usa `tipo` + esses ids para montar a rota (§4.5, tabela no app).
export const CAMPOS_ID_ROTA = ['ponto_id', 'pedido_id', 'registro_id'] as const;

// Copia do payload apenas os ids de rota presentes, montando o `data` cru
// `{ tipo, ...ids }` que viaja na mensagem push.
export function dadosDeRota(tipo: string, payload: Payload): Record<string, string> {
  const dados: Record<string, string> = { tipo };
  for (const campo of CAMPOS_ID_ROTA) {
    const v = str(payload[campo]);
    if (v) dados[campo] = v;
  }
  return dados;
}

// Título e corpo exibidos no push. O payload pode sobrescrever com `titulo`/`corpo`.
export function conteudoPara(
  tipo: string,
  payload: Payload
): { titulo: string; corpo: string } {
  const override = {
    titulo: str(payload.titulo),
    corpo: str(payload.corpo),
  };

  const base: Record<string, { titulo: string; corpo: string }> = {
    ponto_vencido: {
      titulo: 'Um ponto precisa de você',
      corpo: 'Um ponto que você acompanha está sem registro há um tempo.',
    },
    pedido_ajuda: {
      titulo: 'Pedido de ajuda perto de você',
      corpo: 'Alguém precisa de cobertura em um ponto que você conhece.',
    },
    registro_em_ponto_seguido: {
      titulo: 'Novo registro em ponto seguido',
      corpo: 'Alguém acabou de alimentar um ponto que você segue.',
    },
    comentario: {
      titulo: 'Comentaram no seu registro',
      corpo: 'Toque para ver o que disseram.',
    },
    ponto_novo_por_perto: {
      titulo: 'Ponto novo por perto',
      corpo: 'Cadastraram um ponto de alimentação perto de você.',
    },
    cobertura_confirmada: {
      titulo: 'Cobertura confirmada',
      corpo: 'Alguém aceitou o seu pedido de ajuda.',
    },
    lembrete_cobertura: {
      titulo: 'Lembrete de cobertura',
      corpo: 'Hoje é o dia da cobertura com que você se comprometeu.',
    },
    promovido_principal: {
      titulo: 'Você é o mantenedor agora',
      corpo: 'Um ponto passou a ter você como mantenedor principal.',
    },
  };

  const padrao = base[tipo] ?? {
    titulo: 'Meu Caramelo',
    corpo: 'Você tem um aviso novo.',
  };

  return {
    titulo: override.titulo ?? padrao.titulo,
    corpo: override.corpo ?? padrao.corpo,
  };
}

export const TETO_DIARIO_PADRAO = 5;

// §7.5 — decide se uma notificação pode virar push agora, respeitando o teto
// diário por usuário e o silêncio 22h–7h (exceto pedido de ajuda para hoje).
export function podeEnviar(args: {
  agora: Date;
  tz: string;
  tipo: string;
  payload: Payload;
  enviadasHoje: number;
  teto?: number;
}): { enviar: boolean; motivo: 'ok' | 'teto_diario' | 'silencio_noturno' } {
  const teto = args.teto ?? TETO_DIARIO_PADRAO;

  if (args.enviadasHoje >= teto) {
    return { enviar: false, motivo: 'teto_diario' };
  }

  const hora = horaLocal(args.agora, args.tz);
  const noturno = hora >= 22 || hora < 7;
  if (noturno) {
    const ajudaParaHoje =
      args.tipo === 'pedido_ajuda' &&
      str(args.payload.data_alvo) === dataLocal(args.agora, args.tz);
    if (!ajudaParaHoje) {
      return { enviar: false, motivo: 'silencio_noturno' };
    }
  }

  return { enviar: true, motivo: 'ok' };
}
