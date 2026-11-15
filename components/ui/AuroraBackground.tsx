import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/** Plain, static background. (The animated aurora was removed for a calmer, minimal look.) */
export const AuroraBackground: React.FC<{ intensity?: number }> = () => {
  const { theme } = useTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />;
};
