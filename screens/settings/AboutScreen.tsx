import React from 'react';
import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { AppText, FadeIn, GlassCard, Header, ListGroup, ListRow, Screen, SectionHeader } from '../../components/ui';
import { AnimatedLogo } from '../../components/brand/Logo';
import { useTheme } from '../../contexts/ThemeContext';

const TEAM = [
  ['Deepak Meena', '2023188'],
  ['Vaibhav Sorot', '2023573'],
  ['Kartik Haritwal', '2023275'],
  ['Aishwary Singh Panwar', '2023055'],
  ['Yuvraj Rajput', '2023616'],
];

export const AboutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  return (
    <Screen header={<Header title="About" />}>
      <FadeIn style={styles.hero}>
        <AnimatedLogo size={80} />
        <AppText variant="h1" align="center" style={{ marginTop: 18 }}>
          UPIC
        </AppText>
        <AppText variant="bodyLg" secondary align="center">
          Universal Password and Identity Custodian
        </AppText>
        <AppText variant="caption" muted>
          Version {Constants.expoConfig?.version ?? '2.0.0'}
        </AppText>
      </FadeIn>

      <SectionHeader title="Group 17 · Usable Security and Privacy" />
      <ListGroup>
        {TEAM.map(([name, roll]) => (
          <ListRow key={roll} title={name} right={<AppText variant="label" secondary>{roll}</AppText>} />
        ))}
        <ListRow title="Supervisor" right={<AppText variant="label" color={theme.primary}>Prof. Arun Balaji</AppText>} />
      </ListGroup>

      <SectionHeader title="Built from our user study" />
      <GlassCard>
        <AppText variant="body" secondary>
          UPIC's design comes from our Phase 1 research: a survey of 38 students and interviews with 36 participants. Every major screen answers something
          they told us — one explained score, Password Health with a Fix button, master-password recovery, temporary-email wording, equal Approve and Deny
          buttons, larger text, and a clear explanation of how your data is protected.
        </AppText>
      </GlassCard>
      <View style={{ marginTop: 12 }}>
        <ListGroup>
          <ListRow title="How UPIC protects you" onPress={() => navigation.navigate('HowUPICProtects')} />
          <ListRow title="Replay the quick tour" onPress={() => navigation.navigate('Walkthrough')} />
        </ListGroup>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 8 },
});
