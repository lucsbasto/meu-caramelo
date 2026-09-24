// Nome exibido = primeiro nome + inicial do sobrenome (§7.6).
// "Marina Cardoso" -> "Marina C." · "Marina" -> "Marina" · "" -> "".
export function abbreviateName(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '';

  const first = parts[0];
  if (parts.length === 1) return first;

  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

// Autor cuja conta foi apagada: o registro fica, a autoria some (§6.13/§7.6).
export const AUTOR_REMOVIDO = 'Voluntário removido';

// Nome de exibição de um autor: abreviado quando há nome; "Voluntário removido"
// quando não há (conta apagada -> autoria nula preservando o histórico).
export function nomeAutor(full: string | null | undefined): string {
  const abreviado = abbreviateName(full);
  return abreviado === '' ? AUTOR_REMOVIDO : abreviado;
}
