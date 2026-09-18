// Ilustração vetorial original do topo do onboarding (§6.1 Anatomia item 1):
// silhueta de cão ao lado de uma tigela, skyline simples ao fundo e duas patas
// decorativas de baixa opacidade. Nada de foto de banco de imagens — o argumento
// da tela é que este é o bairro da pessoa (§6.1 Regras).
import Svg, {
  Path,
  Rect,
  Circle,
  Ellipse,
  G,
} from 'react-native-svg';
import { colors } from '@/theme';

// Uma pata estilizada: coxim central + quatro dedos. Reusada nas decorativas.
function Pata({
  x,
  y,
  escala,
  opacidade,
  cor,
}: {
  x: number;
  y: number;
  escala: number;
  opacidade: number;
  cor: string;
}) {
  return (
    <G
      transform={`translate(${x} ${y}) scale(${escala})`}
      opacity={opacidade}
      fill={cor}
    >
      <Ellipse cx={0} cy={6} rx={9} ry={7} />
      <Ellipse cx={-9} cy={-4} rx={3.2} ry={4.4} />
      <Ellipse cx={-3} cy={-8} rx={3.2} ry={4.6} />
      <Ellipse cx={3} cy={-8} rx={3.2} ry={4.6} />
      <Ellipse cx={9} cy={-4} rx={3.2} ry={4.4} />
    </G>
  );
}

export function IlustracaoOnboarding({ width }: { width: number }) {
  const height = width * 0.62;
  const claro = colors.onDark;
  const escuro = colors.carameloPressed;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 320 198"
      accessibilityRole="image"
      accessibilityLabel="Ilustração de um cachorro ao lado de uma tigela no bairro"
    >
      {/* Patas decorativas de fundo, baixa opacidade. */}
      <Pata x={44} y={40} escala={1.1} opacidade={0.14} cor={claro} />
      <Pata x={280} y={150} escala={0.9} opacidade={0.12} cor={claro} />

      {/* Skyline simples do bairro, atrás do cão. */}
      <G opacity={0.34} fill={escuro}>
        <Rect x={18} y={96} width={26} height={62} rx={2} />
        <Rect x={50} y={78} width={20} height={80} rx={2} />
        <Rect x={76} y={104} width={30} height={54} rx={2} />
        <Rect x={214} y={86} width={22} height={72} rx={2} />
        <Rect x={242} y={100} width={28} height={58} rx={2} />
        <Rect x={276} y={74} width={20} height={84} rx={2} />
        {/* Janelas pontuais para não virar bloco chapado. */}
      </G>
      <G opacity={0.22} fill={claro}>
        <Rect x={55} y={86} width={4} height={4} />
        <Rect x={63} y={86} width={4} height={4} />
        <Rect x={281} y={82} width={4} height={4} />
      </G>

      {/* Chão. */}
      <Rect x={0} y={156} width={320} height={6} rx={3} fill={claro} opacity={0.5} />

      {/* Tigela. */}
      <G>
        <Path
          d="M196 150 h56 l-7 12 a8 8 0 0 1 -7 4 h-28 a8 8 0 0 1 -7 -4 Z"
          fill={claro}
        />
        <Ellipse cx={224} cy={150} rx={28} ry={7} fill={claro} />
        <Ellipse cx={224} cy={149} rx={20} ry={4.4} fill={escuro} opacity={0.45} />
      </G>

      {/* Silhueta do cão (caramelo de rua), sentado, olhando a tigela. */}
      <G fill={claro}>
        {/* Corpo + traseira sentada. */}
        <Path d="M96 156 c-4 -30 6 -52 30 -56 c22 -4 40 8 46 26 c4 12 2 28 -4 30 c-8 3 -20 -2 -24 -8 c-2 12 -2 8 -4 8 Z" />
        {/* Peito e pata dianteira. */}
        <Path d="M150 118 c10 2 16 12 16 24 c0 8 -1 14 -3 14 h-12 c-2 0 -3 -6 -3 -14 c0 -12 -3 -22 2 -24 Z" />
        {/* Cabeça. */}
        <Path d="M150 96 c14 -2 26 6 28 20 c1 8 -4 16 -14 18 c-12 2 -22 -4 -24 -14 c-2 -12 4 -22 10 -24 Z" />
        {/* Focinho apontado pra tigela. */}
        <Path d="M176 116 c8 0 16 3 16 8 c0 4 -8 6 -16 6 c-4 0 -6 -3 -6 -7 c0 -4 2 -7 6 -7 Z" />
        {/* Orelha caída. */}
        <Path d="M150 96 c-6 -2 -12 2 -13 10 c-1 7 3 14 8 15 c2 -9 3 -18 5 -25 Z" />
        {/* Rabo. */}
        <Path d="M96 150 c-10 -2 -18 -10 -18 -18 c6 2 12 6 20 8 Z" />
      </G>
      {/* Olho e focinho (recorte no claro). */}
      <Circle cx={162} cy={112} r={2.4} fill={escuro} />
      <Circle cx={190} cy={122} r={2.8} fill={escuro} />
    </Svg>
  );
}
