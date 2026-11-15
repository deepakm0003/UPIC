import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppText,
  Button,
  ConfirmSheet,
  FadeIn,
  GlassCard,
  IconTile,
  ListGroup,
  ListRow,
  OptionSheet,
  Screen,
  SectionHeader,
  ToggleRow,
  useToast,
} from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { autoLockLabel, SecurityPrefs } from '../../services/preferences';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, preference, textSize } = useTheme();
  const toast = useToast();
  const {
    user,
    prefs,
    updatePrefs,
    biometricAvailable,
    biometricEnabled,
    biometricLabel,
    enableBiometrics,
    disableBiometrics,
    lock,
    signOut,
    markWalkthroughDone,
  } = useAuth();
  const [autoLockSheet, setAutoLockSheet] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const go = (screen: string, params?: object) => navigation.navigate(screen, params);

  const toggleBiometric = async (on: boolean) => {
    if (on) {
      const ok = await enableBiometrics();
      toast.show(ok ? `${biometricLabel} unlock is on` : { message: `${biometricLabel} was not turned on`, tone: 'warning' });
    } else {
      await disableBiometrics();
      toast.show(`${biometricLabel} unlock is off`);
    }
  };

  return (
    <Screen tabBarSpace>
      <FadeIn style={{ marginTop: 8, marginBottom: 18 }}>
        <AppText variant="h1" accessibilityRole="header">
          Settings
        </AppText>
      </FadeIn>

      <FadeIn delay={40}>
        <GlassCard>
          <View style={styles.profile}>
            <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <AppText variant="h2" color={theme.onPrimary}>
                {(user?.username ?? '?').charAt(0).toUpperCase()}
              </AppText>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <AppText variant="title">{user?.username}</AppText>
              <AppText variant="body" secondary numberOfLines={1}>
                {user?.email}
              </AppText>
            </View>
          </View>
        </GlassCard>
      </FadeIn>

      <SectionHeader title="Security" />
      <ListGroup>
        <ToggleRow
          left={<IconTile icon="fingerprint" size={38} />}
          title={`${biometricLabel} unlock`}
          subtitle={biometricAvailable ? 'Unlock without typing your master password' : 'Not available on this device'}
          value={biometricEnabled}
          disabled={!biometricAvailable}
          onValueChange={toggleBiometric}
        />
        <ListRow left={<IconTile icon="shield-key-outline" size={38} />} title="Master password" subtitle="Change the password that encrypts your vault" onPress={() => go('ChangeMasterPassword')} />
        <ListRow
          left={<IconTile icon="timer-lock-outline" size={38} />}
          title="Auto-lock"
          subtitle={autoLockLabel(prefs.autoLockMinutes)}
          onPress={() => setAutoLockSheet(true)}
        />
        <ListRow
          left={<IconTile icon="lifebuoy" size={38} />}
          title="Recovery contacts & key"
          subtitle={user?.recoveryPhone ? 'Email, phone and recovery key' : 'Add a recovery phone'}
          onPress={() => go('RecoverySettings')}
        />
        <ToggleRow
          left={<IconTile icon="cellphone-check" size={38} />}
          title="Extra check for new devices"
          subtitle="Approving a login from a new device needs biometrics or a press-and-hold"
          value={prefs.confirmNewDevices}
          onValueChange={(v) => updatePrefs({ confirmNewDevices: v })}
        />
      </ListGroup>

      <SectionHeader title="Privacy" />
      <ListGroup>
        <ListRow left={<IconTile icon="email-fast-outline" size={38} />} title="Temporary emails" subtitle="Manage your private email addresses" onPress={() => navigation.navigate('Tabs', { screen: 'Relay' })} />
        <ListRow left={<IconTile icon="shield-account-outline" size={38} />} title="Privacy dashboard" subtitle="What UPIC stores and why" onPress={() => go('PrivacyDashboard')} />
        <ToggleRow
          left={<IconTile icon="palette-swatch-outline" size={38} />}
          title="Website colours & logos"
          subtitle="Ask each saved website for its logo and colour. Only that website is contacted — no third-party service."
          value={prefs.fetchSiteBranding}
          onValueChange={(v) => updatePrefs({ fetchSiteBranding: v })}
        />
        <ListRow left={<IconTile icon="shield-lock-outline" size={38} />} title="How UPIC protects you" subtitle="Encryption and who can see what" onPress={() => go('HowUPICProtects')} />
        <ListRow left={<IconTile icon="history" size={38} />} title="MFA history" subtitle="Approved and denied logins" onPress={() => go('MFAHistory')} />
      </ListGroup>

      <SectionHeader title="Data" />
      <ListGroup>
        <ListRow left={<IconTile icon="swap-vertical" size={38} />} title="Import & export passwords" subtitle="Bring passwords in or take them with you" onPress={() => go('ImportExport')} />
      </ListGroup>

      <SectionHeader title="General" />
      <ListGroup>
        <ListRow
          left={<IconTile icon="palette-outline" size={38} />}
          title="Appearance & text size"
          subtitle={`${preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light'} · ${textSize === 'standard' ? 'Standard text' : textSize === 'large' ? 'Large text' : 'Extra large text'}`}
          onPress={() => go('Appearance')}
        />
        <ListRow
          left={<IconTile icon="map-marker-path" size={38} />}
          title="Replay the quick tour"
          subtitle="Passwords, MFA and temporary emails in 4 steps"
          onPress={async () => {
            await markWalkthroughDone(false);
            go('Walkthrough');
          }}
        />
        <ListRow left={<IconTile icon="information-outline" size={38} />} title="About UPIC" subtitle="Version, team and study" onPress={() => go('About')} />
      </ListGroup>

      <View style={{ gap: 10, marginTop: 28 }}>
        <Button title="Lock now" variant="secondary" icon="lock-outline" onPress={lock} />
        <Button title="Log out" variant="danger" icon="logout" onPress={() => setConfirmLogout(true)} />
      </View>

      <OptionSheet<SecurityPrefs['autoLockMinutes']>
        visible={autoLockSheet}
        onClose={() => setAutoLockSheet(false)}
        title="Auto-lock"
        description="UPIC locks itself after this much inactivity, and whenever you leave the app for that long."
        value={prefs.autoLockMinutes}
        onSelect={(v) => {
          updatePrefs({ autoLockMinutes: v });
          toast.show(`Auto-lock: ${autoLockLabel(v).toLowerCase()}`);
        }}
        options={[
          { value: 0, label: 'Immediately', hint: 'As soon as you leave UPIC' },
          { value: 1, label: 'After 1 minute' },
          { value: 5, label: 'After 5 minutes', hint: 'Recommended' },
          { value: 15, label: 'After 15 minutes' },
        ]}
      />

      <ConfirmSheet
        visible={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await signOut();
        }}
        icon="logout"
        tone="danger"
        title="Log out?"
        message="Your encrypted vault stays on this device. You'll need your username and master password to log in again."
        confirmLabel="Log out"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
