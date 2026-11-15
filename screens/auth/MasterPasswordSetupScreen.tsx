import React, { useState } from 'react';
import { View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText, Button, Checkbox, FadeIn, Header, Screen, StrengthMeter, TextField, TitleBlock, useToast } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { getCurrentUser, setupMasterPassword } from '../../services/fileStorage';
import { assessPassword } from '../../utils/passwordStrength';
import type { AuthStackParamList } from '../../types';
import { Illustration } from '../../components/brand/Illustration';

type Props = NativeStackScreenProps<AuthStackParamList, 'MasterPasswordSetup'>;

export const MasterPasswordSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const [master, setMaster] = useState('');
  const [confirm, setConfirm] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    const strength = assessPassword(master);
    if (master.length < 10) next.master = 'Use at least 10 characters — a short phrase works well.';
    else if (strength.level < 2) next.master = 'This master password is too easy to guess. Try a longer phrase.';
    if (confirm !== master) next.confirm = 'Passwords do not match.';
    if (!understood) next.understood = 'Please confirm you understand.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No account found. Please sign up again.');
      const { recoveryKey } = await setupMasterPassword(user.id, master);
      setMaster('');
      setConfirm('');
      navigation.replace('RecoveryKey', { recoveryKey, mode: 'setup' });
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Could not create your vault.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      header={<Header title="Vault setup" />}
      footer={<Button title={loading ? 'Encrypting your vault…' : 'Continue'} onPress={submit} loading={loading} size="lg" />}
    >
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Illustration kind="encrypt" size={170} />
      </View>
      <TitleBlock
        title="Master password"
        subtitle="Step 2 of 3 · It encrypts your vault. From now on you unlock UPIC with it or with biometrics — no second password."
      />

      <FadeIn delay={180}>
        <TextField label="Master password" icon="shield-key-outline" placeholder="e.g. a short sentence only you know" value={master} onChangeText={setMaster} secret autoComplete="password-new" error={errors.master} />
        <StrengthMeter password={master} showCrackTime />
        <TextField label="Confirm master password" icon="shield-check-outline" placeholder="Enter it again" value={confirm} onChangeText={setConfirm} secret error={errors.confirm} />
        <Checkbox
          checked={understood}
          onChange={setUnderstood}
          label="I understand UPIC cannot see or reset my master password. I'll keep the recovery key I get next."
        />
        {errors.understood ? (
          <AppText variant="caption" color={theme.error} style={{ marginTop: 4 }}>
            {errors.understood}
          </AppText>
        ) : null}
      </FadeIn>
    </Screen>
  );
};

