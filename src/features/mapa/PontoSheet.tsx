import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, fonts, radii, spacing, touch } from '@/theme';
import {
  formatarDistancia,
  formatarTempo,
  type Ponto,
  rotuloStatus,
} from './pontos';

type Props = {
  ponto: Ponto | null;
  distanciaM: number | null;
  onClose: () => void;
  onAlimentar: (ponto: Ponto) => void;
};

const ABRE = { duration: 280, easing: Easing.out(Easing.cubic) };
const FECHA = 8; // px extra além do peek que dispara fechar ao arrastar

// Folha inferior ao tocar o pin (§6.3). Bottom sheet animado com dois snaps:
// "peek" (altura do conteúdo) e "expandido" (95% da tela). Arrastar para cima
// ou tocar no puxador/"Detalhes" sobe suave; não navega para outra tela. Só Animated +
// PanResponder do core — sem dep de bottom-sheet nem gesture-handler.
export function PontoSheet({ ponto, distanciaM, onClose, onAlimentar }: Props) {
  const { height: TELA } = useWindowDimensions();
  const EXPANDIDA = Math.round(TELA * 0.95);

  // Renderiza durante a animação de saída mesmo com ponto já nulo.
  const [dados, setDados] = useState<Ponto | null>(null);
  const [peek, setPeek] = useState(0);
  const [expandido, setExpandido] = useState(false);

  // Instância estável via init lazy do useState (sem ler ref no render).
  const [y] = useState(() => new Animated.Value(EXPANDIDA)); // translateY: 0 = topo (95%)
  const yRef = useRef(EXPANDIDA);
  const peekRef = useRef(0);
  const expandidaRef = useRef(EXPANDIDA);
  const dragStart = useRef(0);
  const abertoRef = useRef(false);

  // Sincroniza refs lidas pelos handlers de gesto após cada commit (não no
  // render — os handlers só disparam pós-mount, então nunca leem valor obsoleto).
  useEffect(() => {
    expandidaRef.current = EXPANDIDA;
    peekRef.current = peek;
  });

  useEffect(() => {
    const id = y.addListener(({ value }) => {
      yRef.current = value;
    });
    return () => y.removeListener(id);
  }, [y]);

  function anima(destino: number, cb?: () => void) {
    Animated.timing(y, {
      toValue: destino,
      ...ABRE,
      // JS driver: PanResponder usa y.setValue durante o arrasto; com native
      // driver o setValue não reflete na tela (gesto trava). translateY roda
      // bem no JS thread para este caso.
      useNativeDriver: false,
    }).start(({ finished }) => finished && cb?.());
  }

  const posColapsada = () => expandidaRef.current - peekRef.current;

  // Snap para expandido (95%) ou colapsado (peek), atualizando o rótulo do botão.
  function snapPara(expandir: boolean) {
    setExpandido(expandir);
    anima(expandir ? 0 : posColapsada());
  }

  function fecha() {
    abertoRef.current = false;
    setExpandido(false);
    anima(expandidaRef.current, () => {
      setDados(null);
      setPeek(0); // força nova medição na próxima abertura (evita peek stale)
      onClose();
    });
  }

  // Abre quando um ponto é selecionado; guarda os dados para o render.
  useEffect(() => {
    if (ponto) {
      // Sincroniza prop->estado interno; dados persiste após ponto=null p/ animar
      // a saída, então não dá p/ derivar no render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDados(ponto);
      setExpandido(false);
      abertoRef.current = false; // reabre no snap colapsado assim que medir o peek
    } else if (dados) {
      fecha();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ponto]);

  // Anima até o snap colapsado assim que o peek é medido — e o reacompanha
  // quando o peek muda com a folha aberta (troca direta de pin A→B, cuja altura
  // nova só chega no onLayout seguinte). Expandido fica em 0, independe do peek.
  useEffect(() => {
    if (!dados || peek <= 0 || expandido) return;
    if (!abertoRef.current) {
      abertoRef.current = true;
      y.setValue(EXPANDIDA); // primeira abertura: sobe a partir da base
    }
    anima(EXPANDIDA - peek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, peek, expandido]);

  // Rotação/mudança de dimensão: reposiciona o translateY no snap atual — a
  // altura recalcula com EXPANDIDA, mas o valor animado não, deixando a folha
  // aberta com offset velho até o próximo snap/drag.
  useEffect(() => {
    y.setValue(dados ? (expandido ? 0 : EXPANDIDA - peek) : EXPANDIDA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [EXPANDIDA]);

  // Init lazy: PanResponder criado uma vez. Os refs só são lidos dentro dos
  // handlers (pós-mount), nunca durante o render — falso positivo da regra.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      // Bubble (não capture): a ScrollView filha reivindica os arrastos sobre
      // ela e rola o conteúdo expandido; a folha só vira responder nos arrastos
      // verticais fora da ScrollView (puxador/cabeçalho/botões — tap continua,
      // pois só gestos de movimento chegam aqui). Capture roubava todo drag e
      // impedia a rolagem. Termination default do Pressable devolve o gesto.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        y.stopAnimation();
        dragStart.current = yRef.current; // síncrono, sem esperar callback
      },
      onPanResponderMove: (_e, g) => {
        const prox = Math.min(
          Math.max(dragStart.current + g.dy, 0),
          expandidaRef.current,
        );
        y.setValue(prox);
      },
      onPanResponderRelease: (_e, g) => {
        const atual = yRef.current;
        const colaps = posColapsada();
        const meio = colaps / 2;
        const estaExpandido = atual < meio;
        // Arrastado abaixo do peek → fecha.
        if (atual > colaps + FECHA) {
          fecha();
          return;
        }
        // Flick rápido pra baixo: do expandido volta ao peek; do peek, fecha.
        if (g.vy > 0.9) {
          if (estaExpandido) snapPara(false);
          else fecha();
          return;
        }
        // Flick rápido pra cima expande; sem flick, snap para o mais próximo.
        if (g.vy < -0.9) {
          snapPara(true);
          return;
        }
        snapPara(estaExpandido);
      },
      // Não devolve o gesto para a ScrollView/backdrop no meio do arrasto.
      onPanResponderTerminationRequest: () => false,
    }),
  );

  return (
    <Modal
      visible={dados != null}
      transparent
      animationType="none"
      onRequestClose={fecha}
    >
      <View style={styles.raiz}>
        <Pressable style={styles.backdrop} onPress={fecha} />
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.sheet,
            { height: EXPANDIDA, transform: [{ translateY: y }] },
          ]}
        >
          {dados && (
            <>
              <View
                onLayout={(e) => setPeek(e.nativeEvent.layout.height)}
                style={styles.peek}
              >
                <Pressable
                  onPress={() => snapPara(!expandido)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    expandido ? 'Recolher folha' : 'Expandir folha'
                  }
                  hitSlop={spacing.sm}
                >
                  <View style={styles.puxador} />
                  <View style={styles.cabecalho}>
                    <View
                      style={[styles.dot, { backgroundColor: dados.cor }]}
                    />
                    <Text style={styles.status}>
                      {rotuloStatus[dados.status]}
                    </Text>
                  </View>
                </Pressable>

                <Text style={styles.nome}>{dados.nome}</Text>
                {dados.endereco ? (
                  <Text style={styles.endereco}>{dados.endereco}</Text>
                ) : null}

                <View style={styles.linhaMeta}>
                  <Meta
                    rotulo="Distância"
                    valor={
                      distanciaM != null ? formatarDistancia(distanciaM) : '—'
                    }
                  />
                  <Meta
                    rotulo="Último registro"
                    valor={formatarTempo(dados.horasDesdeUltima)}
                  />
                  <Meta
                    rotulo="Mantenedor"
                    valor={dados.temMantenedor ? 'Tem' : 'Órfão'}
                  />
                </View>

                <View style={styles.ctas}>
                  <Pressable
                    onPress={() => snapPara(!expandido)}
                    accessibilityRole="button"
                    style={[styles.botao, styles.botaoSecundario]}
                  >
                    <Text style={styles.botaoSecundarioTexto}>
                      {expandido ? 'Recolher' : 'Detalhes'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onAlimentar(dados)}
                    accessibilityRole="button"
                    style={[styles.botao, styles.botaoPrimario]}
                  >
                    <Text style={styles.botaoPrimarioTexto}>Alimentar</Text>
                  </Pressable>
                </View>
              </View>

              {/* Área revelada ao expandir (95%). Rola quando o conteúdo cresce. */}
              <ScrollView
                style={styles.corpo}
                contentContainerStyle={styles.corpoConteudo}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.secaoTitulo}>Detalhes</Text>
                <Text style={styles.secaoTexto}>
                  Arraste para baixo para fechar ou toque fora da folha.
                </Text>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function Meta({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaRotulo}>{rotulo}</Text>
      <Text style={styles.metaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(43,29,18,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: 'hidden',
  },
  peek: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  puxador: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  status: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  nome: { fontFamily: fonts.title, fontSize: 22, color: colors.text },
  endereco: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: -spacing.xs,
  },
  linhaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  meta: { flex: 1, gap: 2 },
  metaRotulo: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textWeak,
  },
  metaValor: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  ctas: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  botao: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundario: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoSecundarioTexto: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  botaoPrimario: { backgroundColor: colors.caramelo },
  botaoPrimarioTexto: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onDark,
  },
  corpo: { flex: 1 },
  corpoConteudo: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  secaoTitulo: {
    fontFamily: fonts.title,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.sm,
  },
  secaoTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
