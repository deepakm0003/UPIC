import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, FadeIn, Header, PressableScale, Screen, StrengthMeter, TextField, TitleBlock } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { createUser, VaultError } from '../../services/fileStorage';
import { validateEmail, validateUsername } from '../../utils/validators';
import { assessPassword } from '../../utils/passwordStrength';
import type { AuthStackParamList } from '../../types';
import { Illustration } from '../../components/brand/Illustration';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    const u = validateUsername(username.trim());
    if (!u.valid) next.username = u.error ?? 'Choose a username';
    const e = validateEmail(email.trim());
    if (!e.valid) next.email = e.error ?? 'Enter a valid email';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    else if (assessPassword(password, { username, email }).level < 2) next.password = 'Choose a stronger password — see the tips below.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await createUser(username.trim(), email.trim(), password);
      navigation.navigate('MasterPasswordSetup');
    } catch (err) {
      setErrors({ username: err instanceof VaultError ? err.message : 'Could not create the account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      header={<Header title="Create account" />}
      footer={
        <>
          <Button title="Create account" onPress={submit} loading={loading} size="lg" />
          <PressableScale onPress={() => navigation.replace('Login')} accessibilityRole="link" accessibilityLabel="Already have an account? Log in">
            <AppText variant="label" secondary align="center">
              Already have an account?{' '}
              <AppText variant="label" weight="semibold" color={theme.primary}>
                Log in
              </AppText>
            </AppText>
          </PressableScale>
        </>
      }
    >
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Illustration kind="account" size={170} />
      </View>
      <FadeIn>
        <TitleBlock title="Create account" subtitle="Step 1 of 3" />
      </FadeIn>
      <FadeIn delay={80}>
        <TextField label="Username" icon="account-outline" placeholder="Choose a username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username-new" error={errors.username} />
        <TextField label="Email" icon="email-outline" placeholder="name@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
        <TextField label="Account password" icon="lock-outline" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secret autoComplete="password-new" error={errors.password} />
        <StrengthMeter password={password} context={{ username, email }} />
        <TextField label="Confirm password" icon="lock-check-outline" placeholder="Enter password again" value={confirm} onChangeText={setConfirm} secret error={errors.confirm} />
      </FadeIn>
      <FadeIn delay={160}>
        <AppText variant="caption" secondary>
          Next you'll create a master password. That's the one you'll use to unlock UPIC.
        </AppText>
      </FadeIn>
    </Screen>
  );
};
