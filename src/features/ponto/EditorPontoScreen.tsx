// Editor de ponto (§6.6): cria e edita um lugar com coordenada correta e sem
// expor a casa de ninguém. Compartilhado pelas rotas /ponto/novo e
// /ponto/:id/editar. As regras de permissão vivem na RLS; a UI só oferece as
// ações a quem já está autenticado (e, na edição, a mantenedores).
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
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
import * as Location from 'expo-location';

import { colors, fonts, radii, spacing, touch } from '@/theme';
import { useAuth } from '@/features/auth/session';
import { LoginWall } from '@/features/auth/LoginWall';
import { arredondarCoord, formatarDistancia } from '@/features/mapa/pontos';
import { CENTRO_PADRAO } from '@/features/mapa/MapaScreen';
import { queryClient } from '@/lib/query';
import { SeletorMapa } from './SeletorMapa';
import {
  AVISO_PRIVACIDADE,
  DICA_NOME,
  nomeValido,
  type Coord,
} from './editor';
import {
  buscarPontoProximo,
  geocodeReverso,
  gravarFotoUrl,
  inserirFotoPonto,
  removerFotoPonto,
  subirFotoGaleria,
  useAtualizarPonto,
  useCriarPonto,
  useDesativarPonto,
  useFotosEditavel,
  useGarantirMantenedor,
  useMeusPontos,
  usePontoEditavel,
  useReativarPonto,
  useSairMantenedor,
  type FotoEditavel,
  type PontoProximo,
} from './useEditorPonto';

type Props = {
  modo: 'novo' | 'editar';
  id?: string;
  coordInicial?: Coord;
};

export function EditorPontoScreen({ modo, id, coordInicial }: Props) {
  const { session, user, loading } = useAuth();
  const editavel = usePontoEditavel(modo === 'editar' ? id : undefined);
  const meusPontos = useMeusPontos(user?.id ?? null);

  if (loading) {
    return <TelaCentral><ActivityIndicator color={colors.caramelo} /></TelaCentral>;
  }

  // Cadastrar/editar exige identidade (§6.6 Regras) — parede de login.
  if (!session || !user) {
    return (
      <LoginWall
        title={modo === 'novo' ? 'Cadastrar um ponto' : 'Editar o ponto'}
        reason="Entre para cadastrar e cuidar de pontos de alimentação no seu bairro."
        next={modo === 'editar' && id ? `/ponto/${id}/editar` : '/ponto/novo'}
      />
    );
  }

  if (modo === 'editar') {
    if (editavel.isLoading || meusPontos.isLoading) {
      return <TelaCentral><ActivityIndicator color={colors.caramelo} /></TelaCentral>;
    }
    if (editavel.isError || !editavel.data) {
      return (
        <TelaCentral>
          <Text style={styles.textoCentral}>Não deu para carregar este ponto.</Text>
        </TelaCentral>
      );
    }
    // Só mantenedor/co-mantenedor edita (§6.6 Regras). A RLS é a autoridade;
    // aqui evitamos abrir o formulário para quem não pode salvar.
    const souMantenedor = (meusPontos.data ?? []).some((p) => p.id === id);
    if (!souMantenedor) {
      return (
        <TelaCentral>
          <Text style={styles.textoCentral}>
            Só quem mantém este ponto pode editá-lo.
          </Text>
        </TelaCentral>
      );
    }
    const p = editavel.data;
    return (
      <EditorForm
        modo="editar"
        id={p.id}
        usuarioId={user.id}
        nomeInicial={p.nome}
        enderecoInicial={p.endereco}
        coordSeed={{ lat: p.lat, lng: p.lng }}
        ativoInicial={p.ativo}
      />
    );
  }

  return (
    <EditorForm
      modo="novo"
      usuarioId={user.id}
      nomeInicial=""
      enderecoInicial={null}
      coordSeed={coordInicial ?? CENTRO_PADRAO}
      resolverLocalizacao={coordInicial == null}
      ativoInicial
    />
  );
}

