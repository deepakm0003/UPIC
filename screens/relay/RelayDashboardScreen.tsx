import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Button,
  EmptyState,
  FadeIn,
  IconButton,
  IconTile,
  InfoCallout,
  ListGroup,
  ListRow,
  Pill,
  Screen,
  SectionHeader,
  StatTile,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useAliases } from '../../hooks/useVault';
import { displaySiteName } from '../../utils/siteIcon';
import { RELAY_INTRO_KEY } from './RelayIntroScreen';

export const RelayDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { aliases, loading } = useAliases();

  // First visit: explain the concept before showing the dashboard.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(RELAY_INTRO_KEY).then((seen) => {
        if (seen !== 'true') navigation.navigate('RelayIntro');
      });
    }, [navigation])
  );

  const active = aliases.filter((a) => a.status === 'active').length;
  const paused = aliases.filter((a) => a.status !== 'active').length;
  const forwarded = aliases.reduce((s, a) => s + (a.emailsReceived ?? 0), 0);

  return (
    <Screen tabBarSpace>
      <FadeIn style={styles.top}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" muted>
            Email relay
          </AppText>
          <AppText variant="h1" accessibilityRole="header">
            Temporary emails
          </AppText>
        </View>
        <IconButton icon="help-circle-outline" label="How temporary emails work" onPress={() => navigation.navigate('RelayIntro')} />
        <IconButton icon="plus" label="Create a temporary email" tone="primary" onPress={() => navigation.navigate('CreateAlias')} />
      </FadeIn>

      <FadeIn delay={60} style={styles.stats}>
        <StatTile value={active} label="Active" tone={active ? 'success' : 'neutral'} />
        <StatTile value={paused} label="Paused" />
        <StatTile value={forwarded} label="Forwarded" hint="emails" />
      </FadeIn>

      <FadeIn delay={100} style={{ marginTop: 14 }}>
        <InfoCallout
          icon="incognito"
          title="Your real email stays hidden"
          body={`Websites only see the temporary address. Messages are forwarded to ${user?.email ?? 'your inbox'}.`}
        />
      </FadeIn>

      <SectionHeader title="My temporary emails" />
      {aliases.length === 0 && !loading ? (
        <EmptyState icon="email-fast-outline" title="No temporary emails yet" body="Make one the next time a website asks for your email — for shopping, newsletters or free trials.">
          <Button title="Create a temporary email" icon="email-plus-outline" onPress={() => navigation.navigate('CreateAlias')} />
        </EmptyState>
      ) : (
        <FadeIn delay={140}>
          <ListGroup>
            {aliases.map((a) => (
              <ListRow
                key={a.id}
                left={a.website ? <IconTile site={a.website} /> : <IconTile icon="email-outline" />}
                title={a.label || (a.website ? displaySiteName(a.website) : 'Temporary email')}
                subtitle={a.alias}
                meta={`${a.website ? `For ${a.website} · ` : ''}${a.emailsReceived ?? 0} forwarded`}
                right={<Pill label={a.status === 'active' ? 'Active' : a.status === 'expired' ? 'Expired' : 'Paused'} tone={a.status === 'active' ? 'success' : 'neutral'} />}
                onPress={() => navigation.navigate('AliasDetails', { aliasId: a.id })}
              />
            ))}
          </ListGroup>
          <Button title="Create new temporary email" icon="email-plus-outline" onPress={() => navigation.navigate('CreateAlias')} style={{ marginTop: 16 }} />
        </FadeIn>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 20 },
  stats: { flexDirection: 'row', gap: 10 },
});
