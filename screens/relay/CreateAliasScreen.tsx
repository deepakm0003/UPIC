import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, FadeIn, GlassCard, Header, IconButton, Screen, Segmented, TextField, TitleBlock, useToast } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { createEmailAlias, makeAliasAddress } from '../../services/fileStorage';
import { copyText } from '../../utils/clipboard';
import { validateEmail } from '../../utils/validators';

type Expiry = 'never' | '30' | '7' | 'once';

export const CreateAliasScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [website, setWebsite] = useState('');
  const [label, setLabel] = useState('');
  const [forwardTo, setForwardTo] = useState(user?.email ?? '');
  const [expiry, setExpiry] = useState<Expiry>('never');
  const [address, setAddress] = useState(() => makeAliasAddress());
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAddress(makeAliasAddress(label, website)), 250);
    return () => clearTimeout(t);
  }, [label, website]);

  const create = async () => {
    if (!validateEmail(forwardTo.trim()).valid) {
      setError('Enter the real email address messages should go to.');
      return;
    }
    setSaving(true);
    try {
      const alias = await createEmailAlias({
        address,
        label: label.trim() || undefined,
        website: website.trim() || undefined,
        forwardTo: forwardTo.trim(),
        expiresInDays: expiry === 'never' || expiry === 'once' ? null : parseInt(expiry, 10),
        autoExpire: expiry === 'once',
      });
      await copyText(alias.alias);
      toast.show('Temporary email created and copied');
      navigation.replace('AliasDetails', { aliasId: alias.id });
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Could not create it.', tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<Header title="New temporary email" />} footer={<Button title="Create temporary email" icon="email-plus-outline" onPress={create} loading={saving} size="lg" />}>
      <FadeIn>
        <TitleBlock title="Create a private address" subtitle="Use it instead of your real email when you sign up." />
      </FadeIn>
      <FadeIn delay={60}>
        <TextField label="Website or service" icon="web" placeholder="e.g. myntra.com" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" helper="So you always know which site this address belongs to." />
        <TextField label="Label (optional)" icon="tag-outline" placeholder="e.g. Shopping" value={label} onChangeText={setLabel} />
        <TextField label="Forward messages to" icon="inbox-arrow-down-outline" value={forwardTo} onChangeText={setForwardTo} keyboardType="email-address" autoCapitalize="none" error={error} />
        <AppText variant="label" weight="medium" secondary style={{ marginBottom: 8 }}>
          Stop working
        </AppText>
        <Segmented<Expiry>
          label="When the temporary email stops working"
          value={expiry}
          onChange={setExpiry}
          options={[
            { value: 'never', label: 'Never' },
            { value: '30', label: '30 days' },
            { value: '7', label: '7 days' },
            { value: 'once', label: '1 email' },
          ]}
        />
      </FadeIn>
      <FadeIn delay={120} style={{ marginTop: 20 }}>
        <GlassCard dashed tone="primary">
          <View style={styles.previewTop}>
            <AppText variant="overline" color={theme.primary}>
              Your new address
            </AppText>
            <IconButton icon="refresh" label="Make a different address" onPress={() => setAddress(makeAliasAddress(label, website))} />
          </View>
          <AppText variant="mono" style={{ fontSize: 17 }} selectable>
            {address}
          </AppText>
          <AppText variant="caption" muted style={{ marginTop: 8 }}>
            The random part makes it impossible to guess your other addresses.
          </AppText>
        </GlassCard>
      </FadeIn>
    </Screen>
  );
};

const styles = StyleSheet.create({
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
});
