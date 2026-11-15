import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, FadeIn, GlassCard, Header, Screen, SectionHeader, Segmented, StrengthMeter } from '../../components/ui';
import { ThemePreference, useTheme } from '../../contexts/ThemeContext';
import type { TextSize } from '../../theme/tokens';

export const AppearanceScreen: React.FC = () => {
  const { theme, preference, setPreference, textSize, setTextSize } = useTheme();
  return (
    <Screen header={<Header title="Appearance" />}>
      <SectionHeader title="Theme" style={{ marginTop: 8 }} />
      <FadeIn>
        <Segmented<ThemePreference>
          label="Theme"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'light', label: 'White' },
            { value: 'dark', label: 'Black' },
            { value: 'system', label: 'System' },
          ]}
        />
      </FadeIn>

      <SectionHeader title="Text size" />
      <FadeIn delay={60}>
        <Segmented<TextSize>
          label="Text size"
          value={textSize}
          onChange={setTextSize}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'large', label: 'Large' },
            { value: 'xlarge', label: 'Extra large' },
          ]}
        />
        <AppText variant="caption" muted style={{ marginTop: 8 }}>
          UPIC also follows your phone's font-size setting. Larger text was requested in our user study.
        </AppText>
      </FadeIn>

      <SectionHeader title="Preview" />
      <FadeIn delay={120}>
        <GlassCard style={{ gap: 8 }}>
          <AppText variant="overline" color={theme.primary}>
            Preview
          </AppText>
          <AppText variant="h2">Good evening</AppText>
          <AppText variant="body" secondary>
            This is how text looks across UPIC with your current settings.
          </AppText>
          <View style={styles.sample}>
            <StrengthMeter password="Tiger-Lamp-Orbit-42" showReasons={false} />
          </View>
        </GlassCard>
      </FadeIn>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sample: { marginTop: 12 },
});
