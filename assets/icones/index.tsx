// Ícones do Meu Caramelo — gerado a partir de assets/icones/*.svg
// Grid 24x24 · traço 1.9 · cor via prop, nunca fixa no ícone.
//
//   <IconeTigela size={20} color={cores.caramelo} />

import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

type Props = { size?: number; color?: string };

/** Pata — marca do app — pin do mapa, marca, placeholder de foto */
export const IconePata = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Ellipse cx="6.5" cy="9.5" rx="2" ry="2.5" />
    <Ellipse cx="10.6" cy="6.6" rx="2" ry="2.5" />
    <Ellipse cx="15" cy="6.8" rx="2" ry="2.5" />
    <Ellipse cx="18.4" cy="10.6" rx="1.9" ry="2.3" />
    <Path d="M12.4 12.6c2.6 0 4.7 1.8 5.3 3.8.6 2-.8 3.8-3 3.8-1 0-1.7-.3-2.3-.3s-1.3.3-2.3.3c-2.2 0-3.6-1.8-3-3.8.6-2 2.7-3.8 5.3-3.8Z" />
  </Svg>
);

/** Pin de local — aba Mapa, endereço, notificação de ponto novo */
export const IconePin = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
    <Circle cx="12" cy="10" r="2.6" />
  </Svg>
);

/** Tigela com vapor — ração / alimentar — botão Alimentar, chip Ração, conquista */
export const IconeTigela = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M3.5 11h17c0 4.4-3.8 8-8.5 8S3.5 15.4 3.5 11Z" />
    <Path d="M8 8.2c0-1.2.9-1.6.9-2.7M12 7.8c0-1.4 1-1.9 1-3M16 8.2c0-1.2.9-1.6.9-2.7" />
  </Svg>
);

/** Gota — água — chip Água, pin de bebedouro, conquista */
export const IconeGota = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 3.5s5.5 6 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.5 12 3.5 12 3.5Z" />
  </Svg>
);

/** Câmera — adicionar foto, conquista Relato completo */
export const IconeCamera = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M4 8h3l1.5-2.2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <Circle cx="12" cy="13.5" r="3.5" />
  </Svg>
);

/** Confirmação — status ok hoje, selo Alimentou, confirmar registro */
export const IconeCheck = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

/** Atenção — status urgente, notificação de ponto vencido */
export const IconeAlerta = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 7.5v6" />
    <Path d="M12 17h.01" />
  </Svg>
);

/** Sino — notificações */
export const IconeSino = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" />
    <Path d="M10.3 19a2 2 0 0 0 3.4 0" />
  </Svg>
);

/** Lupa — busca do mapa */
export const IconeBusca = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="11" cy="11" r="6.2" />
    <Path d="M20 20l-4.6-4.6" />
  </Svg>
);

/** Mais — botão central de registro, steppers, adicionar */
export const IconeMais = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

/** Menos — steppers */
export const IconeMenos = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M5 12h14" />
  </Svg>
);

/** Seta esquerda — voltar em telas empilhadas */
export const IconeVoltar = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M15 5l-7 7 7 7" />
  </Svg>
);

/** Seta direita — linhas de menu, cards clicáveis */
export const IconeAvancar = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M9 5l7 7-7 7" />
  </Svg>
);

/** Seta para baixo — seletor de período, listas suspensas */
export const IconeExpandir = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);

/** Coração — reação no feed, seguir ponto */
export const IconeCoracao = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 20.3l-1.1-1C6 14.9 3 12.2 3 8.9 3 6.2 5.1 4.2 7.7 4.2c1.5 0 2.9.7 3.8 1.8.9-1.1 2.3-1.8 3.8-1.8 2.6 0 4.7 2 4.7 4.7 0 3.3-3 6-7.9 10.4l-1.1 1Z" />
  </Svg>
);

/** Balão — comentários */
export const IconeComentario = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M20 12c0 3.9-3.6 7-8 7-1 0-2-.2-2.9-.5L4 20l1.4-3.6A6.5 6.5 0 0 1 4 12c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
  </Svg>
);

/** Compartilhar — feed, detalhe do ponto */
export const IconeCompartilhar = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="18" cy="6" r="2.6" />
    <Circle cx="6" cy="12" r="2.6" />
    <Circle cx="18" cy="18" r="2.6" />
    <Path d="M8.4 10.8 15.6 7.2M8.4 13.2l7.2 3.6" />
  </Svg>
);

/** Relógio — tempo desde o último registro, histórico */
export const IconeRelogio = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="12" cy="12" r="7.5" />
    <Path d="M12 7.8V12l2.8 1.8" />
  </Svg>
);

/** Troféu — aba Ranking (fora do MVP) */
export const IconeTrofeu = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <Path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 10" />
    <Path d="M16 5.5h2.5A2.5 2.5 0 0 1 16 10" />
    <Path d="M12 13v4" />
    <Path d="M9 20h6l-.7-3h-4.6L9 20Z" />
  </Svg>
);

