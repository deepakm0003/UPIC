import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Button, ConfirmSheet, FadeIn, PressableScale, Screen, TextField } from '../../components/ui';
import { haptic, nativeDriver } from '../../components/ui/motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { VaultError } from '../../services/fileStorage';
import { useUnlockThrottle } from '../../hooks/useThrottle';
import { Illustration } from '../../components/brand/Illustration';

/** Shown on app start and after auto-lock: master password or biometrics, nothing else. */
export const UnlockScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, unlock, unlockWithBiometrics, biometricEnabled, biometricLabel, signOut } = useAuth();
  const throttle = useUnlockThrottle();
  const [master, setMaster] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const triedBio = useRef(false);

  useEffect(() => {
    if (biometricEnabled && !triedBio.current) {
      triedBio.current = true;
      const t = setTimeout(() => unlockWithBiometrics(), 400);
      return () => clearTimeout(t);
    }
  }, [biometricEnabled, unlockWithBiometrics]);

  const doShake = () => {
    haptic.error();
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 50, useNativeDriver: nativeDriver }))
    ).start();
  };

  const submit = async () => {
    if (throttle.blocked) return;
    if (!master) {
      setError('Enter your master password.');
      return;
    }
    setLoading(true);
    try {
      await unlock(master);
      throttle.reset();
    } catch (e) {
      const err = e as VaultError;
      if (err.code === 'BAD_PASSWORD') throttle.fail();
      setError(err.code === 'BAD_PASSWORD' ? 'Incorrect master password.' : err.message);
      doShake();
    } finally {
      setLoading(false);
      setMaster('');
    }
  };

  const initial = (user?.username ?? '?').charAt(0).toUpperCase();

  return (
    <Screen
      footer={
        <>
          <Button
            title={throttle.blocked ? `Too many attempts — wait ${throttle.remaining}s` : loading ? 'Unlocking…' : 'Unlock'}
            icon="lock-open-variant-outline"
            onPress={submit}
            loading={loading}
            disabled={throttle.blocked}
            size="lg"
          />
          {biometricEnabled ? (
            <Button title={`Use ${biometricLabel}`} icon="fingerprint" variant="secondary" size="lg" onPress={() => unlockWithBiometrics()} />
          ) : null}
        </>
      }
    >
      <View style={styles.top}>
        <FadeIn style={{ alignItems: 'center', gap: 16 }}>
          <Illustration kind="lock" size={200} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <AppText variant="h1" align="center" accessibilityRole="header">
              Welcome back, {user?.username}
            </AppText>
            <AppText variant="bodyLg" secondary align="center">
              UPIC is locked to keep your vault safe.
            </AppText>
          </View>
        </FadeIn>
      </View>

      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <TextField
          label="Master password"
          icon="shield-key-outline"
          placeholder="Enter master password"
          value={master}
          onChangeText={(t) => {
            setMaster(t);
            setError(undefined);
          }}
          secret
          autoFocus={!biometricEnabled}
          onSubmitEditing={submit}
          returnKeyType="go"
          error={error}
        />
      </Animated.View>

      <View style={styles.links}>
        <PressableScale onPress={() => navigation.navigate('ForgotMasterPassword', { identifier: user?.username })} accessibilityRole="link" accessibilityLabel="Forgot master password?">
          <AppText variant="label" weight="semibold" color={theme.primary}>
            Forgot master password?
          </AppText>
        </PressableScale>
        <PressableScale onPress={() => setConfirmSignOut(true)} accessibilityRole="link" accessibilityLabel="Not you? Sign out">
          <AppText variant="label" weight="semibold" secondary>
            Not you? Sign out
          </AppText>
        </PressableScale>
      </View>

      <ConfirmSheet
        visible={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={async () => {
          setConfirmSignOut(false);
          await signOut();
        }}
        icon="logout"
        title="Sign out?"
        message="Your encrypted vault stays on this device. You'll need your username and master password to sign in again."
        confirmLabel="Sign out"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { paddingTop: 48, paddingBottom: 36 },
  avatar: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
});
