// Nome exibido = primeiro nome + inicial do sobrenome (§7.6).
// "Marina Cardoso" -> "Marina C." · "Marina" -> "Marina" · "" -> "".
export function abbreviateName(full: string | null | undefined): string {
  const parts = (full ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '';

  const first = parts[0];
  if (parts.length === 1) return first;

  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}
