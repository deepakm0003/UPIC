import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  Chips,
  EmptyState,
  FadeIn,
  GlassCard,
  Header,
  IconTile,
  ListGroup,
  ListRow,
  Pill,
  PressableScale,
  Screen,
  ScoreRing,
  SectionHeader,
  ToggleRow,
  useToast,
} from '../../components/ui';
import { ScoreExplainer } from '../../components/ScoreExplainer';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurityReport } from '../../hooks/useVault';
import { IssueType, Severity } from '../../services/securityScore';
import { cancelHealthReminder, scheduleHealthReminder } from '../../services/reminders';
import type { Tone } from '../../theme/tokens';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

const TYPE_META: Record<IssueType, { label: string; hint: string; icon: Glyph; tone: Tone }> = {
  breached: { label: 'Breached passwords', hint: 'Found in data breaches', icon: 'alert-octagon-outline', tone: 'danger' },
  reused: { label: 'Reused passwords', hint: 'Used on more than one site', icon: 'content-duplicate', tone: 'danger' },
  weak: { label: 'Weak passwords', hint: 'Easy to guess', icon: 'lock-alert-outline', tone: 'warning' },
  old: { label: 'Old passwords', hint: 'Not changed in 6+ months', icon: 'clock-alert-outline', tone: 'info' },
};

const SEVERITY_TONE: Record<Severity, Tone> = { critical: 'danger', high: 'danger', medium: 'warning', low: 'info' };

export const PasswordHealthScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { prefs, updatePrefs } = useAuth();
  const { report } = useSecurityReport();
  const [filter, setFilter] = useState<'all' | IssueType>('all');
  const [explain, setExplain] = useState(false);

  const shown = useMemo(() => report.issues.filter((i) => filter === 'all' || i.type === filter), [report, filter]);
  const urgent = report.issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length;

  const toggleReminders = async (on: boolean) => {
    await updatePrefs({ passwordReminders: on });
    if (on) {
      const ok = await scheduleHealthReminder(report.issues.length);
      toast.show(ok ? 'Weekly check-up reminder is on' : 'Reminders saved — allow notifications to receive them');
    } else {
      await cancelHealthReminder();
      toast.show('Reminders turned off');
    }
  };

  return (
    <Screen header={<Header title="Password health" />}>
      <FadeIn>
        <GlassCard>
          <View style={styles.scoreRow}>
            <ScoreRing score={report.score} size={116} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="overline" muted>
                Overall security
              </AppText>
              <AppText variant="h2">{report.label}</AppText>
              <AppText variant="body" secondary>
                {report.summary}
              </AppText>
            </View>
          </View>
          <PressableScale onPress={() => setExplain(true)} accessibilityRole="button" accessibilityLabel="What this score measures" style={styles.explain}>
            <MaterialCommunityIcons name="help-circle-outline" size={16} color={theme.primary} />
            <AppText variant="label" weight="semibold" color={theme.primary}>
              What this score measures
            </AppText>
          </PressableScale>
        </GlassCard>
      </FadeIn>

      {report.counts.total === 0 ? (
        <EmptyState icon="shield-search" title="Nothing to check yet" body="Add a few passwords and UPIC will check them for weak, reused and breached passwords.">
          <Button title="Add password" icon="plus" onPress={() => navigation.navigate('PasswordEdit')} />
        </EmptyState>
      ) : (
        <>
          <SectionHeader title="Issues to review" />
          <FadeIn delay={80}>
            <ListGroup>
              {(Object.keys(TYPE_META) as IssueType[]).map((t) => {
                const count = report.counts[t];
                const m = TYPE_META[t];
                return (
                  <ListRow
                    key={t}
                    left={<IconTile icon={m.icon} tone={count ? m.tone : 'neutral'} size={40} />}
                    title={m.label}
                    subtitle={m.hint}
                    right={
                      <AppText variant="title" color={count ? undefined : theme.textMuted}>
                        {count}
                      </AppText>
                    }
                    chevron={count > 0}
                    onPress={count ? () => setFilter(t) : undefined}
                  />
                );
              })}
            </ListGroup>
          </FadeIn>

          <SectionHeader title={urgent ? 'Fix these first' : 'Recommendations'} />
          {report.issues.length === 0 ? (
            <EmptyState icon="party-popper" title="Everything looks healthy" body="No weak, reused, breached or old passwords. Nice work." />
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                <Chips
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'All', count: report.issues.length },
                    ...(Object.keys(TYPE_META) as IssueType[])
                      .filter((t) => report.counts[t] > 0)
                      .map((t) => ({ value: t, label: TYPE_META[t].label.split(' ')[0], count: report.issues.filter((i) => i.type === t).length })),
                  ]}
                />
              </View>
              <View style={{ gap: 10 }}>
                {shown.map((issue, idx) => (
                  <FadeIn key={issue.key} delay={Math.min(idx, 8) * 50}>
                    <GlassCard>
                      <View style={styles.issueTop}>
                        <IconTile site={issue.website} size={40} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="label" weight="semibold">
                            {issue.title}
                          </AppText>
                          <AppText variant="caption" muted numberOfLines={1}>
                            {issue.username}
                          </AppText>
                        </View>
                        <Pill label={issue.severity} tone={SEVERITY_TONE[issue.severity]} />
                      </View>
                      <AppText variant="body" secondary style={{ marginTop: 10 }}>
                        {issue.reason}
                      </AppText>
                      <View style={styles.issueActions}>
                        <Button
                          title="Fix"
                          icon="auto-fix"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => navigation.navigate('PasswordEdit', { passwordId: issue.entryId, focusFix: true })}
                          accessibilityHint={issue.fix}
                        />
                        <Button
                          title="Details"
                          variant="secondary"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => navigation.navigate('PasswordDetails', { passwordId: issue.entryId })}
                        />
                      </View>
                    </GlassCard>
                  </FadeIn>
                ))}
              </View>
            </>
          )}

          <SectionHeader title="Reminders" />
          <ListGroup>
            <ToggleRow
              title="Remind me to fix passwords"
              subtitle="A weekly nudge about old, weak or reused passwords. The notification never names a website."
              value={prefs.passwordReminders}
              onValueChange={toggleReminders}
            />
          </ListGroup>
        </>
      )}

      <ScoreExplainer visible={explain} onClose={() => setExplain(false)} report={report} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  explain: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' },
  issueTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  issueActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
