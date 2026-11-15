import React, { forwardRef, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { fonts, radius } from '../../theme/tokens';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  error?: string;
  helper?: string;
  /** Adds a show/hide toggle and hides the value by default. */
  secret?: boolean;
  right?: React.ReactNode;
  mono?: boolean;
  /** Visually hide the label (still read by screen readers). */
  labelHidden?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, icon, error, helper, secret, right, mono, labelHidden, style, onFocus, onBlur, ...rest }, ref) => {
    const { theme, fs } = useTheme();
    const [visible, setVisible] = useState(false);
    const focus = useRef(new Animated.Value(0)).current;

    const animate = (to: number) =>
      Animated.timing(focus, { toValue: to, duration: 180, useNativeDriver: false }).start();

    const borderColor = error
      ? theme.error
      : focus.interpolate({ inputRange: [0, 1], outputRange: [theme.isDark ? theme.border : theme.ink, theme.primary] });

    return (
      <View style={styles.wrap}>
        {labelHidden ? null : (
          <AppText variant="label" weight="medium" secondary style={styles.label}>
            {label}
          </AppText>
        )}
        <Animated.View
          style={[
            styles.field,
            { backgroundColor: theme.surface, borderColor, borderWidth: theme.outline },
          ]}
        >
          {icon ? <MaterialCommunityIcons name={icon} size={20} color={theme.textMuted} /> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={theme.textMuted}
            secureTextEntry={secret && !visible}
            autoCapitalize={secret ? 'none' : rest.autoCapitalize}
            autoCorrect={secret ? false : rest.autoCorrect}
            selectionColor={theme.primary}
            accessibilityLabel={label}
            maxFontSizeMultiplier={1.6}
            onFocus={(e) => {
              animate(1);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              animate(0);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              {
                color: theme.text,
                fontFamily: mono && (!secret || visible) ? fonts.mono : fonts.body,
                fontSize: fs(16),
              },
              style,
            ]}
            {...rest}
          />
          {secret ? (
            <Pressable
              onPress={() => setVisible((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
            >
              <MaterialCommunityIcons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
            </Pressable>
          ) : null}
          {right}
        </Animated.View>
        {error ? (
          <View style={styles.msgRow} accessibilityLiveRegion="polite">
            <MaterialCommunityIcons name="alert-circle-outline" size={15} color={theme.error} />
            <AppText variant="caption" color={theme.error} style={{ flex: 1 }}>
              {error}
            </AppText>
          </View>
        ) : helper ? (
          <AppText variant="caption" muted style={styles.helper}>
            {helper}
          </AppText>
        ) : null}
      </View>
    );
  }
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, outlineStyle: 'none' } as any,
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  helper: { marginTop: 6 },
});
