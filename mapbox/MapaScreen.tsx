/**
 * Meu Caramelo — tela do mapa (React Native + @rnmapbox/maps + Supabase)
 *
 * Instalação:
 *   npm i @rnmapbox/maps
 *   # iOS: cd ios && pod install
 *   # O token público vai no app.json/plugin do Expo ou no gradle.properties / Info.plist.
 *
 * O style caramelo está em estilo-caramelo.json — importe o JSON e passe em `styleJSON`.
 * Assim o mapa não usa nenhum style padrão do Mapbox e você não precisa publicar
 * o style no Studio (dá para publicar depois e trocar por `styleURL`).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Mapbox, { MapView, Camera, MarkerView, UserLocation } from '@rnmapbox/maps';

import estiloCaramelo from './estilo-caramelo.json';
import { supabase } from '../lib/supabase';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);

type Status = 'ok' | 'precisa' | 'urgente';

type Ponto = {
  id: string;
  nome: string;
  endereco: string | null;
  lng: number;
  lat: number;
  horas_desde_ultima: number | null;
};

const CORES: Record<Status, string> = {
  ok: '#3E8F5E',
  precisa: '#B9702F',
  urgente: '#C1452F',
};

/** Regra de status derivada do tempo desde o último registro. */
function statusDoPonto(horas: number | null): Status {
  if (horas == null) return 'urgente';
  if (horas <= 4) return 'ok';
  if (horas <= 12) return 'precisa';
  return 'urgente';
}

export default function MapaScreen({ onAbrirPonto }: { onAbrirPonto: (p: Ponto) => void }) {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'urgente' | 'ok'>('todos');
  const [selecionado, setSelecionado] = useState<Ponto | null>(null);

  /**
   * View `pontos_com_status` no Supabase:
   *   select p.id, p.nome, p.endereco,
   *          st_x(p.geom::geometry) as lng,
   *          st_y(p.geom::geometry) as lat,
   *          extract(epoch from now() - max(r.criado_em)) / 3600 as horas_desde_ultima
   *   from pontos p left join registros r on r.ponto_id = p.id
   *   group by p.id;
   */
  useEffect(() => {
    let ativo = true;
    supabase
      .from('pontos_com_status')
      .select('id, nome, endereco, lng, lat, horas_desde_ultima')
      .then(({ data, error }) => {
        if (!ativo || error || !data) return;
        setPontos(data as Ponto[]);
      });

    // Atualiza o pin assim que alguém registra alimentação em qualquer ponto.
    const canal = supabase
      .channel('registros-mapa')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registros' }, payload => {
        const pontoId = (payload.new as { ponto_id: string }).ponto_id;
        setPontos(atual =>
          atual.map(p => (p.id === pontoId ? { ...p, horas_desde_ultima: 0 } : p)),
        );
      })
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  const visiveis = useMemo(
    () =>
      pontos.filter(p => {
        if (filtro === 'todos') return true;
        const s = statusDoPonto(p.horas_desde_ultima);
        return filtro === 'ok' ? s === 'ok' : s !== 'ok';
      }),
    [pontos, filtro],
  );

  const selecionar = useCallback((p: Ponto) => setSelecionado(p), []);

  return (
    <View style={estilos.tela}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleJSON={JSON.stringify(estiloCaramelo)}
        scaleBarEnabled={false}
        logoPosition={{ bottom: 100, left: 12 }}
        attributionPosition={{ bottom: 100, left: 96 }}
      >
        <Camera followUserLocation followZoomLevel={15.2} animationMode="easeTo" />
        <UserLocation androidRenderMode="compass" showsUserHeadingIndicator />

        {visiveis.map(p => {
          const cor = CORES[statusDoPonto(p.horas_desde_ultima)];
          return (
            <MarkerView key={p.id} coordinate={[p.lng, p.lat]} anchor={{ x: 0.5, y: 0.5 }}>
              <Pressable
                onPress={() => selecionar(p)}
                hitSlop={8}
                style={[estilos.marcador, { backgroundColor: cor }]}
              >
                <IconePata />
              </Pressable>
            </MarkerView>
          );
        })}
      </MapView>

      <Chips valor={filtro} onChange={setFiltro} />

      {selecionado && (
        <FolhaDoPonto
          ponto={selecionado}
          onAbrir={() => onAbrirPonto(selecionado)}
          onFechar={() => setSelecionado(null)}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#EFEAE0' },
  marcador: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B1D12',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
