import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Button,
  Chips,
  FadeIn,
  Header,
  InfoCallout,
  PressableScale,
  Screen,
  StrengthMeter,
  TextField,
  TitleBlock,
  useToast,
  AppText,
} from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { usePasswords } from '../../hooks/useVault';
import { savePassword } from '../../services/fileStorage';
import { defaultPasswordOptions, generatePassword } from '../../utils/passwordGenerator';
import { displaySiteName } from '../../utils/siteIcon';
import { brandColor, entryColor, knownBrandColor } from '../../utils/brandColor';

const CATEGORIES = ['Social', 'Work', 'Shopping', 'Finance', 'Entertainment', 'Other'];

export const PasswordEditScreen: React.FC<{
  navigation: any;
  route: { params?: { passwordId?: string; generated?: string; focusFix?: boolean } };
}> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { passwords } = usePasswords();
  const existing = route.params?.passwordId ? passwords.find((p) => p.id === route.params?.passwordId) : undefined;
  const isEdit = !!route.params?.passwordId;

  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || (isEdit && !existing)) return;
    if (existing) {
      setWebsite(existing.website);
      setUsername(existing.username);
      setPassword(route.params?.focusFix ? generatePassword(defaultPasswordOptions) : existing.password);
      setCategory(existing.category ?? '');
      setNotes(existing.notes ?? '');
    }
    setLoaded(true);
  }, [existing, isEdit, loaded, route.params?.focusFix]);

  // A password chosen on the generator screen fills the field automatically.
  useEffect(() => {
    if (route.params?.generated) setPassword(route.params.generated);
  }, [route.params?.generated]);

  const reusedWith = useMemo(
    () => (password ? passwords.filter((p) => p.password === password && p.id !== existing?.id).map((p) => displaySiteName(p.website)) : []),
    [password, passwords, existing?.id]
  );

  const save = async () => {
    const next: Record<string, string> = {};
    if (!website.trim()) next.website = 'Enter the website or app name.';
    if (!username.trim()) next.username = 'Enter the username or email you sign in with.';
    if (!password) next.password = 'Enter a password or generate one.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const saved = await savePassword({
        id: existing?.id,
        website: website.trim(),
        username: username.trim(),
        password,
        category: category || undefined,
        notes: notes.trim() || undefined,
      });
      toast.show(isEdit ? 'Changes saved' : `${displaySiteName(saved.website)} saved to your vault`);
      navigation.goBack();
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Could not save.', tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<Header title={isEdit ? 'Edit password' : 'Add password'} />}
      footer={
        <>
          <Button
            title={isEdit ? 'Save changes' : 'Save password'}
            icon="content-save-outline"
            onPress={save}
            loading={saving}
            size="lg"
            color={
              !website.trim()
                ? undefined
                : existing && existing.website === website
                  ? entryColor(existing)
                  : knownBrandColor(website) ?? brandColor(website)
            }
          />
          <Button
            title="More generator options"
            variant="secondary"
            icon="tune-variant"
            onPress={() => navigation.navigate('PasswordGenerator', { returnTo: 'PasswordEdit', passwordId: existing?.id })}
          />
        </>
      }
    >
      <FadeIn>
        <TitleBlock title={isEdit ? 'Update this login' : 'Save a new login'} subtitle="It's encrypted on this device before it's stored." />
      </FadeIn>
      {route.params?.focusFix ? (
        <FadeIn style={{ marginBottom: 16 }}>
          <InfoCallout
            icon="auto-fix"
            title="We generated a new password for you"
            body="1. Change the password on the website to this one.  2. Tap Save here. UPIC keeps the old password until you save."
          />
        </FadeIn>
      ) : null}
      <FadeIn delay={80}>
        <TextField label="Website or app" icon="web" placeholder="e.g. netflix.com" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" error={errors.website} />
        <TextField label="Username or email" icon="account-outline" placeholder="name@example.com" value={username} onChangeText={setUsername} autoCapitalize="none" error={errors.username} />
        <TextField
          label="Password"
          icon="lock-outline"
          placeholder="Enter or generate"
          value={password}
          onChangeText={setPassword}
          secret
          mono
          error={errors.password}
          right={
            <PressableScale
              onPress={() => setPassword(generatePassword(defaultPasswordOptions))}
              accessibilityRole="button"
              accessibilityLabel="Generate a strong password"
              hitSlop={8}
              style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}
            >
              <MaterialCommunityIcons name="dice-multiple-outline" size={20} color={theme.primary} />
            </PressableScale>
          }
        />
        <StrengthMeter password={password} context={{ username, site: website }} />
        {reusedWith.length > 0 ? (
          <InfoCallout
            icon="content-duplicate"
            tone="warning"
            title="You already use this password"
            body={`Also used for ${reusedWith.slice(0, 3).join(', ')}. A unique password keeps the others safe if one site leaks.`}
            action="Generate a unique one"
            onAction={() => setPassword(generatePassword(defaultPasswordOptions))}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <AppText variant="label" weight="medium" secondary style={{ marginBottom: 8 }}>
          Category
        </AppText>
        <View style={{ marginBottom: 16 }}>
          <Chips value={category} onChange={(c) => setCategory(c === category ? '' : c)} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </View>
        <TextField label="Notes (optional)" icon="note-text-outline" placeholder="Security questions, recovery codes…" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
      </FadeIn>
    </Screen>
  );
};
