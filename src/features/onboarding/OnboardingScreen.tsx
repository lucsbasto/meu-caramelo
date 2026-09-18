// Onboarding (§6.1): uma tela de primeira execução, sem carrossel. Explica o app
// em cinco segundos e sai da frente. Não rola; sem botão "pular" nem "ver o mapa
// sem entrar" — a entrada como visitante mora na tela de login (§6.2/§7.1).
import { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, radii, touch, fonts } from '@/theme';
import { IlustracaoOnboarding } from './IlustracaoOnboarding';
import { useEstatisticasCidade } from './useEstatisticasCidade';
import { rotulosEstatisticas } from './estatisticas';
import { marcarOnboardingVisto } from './primeiraAbertura';

const TERMOS_URL = 'https://meucaramelo.app/termos';
const PRIVACIDADE_URL = 'https://meucaramelo.app/privacidade';

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { estatisticas } = useEstatisticasCidade();

  // Ambos os botões marcam o onboarding como visto (execuções seguintes vão
  // direto ao app, §6.1) e abrem o login no modo certo (§6.1 Interações).
  const irParaLogin = useCallback(
    (modo: 'cadastro' | 'entrada') => {
      void marcarOnboardingVisto();
      router.push({ pathname: '/login', params: { mode: modo } });
    },
    [router]
  );

  function abrirLink(url: string) {
    void WebBrowser.openBrowserAsync(url);
  }

  // O gate segura o splash até esta tela existir; escondemos só quando o
  // onboarding já pintou o primeiro frame, para não piscar o mapa de baixo.
  const aoPintar = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const larguraIlustracao = Math.min(width, 460) - spacing.xl * 2;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']} onLayout={aoPintar}>
      {/* Bloco superior caramelo, cantos inferiores 40 px (§6.1). */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <View style={styles.marca}>
            <View style={styles.marcaIcone}>
              <Text style={styles.marcaPata}>🐾</Text>
            </View>
            <Text style={styles.marcaTexto}>Meu Caramelo</Text>
          </View>

          <View style={styles.heroArte}>
            <IlustracaoOnboarding width={larguraIlustracao} />
          </View>
        </SafeAreaView>
      </View>

      {/* Conteúdo — não rola. */}
      <View style={styles.conteudo}>
        <View style={styles.textos}>
          <Text style={styles.titulo}>
            Nenhum caramelo com fome no seu bairro.
          </Text>
          <Text style={styles.subtitulo}>
            Marque pontos, registre o que deixou e veja quem já passou.
          </Text>

          {/* Três números — somem sem rede / sem cidade (§6.1 Dados). */}
          {estatisticas && (
            <View style={styles.numeros}>
              {rotulosEstatisticas.map(({ chave, rotulo }, i) => (
                <View key={chave} style={styles.numeroItem}>
                  {i > 0 && <View style={styles.divisoria} />}
                  <View style={styles.numeroBloco}>
                    <Text style={styles.numeroValor}>{estatisticas[chave]}</Text>
                    <Text style={styles.numeroRotulo}>{rotulo}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.acoes}>
          <Pressable
            onPress={() => irParaLogin('cadastro')}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryLabel}>Criar minha conta</Text>
          </Pressable>

          <Pressable
            onPress={() => irParaLogin('entrada')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
            ]}
          >
            <Text style={styles.secondaryLabel}>Já tenho conta</Text>
          </Pressable>

          <Text style={styles.legal}>
            Ao continuar, você aceita os{' '}
            <Text style={styles.legalLink} onPress={() => abrirLink(TERMOS_URL)}>
              Termos
            </Text>{' '}
            e a{' '}
            <Text
              style={styles.legalLink}
              onPress={() => abrirLink(PRIVACIDADE_URL)}
            >
              Política de Privacidade
            </Text>
            .
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: {
    height: 400,
    flexShrink: 1,
    minHeight: 0,
    backgroundColor: colors.caramelo,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  heroSafe: { flex: 1, paddingHorizontal: spacing.xl },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  marcaIcone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaPata: { fontSize: 18 },
  marcaTexto: {
    fontFamily: fonts.title,
    fontSize: 17,
    fontWeight: '700',
    color: colors.onDark,
  },
  heroArte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteudo: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    justifyContent: 'space-between',
  },
  textos: { gap: spacing.md },
  titulo: {
    fontFamily: fonts.title,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  subtitulo: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  numeros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  numeroItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  divisoria: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  numeroBloco: { flex: 1 },
  numeroValor: {
    fontFamily: fonts.title,
    fontSize: 22,
    fontWeight: '700',
    color: colors.caramelo,
  },
  numeroRotulo: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  acoes: { gap: spacing.md, paddingBottom: spacing.lg },
  primaryBtn: {
    height: 54,
    minHeight: touch.min,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: { backgroundColor: colors.carameloPressed },
  primaryLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onDark,
  },
  secondaryBtn: {
    height: 54,
    minHeight: touch.min,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: { backgroundColor: colors.bg },
  secondaryLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  legal: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  legalLink: { color: colors.caramelo, textDecorationLine: 'underline' },
});
