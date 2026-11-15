import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { AppText } from './AppText';

export interface ScoreRingProps {
  /** 0-100, or null when there is nothing to score yet. */
  score: number | null;
  size?: number;
  stroke?: number;
  caption?: string;
}

/** Security score ring. The same component is used on every screen that shows the score. */
export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 104, stroke = 8, caption = 'of 100' }) => {
  const { theme, fs } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, score ?? 0));
  // Monochrome when healthy; only a warning or danger score gets colour.
  const color = value >= 75 ? theme.primary : value >= 50 ? theme.warning : theme.error;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={score === null ? 'No security score yet' : `Security score ${value} out of 100`}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.border} strokeWidth={stroke} fill="none" />
        {score !== null ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - value / 100)}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <AppText variant="h1" style={{ fontSize: fs(size * 0.3), lineHeight: fs(size * 0.36) }}>
          {score === null ? '—' : value}
        </AppText>
        <AppText variant="caption" muted style={{ marginTop: -2 }}>
          {score === null ? 'no data' : caption}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
