// Três números do onboarding (§6.1 Dados): pontos ativos · alimentados hoje ·
// voluntários. Vêm de um endpoint público agregado por cidade (sem auth). A
// regra de produto é forte: o bloco **some** quando não há dado confiável — não
// mostra zero nem esqueleto —, porque "0 voluntários" no lançamento é o
// argumento contrário à prova social (§6.1 Por quê).

export type EstatisticasCidade = {
  pontosAtivos: number;
  alimentadosHoje: number;
  voluntarios: number;
};

// Supabase `rpc()` devolve ora um objeto, ora um array de uma linha, conforme a
// função seja escalar-composta ou `returns table`. Aceita as duas formas.
function primeiraLinha(payload: unknown): Record<string, unknown> | null {
  if (payload == null) return null;
  const linha = Array.isArray(payload) ? payload[0] : payload;
  if (linha == null || typeof linha !== 'object') return null;
  return linha as Record<string, unknown>;
}

function inteiroNaoNegativo(valor: unknown): number | null {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

// Normaliza a resposta do endpoint. Devolve `null` (→ bloco some) quando:
// - a resposta é vazia/malformada;
// - algum dos três campos falta ou não é um inteiro >= 0;
// - os três são zero (dia do lançamento — esconder em vez de mostrar zeros).
export function normalizarEstatisticas(
  payload: unknown,
): EstatisticasCidade | null {
  const linha = primeiraLinha(payload);
  if (!linha) return null;

  const pontosAtivos = inteiroNaoNegativo(linha.pontos_ativos);
  const alimentadosHoje = inteiroNaoNegativo(linha.alimentados_hoje);
  const voluntarios = inteiroNaoNegativo(linha.voluntarios);

  if (pontosAtivos == null || alimentadosHoje == null || voluntarios == null) {
    return null;
  }

  if (pontosAtivos === 0 && alimentadosHoje === 0 && voluntarios === 0) {
    return null;
  }

  return { pontosAtivos, alimentadosHoje, voluntarios };
}

// Rótulos dos três números, na ordem da tela (§6.1 Anatomia item 4).
export const rotulosEstatisticas: {
  chave: keyof EstatisticasCidade;
  rotulo: string;
}[] = [
  { chave: 'pontosAtivos', rotulo: 'pontos ativos' },
  { chave: 'alimentadosHoje', rotulo: 'alimentados hoje' },
  { chave: 'voluntarios', rotulo: 'voluntários' },
];
