/**
 * Selection controls: segmented control, chips, stepper.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { haptic } from './motion';

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useRef(new Animated.Value(0)).current;
  const segW = width / options.length;

  useEffect(() => {
    Animated.spring(x, { toValue: index * segW, useNativeDriver: false, speed: 20, bounciness: 6 }).start();
  }, [index, segW, x]);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 8)}
      style={[styles.seg, { backgroundColor: theme.surface, borderColor: theme.ink, borderWidth: theme.outline }]}
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { width: segW, backgroundColor: theme.primarySoft, borderColor: theme.primary + '66', transform: [{ translateX: x }] },
          ]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            style={styles.segItem}
            hapticFeedback={false}
            onPress={() => {
              haptic.select();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
          >
            <AppText variant="label" weight="semibold" color={selected ? theme.primary : theme.textSecondary} numberOfLines={1}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: (Option<T> & { count?: number })[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={o.count !== undefined ? `${o.label}, ${o.count}` : o.label}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.secondary : theme.surface,
                borderColor: selected ? theme.secondary : theme.ink,
                borderWidth: theme.outline,
              },
            ]}
          >
            <AppText variant="label" weight="semibold" color={selected ? '#FFFFFF' : theme.textSecondary}>
              {o.label}
              {o.count !== undefined ? ` · ${o.count}` : ''}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export const Stepper: React.FC<{ value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string }> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}) => {
  const { theme } = useTheme();
  const btn = (icon: 'minus' | 'plus', disabled: boolean, next: number) => (
    <PressableScale
      disabled={disabled}
      onPress={() => onChange(next)}
      accessibilityRole="button"
      accessibilityLabel={`${icon === 'minus' ? 'Decrease' : 'Increase'} ${label}`}
      style={[styles.stepBtn, { backgroundColor: theme.surface, borderColor: theme.ink, borderWidth: theme.outline }]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={theme.text} />
    </PressableScale>
  );
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${value}`}>
      {btn('minus', value <= min, Math.max(min, value - step))}
      <AppText variant="h2" style={{ minWidth: 44, textAlign: 'center' }}>
        {value}
      </AppText>
      {btn('plus', value >= max, Math.min(max, value + step))}
    </View>
  );
};

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 4 },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.sm, borderWidth: 1 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
