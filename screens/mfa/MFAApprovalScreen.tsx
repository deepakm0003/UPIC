import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  EmptyState,
  FadeIn,
  GlassCard,
  HoldButton,
  IconButton,
  IconTile,
  InfoCallout,
  ListGroup,
  ListRow,
  Pill,
  Screen,
  SectionHeader,
  useToast,
} from '../../components/ui';
import { haptic } from '../../components/ui/motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMfa, usePasswords } from '../../hooks/useVault';
import { updateMFAApprovalStatus } from '../../services/fileStorage';
import { simulateLoginRequest } from '../../services/mfaSimulator';
import { displaySiteName, timeAgo } from '../../utils/siteIcon';
import type { MFAApproval } from '../../types';

const PulseDot: React.FC<{ color: string }> = ({ color }) => (
  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
);

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

type Outcome = { request: MFAApproval; status: 'approved' | 'denied' } | null;

export const MFAApprovalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const toast = useToast();
  const { prefs, biometricAvailable } = useAuth();
  const { pending, all, reload } = useMfa();
  const { passwords } = usePasswords();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow();

  const request = pending[0];
  const remaining = request?.expiresAt ? Math.max(0, Math.round((new Date(request.expiresAt).getTime() - now) / 1000)) : 0;
  const newDevice = request ? !request.recognizedDevice : false;
  const needsDeliberate = newDevice && prefs.confirmNewDevices;

  useEffect(() => {
    if (request && remaining === 0) reload();
  }, [remaining, request, reload]);

  const respond = async (status: 'approved' | 'denied') => {
    if (!request) return;
    setBusy(true);
    try {
      if (status === 'approved' && needsDeliberate && biometricAvailable) {
        const res = await LocalAuthentication.authenticateAsync({ promptMessage: `Approve ${request.service} sign-in from a new device` });
        if (!res.success) {
          toast.show({ message: 'Not approved — biometric check was cancelled.', tone: 'warning' });
          return;
        }
      }
      await updateMFAApprovalStatus(request.id, status);
      status === 'approved' ? haptic.success() : haptic.warning();
      setOutcome({ request, status });
    } finally {
      setBusy(false);
    }
  };

  const simulate = async () => {
    await simulateLoginRequest();
    setOutcome(null);
    toast.show({ message: 'Demo login request created', icon: 'flask-outline' });
  };

  const matching = outcome ? passwords.find((p) => displaySiteName(p.website).toLowerCase() === outcome.request.service.toLowerCase()) : undefined;
  const history = all.filter((a) => a.status !== 'pending').slice(0, 3);

  return (
    <Screen tabBarSpace>
      <FadeIn style={styles.top}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" muted>
            Multi-factor authentication
          </AppText>
          <AppText variant="h1" accessibilityRole="header">
            Login requests
          </AppText>
        </View>
        <IconButton icon="flask-outline" label="Create a demo login request" onPress={simulate} />
        <Button title="History" variant="secondary" size="sm" icon="history" onPress={() => navigation.navigate('MFAHistory')} />
      </FadeIn>

      {outcome ? (
        <FadeIn key={outcome.request.id + outcome.status}>
          <GlassCard tone={outcome.status === 'approved' ? 'success' : 'danger'} style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
            <MaterialCommunityIcons
              name={outcome.status === 'approved' ? 'check-decagram' : 'shield-off-outline'}
              size={56}
              color={outcome.status === 'approved' ? theme.success : theme.error}
            />
            <AppText variant="h2" align="center">
              {outcome.status === 'approved' ? 'Sign-in approved' : 'Sign-in blocked'}
            </AppText>
            <AppText variant="body" secondary align="center">
              {outcome.status === 'approved'
                ? `${outcome.request.service} on ${outcome.request.deviceInfo} can continue.`
                : `We stopped this ${outcome.request.service} sign-in. If it wasn't you, someone may know your password — change it now.`}
            </AppText>
            <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
              {outcome.status === 'denied' && matching ? (
                <Button title={`Change ${outcome.request.service} password`} icon="lock-reset" onPress={() => navigation.navigate('PasswordEdit', { passwordId: matching.id, focusFix: true })} />
              ) : null}
              <Button title={pending.length ? `Next request (${pending.length})` : 'Done'} variant="secondary" onPress={() => setOutcome(null)} />
            </View>
          </GlassCard>
        </FadeIn>
      ) : request ? (
        <FadeIn key={request.id}>
          <GlassCard style={{ gap: 0 }} padding={0}>
            <View style={styles.reqHead}>
              <View style={styles.live}>
                <PulseDot color={theme.warning} />
                <AppText variant="overline" color={theme.warning}>
                  Login request · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </AppText>
              </View>
              <IconTile site={request.service} size={64} />
              <AppText variant="h1" align="center">
                {request.service}
              </AppText>
              <AppText variant="body" secondary align="center">
                Someone is signing in to your {request.service} account. Is it you?
              </AppText>
            </View>
            {[
              ['laptop', 'Device', request.deviceInfo ?? 'Unknown device'],
              ['map-marker-outline', 'Location', request.location],
              ['clock-outline', 'Time', `${new Date(request.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${timeAgo(request.timestamp)}`],
              ['ip-network-outline', 'IP address', request.ipAddress ?? '—'],
            ].map(([icon, label, value]) => (
              <View key={label} style={[styles.detail, { borderTopColor: theme.border }]}>
                <MaterialCommunityIcons name={icon as any} size={20} color={theme.textMuted} />
                <AppText variant="body" secondary style={{ width: 92 }}>
                  {label}
                </AppText>
                <AppText variant="label" weight="semibold" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
                  {value}
                </AppText>
              </View>
            ))}
            <View style={[styles.detail, { borderTopColor: theme.border }]}>
              <MaterialCommunityIcons name="shield-search" size={20} color={theme.textMuted} />
              <AppText variant="body" secondary style={{ flex: 1 }}>
                Device status
              </AppText>
              <Pill label={newDevice ? 'New device' : 'Known device'} tone={newDevice ? 'warning' : 'success'} icon={newDevice ? 'alert' : 'check'} />
            </View>
          </GlassCard>

          <InfoCallout
            style={{ marginTop: 14 }}
            icon={newDevice ? 'alert-outline' : 'information-outline'}
            tone={newDevice ? 'warning' : 'info'}
            title={newDevice ? 'This is a device you have not used before' : 'Only approve requests you started'}
            body={
              newDevice
                ? `If you are not signing in on ${request.deviceInfo} right now, tap Deny.${needsDeliberate ? ` Approving needs ${biometricAvailable ? 'your biometrics' : 'a press and hold'}.` : ''}`
                : 'If you did not just try to sign in, tap Deny — even if the location looks familiar.'
            }
          />

          <View style={styles.actions}>
            <Button title="Deny" variant="danger" icon="close" size="lg" onPress={() => respond('denied')} disabled={busy} style={{ flex: 1 }} />
            {needsDeliberate && !biometricAvailable ? (
              <HoldButton title="Hold to approve" onConfirm={() => respond('approved')} style={{ flex: 1 }} />
            ) : (
              <Button
                title="Approve"
                icon={needsDeliberate ? 'fingerprint' : 'check'}
                size="lg"
                onPress={() => respond('approved')}
                loading={busy}
                style={{ flex: 1 }}
              />
            )}
          </View>
          {pending.length > 1 ? (
            <AppText variant="caption" muted align="center" style={{ marginTop: 10 }}>
              {pending.length - 1} more request{pending.length > 2 ? 's' : ''} waiting
            </AppText>
          ) : null}
        </FadeIn>
      ) : (
        <FadeIn>
          <EmptyState
            icon="shield-check-outline"
            title="No login requests"
            body="When you sign in to a website protected by UPIC, the request appears here for one-tap approval — no codes to type."
          >
            <Button title="Try a demo request" variant="secondary" icon="flask-outline" onPress={simulate} />
          </EmptyState>
        </FadeIn>
      )}

      <SectionHeader title="Recent decisions" action="View all" onAction={() => navigation.navigate('MFAHistory')} />
      {history.length === 0 ? (
        <AppText variant="body" muted>
          Nothing yet.
        </AppText>
      ) : (
        <ListGroup>
          {history.map((a) => (
            <ListRow
              key={a.id}
              left={<IconTile site={a.service} size={40} />}
              title={a.service}
              subtitle={`${a.deviceInfo ?? 'Unknown device'} · ${a.location}`}
              meta={timeAgo(a.respondedAt ?? a.timestamp)}
              right={<Pill label={a.status} tone={a.status === 'approved' ? 'success' : a.status === 'denied' ? 'danger' : 'neutral'} />}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 20 },
  reqHead: { alignItems: 'center', gap: 10, padding: 20, paddingBottom: 18 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
