import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  BottomSheet,
  Button,
  FadeIn,
  GlassCard,
  Header,
  InfoCallout,
  ListGroup,
  Screen,
  SectionHeader,
  TextField,
  ToggleRow,
  useToast,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  confirmMasterPassword,
  isDeviceRecoveryEnabled,
  rotateRecoveryKey,
  setDeviceRecoveryEnabled,
  updateRecoveryContacts,
} from '../../services/fileStorage';
import { validateEmail } from '../../utils/validators';

export const RecoverySettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.recoveryEmail ?? '');
  const [phone, setPhone] = useState(user?.recoveryPhone ?? '');
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [deviceRecovery, setDeviceRecovery] = useState(isDeviceRecoveryEnabled());
  const [rotateSheet, setRotateSheet] = useState(false);
  const [master, setMaster] = useState('');
  const [masterError, setMasterError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(user?.recoveryEmail ?? '');
    setPhone(user?.recoveryPhone ?? '');
  }, [user?.recoveryEmail, user?.recoveryPhone]);

  const saveContacts = async () => {
    const next: typeof errors = {};
    if (email && !validateEmail(email.trim()).valid) next.email = 'Enter a valid email or leave it empty.';
    if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) next.phone = 'Enter a phone number with country code, e.g. +91 98765 43210.';
    setErrors(next);
    if (Object.keys(next).length) return;
    await updateRecoveryContacts({ recoveryEmail: email.trim().toLowerCase() || undefined, recoveryPhone: phone.trim() || undefined });
    await refreshUser();
    toast.show('Recovery contacts saved');
  };

  const toggleDevice = async (on: boolean) => {
    await setDeviceRecoveryEnabled(on);
    setDeviceRecovery(on);
    toast.show(on ? 'Email/phone recovery is on for this device' : 'Email/phone recovery is off — only your recovery key can reset access');
  };

  const rotate = async () => {
    setBusy(true);
    try {
      if (!(await confirmMasterPassword(master))) {
        setMasterError('Incorrect master password.');
        return;
      }
      const key = await rotateRecoveryKey();
      setRotateSheet(false);
      setMaster('');
      navigation.navigate('RecoveryKey', { recoveryKey: key, mode: 'rotated' });
    } finally {
      setBusy(false);
    }
  };

  const created = user?.recoveryKeyCreatedAt ? new Date(user.recoveryKeyCreatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' } as any) : null;

  return (
    <Screen header={<Header title="Recovery" />}>
      <FadeIn>
        <AppText variant="body" secondary style={{ marginBottom: 6 }}>
          Ways to get back into UPIC if you forget your master password. Your vault stays encrypted throughout.
        </AppText>
      </FadeIn>

      <SectionHeader title="Recovery key" />
      <FadeIn delay={60}>
        <GlassCard tone={user?.hasRecoveryKey ? 'success' : 'warning'}>
          <AppText variant="label" weight="semibold">
            {user?.hasRecoveryKey ? 'Recovery key is set up' : 'No recovery key yet'}
          </AppText>
          <AppText variant="body" secondary style={{ marginTop: 4, marginBottom: 14 }}>
            {user?.hasRecoveryKey
              ? `Created ${created}. Works on any device. If you lost it, make a new one — the old key stops working.`
              : 'Create one now so you can always reset your master password.'}
          </AppText>
          <Button title={user?.hasRecoveryKey ? 'Create a new recovery key' : 'Create recovery key'} variant="secondary" icon="key-change" onPress={() => setRotateSheet(true)} />
        </GlassCard>
      </FadeIn>

      <SectionHeader title="Recovery contacts" />
      <FadeIn delay={100}>
        <TextField label="Recovery email" icon="email-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <TextField label="Recovery phone" icon="cellphone" placeholder="+91 98765 43210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        <Button title="Save contacts" icon="content-save-outline" onPress={saveContacts} />
      </FadeIn>

      <SectionHeader title="On this device" />
      <ListGroup>
        <ToggleRow
          title="Allow email or phone recovery"
          subtitle="A verified code can reset your master password, but only on this phone."
          value={deviceRecovery}
          onValueChange={toggleDevice}
        />
      </ListGroup>
      <InfoCallout
        style={{ marginTop: 12 }}
        icon="scale-balance"
        tone="info"
        title="Convenience vs. maximum security"
        body="With this on, a backup of your vault key is kept in this phone's secure hardware so a code can restore access. Turn it off if you want the recovery key to be the only way back in."
      />

      <BottomSheet visible={rotateSheet} onClose={() => setRotateSheet(false)}>
        <AppText variant="h2">Confirm it's you</AppText>
        <AppText variant="body" secondary style={{ marginTop: 6, marginBottom: 16 }}>
          Enter your master password to create a new recovery key. Your current key will stop working.
        </AppText>
        <TextField label="Master password" icon="shield-key-outline" value={master} onChangeText={(t) => { setMaster(t); setMasterError(undefined); }} secret error={masterError} autoFocus />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setRotateSheet(false)} />
          <Button title="Create key" style={{ flex: 1 }} onPress={rotate} loading={busy} disabled={!master} />
        </View>
      </BottomSheet>
    </Screen>
  );
};
