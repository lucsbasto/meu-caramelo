// Helpers puros e constantes do editor de ponto (§6.6).
import type { Papel } from './dados';

export type Coord = { lat: number; lng: number };

// Papel de quem cria o ponto: mantenedor principal (enum papel_mantenedor).
export const PAPEL_PRINCIPAL: Papel = 'principal';

// A coluna `pontos.geom` é geography(Point,4326). O cliente grava a geometria
// como EWKT — e no PostGIS a ordem é X Y, ou seja, longitude antes da latitude.
export function coordParaEwkt(c: Coord): string {
  return `SRID=4326;POINT(${c.lng} ${c.lat})`;
}

// Ao ler `pontos.geom` direto da tabela, o PostgREST devolve EWKB em hexa
// (ex.: "0101000020E6100000...."). Para carregar um ponto na edição — inclusive
// desativado, que a view `pontos_com_status` esconde — decodificamos o Point:
// ordem (1 byte) + tipo (4) + SRID quando presente (4) + X (8) + Y (8), doubles
// little/big-endian conforme o byte de ordem.
export function geomHexParaCoord(hex: string): Coord | null {
  try {
    if (hex.length < 42) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    const view = new DataView(bytes.buffer);
    const little = bytes[0] === 1;
    const tipo = view.getUint32(1, little);
    const temSrid = (tipo & 0x20000000) !== 0; // flag EWKB de SRID embutido
    const offsetX = 5 + (temSrid ? 4 : 0);
    const lng = view.getFloat64(offsetX, little);
    const lat = view.getFloat64(offsetX + 8, little);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Mínimo válido do cadastro (§6.6 Regras): nome preenchido + coordenada.
// A coordenada sempre existe (mapa começa em algum centro), então só o nome
// precisa ser validado aqui.
export function nomeValido(nome: string): boolean {
  return nome.trim().length > 0;
}

// Abaixo desta distância dois pontos disparam o aviso de duplicata (§6.6 Estados).
export const DISTANCIA_DUPLICATA_M = 30;

// Bucket do Storage onde as fotos dos pontos são guardadas.
// PROVISIONAMENTO EXTERNO: criar o bucket público `pontos` no Supabase é um
// follow-up de infra; enquanto ele não existe, o upload falha e o fluxo de
// "salvar sem foto" (§6.6 Estados) mantém o cadastro mesmo assim.
export const BUCKET_FOTOS = 'pontos';

// Textos fixos vindos direto da especificação (§6.6 Anatomia).
export const DICA_NOME =
  'Como as pessoas do bairro chamam esse lugar. Ex.: Praça da Matriz, Viaduto da Rodoviária.';

export const AVISO_PRIVACIDADE =
  'Marque só lugares públicos. Não cadastre a frente da casa de alguém, nem a sua.';
