import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

export interface FadeInProps {
  children?: React.ReactNode;
  /** Kept for compatibility; entrance animations were removed for a calmer UI. */
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}

/** Layout wrapper. Content appears immediately — no entrance animation. */
export const FadeIn: React.FC<FadeInProps> = ({ children, style }) => <View style={style}>{children}</View>;
