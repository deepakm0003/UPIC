import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { AppText, Chips, EmptyState, FadeIn, Header, IconTile, InfoCallout, ListGroup, ListRow, Pill, Screen, SectionHeader } from '../../components/ui';
import { useMfa } from '../../hooks/useVault';
import { timeAgo } from '../../utils/siteIcon';
import type { MFAStatus } from '../../types';

type Filter = 'all' | Exclude<MFAStatus, 'pending'>;

export const MFAHistoryScreen: React.FC<{ navigation: any }> = () => {
  const { all } = useMfa();
  const [filter, setFilter] = useState<Filter>('all');
  const decided = all.filter((a) => a.status !== 'pending');
  const list = decided.filter((a) => filter === 'all' || a.status === filter);

  const groups = useMemo(() => {
    const today = new Date().toDateString();
    const out: { title: string; items: typeof list }[] = [
      { title: 'Today', items: [] },
      { title: 'Earlier', items: [] },
    ];
    list.forEach((a) => (new Date(a.timestamp).toDateString() === today ? out[0] : out[1]).items.push(a));
    return out.filter((g) => g.items.length);
  }, [list]);

  const count = (s: Filter) => (s === 'all' ? decided.length : decided.filter((a) => a.status === s).length);

  return (
    <Screen header={<Header title="MFA history" />}>
      <FadeIn>
        <AppText variant="body" secondary style={{ marginBottom: 14 }}>
          Every login request you approved, denied or let expire — newest first.
        </AppText>
        <Chips
          value={filter}
          onChange={setFilter}
          options={(['all', 'approved', 'denied', 'expired'] as Filter[]).map((s) => ({
            value: s,
            label: s.charAt(0).toUpperCase() + s.slice(1),
            count: count(s),
          }))}
        />
      </FadeIn>

      {groups.length === 0 ? (
        <EmptyState icon="history" title="No history yet" body="Your login approvals will be listed here." />
      ) : (
        groups.map((g) => (
          <View key={g.title}>
            <SectionHeader title={g.title} />
            <ListGroup>
              {g.items.map((a) => (
                <ListRow
                  key={a.id}
                  left={<IconTile site={a.service} size={40} />}
                  title={a.service}
                  subtitle={`${a.deviceInfo ?? 'Unknown device'} · ${a.location}`}
                  meta={`${new Date(a.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}${a.recognizedDevice === false ? ' · new device' : ''}`}
                  right={<Pill label={a.status} tone={a.status === 'approved' ? 'success' : a.status === 'denied' ? 'danger' : 'neutral'} />}
                />
              ))}
            </ListGroup>
          </View>
        ))
      )}

      <InfoCallout
        style={{ marginTop: 24 }}
        icon="account-question-outline"
        tone="warning"
        title="See something unfamiliar?"
        body="If you approved a request you don't recognise, change that account's password right away and deny future requests you didn't start."
      />
      <AppText variant="caption" muted align="center" style={{ marginTop: 12 }}>
        Showing the last {Math.min(decided.length, 100)} requests · {decided[0] ? `latest ${timeAgo(decided[0].timestamp)}` : ''}
      </AppText>
    </Screen>
  );
};
