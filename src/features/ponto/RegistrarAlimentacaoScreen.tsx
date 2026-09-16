// Tela de registrar alimentação (§6.7). Rota /ponto/:id/registrar. A entrada
// já é gated por requireAuth antes de navegar; ainda assim lemos o usuário via
// useAuth para o user_id e para uma parede de segurança. Regra central: ao
// menos um tipo é obrigatório; todo o resto é opcional. O registro nunca se
// perde — sem rede, cai na fila offline e sobe sozinho depois.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import { useAuth } from '@/features/auth/session';
import { LoginWall } from '@/features/auth/LoginWall';
import { ROTULOS_TIPO } from './dados';
import {
  OBSERVACAO_MAX,
  PASSO_KG,
  TIPOS_ITEM,
  contagemParaInsert,
  exigeQuantidade,
  type TipoItem,
} from './registro';
import {
  buscarMensagemH2,
  useRegistrarAlimentacao,
  type EntradaRegistro,
} from './useRegistro';

type Props = { id: string };

export function RegistrarAlimentacaoScreen({ id }: Props) {
  const { session, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.central}>
        <ActivityIndicator color={colors.caramelo} />
      </View>
    );
  }

  // A entrada já passa por requireAuth, mas mantemos a parede por segurança.
  if (!session || !user) {
    return (
      <LoginWall
        title="Registrar alimentação"
        reason="Entre para registrar uma alimentação neste ponto."
        next={`/ponto/${id}/registrar`}
      />
    );
  }

  return <FormRegistro id={id} usuarioId={user.id} />;
}

