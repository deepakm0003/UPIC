import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  FadeIn,
  GlassCard,
  Header,
  InfoCallout,
  Screen,
  StrengthMeter,
  TextField,
  TitleBlock,
  useToast,
} from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getUserByUsername, recoverOnThisDevice, recoverWithRecoveryKey, VaultError } from '../../services/fileStorage';
import { randomString } from '../../services/crypto';
import { assessPassword } from '../../utils/passwordStrength';
import type { User } from '../../types';
import { Illustration } from '../../components/brand/Illustration';

type Method = 'key' | 'email' | 'phone';
type Step = 'identify' | 'verify' | 'reset';

function mask(value: string, kind: 'email' | 'phone'): string {
  if (kind === 'phone') return value.replace(/\d(?=\d{2})/g, '•');
  const [name, domain] = value.split('@');
  return `${name.charAt(0)}${'•'.repeat(Math.max(1, name.length - 1))}@${domain ?? ''}`;
}

/**
 * Forgot master password. Recovery works by:
 *  - the backup recovery key (any device, fully zero-knowledge), or
 *  - a code sent to the recovery email / phone, which releases a device-only
 *    escrow key — so it only works on this trusted device.
 */
export const ForgotMasterPasswordScreen: React.FC<{ navigation: any; route: { params?: { identifier?: string } } }> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { finishSetup } = useAuth();
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState(route.params?.identifier ?? '');
  const [account, setAccount] = useState<User | null>(null);
  const [method, setMethod] = useState<Method>('key');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [master, setMaster] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const methods = useMemo(
    () =>
      [
        {
          id: 'key' as Method,
          icon: 'key-chain' as const,
          title: 'Use my recovery key',
          body: 'The 32-character key you saved at sign-up. Works on any device.',
          enabled: true,
        },
        {
          id: 'email' as Method,
          icon: 'email-check-outline' as const,
          title: 'Send a code to my email',
          body: account?.recoveryEmail ? `${mask(account.recoveryEmail, 'email')} · this device only` : 'No recovery email set',
          enabled: !!account?.recoveryEmail,
        },
        {
          id: 'phone' as Method,
          icon: 'cellphone-message' as const,
          title: 'Send a code to my phone',
          body: account?.recoveryPhone ? `${mask(account.recoveryPhone, 'phone')} · this device only` : 'Add a phone in Settings › Recovery',
          enabled: !!account?.recoveryPhone,
        },
      ],
    [account]
  );

  const findAccount = async () => {
    setError(undefined);
    const u = await getUserByUsername(identifier);
    if (!u) {
      setError('No account with that username or email on this device.');
      return;
    }
    setAccount(u);
  };

  const sendCode = () => {
    const c = randomString(6, '0123456789');
    setSentCode(c);
    setCode('');
    setStep('verify');
  };

  const verify = () => {
    setError(undefined);
    if (method === 'key') {
      if (recoveryKey.replace(/[^0-9A-Za-z]/g, '').length < 32) {
        setError('A recovery key has 32 letters and numbers.');
        return;
      }
    } else if (code !== sentCode) {
      setError('That code is not correct.');
      return;
    }
    setStep('reset');
  };

  const reset = async () => {
    setError(undefined);
    if (master.length < 10 || assessPassword(master).level < 2) {
      setError('Choose a longer, harder-to-guess master password.');
      return;
    }
    if (master !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (method === 'key') {
        const { recoveryKey: fresh } = await recoverWithRecoveryKey(identifier, recoveryKey, master);
        toast.show('Master password reset');
        navigation.replace('RecoveryKey', { recoveryKey: fresh, mode: 'rotated' });
      } else {
        await recoverOnThisDevice(identifier, master);
        toast.show('Master password reset');
        await finishSetup();
      }
    } catch (e) {
      const err = e as VaultError;
      setError(err.message);
      if (err.code === 'BAD_RECOVERY_KEY') setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const footer =
    step === 'identify' ? (
      account ? (
        <Button
          title={method === 'key' ? 'Continue' : 'Send code'}
          onPress={() => (method === 'key' ? setStep('verify') : sendCode())}
          disabled={!methods.find((m) => m.id === method)?.enabled}
          size="lg"
        />
      ) : (
        <Button title="Find my account" onPress={findAccount} size="lg" />
      )
    ) : step === 'verify' ? (
      <Button title="Verify" onPress={verify} size="lg" />
    ) : (
      <Button title="Reset master password" onPress={reset} loading={loading} size="lg" />
    );

  return (
    <Screen header={<Header title="Recover access" onBack={step === 'identify' ? undefined : () => setStep(step === 'reset' ? 'verify' : 'identify')} />} footer={footer}>
      {step === 'identify' ? (
        <FadeIn key="identify">
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Illustration kind="recovery" size={160} />
          </View>
          <TitleBlock title="Forgot your master password?" subtitle="Choose how you'd like to prove it's you. Your vault stays encrypted the whole time." />
          <TextField
            label="Username or email"
            icon="account-outline"
            value={identifier}
            onChangeText={(t) => {
              setIdentifier(t);
              setAccount(null);
            }}
            autoCapitalize="none"
            error={!account ? error : undefined}
          />
          {account ? (
            <View style={{ gap: 10 }}>
              {methods.map((m) => {
                const selected = method === m.id;
                return (
                  <GlassCard
                    key={m.id}
                    onPress={m.enabled ? () => setMethod(m.id) : undefined}
                    tone={selected ? 'primary' : 'neutral'}
                    accessibilityLabel={`${m.title}. ${m.body}`}
                    style={!m.enabled ? { opacity: 0.55 } : undefined}
                  >
                    <View style={styles.method}>
                      <MaterialCommunityIcons name={m.icon} size={24} color={selected ? theme.primary : theme.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="label" weight="semibold">
                          {m.title}
                        </AppText>
                        <AppText variant="caption" secondary>
                          {m.body}
                        </AppText>
                      </View>
                      <MaterialCommunityIcons
                        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                        size={22}
                        color={selected ? theme.primary : theme.textMuted}
                      />
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          ) : null}
        </FadeIn>
      ) : step === 'verify' ? (
        <FadeIn key="verify">
          {method === 'key' ? (
            <>
              <TitleBlock title="Enter your recovery key" subtitle="Letters and numbers only — dashes and spaces are ignored." />
              <TextField
                label="Recovery key"
                icon="key-chain"
                mono
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                value={recoveryKey}
                onChangeText={setRecoveryKey}
                autoCapitalize="characters"
                autoCorrect={false}
                error={error}
              />
            </>
          ) : (
            <>
              <TitleBlock
                title="Enter the 6-digit code"
                subtitle={`We sent a code to ${method === 'email' ? mask(account!.recoveryEmail!, 'email') : mask(account!.recoveryPhone!, 'phone')}.`}
              />
              <InfoCallout
                icon="flask-outline"
                tone="warning"
                title="Prototype mode"
                body={`No mail or SMS server is connected in this build, so the code is shown here: ${sentCode}`}
                style={{ marginBottom: 16 }}
              />
              <TextField
                label="Verification code"
                icon="numeric"
                mono
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                error={error}
              />
              <Button title="Send a new code" variant="ghost" onPress={sendCode} />
            </>
          )}
        </FadeIn>
      ) : (
        <FadeIn key="reset">
          <TitleBlock title="Create a new master password" subtitle="This replaces your old master password. Your saved passwords stay exactly as they are." />
          <TextField label="New master password" icon="shield-key-outline" value={master} onChangeText={setMaster} secret />
          <StrengthMeter password={master} showCrackTime />
          <TextField label="Confirm new master password" icon="shield-check-outline" value={confirm} onChangeText={setConfirm} secret error={error} />
          {method === 'key' ? (
            <InfoCallout icon="refresh" tone="info" title="You'll get a new recovery key" body="For safety, the key you just used stops working. Save the new one on the next screen." />
          ) : null}
        </FadeIn>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  method: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
