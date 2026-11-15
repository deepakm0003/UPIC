import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ConfirmSheet, FadeIn, GlassCard, Header, IconTile, InfoCallout, ListGroup, ListRow, Pill, Screen, useToast } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAliases } from '../../hooks/useVault';
import { deleteEmailAlias, recordEmailAliasUsage, recordTrackerBlocked, updateEmailAliasStatus } from '../../services/fileStorage';
import { randomInt } from '../../services/crypto';
import { copyText } from '../../utils/clipboard';
import { displaySiteName, timeAgo } from '../../utils/siteIcon';

export const AliasDetailsScreen: React.FC<{ navigation: any; route: { params: { aliasId: string } } }> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { aliases } = useAliases();
  const alias = aliases.find((a) => a.id === route.params.aliasId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!alias) {
    return (
      <Screen header={<Header title="Temporary email" />}>
        <AppText variant="body" secondary>
          This temporary email no longer exists.
        </AppText>
      </Screen>
    );
  }

  const title = alias.label || (alias.website ? displaySiteName(alias.website) : 'Temporary email');
  const isActive = alias.status === 'active';
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never');

  return (
    <Screen header={<Header title="Temporary email" />}>
      <FadeIn style={styles.hero}>
        {alias.website ? <IconTile site={alias.website} size={68} /> : <IconTile icon="email-outline" size={68} />}
        <AppText variant="h1" align="center">
          {title}
        </AppText>
        <Pill label={isActive ? 'Active' : alias.status === 'expired' ? 'Expired' : 'Paused'} tone={isActive ? 'success' : 'neutral'} />
      </FadeIn>

      <FadeIn delay={60}>
        <GlassCard dashed tone="primary" style={{ gap: 12, alignItems: 'center' }}>
          <AppText variant="caption" secondary>
            Your temporary address
          </AppText>
          <AppText variant="mono" style={{ fontSize: 17 }} align="center" selectable>
            {alias.alias}
          </AppText>
          <Button
            title="Copy address"
            variant="secondary"
            icon="content-copy"
            style={{ alignSelf: 'stretch' }}
            onPress={async () => {
              await copyText(alias.alias);
              toast.show('Address copied');
            }}
          />
        </GlassCard>
      </FadeIn>

      <FadeIn delay={120} style={{ marginTop: 16 }}>
        <ListGroup>
          <ListRow title="Made for" right={<AppText variant="label">{alias.website ?? '—'}</AppText>} />
          <ListRow title="Forwards to" right={<AppText variant="label" numberOfLines={1} style={{ maxWidth: 200 }}>{alias.forwardTo ?? '—'}</AppText>} />
          <ListRow title="Created" right={<AppText variant="label">{fmt(alias.createdAt)}</AppText>} />
          <ListRow title="Stops working" right={<AppText variant="label">{alias.autoExpire ? 'After 1 email' : fmt(alias.expiresAt)}</AppText>} />
          <ListRow title="Emails forwarded" right={<AppText variant="label">{alias.emailsReceived ?? 0}</AppText>} />
          <ListRow title="Trackers blocked" right={<AppText variant="label">{alias.trackersBlocked ?? 0}</AppText>} />
          <ListRow title="Last email" right={<AppText variant="label">{timeAgo(alias.lastUsedAt)}</AppText>} />
        </ListGroup>
      </FadeIn>

      <FadeIn delay={160} style={{ marginTop: 16 }}>
        <InfoCallout
          icon="shield-account-outline"
          title="How this protects you"
          body={`${alias.website ?? 'The website'} only knows this address. If it starts sending spam or leaks its customer list, pause or delete it — your real email stays private.`}
        />
      </FadeIn>

      <View style={{ gap: 10, marginTop: 24 }}>
        {isActive ? (
          <Button
            title="Simulate an incoming email"
            variant="ghost"
            icon="flask-outline"
            onPress={async () => {
              await recordEmailAliasUsage(alias.id, 'email');
              if (randomInt(2)) await recordTrackerBlocked(alias.id, 1 + randomInt(3));
              toast.show({ message: 'Demo email forwarded', icon: 'email-check-outline' });
            }}
          />
        ) : null}
        {alias.status !== 'expired' ? (
          <Button
            title={isActive ? 'Pause temporary email' : 'Turn back on'}
            variant="secondary"
            icon={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            onPress={async () => {
              await updateEmailAliasStatus(alias.id, isActive ? 'inactive' : 'active');
              toast.show(isActive ? 'Paused — messages to this address are now blocked' : 'Forwarding is back on');
            }}
          />
        ) : null}
        <Button title="Delete temporary email" variant="danger" icon="trash-can-outline" onPress={() => setConfirmDelete(true)} />
      </View>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await deleteEmailAlias(alias.id);
          toast.show('Temporary email deleted');
          navigation.goBack();
        }}
        icon="trash-can-outline"
        title="Delete this address?"
        message={`Messages sent to ${alias.alias} will bounce. Update your email on ${alias.website ?? 'the website'} first if you still need the account.`}
        confirmLabel="Delete"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 20 },
});
