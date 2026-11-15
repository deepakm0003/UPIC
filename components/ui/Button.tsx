import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../theme/tokens';
import { readableOn } from '../../utils/brandColor';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconRight?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
  /** Overrides the primary colour, e.g. with the brand colour of the current app. */
  color?: string;
}

const heights = { sm: 42, md: 52, lg: 58 };

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  style,
  accessibilityHint,
  testID,
  color,
}) => {
  const { theme } = useTheme();
  const height = heights[size];

  const fill = color ?? theme.primary;
  const fg =
    variant === 'primary'
      ? color
        ? readableOn(color)
        : theme.onPrimary
      : variant === 'danger'
        ? theme.error
        : variant === 'ghost'
          ? theme.primary
          : theme.text;

  const content = (
    <View style={[styles.row, { height, paddingHorizontal: size === 'sm' ? 16 : 22 }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={size === 'sm' ? 18 : 20} color={fg} /> : null}
          <AppText variant="label" weight="semibold" color={fg} numberOfLines={1} style={styles.label}>
            {title}
          </AppText>
          {iconRight ? <MaterialCommunityIcons name={iconRight} size={20} color={fg} /> : null}
        </>
      )}
    </View>
  );

  const shell: ViewStyle = {
    borderRadius: radius.md,
    overflow: 'hidden',
  };

  let body: React.ReactNode;
  if (variant === 'primary') {
    body = (
      <View style={[shell, { backgroundColor: fill }]}>{content}</View>
    );
  } else {
    const variantStyle: ViewStyle =
      variant === 'secondary'
        ? { backgroundColor: theme.surface, borderWidth: theme.outline, borderColor: theme.isDark ? theme.borderStrong : theme.ink }
        : variant === 'outline'
          ? { borderWidth: theme.outline, borderColor: theme.isDark ? theme.borderStrong : theme.ink }
          : variant === 'danger'
            ? { backgroundColor: theme.errorSoft, borderWidth: 1.5, borderColor: theme.error }
            : {};
    body = <View style={[shell, variantStyle]}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      testID={testID}
    >
      {body}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    flexShrink: 1,
  },
});
