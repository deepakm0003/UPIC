import React, { useState } from 'react';
import { Button, FadeIn, Header, InfoCallout, Screen, StrengthMeter, TextField, TitleBlock, useToast } from '../../components/ui';
import { changeMasterPassword, VaultError } from '../../services/fileStorage';
import { assessPassword } from '../../utils/passwordStrength';

export const ChangeMasterPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!current) e.current = 'Enter your current master password.';
    if (next.length < 10 || assessPassword(next).level < 2) e.next = 'Choose a longer, harder-to-guess master password.';
    else if (next === current) e.next = 'The new master password must be different.';
    if (confirm !== next) e.confirm = 'Passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await changeMasterPassword(current, next);
      toast.show('Master password changed');
      navigation.goBack();
    } catch (err) {
      const v = err as VaultError;
      setErrors(v.code === 'BAD_PASSWORD' ? { current: v.message } : { next: v.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<Header title="Master password" />} footer={<Button title="Change master password" onPress={save} loading={saving} size="lg" />}>
      <FadeIn>
        <TitleBlock title="Change master password" subtitle="Your saved passwords stay exactly as they are — only the key that unlocks them changes." />
        <TextField label="Current master password" icon="shield-key-outline" value={current} onChangeText={setCurrent} secret error={errors.current} />
        <TextField label="New master password" icon="shield-plus-outline" value={next} onChangeText={setNext} secret error={errors.next} />
        <StrengthMeter password={next} showCrackTime />
        <TextField label="Confirm new master password" icon="shield-check-outline" value={confirm} onChangeText={setConfirm} secret error={errors.confirm} />
        <InfoCallout icon="fingerprint" tone="info" title="Biometric unlock keeps working" body="Your recovery key also stays valid. You don't need to set anything up again." />
      </FadeIn>
    </Screen>
  );
};
