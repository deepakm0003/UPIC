import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, Button, Checkbox, FadeIn, GlassCard, Header, InfoCallout, Screen, TitleBlock, useToast } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { copySecret } from '../../utils/clipboard';
import { Illustration } from '../../components/brand/Illustration';

/**
 * Shows the backup recovery key exactly once. Used after sign-up ("setup"),
 * after a key is regenerated or used for recovery ("rotated").
 */
export const RecoveryKeyScreen: React.FC<{ navigation: any; route: { params: { recoveryKey: string; mode: 'setup' | 'rotated' } } }> = ({
  navigation,
  route,
}) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { status, finishSetup } = useAuth();
  const { recoveryKey, mode } = route.params;
  const [saved, setSaved] = useState(false);
  const groups = recoveryKey.split('-');

  const next = async () => {
    if (mode === 'setup') navigation.replace('BiometricSetup');
    else if (status !== 'unlocked') await finishSetup();
    else navigation.goBack();
  };

  return (
    <Screen
      header={<Header title="Recovery key" noBack={mode === 'setup'} />}
      footer={<Button title={mode === 'setup' ? 'Continue' : 'Done'} onPress={next} disabled={!saved} size="lg" />}
    >
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Illustration kind="recovery" size={160} />
      </View>
      <FadeIn>
        <TitleBlock
          eyebrow={mode === 'setup' ? 'Step 3 of 3' : 'New recovery key'}
          title="Save your recovery key"
          subtitle="If you ever forget your master password, this key unlocks your vault on any device. It's shown only once."
        />
      </FadeIn>

      <FadeIn delay={100}>
        <GlassCard tone="primary" style={styles.keyCard}>
          <View style={styles.grid} accessible accessibilityLabel={`Recovery key: ${groups.join(' ')}`}>
            {groups.map((g, i) => (
              <View key={i} style={[styles.group, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                <AppText variant="mono" style={{ fontSize: 18, letterSpacing: 2 }}>
                  {g}
                </AppText>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Button
              title="Copy"
              icon="content-copy"
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              onPress={async () => {
                await copySecret(recoveryKey, 60);
                toast.show('Recovery key copied — clipboard clears in 60 s');
              }}
            />
            <Button
              title="Save / share"
              icon="export-variant"
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => Share.share({ message: `UPIC recovery key: ${recoveryKey}` }).catch(() => undefined)}
            />
          </View>
        </GlassCard>
      </FadeIn>

      <FadeIn delay={180} style={{ gap: 12, marginTop: 18 }}>
        <InfoCallout
          icon="file-lock-outline"
          title="Where to keep it"
          body="Write it down or store it in a safe place offline. Don't keep it only on this phone — if you lose the phone, you'd lose the key too."
        />
        <View style={styles.row}>
          <MaterialCommunityIcons name="shield-alert-outline" size={18} color={theme.warning} />
          <AppText variant="caption" secondary style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            Anyone with this key and your username can reset your master password. Treat it like a password.
          </AppText>
        </View>
        <Checkbox checked={saved} onChange={setSaved} label="I've saved my recovery key somewhere safe." />
      </FadeIn>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyCard: { gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  group: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, minWidth: 86, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
