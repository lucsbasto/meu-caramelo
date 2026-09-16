import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing, touch } from '@/theme';
import {
  formatarDistancia,
  formatarTempo,
  rotuloStatus,
  type Ponto,
} from './pontos';

type Props = {
  ponto: Ponto | null;
  distanciaM: number | null;
  onClose: () => void;
  onVerPonto: (ponto: Ponto) => void;
  onAlimentar: (ponto: Ponto) => void;
};

// Folha inferior ao tocar o pin (§6.3). Modal nativo, sem dep de bottom-sheet.
export function PontoSheet({
  ponto,
  distanciaM,
  onClose,
  onVerPonto,
  onAlimentar,
}: Props) {
  return (
    <Modal
      visible={ponto != null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Pressable interno bloqueia o toque de fechar ao interagir na folha */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {ponto && (
            <>
              <View style={styles.puxador} />
              <View style={styles.cabecalho}>
                <View style={[styles.dot, { backgroundColor: ponto.cor }]} />
                <Text style={styles.status}>{rotuloStatus[ponto.status]}</Text>
              </View>

              <Text style={styles.nome}>{ponto.nome}</Text>
              {ponto.endereco ? (
                <Text style={styles.endereco}>{ponto.endereco}</Text>
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
                  valor={formatarTempo(ponto.horasDesdeUltima)}
                />
                <Meta
                  rotulo="Mantenedor"
                  valor={ponto.temMantenedor ? 'Tem' : 'Órfão'}
                />
              </View>

              <View style={styles.ctas}>
                <Pressable
                  onPress={() => onVerPonto(ponto)}
                  accessibilityRole="button"
                  style={[styles.botao, styles.botaoSecundario]}
                >
                  <Text style={styles.botaoSecundarioTexto}>Ver ponto</Text>
                </Pressable>
                <Pressable
                  onPress={() => onAlimentar(ponto)}
                  accessibilityRole="button"
                  style={[styles.botao, styles.botaoPrimario]}
                >
                  <Text style={styles.botaoPrimarioTexto}>Alimentar</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43,29,18,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
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
});
