import React, { useState } from 'react';
import { Button, FadeIn, GlassCard, Header, Screen, TextField, TitleBlock, AppText } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserByUsername } from '../../services/fileStorage';
import { validateEmail } from '../../utils/validators';

export const ForgotUsernameScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [found, setFound] = useState<string | null>(null);

  const lookup = async () => {
    setError(undefined);
    setFound(null);
    if (!validateEmail(email.trim()).valid) {
      setError('Enter the email you signed up with.');
      return;
    }
    const u = await getUserByUsername(email);
    if (!u || u.email !== email.trim().toLowerCase()) setError('No account with that email on this device.');
    else setFound(u.username);
  };

  return (
    <Screen
      header={<Header title="Find username" />}
      footer={found ? <Button title="Back to log in" onPress={() => navigation.goBack()} size="lg" /> : <Button title="Find username" onPress={lookup} size="lg" />}
    >
      <FadeIn>
        <TitleBlock title="Forgot your username?" subtitle="Enter your account email. UPIC accounts are stored on this device, so we can look it up right here." />
        <TextField label="Email" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={error} onSubmitEditing={lookup} />
      </FadeIn>
      {found ? (
        <FadeIn>
          <GlassCard tone="success">
            <AppText variant="caption" secondary>
              Your username is
            </AppText>
            <AppText variant="h2" color={theme.success} selectable>
              {found}
            </AppText>
          </GlassCard>
        </FadeIn>
      ) : null}
    </Screen>
  );
};
