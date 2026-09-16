// Helpers puros e constantes do registro de alimentação (§6.7).
import type { Database } from '@/lib/database.types';

export type TipoItem = Database['public']['Enums']['tipo_item'];

// Ordem de exibição dos chips de tipo (§6.7). Os rótulos PT vêm de
// ROTULOS_TIPO em dados.ts — aqui só a ordem, para não duplicar texto.
export const TIPOS_ITEM: TipoItem[] = [
  'racao',
  'agua',
  'caseira',
  'petisco',
  'remedio',
];

// Quantidade em kg só vale quando há ração OU comida caseira selecionada
// (§6.7): sem esses tipos, o campo não aparece e o insert grava null.
export function exigeQuantidade(tipos: TipoItem[]): boolean {
  return tipos.includes('racao') || tipos.includes('caseira');
}

// Passo do stepper de quantidade (§6.7): meio quilo.
export const PASSO_KG = 0.5;

// Limite duro da observação (§6.7): 280 caracteres.
export const OBSERVACAO_MAX = 280;

// 0 vira null no insert (§6.7): contador zerado é ausência de dado, não zero.
export function contagemParaInsert(n: number): number | null {
  return n > 0 ? n : null;
}

// UUID v4 gerado no cliente para a PK do registro (§6.7 idempotência). É um id
// de deduplicação, não um segredo, então usa Math.random puro — evita depender
// do módulo nativo ExpoCrypto (que nem todo dev-client tem embutido). Formato
// uuid válido para a coluna `registros.id` (uuid).
export function gerarIdRegistro(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
