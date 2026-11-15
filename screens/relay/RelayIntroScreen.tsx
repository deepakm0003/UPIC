import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, Button, FadeIn, GlassCard, Header, InfoCallout, Screen, TitleBlock } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';

export const RELAY_INTRO_KEY = '@upic_relay_intro_seen';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

const Step: React.FC<{ icon: Glyph; title: string; body: string; highlight?: boolean }> = ({ icon, title, body, highlight }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.step,
        { backgroundColor: highlight ? theme.primarySoft : theme.surfaceStrong, borderColor: highlight ? theme.primary + '77' : theme.border },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={highlight ? theme.primary : theme.text} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" weight="semibold">
          {title}
        </AppText>
        <AppText variant="caption" secondary>
          {body}
        </AppText>
      </View>
    </View>
  );
};

const Connector: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={styles.connector}>
      <MaterialCommunityIcons name="arrow-down" size={18} color={theme.textMuted} />
    </View>
  );
};

/** Explains the relay before first use — Phase 1 participants did not understand "alias" without help. */
export const RelayIntroScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  useEffect(() => {
    AsyncStorage.setItem(RELAY_INTRO_KEY, 'true').catch(() => undefined);
  }, []);

  return (
    <Screen
      header={<Header title="Private email relay" />}
      footer={
        <>
          <Button title="Create a temporary email" icon="email-plus-outline" size="lg" onPress={() => navigation.replace('CreateAlias')} />
          <Button title="Maybe later" variant="secondary" onPress={() => navigation.goBack()} />
        </>
      }
    >
      <FadeIn>
        <TitleBlock eyebrow="Protect your inbox" title="Keep your real email private" subtitle="Create a temporary email address when signing up to websites. Messages are forwarded to you — the website never learns your real address." />
      </FadeIn>
      <FadeIn delay={100}>
        <GlassCard style={{ gap: 0 }}>
          <Step icon="web" title="Website" body="You sign up with a temporary email" />
          <Connector />
          <Step icon="email-fast-outline" title="Temporary email" body="shopping.k3x9pa@relay.upic.app" highlight />
          <Connector />
          <Step icon="inbox-arrow-down-outline" title="Your real email" body="Receives the messages — stays hidden" />
        </GlassCard>
      </FadeIn>
      <FadeIn delay={180} style={{ gap: 10, marginTop: 16 }}>
        <InfoCallout icon="toggle-switch-off-outline" title="You stay in control" body="If a website starts sending spam or gets breached, pause or delete its temporary email. Your real address is never exposed." />
        <InfoCallout icon="tag-outline" tone="info" title="One per website" body="UPIC labels each temporary email with the website it belongs to, so you always know who sold your address." />
      </FadeIn>
    </Screen>
  );
};

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  connector: { height: 30, alignItems: 'center', justifyContent: 'center' },
});
