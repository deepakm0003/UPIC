import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, Button, FadeIn, GlassCard, Header, Screen, SectionHeader, TitleBlock } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { KDF_ITERATIONS } from '../../services/crypto';
import { Illustration } from '../../components/brand/Illustration';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

/** Animated "data → lock → vault" diagram. */
const FlowDiagram: React.FC = () => {
  const { theme } = useTheme();

  const node = (icon: Glyph, label: string, highlight?: boolean) => (
    <View style={styles.node}>
      <View
        style={[
          styles.nodeIcon,
          { backgroundColor: highlight ? theme.primarySoft : theme.surfaceStrong, borderColor: highlight ? theme.primary + '77' : theme.border },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color={highlight ? theme.primary : theme.text} />
      </View>
      <AppText variant="caption" secondary align="center">
        {label}
      </AppText>
    </View>
  );

  const dot = (_offset: number) => <MaterialCommunityIcons name="arrow-right" size={18} color={theme.textMuted} style={{ alignSelf: 'center' }} />;

  return (
    <GlassCard style={styles.diagram} accessibilityLabel="Your data is encrypted on your phone before it is stored in the vault">
      {node('cellphone', 'Your data')}
      <View style={styles.track}>{dot(-4)}</View>
      {node('lock', 'AES-256\nencryption', true)}
      <View style={styles.track}>{dot(-4)}</View>
      {node('safe-square-outline', 'Encrypted\nvault')}
    </GlassCard>
  );
};

const WHO: { who: string; sees: string; icon: Glyph; ok: boolean }[] = [
  { who: 'You', sees: 'Everything, after unlocking with your master password or biometrics.', icon: 'account-check-outline', ok: true },
  { who: 'UPIC developers', sees: 'Nothing. The vault is encrypted before it is stored and we never have your key.', icon: 'account-cancel-outline', ok: false },
  { who: 'Websites you sign up to', sees: 'Only the temporary email you give them — never your real address.', icon: 'web', ok: false },
  { who: 'Someone holding your phone', sees: 'Nothing while UPIC is locked. It locks itself when you are away.', icon: 'cellphone-lock', ok: false },
];

const FACTS: { icon: Glyph; title: string; body: string }[] = [
  {
    icon: 'shield-lock-outline',
    title: 'Encrypted on your device',
    body: `Passwords, MFA history and temporary emails are encrypted with AES-256-GCM. The key comes from your master password via PBKDF2 (${KDF_ITERATIONS.toLocaleString()} rounds), which makes guessing very slow.`,
  },
  {
    icon: 'server-off',
    title: 'Where your data is stored',
    body: 'In an encrypted file inside this app on this phone. In this version nothing is uploaded to a server.',
  },
  {
    icon: 'fingerprint',
    title: 'Your biometrics never leave your phone',
    body: 'Face or fingerprint checks happen in your phone’s secure hardware. UPIC only receives “yes, it’s you”.',
  },
  {
    icon: 'timer-lock-outline',
    title: 'Locks automatically',
    body: 'UPIC locks after a period of inactivity that you choose, and copied passwords are cleared from the clipboard after 30 seconds.',
  },
  {
    icon: 'lifebuoy',
    title: 'If you forget your master password',
    body: 'Use your recovery key on any device, or a code to your recovery email/phone on this device. We still never see your vault.',
  },
  {
    icon: 'eye-off-outline',
    title: 'No tracking',
    body: 'No analytics and no third-party logo services. Website colours and logos are requested only from the website you saved (you can switch this off in Settings), so no outside company learns which accounts you have.',
  },
];

export const HowUPICProtectsScreen: React.FC<{ navigation: any; route: { params?: { onboarding?: boolean } } }> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { finishSetup } = useAuth();
  const onboarding = !!route.params?.onboarding;

  return (
    <Screen
      header={<Header title="Your privacy" noBack={onboarding} />}
      footer={onboarding ? <Button title="Start using UPIC" iconRight="arrow-right" onPress={() => finishSetup()} size="lg" /> : undefined}
    >
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Illustration kind="encrypt" size={190} />
      </View>
      <FadeIn>
        <TitleBlock eyebrow="Zero-knowledge by design" title="Only you can open your vault" subtitle="Here is exactly what happens to your data, in plain language." />
      </FadeIn>
      <FadeIn delay={80}>
        <FlowDiagram />
      </FadeIn>

      <SectionHeader title="Who can see what" />
      <View style={{ gap: 10 }}>
        {WHO.map((w, i) => (
          <FadeIn key={w.who} delay={120 + i * 60}>
            <GlassCard padding={14}>
              <View style={styles.whoRow}>
                <MaterialCommunityIcons name={w.icon} size={24} color={w.ok ? theme.success : theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label" weight="semibold">
                    {w.who}
                  </AppText>
                  <AppText variant="caption" secondary style={{ fontSize: 14, lineHeight: 20 }}>
                    {w.sees}
                  </AppText>
                </View>
                <MaterialCommunityIcons
                  name={w.ok ? 'check-circle' : 'close-circle-outline'}
                  size={22}
                  color={w.ok ? theme.success : theme.textMuted}
                  accessibilityLabel={w.ok ? 'Can see' : 'Cannot see your vault'}
                />
              </View>
            </GlassCard>
          </FadeIn>
        ))}
      </View>

      <SectionHeader title="The details" />
      <View style={{ gap: 18 }}>
        {FACTS.map((f) => (
          <View key={f.title} style={styles.fact}>
            <View style={[styles.factIcon, { backgroundColor: theme.primarySoft }]}>
              <MaterialCommunityIcons name={f.icon} size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label" weight="semibold">
                {f.title}
              </AppText>
              <AppText variant="body" secondary>
                {f.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  diagram: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 22 },
  node: { alignItems: 'center', gap: 8, width: 84 },
  nodeIcon: { width: 58, height: 58, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 58, justifyContent: 'center', overflow: 'hidden' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fact: { flexDirection: 'row', gap: 14 },
  factIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
