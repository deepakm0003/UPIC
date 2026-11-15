import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, Button, Header, Screen, TitleBlock, useToast } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../../types';
import { Illustration } from '../../components/brand/Illustration';

type Props = NativeStackScreenProps<AuthStackParamList, 'BiometricSetup'>;

export const BiometricSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { biometricAvailable, biometricLabel, enableBiometrics } = useAuth();
  const [loading, setLoading] = useState(false);

  const next = () => navigation.replace('HowUPICProtects', { onboarding: true });

  const enable = async () => {
    setLoading(true);
    const ok = await enableBiometrics();
    setLoading(false);
    if (ok) {
      toast.show(`${biometricLabel} is on`);
      next();
    } else {
      toast.show({ message: `${biometricLabel} was not turned on. You can do it later in Settings.`, tone: 'warning' });
    }
  };

  return (
    <Screen
      header={<Header title="Quick unlock" noBack />}
      footer={
        biometricAvailable ? (
          <>
            <Button title={`Enable ${biometricLabel}`} onPress={enable} loading={loading} size="lg" />
            <Button title="Skip for now" variant="secondary" onPress={next} size="lg" />
          </>
        ) : (
          <Button title="Continue" onPress={next} size="lg" />
        )
      }
    >
      <View style={styles.hero}>
        <Illustration kind="fingerprint" size={220} />
      </View>
      <TitleBlock
        center
        title={`Unlock with ${biometricLabel}?`}
        subtitle="Open your vault without typing your master password. Your fingerprint or face never leaves this device."
      />
      {!biometricAvailable ? (
        <AppText variant="body" secondary align="center">
          Biometrics aren't set up on this device. You can turn this on later in Settings.
        </AppText>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  icon: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
