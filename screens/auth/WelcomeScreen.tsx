import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, PressableScale, Screen } from '../../components/ui';
import { Illustration } from '../../components/brand/Illustration';
import { LogoMark } from '../../components/brand/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

/** Landing page: one illustration, one headline, two actions. */
export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { pendingSetupUser } = useAuth();

  return (
    <Screen
      footer={
        <>
          {pendingSetupUser ? (
            <Button title={`Finish setting up ${pendingSetupUser.username}`} variant="outline" onPress={() => navigation.navigate('MasterPasswordSetup')} size="lg" />
          ) : null}
          <Button title="Create account" onPress={() => navigation.navigate('SignUp')} size="lg" />
          <Button title="Log in" variant="secondary" onPress={() => navigation.navigate('Login')} size="lg" />
          <PressableScale onPress={() => navigation.navigate('HowUPICProtects')} accessibilityRole="link" accessibilityLabel="How UPIC protects you" style={styles.link}>
            <AppText variant="caption" secondary align="center">
              How UPIC protects you
            </AppText>
          </PressableScale>
        </>
      }
    >
      <View style={styles.brand}>
        <LogoMark size={36} />
        <AppText variant="title" weight="bold">
          UPIC
        </AppText>
      </View>
      <View style={styles.center}>
        <View style={{ alignItems: 'center' }}>
          <Illustration kind="keys" size={260} />
        </View>
        <AppText variant="display" style={{ marginTop: 28 }} accessibilityRole="header">
          All your keys{'\n'}in{' '}
          <AppText variant="display" color={theme.primary}>
            one place
          </AppText>
          .
        </AppText>
        <AppText variant="bodyLg" secondary style={{ marginTop: 10 }}>
          Passwords, one-tap logins and private email — encrypted on your phone.
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  center: { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  link: { paddingVertical: 8 },
});