/** Coroa — mantenedor — selo no avatar, adotar ponto, 1º do ranking */
export const IconeCoroa = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M3 7.5 7 11l5-6.5L17 11l4-3.5-1.8 10.2a1.2 1.2 0 0 1-1.2 1H6a1.2 1.2 0 0 1-1.2-1L3 7.5Z" />
  </Svg>
);

/** Pessoa — aba Perfil */
export const IconeUsuario = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="12" cy="8" r="3.4" />
    <Path d="M4.8 20c.8-3.6 3.7-5.6 7.2-5.6s6.4 2 7.2 5.6" />
  </Svg>
);

/** Cards empilhados — aba Comunidade */
export const IconeFeed = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x="3.5" y="4" width="17" height="7" rx="2.2" />
    <Rect x="3.5" y="13" width="17" height="7" rx="2.2" />
  </Svg>
);

/** Camadas — alternar estilo do mapa */
export const IconeCamadas = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 3 3.5 7.2 12 11.4l8.5-4.2L12 3Z" />
    <Path d="M3.5 12.4 12 16.6l8.5-4.2" />
    <Path d="M3.5 17.2 12 21.4l8.5-4.2" />
  </Svg>
);

/** Alvo — recentralizar o mapa */
export const IconeAlvo = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="12" cy="12" r="3.2" />
    <Circle cx="12" cy="12" r="8" />
    <Path d="M12 2.2v2.4M12 19.4v2.4M2.2 12h2.4M19.4 12h2.4" />
  </Svg>
);

/** Seta de navegação — Como chegar, posição do usuário */
export const IconeNavegar = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 3.5 20.5 20 12 16.4 3.5 20 12 3.5Z" />
  </Svg>
);

/** Lápis — editar perfil, editar ponto */
export const IconeLapis = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="m16.5 4.5 3 3L9 18l-4 1 1-4 10.5-10.5Z" />
  </Svg>
);

/** Calendário com confirmação — conquista Rotina, data do pedido de ajuda */
export const IconeCalendarioCheck = ({
  size = 24,
  color = '#2B1D12',
}: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <Path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    <Path d="M8.6 14.6l2.2 2.2 4.2-4.4" />
  </Svg>
);

/** Escudo — conquista Sentinela, aviso de privacidade */
export const IconeEscudo = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 3.5l7 2.6v5.6c0 4.4-3 7.6-7 8.8-4-1.2-7-4.4-7-8.8V6.1l7-2.6Z" />
  </Svg>
);

/** Olho — conquista Olho atento */
export const IconeOlho = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
    <Circle cx="12" cy="12" r="2.8" />
  </Svg>
);

/** Setas em ciclo — cobrir pedido de ajuda, conquista Deu cobertura */
export const IconeCiclo = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M20 12a8 8 0 0 1-13.6 5.7" />
    <Path d="M4 12a8 8 0 0 1 13.6-5.7" />
    <Path d="M17.6 2.6v3.7h-3.7M6.4 21.4v-3.7h3.7" />
  </Svg>
);

/** Pin com estrela — conquista Guardião do bairro */
export const IconePinEstrela = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
    <Path d="M12 6.6l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4L12 6.6Z" />
  </Svg>
);

/** Sacola — apoiador, ponto de coleta (fora do MVP) */
export const IconeSacola = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M4 8.5h16l-1.2 10.2a1.4 1.4 0 0 1-1.4 1.3H6.6a1.4 1.4 0 0 1-1.4-1.3L4 8.5Z" />
    <Path d="M8.6 8.5V6.8a3.4 3.4 0 0 1 6.8 0v1.7" />
  </Svg>
);

/** Engrenagem — configurações */
export const IconeEngrenagem = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="12" cy="12" r="3.2" />
    <Path d="M19.3 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97Z" />
  </Svg>
);

/** Envelope — entrar com e-mail */
export const IconeEnvelope = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x="3" y="5" width="18" height="14" rx="2.5" />
    <Path d="M3.8 6.5 12 13l8.2-6.5" />
  </Svg>
);

/** Cadeado — conquista bloqueada */
export const IconeCadeado = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    <Path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
  </Svg>
);

/** Selo verificado — apoiador verificado (fora do MVP) */
export const IconeVerificado = ({ size = 24, color = '#2B1D12' }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2.5l2.3 1.7 2.8-.3 1 2.7 2.4 1.5-.9 2.7.9 2.7-2.4 1.5-1 2.7-2.8-.3L12 21.5l-2.3-1.7-2.8.3-1-2.7-2.4-1.5.9-2.7-.9-2.7 2.4-1.5 1-2.7 2.8.3L12 2.5Z" />
  </Svg>
);