type FormProps = {
  modo: 'novo' | 'editar';
  id?: string;
  usuarioId: string;
  nomeInicial: string;
  enderecoInicial: string | null;
  coordSeed: Coord;
  ativoInicial: boolean;
  resolverLocalizacao?: boolean;
};

function EditorForm({
  modo,
  id,
  usuarioId,
  nomeInicial,
  enderecoInicial,
  coordSeed,
  ativoInicial,
  resolverLocalizacao,
}: FormProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const criar = useCriarPonto();
  const garantirMantenedor = useGarantirMantenedor();
  const atualizar = useAtualizarPonto();
  const desativar = useDesativarPonto();
  const reativar = useReativarPonto();
  const sairMantenedor = useSairMantenedor();

  const [nome, setNome] = useState(nomeInicial);
  const [endereco, setEndereco] = useState(enderecoInicial ?? '');
  const [coord, setCoord] = useState<Coord>(coordSeed);
  const [mapaSeed, setMapaSeed] = useState<Coord>(coordSeed);
  const [seedNonce, setSeedNonce] = useState(0);
  const [duplicata, setDuplicata] = useState<PontoProximo | null>(null);
  const [duplicataDispensada, setDuplicataDispensada] = useState(false);
  const [modalMapa, setModalMapa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ativo, setAtivo] = useState(ativoInicial);

  // Galeria: fotos já salvas (a remover) + novas escolhidas neste formulário
  // ainda por subir. A capa (§6.4) é a primeira da lista final. As salvas vêm
  // direto da query (fonte da verdade); a remoção é derivada, não copiada para
  // o estado, para não disparar setState dentro de effect.
  const fotosSalvasQuery = useFotosEditavel(modo === 'editar' ? id : undefined);
  const [removidasIds, setRemovidasIds] = useState<string[]>([]);
  const [fotosNovas, setFotosNovas] = useState<string[]>([]);

  const fotosSalvas: FotoEditavel[] = fotosSalvasQuery.data ?? [];
  const fotosSalvasVisiveis = fotosSalvas.filter((f) => !removidasIds.includes(f.id));

  // Endereço editado à mão não é sobrescrito pela geocodificação até o pin
  // se mexer de novo (§6.6: arrastar o pin refaz a geocodificação).
  const enderecoManualRef = useRef(false);
  // Só geocodifica depois que a posição foi definida de propósito: num ponto
  // novo, a posição inicial já vale (endereço começa vazio); na edição, só
  // após o usuário mexer o pin, para não apagar o endereço salvo na abertura.
  const usuarioMoveuRef = useRef(modo === 'novo');
  // Trava síncrona contra toques duplos no salvar (o estado `salvando` só
  // atualiza no próximo render).
  const salvandoRef = useRef(false);
  // Guarda o id do ponto já criado para a tentativa não duplicar o cadastro.
  const pontoCriadoIdRef = useRef<string | null>(null);

  // Novo ponto sem coordenada de origem: centraliza na posição do usuário se já
  // houver permissão; senão fica no centro da cidade (§6.6 Estados).
  useEffect(() => {
    if (!resolverLocalizacao) return;
    let vivo = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const pos = await Location.getLastKnownPositionAsync();
        if (!vivo || !pos) return;
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        aplicarNovoCentro(c);
      } catch {
        // sem posição conhecida: mantém o centro padrão
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geocodificação reversa quando a coordenada é definida de propósito
  // (§6.6 Interações). Nunca roda no onMapIdle inicial da edição, então o
  // endereço salvo é preservado até o usuário arrastar o pin.
  useEffect(() => {
    if (!usuarioMoveuRef.current) return;
    let vivo = true;
    const t = setTimeout(async () => {
      const texto = await geocodeReverso(coord);
      if (vivo && texto && !enderecoManualRef.current) setEndereco(texto);
    }, 600);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coord.lat, coord.lng]);

  // Verificação de duplicata quando a coordenada muda (§6.6 Estados).
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const proximo = await buscarPontoProximo(coord, id);
        if (vivo) {
          setDuplicata(proximo);
          setDuplicataDispensada(false);
        }
      } catch {
        // falha na checagem não bloqueia o cadastro
      }
    }, 700);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coord.lat, coord.lng, id]);

  // Enquanto salva, a tela não pode ser fechada pelo voltar do Android (§6.6).
  useEffect(() => {
    if (!salvando) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [salvando]);

  // Arrastar o pin do mini-mapa: só conta como movimento de propósito quando a
  // coordenada muda de fato (o onMapIdle inicial reporta a própria seed). Aí a
  // geocodificação e a checagem de duplicata são refeitas.
  function aoMudarCoord(c: Coord) {
    const mudou =
      Math.abs(c.lat - coord.lat) > 1e-6 || Math.abs(c.lng - coord.lng) > 1e-6;
    if (!mudou) return;
    usuarioMoveuRef.current = true;
    enderecoManualRef.current = false;
    setCoord(c);
  }

  // Muda o centro E recentraliza o mini-mapa (remount via nonce). Usado pela
  // localização inicial e pelo "Usar esta posição" da tela cheia.
  function aplicarNovoCentro(c: Coord) {
    usuarioMoveuRef.current = true;
    enderecoManualRef.current = false;
    setCoord(c);
    setMapaSeed(c);
    setSeedNonce((n) => n + 1);
  }

  function aoEditarEndereco(texto: string) {
    enderecoManualRef.current = true;
    setEndereco(texto);
  }

  function adicionarNovas(uris: string[]) {
    if (uris.length > 0) setFotosNovas((atuais) => [...atuais, ...uris]);
  }

  async function escolherDaCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Libere a câmera para tirar a foto.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!r.canceled && r.assets[0]) adicionarNovas([r.assets[0].uri]);
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
      allowsMultipleSelection: true,
    });
    if (!r.canceled) adicionarNovas(r.assets.map((a) => a.uri));
  }

  function escolherFoto() {
    Alert.alert('Adicionar foto', 'De onde vem a foto?', [
      { text: 'Câmera', onPress: () => void escolherDaCamera() },
      { text: 'Galeria', onPress: () => void escolherDaGaleria() },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  function removerSalva(fotoId: string) {
    setRemovidasIds((atuais) => (atuais.includes(fotoId) ? atuais : [...atuais, fotoId]));
  }

  function removerNova(uri: string) {
    setFotosNovas((atuais) => {
      const i = atuais.indexOf(uri);
      if (i < 0) return atuais;
      return [...atuais.slice(0, i), ...atuais.slice(i + 1)];
    });
  }

  // Persiste a galeria depois que o ponto já existe: apaga as removidas, sobe as
  // novas e regrava a capa (§6.4). O upload é passo à parte para nunca perder o
  // cadastro por causa da imagem — falha oferece tentar de novo ou seguir sem
  // (§6.6 Estados).
  function salvarGaleriaComGraca(pontoId: string): Promise<void> {
    // Filas de trabalho consumidas item a item: um "Tentar de novo" retoma de
    // onde parou, sem re-remover, re-subir nem re-inserir o que já concluiu
    // (senão a galeria ganharia fotos duplicadas e arquivos órfãos).
    const removerFila = removidasIds
      .map((fid) => ({ id: fid, url: fotosSalvas.find((f) => f.id === fid)?.url ?? '' }))
      .filter((r) => r.url);
    const subirFila = [...fotosNovas];
    const urlsNovas: string[] = [];
    // Próxima ordem = maior ordem salva restante + 1 (não o tamanho da lista,
    // que colide quando se remove uma foto do meio).
    const maiorOrdem = fotosSalvasVisiveis.reduce((m, f) => Math.max(m, f.ordem), -1);
    let proximaOrdem = maiorOrdem + 1;

    return new Promise((resolve) => {
      const tentar = async () => {
        try {
          while (removerFila.length > 0) {
            const { id, url } = removerFila[0];
            await removerFotoPonto(id, url);
            removerFila.shift();
          }
          while (subirFila.length > 0) {
            const url = await subirFotoGaleria(pontoId, subirFila[0]);
            await inserirFotoPonto({ pontoId, url, ordem: proximaOrdem, userId: usuarioId });
            urlsNovas.push(url);
            proximaOrdem += 1;
            subirFila.shift();
          }
          // Capa = primeira foto da lista final (salvas restantes, depois novas).
          const capa = fotosSalvasVisiveis[0]?.url ?? urlsNovas[0] ?? null;
          await gravarFotoUrl(pontoId, capa);
          resolve();
        } catch {
          Alert.alert(
            'Fotos não enviadas',
            'O ponto foi salvo, mas as fotos não subiram. Você pode tentar de novo.',
            [
              { text: 'Seguir sem fotos', style: 'cancel', onPress: () => resolve() },
              { text: 'Tentar de novo', onPress: () => void tentar() },
            ]
          );
        }
      };
      void tentar();
    });
  }

  const temMudancaGaleria = fotosNovas.length > 0 || removidasIds.length > 0;

  async function onSalvar() {
    // Trava síncrona: dois toques rápidos não passam os dois (o estado
    // `salvando` só reflete no próximo render).
    if (!nomeValido(nome) || salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true);
    try {
      if (modo === 'novo') {
        // Retry-safe: reaproveita o ponto já criado numa tentativa anterior,
        // então uma falha no passo do mantenedor não duplica o cadastro.
        let novoId = pontoCriadoIdRef.current;
        if (novoId) {
          await atualizar.mutateAsync({ id: novoId, nome, coord, endereco: endereco || null });
        } else {
          novoId = await criar.mutateAsync({
            nome,
            coord,
            endereco: endereco || null,
            criadoPor: usuarioId,
          });
          pontoCriadoIdRef.current = novoId;
        }
        // Passo idempotente: registra o criador como mantenedor principal.
        await garantirMantenedor.mutateAsync({ pontoId: novoId, userId: usuarioId });
        if (fotosNovas.length > 0) await salvarGaleriaComGraca(novoId);
        queryClient.invalidateQueries({ queryKey: ['pontos'] });
        queryClient.invalidateQueries({ queryKey: ['meus-pontos'] });
        queryClient.invalidateQueries({ queryKey: ['ponto', novoId, 'fotos'] });
        // Cria, fecha e abre o detalhe do ponto novo (§6.6 Interações).
        router.replace(`/ponto/${novoId}`);
      } else if (id) {
        await atualizar.mutateAsync({ id, nome, coord, endereco: endereco || null });
        if (temMudancaGaleria) {
          await salvarGaleriaComGraca(id);
          queryClient.invalidateQueries({ queryKey: ['ponto', id, 'fotos'] });
          // A galeria altera a capa (foto_url) DEPOIS do onSuccess do atualizar,
          // então reinvalida o que depende dela: detalhe, pins do mapa e feed.
          queryClient.invalidateQueries({ queryKey: ['ponto', id] });
          queryClient.invalidateQueries({ queryKey: ['pontos'] });
          queryClient.invalidateQueries({ queryKey: ['meus-pontos'] });
        }
        router.back();
      }
    } catch (err) {
      salvandoRef.current = false;
      setSalvando(false);
      const criado = pontoCriadoIdRef.current != null;
      Alert.alert(
        'Não deu para salvar',
        criado
          ? 'O ponto foi criado, mas faltou concluir. Toque em salvar de novo para terminar sem duplicar o cadastro.'
          : err instanceof Error
            ? err.message
            : 'Tente novamente.'
      );
    }
  }

  function onDesativar() {
    if (!id) return;
    Alert.alert(
      'Desativar ponto',
      'O ponto some do mapa, mas o histórico de registros é preservado e o detalhe continua acessível por link direto. Deseja desativar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: () => {
            desativar.mutate(id, {
              onSuccess: () => router.back(),
              onError: (e) =>
                Alert.alert('Erro', e instanceof Error ? e.message : 'Não deu para desativar.'),
            });
          },
        },
      ]
    );
  }

  function onReativar() {
    if (!id) return;
    reativar.mutate(id, {
      onSuccess: () => {
        setAtivo(true);
        Alert.alert('Ponto reativado', 'Ele volta a aparecer no mapa.');
      },
      onError: (e) =>
        Alert.alert('Erro', e instanceof Error ? e.message : 'Não deu para reativar.'),
    });
  }

  function onSairMantenedor() {
    if (!id) return;
    Alert.alert(
      'Sair de mantenedor',
      'Você deixa de manter este ponto. Se não houver outro co-mantenedor, ele fica órfão (sem ninguém responsável) até alguém adotar. Deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            sairMantenedor.mutate(
              { id, userId: usuarioId },
              {
                onSuccess: (resultado) => {
                  router.back();
                  if (resultado === 'promovido') {
                    Alert.alert('Você saiu', 'O co-mantenedor mais antigo agora mantém o ponto.');
                  } else if (resultado === 'orfao') {
                    Alert.alert('Você saiu', 'O ponto ficou órfão até alguém adotar.');
                  }
                },
                onError: (e) =>
                  Alert.alert('Erro', e instanceof Error ? e.message : 'Não deu para sair.'),
              }
            );
          },
        },
      ]
    );
  }

  const valido = nomeValido(nome);
  const titulo = modo === 'novo' ? 'Novo ponto' : 'Editar ponto';

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
          <Text style={styles.tituloCabecalho}>{titulo}</Text>
          <Pressable
            onPress={onSalvar}
            hitSlop={12}
            disabled={!valido || salvando}
            accessibilityRole="button"
            accessibilityLabel="Salvar"
          >
            <Text style={[styles.salvarTopo, (!valido || salvando) && styles.desabilitadoTexto]}>
              Salvar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mini-mapa de 180 px com pin arrastável (§6.6 Anatomia 2). */}
        <View style={styles.miniMapaBloco}>
          <SeletorMapaMini seedNonce={seedNonce} seed={mapaSeed} onChange={aoMudarCoord} />
          <Pressable
            onPress={() => setModalMapa(true)}
            style={({ pressed }) => [styles.ajustarBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.ajustarBtnTexto}>Ajustar no mapa</Text>
          </Pressable>
        </View>

        {/* Coordenada exibida arredondada por privacidade (§7.6). */}
        <Text style={styles.coordTexto}>
          📍 {arredondarCoord(coord.lat).toFixed(4)}, {arredondarCoord(coord.lng).toFixed(4)}
        </Text>

        {duplicata && !duplicataDispensada && (
          <View style={styles.duplicataBanner}>
            <Text style={styles.duplicataTexto}>
              Existe {`'${duplicata.nome}'`} a {formatarDistancia(duplicata.distanciaM)} daqui. É o mesmo lugar?
            </Text>
            <View style={styles.duplicataAcoes}>
              <Pressable
                onPress={() => router.push(`/ponto/${duplicata.id}`)}
                hitSlop={8}
              >
                <Text style={styles.duplicataLink}>Ver o existente</Text>
              </Pressable>
              <Pressable onPress={() => setDuplicataDispensada(true)} hitSlop={8}>
                <Text style={styles.duplicataDispensar}>Cadastrar mesmo assim</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Endereço geocodificado, editável (§6.6 Anatomia 3). */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Endereço</Text>
          <TextInput
            value={endereco}
            onChangeText={aoEditarEndereco}
            placeholder="Rua, número ou referência"
            placeholderTextColor={colors.textWeak}
            style={styles.input}
          />
        </View>

        {/* Nome obrigatório com a dica da especificação (§6.6 Anatomia 4). */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Nome do ponto</Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Praça da Matriz"
            placeholderTextColor={colors.textWeak}
            style={styles.input}
          />
          <Text style={styles.dica}>{DICA_NOME}</Text>
        </View>

        {/* Fotos opcionais: galeria em carrossel no detalhe (§6.4/§6.6). A
            primeira da lista é a capa usada no mapa e no feed. */}
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Fotos (opcional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fotoStrip}
          >
            {fotosSalvasVisiveis.map((f) => (
              <MiniaturaFoto key={f.id} uri={f.url} onRemover={() => removerSalva(f.id)} />
            ))}
            {fotosNovas.map((uri, i) => (
              <MiniaturaFoto
                key={`nova-${i}-${uri}`}
                uri={uri}
                onRemover={() => removerNova(uri)}
              />
            ))}
            <Pressable
              onPress={escolherFoto}
              style={({ pressed }) => [styles.foto, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Adicionar foto do ponto"
            >
              <Text style={styles.fotoMais}>＋</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Aviso de privacidade fixo, não é caixa de aceite (§6.6 Anatomia 6). */}
        <View style={styles.avisoPrivacidade}>
          <Text style={styles.avisoPrivacidadeTexto}>{AVISO_PRIVACIDADE}</Text>
        </View>

        {/* Ações de edição ao final (§6.6 Anatomia 8). */}
        {modo === 'editar' && (
          <View style={styles.acoesEdicao}>
            <Pressable onPress={onSairMantenedor} hitSlop={8} style={styles.acaoLinha}>
              <Text style={styles.sairMantenedor}>Sair de mantenedor</Text>
            </Pressable>
            {ativo ? (
              <Pressable onPress={onDesativar} hitSlop={8} style={styles.acaoLinha}>
                <Text style={styles.desativar}>Desativar ponto</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onReativar} hitSlop={8} style={styles.acaoLinha}>
                <Text style={styles.reativar}>Reativar ponto</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Botão salvar fixo no rodapé (§6.6 Anatomia 7). */}
      <View style={[styles.rodape, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={onSalvar}
          disabled={!valido || salvando}
          style={({ pressed }) => [
            styles.salvarBtn,
            pressed && styles.salvarBtnPressed,
            (!valido || salvando) && styles.desabilitado,
          ]}
          accessibilityRole="button"
        >
          {salvando ? (
            <ActivityIndicator color={colors.onDark} />
          ) : (
            <Text style={styles.salvarBtnTexto}>
              {modo === 'novo' ? 'Salvar ponto' : 'Salvar alterações'}
            </Text>
          )}
        </Pressable>
      </View>

      <ModalAjustarMapa
        visivel={modalMapa}
        coordInicial={coord}
        onCancelar={() => setModalMapa(false)}
        onUsar={(c) => {
          aplicarNovoCentro(c);
          setModalMapa(false);
        }}
      />
    </View>
  );
}

// Mini-mapa: remonta (via key) só quando o centro muda por fora (localização
// ou tela cheia), nunca durante o arraste, para não brigar com o gesto.
function SeletorMapaMini({
  seedNonce,
  seed,
  onChange,
}: {
  seedNonce: number;
  seed: Coord;
  onChange: (c: Coord) => void;
}) {
  return (
    <SeletorMapa key={seedNonce} seed={seed} onChange={onChange} style={styles.miniMapa} />
  );
}

function ModalAjustarMapa({
  visivel,
  coordInicial,
  onCancelar,
  onUsar,
}: {
  visivel: boolean;
  coordInicial: Coord;
  onCancelar: () => void;
  onUsar: (c: Coord) => void;
}) {
  const insets = useSafeAreaInsets();
  const [coord, setCoord] = useState<Coord>(coordInicial);

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onCancelar}>
      <View style={styles.modalContainer}>
        {visivel && (
          <SeletorMapa
            key={`${coordInicial.lat},${coordInicial.lng}`}
            seed={coordInicial}
            onChange={setCoord}
            style={StyleSheet.absoluteFill}
          />
        )}
        <SafeAreaView edges={['top']} style={styles.modalTopo} pointerEvents="box-none">
          <Pressable onPress={onCancelar} hitSlop={12} style={styles.modalFechar}>
            <Text style={styles.modalFecharTexto}>✕</Text>
          </Pressable>
        </SafeAreaView>
        <View style={[styles.modalRodape, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            onPress={() => onUsar(coord)}
            style={({ pressed }) => [styles.salvarBtn, pressed && styles.salvarBtnPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.salvarBtnTexto}>Usar esta posição</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function TelaCentral({ children }: { children: React.ReactNode }) {
  return <View style={styles.central}>{children}</View>;
}

// Miniatura da galeria no editor: a foto com um botão de remover no canto.
function MiniaturaFoto({ uri, onRemover }: { uri: string; onRemover: () => void }) {
  return (
    <View style={styles.miniatura}>
      <Image source={{ uri }} style={styles.fotoImagem} />
      <Pressable
        onPress={onRemover}
        style={styles.miniaturaRemover}
        accessibilityRole="button"
        accessibilityLabel="Remover esta foto"
        hitSlop={8}
      >
        <Text style={styles.miniaturaRemoverTexto}>×</Text>
      </Pressable>
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
  textoCentral: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },

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
  salvarTopo: { fontFamily: fonts.body, fontSize: 16, fontWeight: '600', color: colors.caramelo },
  desabilitadoTexto: { color: colors.textWeak },

  conteudo: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 120 },

  miniMapaBloco: { gap: spacing.sm },
  miniMapa: { height: 180, borderRadius: radii.card },
  ajustarBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ajustarBtnTexto: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.caramelo },

  coordTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: -spacing.sm,
  },

  duplicataBanner: {
    backgroundColor: colors.alertaLightBg,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  duplicataTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
  duplicataAcoes: { flexDirection: 'row', justifyContent: 'space-between' },
  duplicataLink: { fontFamily: fonts.body, fontSize: 14, fontWeight: '600', color: colors.caramelo },
  duplicataDispensar: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  campo: { gap: spacing.sm },
  rotulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  input: {
    height: 54,
    minHeight: touch.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  dica: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textTertiary },

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
  fotoStrip: { gap: spacing.sm, paddingVertical: 2 },
  miniatura: {
    width: 98,
    height: 98,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  miniaturaRemover: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(43,29,18,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniaturaRemoverTexto: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 18,
    color: colors.onDark,
  },

  avisoPrivacidade: {
    backgroundColor: colors.verdeLightBg,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  avisoPrivacidadeTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.verdeDark,
  },

  acoesEdicao: { gap: spacing.xs, marginTop: spacing.sm },
  acaoLinha: { minHeight: touch.min, justifyContent: 'center' },
  sairMantenedor: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  desativar: { fontFamily: fonts.body, fontSize: 15, fontWeight: '600', color: colors.alerta },
  reativar: { fontFamily: fonts.body, fontSize: 15, fontWeight: '600', color: colors.verde },

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
  desabilitado: { opacity: 0.5 },
  salvarBtnTexto: { fontFamily: fonts.body, fontSize: 16, fontWeight: '600', color: colors.onDark },

  pressed: { opacity: 0.7 },

  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalTopo: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'flex-end', padding: spacing.md },
  modalFechar: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFecharTexto: { fontFamily: fonts.body, fontSize: 18, color: colors.text },
  modalRodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
