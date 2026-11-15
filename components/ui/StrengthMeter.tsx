import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { toneColors } from '../../theme/tokens';
import { assessPassword } from '../../utils/passwordStrength';
import { AppText } from './AppText';

export interface StrengthMeterProps {
  password: string;
  context?: { username?: string; email?: string; site?: string };
  /** Show the reasons behind the rating (explain, don't just colour). */
  showReasons?: boolean;
  showCrackTime?: boolean;
}

export const StrengthMeter: React.FC<StrengthMeterProps> = ({ password, context, showReasons = true, showCrackTime }) => {
  const { theme } = useTheme();
  const result = assessPassword(password, context);
  const color = toneColors(theme, result.tone).fg;
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fill, {
      toValue: password ? Math.max(0.08, result.score / 100) : 0,
      useNativeDriver: false,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [fill, result.score, password]);

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Password strength: ${result.label}`}>
      <View style={styles.row}>
        <AppText variant="caption" secondary>
          Password strength
        </AppText>
        <AppText variant="caption" weight="semibold" color={password ? color : theme.textMuted}>
          {result.label}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceStrong }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      {password && showCrackTime ? (
        <AppText variant="caption" muted style={{ marginTop: 6 }}>
          Estimated time to crack offline: {result.crackTime}
        </AppText>
      ) : null}
      {password && showReasons && result.reasons.length > 0 ? (
        <View style={styles.reasons}>
          {result.reasons.slice(0, 2).map((r) => (
            <View key={r} style={styles.reason}>
              <MaterialCommunityIcons name="information-outline" size={14} color={theme.textMuted} style={{ marginTop: 2 }} />
              <AppText variant="caption" secondary style={{ flex: 1 }}>
                {r}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: -4, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  reasons: { marginTop: 10, gap: 6 },
  reason: { flexDirection: 'row', gap: 6 },
});
