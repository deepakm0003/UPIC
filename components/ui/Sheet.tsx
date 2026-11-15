import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, Tone, toneColors } from '../../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { PressableScale } from './PressableScale';
import { haptic, nativeDriver } from './motion';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

/** Bottom sheet with an animated backdrop and spring slide-up. */
export const BottomSheet: React.FC<{ visible: boolean; onClose: () => void; children?: React.ReactNode }> = ({
  visible,
  onClose,
  children,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(v, { toValue: 1, useNativeDriver: nativeDriver, speed: 16, bounciness: 4 }).start();
    } else {
      Animated.timing(v, { toValue: 0, duration: 180, useNativeDriver: nativeDriver }).start(() => setMounted(false));
    }
  }, [visible, v]);

  if (!mounted) return null;

  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: v }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surfaceSolid,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 20) + 4,
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Confirmation for risky or irreversible actions. Both buttons have the same
 * size so the safe choice is never harder to hit than the risky one.
 */
export const ConfirmSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  icon?: Glyph;
  tone?: Tone;
  loading?: boolean;
}> = ({ visible, onClose, onConfirm, title, message, confirmLabel, icon = 'alert-outline', tone = 'danger', loading }) => {
  const { theme } = useTheme();
  const c = toneColors(theme, tone);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.confirmBody}>
        <View style={[styles.confirmIcon, { backgroundColor: c.bg }]}>
          <MaterialCommunityIcons name={icon} size={28} color={c.fg} />
        </View>
        <AppText variant="h2" align="center">
          {title}
        </AppText>
        <AppText variant="body" secondary align="center">
          {message}
        </AppText>
      </View>
      <View style={styles.confirmActions}>
        <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button
          title={confirmLabel}
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onPress={() => {
            haptic.warning();
            onConfirm();
          }}
          loading={loading}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheet>
  );
};

export function OptionSheet<T extends string | number>({
  visible,
  onClose,
  title,
  description,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2" style={{ marginBottom: 4 }}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" secondary style={{ marginBottom: 12 }}>
          {description}
        </AppText>
      ) : null}
      <View style={{ gap: 8, marginTop: 6 }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <PressableScale
              key={String(o.value)}
              onPress={() => {
                haptic.select();
                onSelect(o.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={[
                styles.option,
                { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="label" weight="semibold">
                  {o.label}
                </AppText>
                {o.hint ? (
                  <AppText variant="caption" secondary>
                    {o.hint}
                  </AppText>
                ) : null}
              </View>
              <MaterialCommunityIcons
                name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                size={22}
                color={selected ? theme.primary : theme.textMuted}
              />
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 560,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  confirmBody: { alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 22 },
  confirmIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md, borderWidth: 1.5 },
});
