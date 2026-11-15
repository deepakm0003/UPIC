import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  FadeIn,
  GlassCard,
  Header,
  IconTile,
  InfoCallout,
  ListGroup,
  ListRow,
  Pill,
  Screen,
  ScoreRing,
  SectionHeader,
  StatTile,
} from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAliases, useMfa, useSecurityReport } from '../../hooks/useVault';
import { getSecurityEvents } from '../../services/analyticsService';
import { timeAgo } from '../../utils/siteIcon';
import type { SecurityEvent } from '../../types';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

const EVENT_ICON: Record<SecurityEvent['type'], Glyph> = {
  login: 'login',
  mfa_approval: 'check-decagram-outline',
  mfa_denial: 'shield-off-outline',
  password_shared: 'share-variant-outline',
  alias_created: 'email-plus-outline',
  alias_expired: 'email-off-outline',
  tracker_blocked: 'eye-off-outline',
};

/** Transparency: what UPIC stores, why, and the current status — 81.6% of survey respondents asked for this. */
export const PrivacyDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { report, passwords } = useSecurityReport();
  const { aliases } = useAliases();
  const { all } = useMfa();
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    getSecurityEvents().then((e) => setEvents(e.slice(0, 5)));
  }, [aliases.length, all.length]);

  const activeAliases = aliases.filter((a) => a.status === 'active').length;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const mfaThisWeek = all.filter((a) => new Date(a.timestamp).getTime() > weekAgo).length;
  const trackers = aliases.reduce((s, a) => s + (a.trackersBlocked ?? 0), 0);
  const exposedEmail = user ? passwords.filter((p) => p.username.toLowerCase() === user.email.toLowerCase()).length : 0;

  const stored: { icon: Glyph; title: string; detail: string; tag: string; tone: 'success' | 'info' | 'neutral' }[] = [
    { icon: 'key-chain-variant', title: 'Saved passwords', detail: `${passwords.length} logins`, tag: 'Encrypted', tone: 'success' },
    { icon: 'shield-check-outline', title: 'MFA history', detail: `${all.length} requests`, tag: 'Encrypted', tone: 'success' },
    { icon: 'email-fast-outline', title: 'Temporary emails', detail: `${aliases.length} addresses`, tag: 'Encrypted', tone: 'success' },
    { icon: 'account-outline', title: 'Account details', detail: 'Username, email, recovery contacts — to identify and recover your account', tag: 'This device', tone: 'info' },
    { icon: 'fingerprint', title: 'Biometric data', detail: 'Stays in your phone’s secure hardware', tag: 'Never stored', tone: 'neutral' },
    { icon: 'chart-line', title: 'Analytics & tracking', detail: 'UPIC collects no usage data', tag: 'None', tone: 'neutral' },
  ];

  const recs: { title: string; body: string; onPress: () => void }[] = [];
  if (report.counts.breached + report.counts.reused > 0)
    recs.push({ title: 'Replace breached and reused passwords', body: `${report.counts.breached + report.counts.reused} logins are at risk if one site leaks.`, onPress: () => navigation.navigate('PasswordHealth') });
  if (exposedEmail > 0)
    recs.push({ title: 'Use temporary emails for low-trust sites', body: `${exposedEmail} logins use your real email address.`, onPress: () => navigation.navigate('CreateAlias') });
  if (!user?.recoveryPhone)
    recs.push({ title: 'Add a recovery phone', body: 'Another way back in if you forget your master password.', onPress: () => navigation.navigate('RecoverySettings') });

  return (
    <Screen header={<Header title="Privacy dashboard" />}>
      <FadeIn>
        <GlassCard>
          <View style={styles.scoreRow}>
            <ScoreRing score={report.score} size={100} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="overline" muted>
                Overall security
              </AppText>
              <AppText variant="h2">{report.label}</AppText>
              <AppText variant="caption" secondary style={{ fontSize: 14, lineHeight: 20 }}>
                The same score as your Home screen, calculated on this device.
              </AppText>
            </View>
          </View>
        </GlassCard>
      </FadeIn>

      <FadeIn delay={60} style={styles.stats}>
        <StatTile value={activeAliases} label="Temp. emails" hint="active" onPress={() => navigation.navigate('Tabs', { screen: 'Relay' })} />
        <StatTile value={mfaThisWeek} label="MFA requests" hint="this week" onPress={() => navigation.navigate('MFAHistory')} />
        <StatTile value={trackers} label="Trackers" hint="blocked" />
      </FadeIn>

      <SectionHeader title="What UPIC stores" action="How it works" onAction={() => navigation.navigate('HowUPICProtects')} />
      <FadeIn delay={100}>
        <ListGroup>
          {stored.map((s) => (
            <ListRow key={s.title} left={<IconTile icon={s.icon} size={40} />} title={s.title} subtitle={s.detail} right={<Pill label={s.tag} tone={s.tone} />} />
          ))}
        </ListGroup>
      </FadeIn>

      <SectionHeader title="Privacy status" />
      <FadeIn delay={140}>
        <ListGroup>
          <ListRow
            left={<IconTile icon="lock-check-outline" tone={report.issues.length ? 'warning' : 'success'} size={40} />}
            title="Password privacy"
            subtitle={report.issues.length ? `${report.issues.length} items to review` : 'No issues found'}
            right={<Pill label={report.issues.length ? 'Review' : 'Good'} tone={report.issues.length ? 'warning' : 'success'} />}
            onPress={() => navigation.navigate('PasswordHealth')}
          />
          <ListRow
            left={<IconTile icon="email-alert-outline" tone={exposedEmail ? 'warning' : 'success'} size={40} />}
            title="Real email exposure"
            subtitle={exposedEmail ? `${exposedEmail} logins use your real email` : 'Your real email is well protected'}
            right={<Pill label={exposedEmail ? 'Review' : 'Good'} tone={exposedEmail ? 'warning' : 'success'} />}
            onPress={() => navigation.navigate('Tabs', { screen: 'Relay' })}
          />
          <ListRow
            left={<IconTile icon="lifebuoy" tone={user?.hasRecoveryKey ? 'success' : 'warning'} size={40} />}
            title="Account recovery"
            subtitle={user?.hasRecoveryKey ? 'Recovery key set up' : 'No recovery key yet'}
            right={<Pill label={user?.hasRecoveryKey ? 'Good' : 'Set up'} tone={user?.hasRecoveryKey ? 'success' : 'warning'} />}
            onPress={() => navigation.navigate('RecoverySettings')}
          />
        </ListGroup>
      </FadeIn>

      {recs.length ? (
        <>
          <SectionHeader title="Recommendations" />
          <View style={{ gap: 10 }}>
            {recs.map((r, i) => (
              <GlassCard key={r.title} onPress={r.onPress} accessibilityLabel={`${r.title}. ${r.body}`}>
                <View style={styles.rec}>
                  <View style={[styles.num, { backgroundColor: theme.primarySoft }]}>
                    <AppText variant="label" weight="bold" color={theme.primary}>
                      {i + 1}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" weight="semibold">
                      {r.title}
                    </AppText>
                    <AppText variant="caption" secondary>
                      {r.body}
                    </AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
                </View>
              </GlassCard>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Recent activity" />
      {events.length === 0 ? (
        <AppText variant="body" muted>
          No activity yet.
        </AppText>
      ) : (
        <ListGroup>
          {events.map((e) => (
            <ListRow key={e.id} left={<IconTile icon={EVENT_ICON[e.type]} size={40} />} title={e.title} subtitle={e.description} meta={timeAgo(e.timestamp)} />
          ))}
        </ListGroup>
      )}

      <InfoCallout
        style={{ marginTop: 22 }}
        icon="shield-lock-outline"
        title="How UPIC protects you"
        body="Zero-knowledge encryption, who can see what, and where your data lives."
        action="Read the overview"
        onAction={() => navigation.navigate('HowUPICProtects')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
