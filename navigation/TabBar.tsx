import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, PressableScale } from '../components/ui';
import { haptic } from '../components/ui/motion';
import { useTheme } from '../contexts/ThemeContext';
import { usePendingMfaCount } from '../hooks/useVault';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

const ICONS: Record<string, [Glyph, Glyph, string]> = {
  Home: ['home', 'home-outline', 'Home'],
  Passwords: ['key', 'key-outline', 'Passwords'],
  MFA: ['shield-check', 'shield-check-outline', 'MFA'],
  Relay: ['email', 'email-outline', 'Relay'],
  Settings: ['cog', 'cog-outline', 'Settings'],
};

/** Flat tab bar with a badge for pending MFA requests. */
export const TabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = usePendingMfaCount();

  return (
    <View
      style={[styles.bar, { backgroundColor: theme.tabBar, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 8) }]}
      accessibilityRole="tablist"
    >
      <View style={styles.inner}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const [on, off, label] = ICONS[route.name] ?? ['circle', 'circle-outline', route.name];
          const badge = route.name === 'MFA' && pending > 0 ? pending : 0;
          const color = focused ? theme.text : theme.textMuted;
          return (
            <PressableScale
              key={route.key}
              style={styles.item}
              scaleTo={0.94}
              hapticFeedback={false}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge} pending` : label}
              onPress={() => {
                haptic.select();
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <View>
                <MaterialCommunityIcons name={focused ? on : off} size={24} color={color} />
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: theme.error, borderColor: theme.tabBar }]}>
                    <AppText variant="caption" weight="bold" color="#fff" style={{ fontSize: 10, lineHeight: 13 }}>
                      {badge > 9 ? '9+' : badge}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText variant="caption" weight={focused ? 'semibold' : 'regular'} color={color} style={{ fontSize: 11, lineHeight: 14 }} numberOfLines={1}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  inner: { flexDirection: 'row', width: '100%', maxWidth: 560 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, gap: 3 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});
