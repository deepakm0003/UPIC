import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, FadeIn, Header, PressableScale, Screen, TextField, TitleBlock } from '../../components/ui';
import { LogoMark } from '../../components/brand/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getUserByUsername, VaultError } from '../../services/fileStorage';
import { useUnlockThrottle } from '../../hooks/useThrottle';
import type { AuthStackParamList, User } from '../../types';
import { Illustration } from '../../components/brand/Illustration';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { signIn, unlockWithBiometrics, biometricAvailable, biometricLabel } = useAuth();
  const throttle = useUnlockThrottle();
  const [identifier, setIdentifier] = useState('');
  const [master, setMaster] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; master?: string }>({});
  const [loading, setLoading] = useState(false);
  const [bioUser, setBioUser] = useState<User | null>(null);

  // Offer biometric unlock when the typed account has it turned on.
  useEffect(() => {
    if (!biometricAvailable || identifier.trim().length < 3) {
      setBioUser(null);
      return;
    }
    const t = setTimeout(async () => {
      const u = await getUserByUsername(identifier);
      setBioUser(u?.biometricEnabled ? u : null);
    }, 300);
    return () => clearTimeout(t);
  }, [identifier, biometricAvailable]);

  const submit = async () => {
    if (throttle.blocked) return;
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = 'Enter your username or email.';
    if (!master) next.master = 'Enter your master password.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const result = await signIn(identifier, master);
      throttle.reset();
      setMaster('');
      if (result.migratedRecoveryKey) {
        navigation.replace('RecoveryKey', { recoveryKey: result.migratedRecoveryKey, mode: 'rotated' });
      }
    } catch (e) {
      const err = e as VaultError;
      if (err.code === 'NO_USER') setErrors({ identifier: err.message });
      else if (err.code === 'BAD_PASSWORD') {
        throttle.fail();
        setErrors({ master: 'Incorrect master password. Check caps lock and try again.' });
      } else setErrors({ master: err.message ?? 'Could not unlock. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      header={<Header title="Log in" />}
      footer={
        <>
          <Button
            title={throttle.blocked ? `Too many attempts — wait ${throttle.remaining}s` : loading ? 'Unlocking…' : 'Log in'}
            onPress={submit}
            loading={loading}
            disabled={throttle.blocked}
            size="lg"
          />
          {bioUser ? (
            <Button title={`Use ${biometricLabel}`} icon="fingerprint" variant="secondary" size="lg" onPress={() => unlockWithBiometrics(bioUser)} />
          ) : null}
          <PressableScale onPress={() => navigation.replace('SignUp')} accessibilityRole="link" accessibilityLabel="Don't have an account? Sign up">
            <AppText variant="label" secondary align="center">
              Don't have an account?{' '}
              <AppText variant="label" weight="semibold" color={theme.primary}>
                Sign up
              </AppText>
            </AppText>
          </PressableScale>
        </>
      }
    >
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Illustration kind="lock" size={170} />
      </View>
      <FadeIn delay={60}>
        <TitleBlock title="Welcome back" subtitle="Unlock your secure vault." />
      </FadeIn>
      <FadeIn delay={120}>
        <TextField
          label="Username or email"
          icon="account-outline"
          placeholder="Enter username or email"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoComplete="username"
          error={errors.identifier}
        />
        <TextField
          label="Master password"
          icon="shield-key-outline"
          placeholder="Enter master password"
          value={master}
          onChangeText={setMaster}
          secret
          autoComplete="password"
          onSubmitEditing={submit}
          returnKeyType="go"
          error={errors.master}
          helper="Your master password decrypts your vault on this device. It is never sent anywhere."
        />
        <View style={styles.links}>
          <PressableScale onPress={() => navigation.navigate('ForgotMasterPassword', { identifier })} accessibilityRole="link" accessibilityLabel="Forgot master password?">
            <AppText variant="label" weight="semibold" color={theme.primary}>
              Forgot master password?
            </AppText>
          </PressableScale>
          <PressableScale onPress={() => navigation.navigate('ForgotUsername')} accessibilityRole="link" accessibilityLabel="Forgot username?">
            <AppText variant="label" weight="semibold" color={theme.primary}>
              Forgot username?
            </AppText>
          </PressableScale>
        </View>
      </FadeIn>
    </Screen>
  );
};

const styles = StyleSheet.create({
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 },
});
