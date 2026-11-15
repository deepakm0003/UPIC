import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  ConfirmSheet,
  GlassCard,
  Header,
  IconButton,
  InfoCallout,
  ListGroup,
  PressableScale,
  Screen,
  ToggleRow,
  useToast,
} from '../../components/ui';
import { BrandHero } from '../../components/BrandHero';
import { useTheme } from '../../contexts/ThemeContext';
import { usePasswords } from '../../hooks/useVault';
import { computeSecurityReport } from '../../services/securityScore';
import { deletePassword, setPasswordFavorite, updatePasswordLastUsed } from '../../services/fileStorage';
import { copySecret, copyText } from '../../utils/clipboard';
import { brandColor } from '../../utils/brandColor';
import { assessPassword } from '../../utils/passwordStrength';
import { displaySiteName, timeAgo } from '../../utils/siteIcon';
import { toneColors } from '../../theme/tokens';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export const PasswordDetailsScreen: React.FC<{ navigation: any; route: { params: { passwordId: string } } }> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { passwords } = usePasswords();
  const entry = passwords.find((p) => p.id === route.params.passwordId);
  const [revealed, setRevealed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const issues = useMemo(
    () => computeSecurityReport(passwords).issues.filter((i) => i.entryId === route.params.passwordId),
    [passwords, route.params.passwordId]
  );

  // Hide the revealed password again after 20 seconds.
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), 20_000);
    return () => clearTimeout(t);
  }, [revealed]);

  if (!entry) {
    return (
      <Screen header={<Header title="Password" />}>
        <AppText variant="body" secondary>
          This login no longer exists.
        </AppText>
      </Screen>
    );
  }

  const site = displaySiteName(entry.website);
  const color = brandColor(entry.website);
  const url = /^https?:\/\//.test(entry.website) ? entry.website : entry.website.includes('.') ? `https://${entry.website}` : null;
  const strength = assessPassword(entry.password, { username: entry.username, site: entry.website });
  const strengthColor = toneColors(theme, strength.tone).fg;

  const copyPassword = async () => {
    await copySecret(entry.password);
    await updatePasswordLastUsed(entry.id);
    toast.show('Password copied · clears in 30 s');
  };

  const QuickAction: React.FC<{ icon: Glyph; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.quick, { backgroundColor: theme.surface, shadowColor: theme.shadow, borderColor: theme.ink, borderWidth: theme.outline }]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <AppText variant="label" weight="semibold">
        {label}
      </AppText>
    </PressableScale>
  );

  const Row: React.FC<{ icon: Glyph; label: string; children: React.ReactNode; right?: React.ReactNode }> = ({ icon, label, children, right }) => (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={22} color={theme.textMuted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {children}
        <AppText variant="caption" muted>
          {label}
        </AppText>
      </View>
      {right}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <BrandHero
          color={color}
          site={entry.website}
          title={site}
          subtitle={entry.website}
          onBack={() => navigation.goBack()}
          actions={[{ icon: 'pencil-outline', label: 'Edit password', onPress: () => navigation.navigate('PasswordEdit', { passwordId: entry.id }) }]}
        />

        <View style={styles.content}>
          <View style={styles.quickRow}>
            <QuickAction icon="content-copy" label="Copy password" onPress={copyPassword} />
            <QuickAction icon={url ? 'open-in-new' : 'account-arrow-right-outline'} label={url ? 'Open site' : 'Copy user'} onPress={() => (url ? Linking.openURL(url) : copyText(entry.username).then(() => toast.show('Username copied')))} />
          </View>

          <ListGroup style={{ marginTop: 16 }}>
            {url ? (
              <Row icon="web" label="Site URL">
                <AppText variant="label" weight="semibold" color={color} numberOfLines={1}>
                  {url}
                </AppText>
              </Row>
            ) : null}
            <Row
              icon="account-outline"
              label="User ID"
              right={<IconButton icon="content-copy" label="Copy username" onPress={() => copyText(entry.username).then(() => toast.show('Username copied'))} />}
            >
              <AppText variant="label" weight="semibold" numberOfLines={1} selectable>
                {entry.username}
              </AppText>
            </Row>
            <Row
              icon="lock-outline"
              label="Password"
              right={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <IconButton icon={revealed ? 'eye-off-outline' : 'eye-outline'} label={revealed ? 'Hide password' : 'Show password'} onPress={() => setRevealed((v) => !v)} />
                  <IconButton icon="content-copy" label="Copy password" onPress={copyPassword} />
                </View>
              }
            >
              <AppText variant="mono" style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={revealed ? 3 : 1} selectable={revealed}>
                {revealed ? entry.password : '••••••••••••'}
              </AppText>
            </Row>
            <Row icon="shield-half-full" label={`Password strength · cracked ${strength.crackTime === 'instantly' ? 'instantly' : `in ${strength.crackTime}`}`}>
              <AppText variant="label" weight="bold" color={strengthColor}>
                {strength.label}
              </AppText>
            </Row>
            <Row icon="clock-outline" label="Last changed">
              <AppText variant="label" weight="semibold">
                {timeAgo(entry.updatedAt)}
              </AppText>
            </Row>
          </ListGroup>

          <ListGroup style={{ marginTop: 12 }}>
            <ToggleRow title="Favourite" subtitle="Keep this login at the top of your vault" value={!!entry.favorite} onValueChange={(v) => setPasswordFavorite(entry.id, v)} />
          </ListGroup>

          {issues.length > 0 ? (
            <View style={{ gap: 10, marginTop: 16 }}>
              {issues.map((i) => (
                <InfoCallout
                  key={i.key}
                  icon={i.type === 'breached' ? 'alert-octagon-outline' : i.type === 'reused' ? 'content-duplicate' : i.type === 'weak' ? 'lock-alert-outline' : 'clock-alert-outline'}
                  tone={i.severity === 'critical' || i.severity === 'high' ? 'danger' : 'warning'}
                  title={i.title}
                  body={`${i.reason} ${i.fix}`}
                  action="Fix now"
                  onAction={() => navigation.navigate('PasswordEdit', { passwordId: entry.id, focusFix: true })}
                />
              ))}
            </View>
          ) : null}

          {entry.notes ? (
            <GlassCard style={{ marginTop: 12 }}>
              <AppText variant="caption" muted>
                Notes
              </AppText>
              <AppText variant="body" selectable>
                {entry.notes}
              </AppText>
            </GlassCard>
          ) : null}

          <View style={{ gap: 10, marginTop: 24 }}>
            <Button title="Edit password" color={color} onPress={() => navigation.navigate('PasswordEdit', { passwordId: entry.id })} size="lg" />
            <Button title="Delete" variant="danger" icon="trash-can-outline" onPress={() => setConfirmDelete(true)} />
          </View>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await deletePassword(entry.id);
          toast.show(`${site} login deleted`);
          navigation.goBack();
        }}
        icon="trash-can-outline"
        title={`Delete ${site}?`}
        message="This removes the login from your vault. Make sure you can still sign in to the website."
        confirmLabel="Delete"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, marginTop: -34 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 62 },
});
