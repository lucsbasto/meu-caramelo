// Toast in-app (T8 #46): com o app em foreground não mostramos banner do SO
// (ver setNotificationHandler em usePushNotifications); o aviso aparece como um
// toast leve no topo. Provider único no _layout expõe showToast pelo contexto.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '@/theme';

// Tempo em tela antes de sumir sozinho (ms).
const DURACAO_MS = 4000;

type ToastContextValue = { showToast: (mensagem: string) => void };

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  // Lazy init: um único Animated.Value por montagem, sem recriar a cada render.
  const [opacidade] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const esconder = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.timing(opacidade, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      // Só limpa se o fade terminou; um novo toast interrompe (finished:false)
      // e não deve apagar a mensagem recém-mostrada.
    }).start(({ finished }) => {
      if (finished) setMensagem(null);
    });
  }, [opacidade]);

  const showToast = useCallback(
    (texto: string) => {
      const limpo = texto.trim();
      if (!limpo) return;
      setMensagem(limpo);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacidade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(esconder, DURACAO_MS);
    },
    [opacidade, esconder],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mensagem != null ? (
        <ToastView
          mensagem={mensagem}
          opacidade={opacidade}
          onPress={esconder}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastView({
  mensagem,
  opacidade,
  onPress,
}: {
  mensagem: string;
  opacidade: Animated.Value;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { top: insets.top + spacing.sm, opacity: opacidade },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="alert"
        accessibilityLabel={mensagem}
        style={styles.toast}
      >
        <Text style={styles.texto} numberOfLines={3}>
          {mensagem}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  texto: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onDark,
    textAlign: 'center',
  },
});
