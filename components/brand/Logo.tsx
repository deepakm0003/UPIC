import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

/** UPIC mark: a shield with a keyhole, in the theme's foreground colour. */
export const LogoMark: React.FC<{ size?: number }> = ({ size = 56 }) => {
  const { theme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="UPIC logo">
      <Rect x="0" y="0" width="64" height="64" rx="16" fill={theme.primary} />
      <Path d="M32 13 L46 18.5 V31 C46 40.5 40 47.5 32 51 C24 47.5 18 40.5 18 31 V18.5 Z" fill={theme.onPrimary} />
      <Circle cx="32" cy="29" r="4.5" fill={theme.primary} />
      <Path d="M29.8 31.5 H34.2 L35.2 39.5 H28.8 Z" fill={theme.primary} />
    </Svg>
  );
};

/** Kept for existing call sites; now static. */
export const AnimatedLogo = LogoMark;
