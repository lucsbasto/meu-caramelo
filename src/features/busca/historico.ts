// Histórico recente da busca (§6.14): mostrado quando o campo está vazio.
// Persistência em expo-secure-store no mesmo padrão da fila offline
// (filaOffline.ts): lista curta (~8 itens) por causa do limite ~2 KB do
// SecureStore no Android. Best-effort — nunca bloqueia a busca se falhar.

import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const CHAVE_HISTORICO = 'busca_historico';
const MAX_ITENS = 8;

export type ItemHistorico = {
  tipo: 'ponto' | 'endereco';
  id: string;
  nome: string;
  endereco: string | null;
  lat: number;
  lng: number;
};

export async function lerHistorico(): Promise<ItemHistorico[]> {
  try {
    const bruto = await SecureStore.getItemAsync(CHAVE_HISTORICO);
    if (!bruto) return [];
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? (lista as ItemHistorico[]) : [];
  } catch {
    // JSON corrompido ou store indisponível: trata como histórico vazio.
    return [];
  }
}

// Dedup por tipo+id, coloca no topo e limita a MAX_ITENS. Não propaga erro de
// escrita: histórico é conveniência, não pode derrubar a interação de busca.
function aplicar(lista: ItemHistorico[], item: ItemHistorico): ItemHistorico[] {
  const semDup = lista.filter(
    (i) => !(i.tipo === item.tipo && i.id === item.id),
  );
  return [item, ...semDup].slice(0, MAX_ITENS);
}

async function gravarHistorico(lista: ItemHistorico[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE_HISTORICO, JSON.stringify(lista));
  } catch {
    // limite ~2 KB / store indisponível: mantemos só em memória nesta sessão.
  }
}

export async function adicionarHistorico(
  item: ItemHistorico,
): Promise<ItemHistorico[]> {
  const nova = aplicar(await lerHistorico(), item);
  await gravarHistorico(nova);
  return nova;
}

// Lista + `registrar`: atualiza a UI na hora e persiste em segundo plano.
export function useHistorico(): {
  itens: ItemHistorico[];
  registrar: (item: ItemHistorico) => void;
} {
  const [itens, setItens] = useState<ItemHistorico[]>([]);

  useEffect(() => {
    let vivo = true;
    lerHistorico().then((l) => {
      if (vivo) setItens(l);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const registrar = useCallback((item: ItemHistorico) => {
    // Persiste a MESMA lista que vai pra memória: evita read-modify-write do
    // disco (duas chamadas seguidas leriam o mesmo estado e a última venceria,
    // perdendo entradas). Memória e disco ficam idênticos.
    setItens((prev) => {
      const nova = aplicar(prev, item);
      void gravarHistorico(nova);
      return nova;
    });
  }, []);

  return { itens, registrar };
}
