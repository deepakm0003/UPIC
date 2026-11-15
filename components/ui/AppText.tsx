import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fonts, typeScale, TypeVariant } from '../../theme/tokens';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  muted?: boolean;
  secondary?: boolean;
  weight?: Weight;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
}

const weightFont: Record<Weight, string> = {
  regular: fonts.body,
  medium: fonts.bodyMedium,
  semibold: fonts.bodySemibold,
  bold: fonts.bodyBold,
};

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  muted,
  secondary,
  weight,
  align,
  uppercase,
  style,
  children,
  ...rest
}) => {
  const { theme, fs } = useTheme();
  const t = typeScale[variant];
  const isDisplay = variant === 'display' || variant === 'h1' || variant === 'h2';
  const fontFamily = weight && !isDisplay ? weightFont[weight] : t.font;
  const textColor = color ?? (muted ? theme.textMuted : secondary ? theme.textSecondary : theme.text);

  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        {
          fontFamily,
          fontSize: fs(t.size),
          lineHeight: fs(t.line),
          letterSpacing: t.spacing,
          color: textColor,
          textAlign: align,
          textTransform: uppercase || variant === 'overline' ? 'uppercase' : undefined,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