function FormRegistro({ id, usuarioId }: { id: string; usuarioId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const registrar = useRegistrarAlimentacao(id);

  const [tipos, setTipos] = useState<TipoItem[]>([]);
  const [quantidadeKg, setQuantidadeKg] = useState(0);
  const [caes, setCaes] = useState(0);
  const [gatos, setGatos] = useState(0);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Trava síncrona contra toques duplos (o estado só reflete no próximo render).
  const salvandoRef = useRef(false);

  const precisaQuantidade = exigeQuantidade(tipos);
  // Ao menos um tipo é obrigatório (§6.7): salvar fica travado até ter >= 1.
  const podeSalvar = tipos.length >= 1 && !salvando;

  // Enquanto salva, o voltar do Android não fecha a tela (§6.7 / §6.6).
  useEffect(() => {
    if (!salvando) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [salvando]);

  function alternarTipo(tipo: TipoItem) {
    setTipos((atuais) => {
      const proximos = atuais.includes(tipo)
        ? atuais.filter((t) => t !== tipo)
        : [...atuais, tipo];
      // Se a nova seleção não exige quantidade, zera o kg para um valor antigo
      // não reaparecer ao re-selecionar ração/caseira depois (§6.7).
      if (!exigeQuantidade(proximos)) setQuantidadeKg(0);
      return proximos;
    });
  }

  async function escolherDaCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Libere a câmera para tirar a foto.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!r.canceled && r.assets[0]) setFotoLocal(r.assets[0].uri);
  }

  async function escolherDaGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Libere as fotos para escolher uma imagem.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!r.canceled && r.assets[0]) setFotoLocal(r.assets[0].uri);
  }

  function escolherFoto() {
    Alert.alert('Foto (opcional)', 'De onde vem a foto?', [
      { text: 'Câmera', onPress: () => void escolherDaCamera() },
      { text: 'Galeria', onPress: () => void escolherDaGaleria() },
      ...(fotoLocal
        ? [{ text: 'Remover', style: 'destructive' as const, onPress: () => setFotoLocal(null) }]
        : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  async function onSalvar() {
    if (tipos.length < 1 || salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true);

    const entrada: EntradaRegistro = {
      userId: usuarioId,
      tipos,
      // Quantidade só quando ração/caseira; senão null (§6.7).
      quantidadeKg: precisaQuantidade && quantidadeKg > 0 ? quantidadeKg : null,
      caes: contagemParaInsert(caes),
      gatos: contagemParaInsert(gatos),
      observacao: observacao.trim() || null,
      fotoLocalUri: fotoLocal,
    };

    try {
      const res = await registrar.mutateAsync(entrada);
      if (res.modo === 'offline') {
        // Caiu na fila: o registro está salvo e sobe sozinho (§6.7).
        Alert.alert('Salvo', 'Vai subir sozinho quando a conexão voltar.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      // Sucesso online: mensagem H2 (§6.7). Se a consulta falhar, cai num
      // texto genérico para não segurar o retorno.
      // TODO(follow-up §6.7): refinar o visual da H2 — hoje é um Alert simples.
      let mensagem = 'Registro salvo. Obrigado por alimentar!';
      try {
        mensagem = await buscarMensagemH2(id, usuarioId);
      } catch {
        // mantém o texto genérico
      }
      Alert.alert('Alimentação registrada', mensagem, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      // Só chega aqui se nem o rascunho offline pôde ser persistido (§6.7).
      salvandoRef.current = false;
      setSalvando(false);
      const msg = (err as { message?: unknown })?.message;
      Alert.alert(
        'Não deu para salvar',
        typeof msg === 'string' && msg ? msg : 'Tente de novo.'
      );
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTopo}>
        <View style={styles.cabecalho}>
          <Pressable
            onPress={() => !salvando && router.back()}
            hitSlop={12}
            disabled={salvando}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={[styles.voltar, salvando && styles.desabilitadoTexto]}>‹ Voltar</Text>
          </Pressable>
          <Text style={styles.tituloCabecalho}>Registrar</Text>
          <View style={styles.espacoCabecalho} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chips de tipo, multi-seleção, ao menos um obrigatório (§6.7). */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>O que você deixou?</Text>
          <View style={styles.chips}>
            {TIPOS_ITEM.map((tipo) => {
              const ativo = tipos.includes(tipo);
              return (
                <Pressable
                  key={tipo}
                  onPress={() => alternarTipo(tipo)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  style={({ pressed }) => [
                    styles.chip,
                    ativo && styles.chipAtivo,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                    {ROTULOS_TIPO[tipo]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quantidade em kg, condicional a ração/caseira, passo 0,5 (§6.7). */}
        {precisaQuantidade && (
          <View style={styles.campo}>
            <Text style={styles.rotulo}>Quantidade (kg)</Text>
            <Stepper
              valor={quantidadeKg}
              texto={`${quantidadeKg.toFixed(1).replace('.', ',')} kg`}
              aoDiminuir={() => setQuantidadeKg((v) => Math.max(0, v - PASSO_KG))}
              aoAumentar={() => setQuantidadeKg((v) => v + PASSO_KG)}
            />
          </View>
        )}

        {/* Contadores separados de cães e gatos, inteiros >= 0 (§6.7). */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Quantos animais?</Text>
          <View style={styles.contadores}>
            <Stepper
              etiqueta="Cães"
              valor={caes}
              texto={String(caes)}
              aoDiminuir={() => setCaes((v) => Math.max(0, v - 1))}
              aoAumentar={() => setCaes((v) => v + 1)}
            />
            <Stepper
              etiqueta="Gatos"
              valor={gatos}
              texto={String(gatos)}
              aoDiminuir={() => setGatos((v) => Math.max(0, v - 1))}
              aoAumentar={() => setGatos((v) => v + 1)}
            />
          </View>
        </View>

        {/* Foto opcional (§6.7): mesmo quadro tracejado do editor. */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Foto (opcional)</Text>
          <Pressable
            onPress={escolherFoto}
            style={({ pressed }) => [styles.foto, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Escolher foto do registro"
          >
            {fotoLocal ? (
              <Image source={{ uri: fotoLocal }} style={styles.fotoImagem} />
            ) : (
              <Text style={styles.fotoMais}>＋</Text>
            )}
          </Pressable>
        </View>

        {/* Observação opcional, máx 280 com contador (§6.7). */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Observação (opcional)</Text>
          <TextInput
            value={observacao}
            onChangeText={setObservacao}
            placeholder="Ex.: filhotes com fome, água acabando…"
            placeholderTextColor={colors.textWeak}
            style={styles.observacao}
            multiline
            maxLength={OBSERVACAO_MAX}
          />
          <Text style={styles.contador}>
            {observacao.length}/{OBSERVACAO_MAX}
          </Text>
        </View>
      </ScrollView>

      {/* Botão salvar primário, estilo do detalhe (§6.7). */}
      <View style={[styles.rodape, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={onSalvar}
          disabled={!podeSalvar}
          style={({ pressed }) => [
            styles.salvarBtn,
            pressed && styles.salvarBtnPressed,
            !podeSalvar && styles.desabilitado,
          ]}
          accessibilityRole="button"
        >
          {salvando ? (
            <ActivityIndicator color={colors.onDark} />
          ) : (
            <Text style={styles.salvarBtnTexto}>Salvar registro</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Stepper({
  etiqueta,
  valor,
  texto,
  aoDiminuir,
  aoAumentar,
}: {
  etiqueta?: string;
  valor: number;
  texto: string;
  aoDiminuir: () => void;
  aoAumentar: () => void;
}) {
  return (
    <View style={styles.stepper}>
      {etiqueta ? <Text style={styles.stepperEtiqueta}>{etiqueta}</Text> : null}
      <View style={styles.stepperControles}>
        <Pressable
          onPress={aoDiminuir}
          disabled={valor <= 0}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Diminuir"
          style={({ pressed }) => [
            styles.stepperBotao,
            pressed && styles.pressed,
            valor <= 0 && styles.desabilitado,
          ]}
        >
          <Text style={styles.stepperSinal}>−</Text>
        </Pressable>
        <Text style={styles.stepperValor}>{texto}</Text>
        <Pressable
          onPress={aoAumentar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Aumentar"
          style={({ pressed }) => [styles.stepperBotao, pressed && styles.pressed]}
        >
          <Text style={styles.stepperSinal}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  central: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },

  safeTopo: { backgroundColor: colors.surface },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  voltar: { fontFamily: fonts.body, fontSize: 16, color: colors.caramelo },
  tituloCabecalho: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
  espacoCabecalho: { width: 54 },
  desabilitadoTexto: { color: colors.textWeak },

  conteudo: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 120 },

  campo: { gap: spacing.sm },
  rotulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touch.chip,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipAtivo: { backgroundColor: colors.caramelo, borderColor: colors.caramelo },
  chipTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  chipTextoAtivo: { color: colors.onDark, fontWeight: '600' },

  contadores: { flexDirection: 'row', gap: spacing.md },

  stepper: { flex: 1, gap: spacing.xs },
  stepperEtiqueta: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
  stepperControles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    height: 54,
  },
  stepperBotao: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSinal: { fontFamily: fonts.body, fontSize: 22, color: colors.caramelo },
  stepperValor: { fontFamily: fonts.title, fontSize: 18, color: colors.text },

  foto: {
    width: 98,
    height: 98,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fotoImagem: { width: '100%', height: '100%' },
  fotoMais: { fontSize: 34, color: colors.textWeak },

  observacao: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  contador: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
    alignSelf: 'flex-end',
  },

  pressed: { opacity: 0.7 },
  desabilitado: { opacity: 0.5 },

  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  salvarBtn: {
    height: 54,
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salvarBtnPressed: { backgroundColor: colors.carameloPressed },
  salvarBtnTexto: { fontFamily: fonts.body, fontSize: 16, fontWeight: '600', color: colors.onDark },
});
