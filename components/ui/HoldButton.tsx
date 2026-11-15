import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../theme/tokens';
import { AppText } from './AppText';
import { haptic } from './motion';

/**
 * Press-and-hold confirmation for risky actions (approving a login from an
 * unknown device). It makes the risky choice deliberate instead of habitual.
 */
export const HoldButton: React.FC<{ title: string; onConfirm: () => void; duration?: number; style?: StyleProp<ViewStyle> }> = ({
  title,
  onConfirm,
  duration = 1200,
  style,
}) => {
  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);

  const start = () => {
    setHolding(true);
    haptic.tap();
    Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        haptic.success();
        setHolding(false);
        progress.setValue(0);
        onConfirm();
      }
    });
  };

  const cancel = () => {
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Press and hold to confirm"
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && onConfirm()}
      accessibilityActions={[{ name: 'activate' }]}
      style={style}
    >
      <View style={[styles.shell, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        >
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={styles.row}>
          <MaterialCommunityIcons name="gesture-tap-hold" size={20} color={holding ? theme.onPrimary : theme.primary} />
          <AppText variant="label" weight="semibold" color={holding ? theme.onPrimary : theme.primary}>
            {holding ? 'Keep holding…' : title}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shell: { height: 58, borderRadius: radius.md, borderWidth: 1.5, overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
