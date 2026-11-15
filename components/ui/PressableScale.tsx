import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { haptic, nativeDriver } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
  hapticFeedback?: boolean;
  children?: React.ReactNode;
}

/**
 * A Pressable that shrinks slightly on touch. The style (including flex sizing)
 * is applied to the pressable itself, so it lays out like a plain View.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  scaleTo = 0.97,
  hapticFeedback = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: nativeDriver, speed: 40, bounciness: 4 }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticFeedback) haptic.tap();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
};
