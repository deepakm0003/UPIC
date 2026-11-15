import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  FadeIn,
  GlassCard,
  IconButton,
  IconTile,
  ListGroup,
  ListRow,
  Pill,
  PressableScale,
  Screen,
  ScoreRing,
  SectionHeader,
  StatTile,
} from '../../components/ui';
import { ScoreExplainer } from '../../components/ScoreExplainer';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMfa, useSecurityReport } from '../../hooks/useVault';
import { timeAgo } from '../../utils/siteIcon';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export const SecurityOverviewScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, lock } = useAuth();
  const { report } = useSecurityReport();
  const { pending, all } = useMfa();
  const [explain, setExplain] = useState(false);

  const stack = (screen: string, params?: object) => navigation.navigate(screen, params);
  const tab = (name: string) => navigation.navigate('Tabs', { screen: name });

  const quick: { icon: Glyph; label: string; bg: string; fg: string; onPress: () => void }[] = [
    { icon: 'plus', label: 'Add password', bg: theme.primary, fg: '#FFFFFF', onPress: () => stack('PasswordEdit') },
    { icon: 'dice-multiple-outline', label: 'Generate', bg: theme.secondary, fg: '#FFFFFF', onPress: () => stack('PasswordGenerator') },
    { icon: 'email-plus-outline', label: 'Temp email', bg: theme.accent, fg: '#111111', onPress: () => stack('CreateAlias') },
    { icon: 'shield-account-outline', label: 'Privacy', bg: theme.isDark ? '#FFFFFF' : '#111111', fg: theme.isDark ? '#111111' : '#FFFFFF', onPress: () => stack('PrivacyDashboard') },
  ];

  return (
    <Screen tabBarSpace>
      <FadeIn style={styles.top}>
        <View style={{ flex: 1 }}>
          <AppText variant="h1" accessibilityRole="header" numberOfLines={2}>
            {greeting()}, {user?.username}
          </AppText>
        </View>
        <IconButton icon="lock-outline" label="Lock UPIC now" onPress={lock} />
        <PressableScale onPress={() => tab('Settings')} accessibilityRole="button" accessibilityLabel="Open settings">
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <AppText variant="title" color={theme.onPrimary}>
              {(user?.username ?? '?').charAt(0).toUpperCase()}
            </AppText>
          </View>
        </PressableScale>
      </FadeIn>

      {pending.length > 0 ? (
        <FadeIn delay={40}>
          <GlassCard tone="warning" onPress={() => tab('MFA')} accessibilityLabel={`${pending.length} login request waiting. Review now.`} style={{ marginBottom: 14 }}>
            <View style={styles.row}>
              <View style={[styles.pulse, { backgroundColor: theme.warning }]} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" weight="semibold">
                  {pending.length === 1 ? 'A login request is waiting' : `${pending.length} login requests are waiting`}
                </AppText>
                <AppText variant="caption" secondary>
                  {pending[0].service} · {pending[0].location} · {timeAgo(pending[0].timestamp)}
                </AppText>
              </View>
              <AppText variant="label" weight="semibold" color={theme.warning}>
                Review
              </AppText>
            </View>
          </GlassCard>
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <GlassCard onPress={() => stack('PasswordHealth')} accessibilityLabel={`Overall security ${report.score ?? 'not available'}. ${report.label}. ${report.summary}. Open password health.`}>
          <View style={styles.scoreRow}>
            <ScoreRing score={report.score} size={108} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="overline" muted>
                Overall security
              </AppText>
              <AppText variant="h2">{report.label}</AppText>
              <AppText variant="body" secondary>
                {report.summary}
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textMuted} />
          </View>
          <PressableScale onPress={() => setExplain(true)} accessibilityRole="button" accessibilityLabel="What is this score based on?" style={styles.explain}>
            <MaterialCommunityIcons name="help-circle-outline" size={16} color={theme.primary} />
            <AppText variant="label" weight="semibold" color={theme.primary}>
              What is this score based on?
            </AppText>
          </PressableScale>
        </GlassCard>
      </FadeIn>

      <SectionHeader title="Password summary" action="View health" onAction={() => stack('PasswordHealth')} />
      <FadeIn delay={140} style={styles.stats}>
        <StatTile value={report.counts.total} label="Total" hint="saved" onPress={() => tab('Passwords')} />
        <StatTile value={report.counts.weak} label="Weak" hint="to improve" tone={report.counts.weak ? 'warning' : 'neutral'} onPress={() => stack('PasswordHealth')} />
        <StatTile value={report.counts.reused} label="Reused" hint="to change" tone={report.counts.reused ? 'danger' : 'neutral'} onPress={() => stack('PasswordHealth')} />
      </FadeIn>

      <SectionHeader title="Quick actions" />
      <FadeIn delay={200} style={styles.quick}>
        {quick.map((q) => (
          <PressableScale
            key={q.label}
            onPress={q.onPress}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            style={[styles.quickItem, { backgroundColor: q.bg, borderColor: theme.isDark ? q.bg : theme.ink, borderWidth: theme.outline }]}
          >
            <MaterialCommunityIcons name={q.icon} size={28} color={q.fg} />
            <AppText variant="caption" weight="bold" align="center" numberOfLines={2} color={q.fg}>
              {q.label}
            </AppText>
          </PressableScale>
        ))}
      </FadeIn>

      <SectionHeader title="Recent MFA activity" action={all.length ? 'See all' : undefined} onAction={() => stack('MFAHistory')} />
      <FadeIn delay={260}>
        {all.filter((a) => a.status !== 'pending').length === 0 ? (
          <GlassCard>
            <AppText variant="body" secondary>
              No login approvals yet. When a website asks UPIC to confirm a login, it will show up here.
            </AppText>
          </GlassCard>
        ) : (
          <ListGroup>
            {all
              .filter((a) => a.status !== 'pending')
              .slice(0, 3)
              .map((a) => (
                <ListRow
                  key={a.id}
                  left={<IconTile site={a.service} size={40} />}
                  title={`${a.service} login ${a.status}`}
                  subtitle={`${a.deviceInfo ?? 'Unknown device'} · ${timeAgo(a.timestamp)}`}
                  right={<Pill label={a.status} tone={a.status === 'approved' ? 'success' : a.status === 'denied' ? 'danger' : 'neutral'} />}
                  onPress={() => stack('MFAHistory')}
                />
              ))}
          </ListGroup>
        )}
      </FadeIn>

      <ScoreExplainer visible={explain} onClose={() => setExplain(false)} report={report} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 22 },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulse: { width: 10, height: 10, borderRadius: 5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  explain: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', gap: 10 },
  quick: { flexDirection: 'row', gap: 10 },
  quickItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 4, borderRadius: 22, minHeight: 96 },
});
