import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, PressableScale, Screen } from '../../components/ui';
import { Illustration, IllustrationKind } from '../../components/brand/Illustration';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const SLIDES: { art: IllustrationKind; title: string; body: string }[] = [
  { art: 'score', title: 'One score, explained', body: 'Home shows your security score. Tap it to see what to fix first.' },
  { art: 'keys', title: 'A unique password everywhere', body: 'Save logins and generate strong passwords in one tap.' },
  { art: 'tap', title: 'Approve logins in one tap', body: 'Check the device and place, then Approve or Deny. No codes.' },
  { art: 'mail', title: 'Temporary emails', body: 'Sign up with an address that forwards to you. Switch it off any time.' },
];

/** Optional four-step tour shown once after sign-up (replayable from Settings). */
export const WalkthroughScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { markWalkthroughDone } = useAuth();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  const finish = async () => {
    await markWalkthroughDone(true);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Tabs');
  };

  return (
    <Screen
      scroll={false}
      footer={
        <View style={styles.footer}>
          <PressableScale onPress={finish} accessibilityRole="button" accessibilityLabel="Skip the tour" style={styles.skip}>
            <AppText variant="label" weight="semibold" secondary>
              Skip
            </AppText>
          </PressableScale>
          <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, { width: i === index ? 18 : 6, backgroundColor: i === index ? theme.text : theme.borderStrong }]} />
            ))}
          </View>
          <Button title={last ? 'Start' : 'Next'} onPress={() => (last ? finish() : setIndex(index + 1))} style={{ minWidth: 112 }} />
        </View>
      }
    >
      <View style={styles.center}>
        <View style={{ alignItems: 'center' }}>
          <Illustration kind={slide.art} size={270} />
        </View>
        <View style={{ gap: 10, marginTop: 28 }}>
          <AppText variant="display" accessibilityRole="header">
            {slide.title}
          </AppText>
          <AppText variant="bodyLg" secondary>
            {slide.body}
          </AppText>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { paddingVertical: 12, paddingRight: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
});
