import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, Tone, toneColors } from '../../theme/tokens';
import { PressableScale } from './PressableScale';

export interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  tone?: Tone;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  dashed?: boolean;
}

/** Flat card with a hairline border — the base surface of the app. */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  padding = 18,
  tone = 'neutral',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  dashed,
}) => {
  const { theme } = useTheme();
  const tinted = tone !== 'neutral';
  const colors = toneColors(theme, tone);

  const cardStyle: ViewStyle = {
    backgroundColor: tinted ? colors.bg : theme.surface,
    borderColor: tinted ? colors.fg + '55' : theme.ink,
    borderWidth: tinted ? 1.5 : theme.outline,
    borderStyle: dashed ? 'dashed' : 'solid',
    borderRadius: radius.lg,
    padding,
  };

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        style={[cardStyle, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {children}
      </PressableScale>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
};
