import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, Tone, toneColors } from '../../theme/tokens';
import { AppText } from './AppText';
import { haptic, nativeDriver } from './motion';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

interface ToastOptions {
  message: string;
  tone?: Tone;
  icon?: Glyph;
}

const ToastContext = createContext<{ show: (o: ToastOptions | string) => void }>({ show: () => undefined });

/** Confirmation feedback ("Password saved", "Copied") — Phase 1 asked for clearer feedback. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (o: ToastOptions | string) => {
      const opts = typeof o === 'string' ? { message: o } : o;
      if (timer.current) clearTimeout(timer.current);
      setToast(opts);
      if (opts.tone === 'danger') haptic.error();
      else haptic.success();
      Animated.spring(v, { toValue: 1, useNativeDriver: nativeDriver, speed: 18, bounciness: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: nativeDriver }).start(() => setToast(null));
      }, 2400);
    },
    [v]
  );

  const tone = toast?.tone ?? 'success';
  const c = toneColors(theme, tone);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { top: insets.top + 10 }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.toast,
              {
                backgroundColor: theme.surfaceSolid,
                borderColor: c.fg + '55',
                opacity: v,
                transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
              },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: c.bg }]}>
              <MaterialCommunityIcons
                name={toast.icon ?? (tone === 'danger' ? 'alert-circle' : tone === 'warning' ? 'alert' : 'check-circle')}
                size={18}
                color={c.fg}
              />
            </View>
            <AppText variant="label" weight="semibold" style={{ flex: 1 }}>
              {toast.message}
            </AppText>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
