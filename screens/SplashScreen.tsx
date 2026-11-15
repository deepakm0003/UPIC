import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AuroraBackground, AppText, FadeIn } from '../components/ui';
import { AnimatedLogo } from '../components/brand/Logo';
import { useTheme } from '../contexts/ThemeContext';

/** Shown while UPIC checks for an account on this device. */
export const SplashScreen: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={styles.root}>
      <AuroraBackground intensity={1.2} />
      <AnimatedLogo size={104} />
      <FadeIn delay={200} style={{ alignItems: 'center', marginTop: 28, gap: 6 }}>
        <AppText variant="h1">UPIC</AppText>
        <AppText variant="label" color={theme.textSecondary}>
          Universal Password and Identity Custodian
        </AppText>
      </FadeIn>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
