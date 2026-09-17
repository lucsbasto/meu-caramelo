// Helpers puros do convite de co-mantenedor (§7.4). Sem React: link do convite,
// papel 'co' e tradução das mensagens de erro das RPCs para PT amigável.
import type { Papel } from './dados';

// Papel de quem entra por convite: co-mantenedor (enum papel_mantenedor).
export const PAPEL_CO: Papel = 'co';

// Deep-link de aceite. O scheme 'meucaramelo' (app.config.ts) mais a rota
// expo-router app/convite/[token].tsx resolvem meucaramelo://convite/<token>.
export function linkConvite(token: string): string {
  return `meucaramelo://convite/${token}`;
}

// Resultado textual da RPC sair_mantenedor (§6.6): o co saiu, o principal
// promoveu o co mais antigo, ou o ponto ficou órfão.
export type ResultadoSaida = 'promovido' | 'orfao' | 'saiu_co';

// A RPC devolve as mensagens de erro cruas ('auth_required' | 'convite_invalido'
// | 'nao_mantenedor'). Como os tipos gerados não conhecem as RPCs novas, lemos
// `error.message` por substring — é o texto que o Postgres levanta no `raise`.
type ErroChave = 'auth_required' | 'convite_invalido' | 'nao_mantenedor';

function chaveDoErro(error: unknown): ErroChave | null {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg.includes('convite_invalido')) return 'convite_invalido';
  if (msg.includes('nao_mantenedor')) return 'nao_mantenedor';
  if (msg.includes('auth_required')) return 'auth_required';
  return null;
}

// Mensagem amigável para a tela de aceite de convite (§7.4). Nunca expõe texto
// técnico: token inválido/expirado/usado vira uma frase única e clara.
export function mensagemAceite(error: unknown): string {
  switch (chaveDoErro(error)) {
    case 'convite_invalido':
      return 'Este convite expirou ou já foi usado.';
    case 'auth_required':
      return 'Entre na sua conta para aceitar o convite.';
    default:
      return 'Não deu para aceitar o convite agora. Tente de novo.';
  }
}

// Mensagem amigável para a saída de mantenedor (§6.6), quando a RPC falha.
export function mensagemSaida(error: unknown): string {
  switch (chaveDoErro(error)) {
    case 'nao_mantenedor':
      return 'Você não mantém mais este ponto.';
    case 'auth_required':
      return 'Entre na sua conta para continuar.';
    default:
      return 'Não deu para sair agora. Tente de novo.';
  }
}
