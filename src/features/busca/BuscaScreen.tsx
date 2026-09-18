import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';

import { colors, fonts, radii, spacing, statusColor, touch } from '@/theme';
import { CENTRO_PADRAO } from '@/features/mapa/MapaScreen';
import { usePontos, type Centro } from '@/features/mapa/usePontos';
import {
  distanciaMetros,
  formatarDistancia,
  rotuloStatus,
  type Ponto,
} from '@/features/mapa/pontos';
import { setFoco } from '@/features/mapa/foco';
import { buscarEnderecos, type Endereco } from './geocode';
import { useHistorico, type ItemHistorico } from './historico';

// Ignora acentos e caixa na comparação (busca por "sao" acha "São").
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

// Tela /busca (§6.14): empilhada sobre o mapa, campo com foco automático.
// Vazio → recentes. Digitando → Pontos primeiro, Endereços depois.
export function BuscaScreen() {
  const router = useRouter();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [texto, setTexto] = useState('');
  const [debounced, setDebounced] = useState('');
  const { itens: recentes, registrar } = useHistorico();

  // Mesma aquisição de localização do mapa (§7.2): permissão when-in-use,
  // timeout contra fix frio e fallback para Palmas se negada/indisponível.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!vivo) return;
      if (status !== 'granted') {
        setCentro(CENTRO_PADRAO);
        return;
      }
      try {
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (!vivo) return;
        const c = pos && { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!c || (Math.abs(c.lat) < 1 && Math.abs(c.lng) < 1)) {
          setCentro(CENTRO_PADRAO);
          return;
        }
        setCentro(c);
      } catch {
        if (vivo) setCentro(CENTRO_PADRAO);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Debounce só para o geocoding de rede; os pontos filtram no cliente na hora.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(texto.trim()), 250);
    return () => clearTimeout(t);
  }, [texto]);

  const q = texto.trim();

  const { data: pontos = [] } = usePontos(centro);

  // Pontos: substring sem acento em nome/endereço, ordenados por distância.
  const pontosFiltrados = useMemo(() => {
    if (!centro || q.length < 1) return [];
    const alvo = normalizar(q);
    return pontos
      .filter(
        (p) =>
          normalizar(p.nome).includes(alvo) ||
          (p.endereco != null && normalizar(p.endereco).includes(alvo))
      )
      .sort(
        (a, b) => distanciaMetros(centro, a) - distanciaMetros(centro, b)
      );
  }, [pontos, centro, q]);

  // Endereços: geocoding do Mapbox. useQuery cancela requests obsoletos via
  // signal (AbortController), casando com o padrão de dados do app (§6.14).
  const geocodeAtivo = debounced.length >= 2 && centro != null;
  const geocodeQuery = useQuery({
    queryKey: ['geocode', debounced, centro?.lat ?? 0, centro?.lng ?? 0],
    queryFn: ({ signal }) => buscarEnderecos(debounced, centro as Centro, signal),
    enabled: geocodeAtivo,
    staleTime: 1000 * 60 * 5,
  });
  const enderecos = geocodeQuery.data ?? [];

  // "Sem resultado" só quando o geocoding já assentou COM sucesso, senão pisca
  // o CTA. Erro de geocoding (token, rede, 5xx) não é "vazio": vira aviso
  // próprio, nunca "cadastrar aqui" — que enganaria e esconderia o bug.
  const geocodeErro = geocodeAtivo && geocodeQuery.isError;
  const geocodePronto =
    !geocodeAtivo ||
    (!geocodeQuery.isFetching && geocodeQuery.isFetched && !geocodeErro);
  const semResultado =
    q.length > 0 &&
    pontosFiltrados.length === 0 &&
    enderecos.length === 0 &&
    geocodePronto;

  function aplicarPonto(p: Ponto) {
    registrar({
      tipo: 'ponto',
      id: p.id,
      nome: p.nome,
      endereco: p.endereco,
      lat: p.lat,
      lng: p.lng,
    });
    setFoco({ lat: p.lat, lng: p.lng, pontoId: p.id });
    router.back();
  }

  function aplicarEndereco(e: Endereco) {
    registrar({
      tipo: 'endereco',
      id: e.id,
      nome: e.nome,
      endereco: e.endereco,
      lat: e.lat,
      lng: e.lng,
    });
    setFoco({ lat: e.lat, lng: e.lng });
    router.back();
  }

  function aplicarRecente(item: ItemHistorico) {
    registrar(item);
    setFoco(
      item.tipo === 'ponto'
        ? { lat: item.lat, lng: item.lng, pontoId: item.id }
        : { lat: item.lat, lng: item.lng }
    );
    router.back();
  }

  function onCadastrarAqui() {
    const c = centro ?? CENTRO_PADRAO;
    router.push({
      pathname: '/ponto/novo',
      params: { lat: String(c.lat), lng: String(c.lng) },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.barra}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fechar busca"
          style={styles.voltar}
        >
          <Text style={styles.voltarIcone}>‹</Text>
        </Pressable>
        <View style={styles.campo}>
          <Text style={styles.campoIcone}>🔍</Text>
          <TextInput
            style={styles.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar ponto ou endereço"
            placeholderTextColor={colors.textWeak}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar ponto ou endereço"
          />
          {q.length > 0 && (
            <Pressable
              onPress={() => setTexto('')}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              style={styles.limpar}
            >
              <Text style={styles.limparIcone}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.listaConteudo}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {q.length === 0 ? (
          recentes.length > 0 ? (
            <>
              <Text style={styles.secaoTitulo}>Recentes</Text>
              {recentes.map((item) => (
                <Pressable
                  key={`${item.tipo}:${item.id}`}
                  onPress={() => aplicarRecente(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.linha, pressed && styles.linhaPressed]}
                >
                  <View style={styles.linhaTexto}>
                    <Text style={styles.linhaNome} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    <Text style={styles.linhaSub} numberOfLines={1}>
                      {item.endereco ?? '—'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : null
        ) : (
          <>
            {pontosFiltrados.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>Pontos</Text>
                {pontosFiltrados.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => aplicarPonto(p)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.linha, pressed && styles.linhaPressed]}
                  >
                    <View style={styles.linhaTexto}>
                      <Text style={styles.linhaNome} numberOfLines={1}>
                        {p.nome}
                      </Text>
                      <Text style={styles.linhaSub} numberOfLines={1}>
                        {p.endereco ?? '—'}
                      </Text>
                      <View style={styles.selo}>
                        <View style={[styles.seloDot, { backgroundColor: statusColor[p.status] }]} />
                        <Text style={styles.seloTexto}>{rotuloStatus[p.status]}</Text>
                      </View>
                    </View>
                    {centro && (
                      <Text style={styles.distancia}>
                        {formatarDistancia(distanciaMetros(centro, p))}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </>
            )}

            {enderecos.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>Endereços</Text>
                {enderecos.map((e) => (
                  <Pressable
                    key={e.id}
                    onPress={() => aplicarEndereco(e)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.linha, pressed && styles.linhaPressed]}
                  >
                    <View style={styles.linhaTexto}>
                      <Text style={styles.linhaNome} numberOfLines={1}>
                        {e.nome}
                      </Text>
                      <Text style={styles.linhaSub} numberOfLines={1}>
                        {e.endereco}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {geocodeAtivo && geocodeQuery.isFetching && enderecos.length === 0 && (
              <ActivityIndicator style={styles.carregando} color={colors.caramelo} />
            )}

            {geocodeErro && enderecos.length === 0 && (
              <Text style={styles.erroEndereco}>Não deu para buscar endereços agora.</Text>
            )}

            {semResultado && (
              <View style={styles.vazio}>
                <Text style={styles.vazioTexto}>
                  Nenhum ponto com esse nome. Quer cadastrar um aqui?
                </Text>
                <Pressable
                  onPress={onCadastrarAqui}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                >
                  <Text style={styles.ctaTexto}>Cadastrar ponto aqui</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  voltar: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voltarIcone: { fontSize: 30, color: colors.text, marginTop: -4 },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  campoIcone: { fontSize: 16 },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  limpar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limparIcone: { fontSize: 14, color: colors.textTertiary },
  lista: { flex: 1 },
  listaConteudo: { paddingBottom: spacing.xxl },
  secaoTitulo: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  linhaPressed: { backgroundColor: colors.surface },
  linhaTexto: { flex: 1, gap: 2 },
  linhaNome: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  linhaSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  seloDot: { width: 8, height: 8, borderRadius: 4 },
  seloTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  distancia: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  carregando: { marginTop: spacing.lg },
  erroEndereco: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  vazio: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  vazioTexto: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cta: {
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.caramelo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { backgroundColor: colors.carameloPressed },
  ctaTexto: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onDark,
  },
});
