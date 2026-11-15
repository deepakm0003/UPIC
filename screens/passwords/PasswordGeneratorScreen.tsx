import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  AppText,
  Button,
  Chips,
  FadeIn,
  GlassCard,
  Header,
  InfoCallout,
  ListGroup,
  Screen,
  SectionHeader,
  Stepper,
  StrengthMeter,
  ToggleRow,
  useToast,
} from '../../components/ui';
import { nativeDriver } from '../../components/ui/motion';
import { useTheme } from '../../contexts/ThemeContext';
import { fonts } from '../../theme/tokens';
import { defaultPasswordOptions, generatePassword, PasswordOptions } from '../../utils/passwordGenerator';
import { copySecret } from '../../utils/clipboard';

/** Generated password with digits and symbols tinted for readability. */
const ColoredPassword: React.FC<{ value: string }> = ({ value }) => {
  const { theme, fs } = useTheme();
  return (
    <Text
      selectable
      accessibilityLabel={`Generated password: ${value.split('').join(' ')}`}
      style={{ fontFamily: fonts.mono, fontSize: fs(value.length > 24 ? 19 : 23), lineHeight: fs(32), textAlign: 'center', letterSpacing: 1.5 }}
    >
      {value.split('').map((c, i) => (
        <Text key={i} style={{ color: /[0-9]/.test(c) ? theme.accent : /[^a-zA-Z0-9]/.test(c) ? theme.secondary : theme.text }}>
          {c}
        </Text>
      ))}
    </Text>
  );
};

export const PasswordGeneratorScreen: React.FC<{
  navigation: any;
  route: { params?: { returnTo?: 'PasswordEdit'; passwordId?: string } };
}> = ({ navigation, route }) => {
  const toast = useToast();
  const { theme } = useTheme();
  const [options, setOptions] = useState<PasswordOptions>(defaultPasswordOptions);
  const [password, setPassword] = useState(() => generatePassword(defaultPasswordOptions));
  const flip = useRef(new Animated.Value(1)).current;
  const returning = route.params?.returnTo === 'PasswordEdit';

  const regenerate = useCallback(
    (opts: PasswordOptions = options) => {
      Animated.sequence([
        Animated.timing(flip, { toValue: 0, duration: 110, useNativeDriver: nativeDriver }),
        Animated.spring(flip, { toValue: 1, useNativeDriver: nativeDriver, speed: 18, bounciness: 10 }),
      ]).start();
      setTimeout(() => setPassword(generatePassword(opts)), 110);
    },
    [options, flip]
  );

  useEffect(() => {
    regenerate(options);
  }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<PasswordOptions>) => {
    const next = { ...options, ...patch };
    const groups = [next.includeLowercase, next.includeUppercase, next.includeNumbers, next.includeSymbols].filter(Boolean).length;
    if (groups === 0) {
      toast.show({ message: 'Keep at least one character type on.', tone: 'warning' });
      return;
    }
    setOptions(next);
  };

  const copy = async () => {
    await copySecret(password);
    toast.show('Password copied · clears in 30 s');
  };

  return (
    <Screen
      header={<Header title="Password generator" />}
      footer={
        returning ? (
          <Button
            title="Use this password"
            icon="check"
            size="lg"
            onPress={() => navigation.navigate({ name: 'PasswordEdit', params: { passwordId: route.params?.passwordId, generated: password }, merge: true })}
          />
        ) : (
          <>
            <Button title="Save as new login" icon="content-save-outline" size="lg" onPress={() => navigation.replace('PasswordEdit', { generated: password })} />
            <Button title="Copy password" variant="secondary" icon="content-copy" onPress={copy} />
          </>
        )
      }
    >
      <FadeIn>
        <GlassCard tone="primary" style={{ gap: 16 }}>
          <AppText variant="overline" color={theme.primary} align="center">
            Generated password
          </AppText>
          <Animated.View style={{ opacity: flip, transform: [{ scale: flip.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
            <ColoredPassword value={password} />
          </Animated.View>
          <View style={styles.row}>
            <Button title="Copy" variant="secondary" icon="content-copy" size="sm" style={{ flex: 1 }} onPress={copy} />
            <Button title="Regenerate" variant="secondary" icon="refresh" size="sm" style={{ flex: 1 }} onPress={() => regenerate()} />
          </View>
        </GlassCard>
      </FadeIn>

      <FadeIn delay={80} style={{ marginTop: 18 }}>
        <StrengthMeter password={password} showReasons={false} showCrackTime />
      </FadeIn>

      <SectionHeader title="Length" />
      <FadeIn delay={120}>
        <GlassCard style={{ gap: 14 }}>
          <View style={styles.lengthRow}>
            <AppText variant="label" weight="semibold">
              {options.length} characters
            </AppText>
            <Stepper value={options.length} min={8} max={64} onChange={(length) => set({ length })} label="Password length" />
          </View>
          <Chips
            value={String(options.length)}
            onChange={(v) => set({ length: parseInt(v, 10) })}
            options={['12', '16', '20', '24', '32'].map((v) => ({ value: v, label: v }))}
          />
        </GlassCard>
      </FadeIn>

      <SectionHeader title="Characters" />
      <FadeIn delay={160}>
        <ListGroup>
          <ToggleRow title="Uppercase letters" subtitle="A–Z" value={options.includeUppercase} onValueChange={(v) => set({ includeUppercase: v })} />
          <ToggleRow title="Lowercase letters" subtitle="a–z" value={options.includeLowercase} onValueChange={(v) => set({ includeLowercase: v })} />
          <ToggleRow title="Numbers" subtitle="0–9" value={options.includeNumbers} onValueChange={(v) => set({ includeNumbers: v })} />
          <ToggleRow title="Symbols" subtitle="! @ # $ % …" value={options.includeSymbols} onValueChange={(v) => set({ includeSymbols: v })} />
          <ToggleRow title="Avoid look-alikes" subtitle="Leaves out 0/O and 1/l/I" value={!!options.avoidAmbiguous} onValueChange={(v) => set({ avoidAmbiguous: v })} />
        </ListGroup>
      </FadeIn>
      <FadeIn delay={200} style={{ marginTop: 16 }}>
        <InfoCallout
          icon="lightbulb-on-outline"
          title="Recommended settings"
          body="16 or more characters with all character types. You never need to remember it — UPIC does that for you."
        />
      </FadeIn>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  lengthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
