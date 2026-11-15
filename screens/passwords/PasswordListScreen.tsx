import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  Chips,
  EmptyState,
  IconButton,
  IconTile,
  PressableScale,
  Screen,
  TextField,
  useToast,
} from '../../components/ui';
import { haptic } from '../../components/ui/motion';
import { useTheme } from '../../contexts/ThemeContext';
import { usePasswords } from '../../hooks/useVault';
import { computeSecurityReport } from '../../services/securityScore';
import { setPasswordFavorite, updatePasswordLastUsed } from '../../services/fileStorage';
import { copySecret } from '../../utils/clipboard';
import { displaySiteName } from '../../utils/siteIcon';
import { brandColor, readableOn, withAlpha } from '../../utils/brandColor';
import type { Tone } from '../../theme/tokens';

type Filter = 'all' | 'recent' | 'favourites' | 'weak' | 'reused';

export const PasswordListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { passwords, loading } = usePasswords();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const report = useMemo(() => computeSecurityReport(passwords), [passwords]);
  const issueByEntry = useMemo(() => {
    const m = new Map<string, { label: string; tone: Tone }>();
    for (const i of report.issues) {
      if (m.has(i.entryId) || i.type === 'old') continue;
      m.set(i.entryId, i.type === 'weak' ? { label: 'Weak', tone: 'warning' } : { label: i.type === 'reused' ? 'Reused' : 'Breached', tone: 'danger' });
    }
    return m;
  }, [report]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const has = (id: string, ...types: string[]) => report.issues.some((i) => i.entryId === id && types.includes(i.type));
    const list = passwords
      .filter((p) => !q || p.website.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
      .filter((p) =>
        filter === 'favourites' ? p.favorite : filter === 'weak' ? has(p.id, 'weak', 'breached') : filter === 'reused' ? has(p.id, 'reused') : true
      );
    if (filter === 'recent') return [...list].sort((a, b) => (b.lastUsed ?? b.updatedAt).localeCompare(a.lastUsed ?? a.updatedAt));
    return [...list].sort(
      (a, b) => Number(!!b.favorite) - Number(!!a.favorite) || displaySiteName(a.website).localeCompare(displaySiteName(b.website))
    );
  }, [passwords, query, filter, report]);

  const copy = async (id: string, password: string, site: string) => {
    await copySecret(password);
    await updatePasswordLastUsed(id);
    toast.show({ message: `${site} password copied · clears in 30 s`, icon: 'content-copy' });
  };

  return (
    <Screen tabBarSpace>
      <View style={styles.top}>
        <AppText variant="h1" accessibilityRole="header" style={{ flex: 1 }}>
          My vault
        </AppText>
        <IconButton icon="swap-vertical" label="Import or export passwords" onPress={() => navigation.navigate('ImportExport')} />
        <IconButton icon="plus" label="Add password" tone="primary" onPress={() => navigation.navigate('PasswordEdit')} />
      </View>

      {passwords.length === 0 && !loading ? (
        <EmptyState icon="key-plus" title="Your vault is empty" body="Add a login, or import a few from your browser.">
          <Button title="Add password" onPress={() => navigation.navigate('PasswordEdit')} />
          <Button title="Import passwords" variant="secondary" onPress={() => navigation.navigate('ImportExport')} />
        </EmptyState>
      ) : (
        <>
          <TextField label="Search your vault" labelHidden icon="magnify" placeholder="Search your vault" value={query} onChangeText={setQuery} autoCapitalize="none" returnKeyType="search" />
          <View style={{ marginTop: -4, marginBottom: 16 }}>
            <Chips
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'recent', label: 'Recent' },
                { value: 'favourites', label: 'Favourites' },
                { value: 'weak', label: 'Weak', count: report.counts.weak + report.counts.breached },
                { value: 'reused', label: 'Reused', count: report.counts.reused },
              ]}
            />
          </View>

          {visible.length === 0 ? (
            <EmptyState
              icon={filter === 'favourites' ? 'heart-outline' : 'text-search'}
              title={filter === 'favourites' ? 'No favourites yet' : 'Nothing here'}
              body={filter === 'favourites' ? 'Tap the heart on a login to keep it at the top.' : 'Try another search or filter.'}
            />
          ) : (
            <View style={styles.grid}>
              {visible.map((p) => {
                const site = displaySiteName(p.website);
                const issue = issueByEntry.get(p.id);
                const color = brandColor(p.website);
                const fg = readableOn(color);
                return (
                  <PressableScale
                    key={p.id}
                    scaleTo={0.97}
                    onPress={() => navigation.navigate('PasswordDetails', { passwordId: p.id })}
                    onLongPress={() => copy(p.id, p.password, site)}
                    accessibilityRole="button"
                    accessibilityLabel={`${site}, ${p.username}${issue ? `, ${issue.label}` : ''}`}
                    accessibilityHint="Opens details. Long-press to copy the password."
                    style={[styles.card, { backgroundColor: color, borderColor: theme.isDark ? 'transparent' : theme.ink }]}
                  >
                    <View style={styles.cardTop}>
                      <IconTile site={p.website} size={42} inverse />
                      <Pressable
                        hitSlop={12}
                        onPress={() => {
                          haptic.select();
                          setPasswordFavorite(p.id, !p.favorite);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={p.favorite ? `Remove ${site} from favourites` : `Add ${site} to favourites`}
                      >
                        <MaterialCommunityIcons name={p.favorite ? 'heart' : 'heart-outline'} size={22} color={fg} />
                      </Pressable>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
                      <AppText variant="title" weight="bold" color={fg} numberOfLines={1}>
                        {site}
                      </AppText>
                      <AppText variant="caption" color={withAlpha(fg, 0.8)} numberOfLines={1}>
                        {p.username}
                      </AppText>
                    </View>
                    <View style={styles.panel}>
                      {issue ? (
                        <>
                          <MaterialCommunityIcons name="alert" size={14} color={issue.tone === 'danger' ? '#D6264A' : '#9A6400'} />
                          <AppText variant="caption" weight="bold" color={issue.tone === 'danger' ? '#D6264A' : '#9A6400'}>
                            {issue.label}
                          </AppText>
                        </>
                      ) : (
                        <AppText variant="caption" weight="bold" color="#111111" style={{ letterSpacing: 2 }}>
                          ••••••••
                        </AppText>
                      )}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}
          <AppText variant="caption" muted align="center" style={{ marginTop: 16 }}>
            Long-press a login to copy its password.
          </AppText>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.4%', minHeight: 176, borderRadius: 24, borderWidth: 2, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
  },
});
