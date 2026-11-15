/**
 * Small building blocks: pills, icon tiles, section headers, callouts, empty states.
 */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, Tone, toneColors } from '../../theme/tokens';
import { siteIcon } from '../../utils/siteIcon';
import { brandColor, readableOn, withAlpha } from '../../utils/brandColor';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export const Pill: React.FC<{ label: string; tone?: Tone; icon?: Glyph; style?: StyleProp<ViewStyle> }> = ({
  label,
  tone = 'neutral',
  icon,
  style,
}) => {
  const { theme } = useTheme();
  const c = toneColors(theme, tone);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.fg + '33' }, style]}>
      {icon ? <MaterialCommunityIcons name={icon} size={13} color={c.fg} /> : null}
      <AppText variant="caption" weight="semibold" color={c.fg} style={{ fontSize: 12, lineHeight: 16 }}>
        {label}
      </AppText>
    </View>
  );
};

/**
 * Rounded tile for an icon or a website. Websites use their brand colour:
 * tinted by default, `solid` for a filled tile, `inverse` for a white tile on a
 * brand-coloured background.
 */
export const IconTile: React.FC<{
  icon?: Glyph;
  site?: string;
  tone?: Tone;
  size?: number;
  gradient?: boolean;
  solid?: boolean;
  inverse?: boolean;
  /** Overrides the brand colour (e.g. the colour read from the website). */
  color?: string;
  /** Website logo; shown on a white tile, falls back to the glyph/letter on error. */
  logoUrl?: string;
}> = ({ icon, site, tone = 'neutral', size = 44, gradient, solid, inverse, color, logoUrl }) => {
  const { theme } = useTheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const c = toneColors(theme, tone);
  const s = site !== undefined ? siteIcon(site) : null;
  const glyph = icon ?? s?.glyph;
  const brand = color ?? (site !== undefined ? brandColor(site) : null);

  if (logoUrl && !logoFailed && !icon) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          borderWidth: inverse ? 0 : theme.outline,
          borderColor: theme.isDark ? theme.border : theme.ink,
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: logoUrl }}
          onError={() => setLogoFailed(true)}
          style={{ width: size * 0.66, height: size * 0.66 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  let bg: string;
  let fg: string;
  if (inverse) {
    bg = '#FFFFFF';
    fg = brand ?? theme.primary;
  } else if (solid || gradient) {
    bg = brand ?? theme.primary;
    fg = readableOn(bg);
  } else if (brand && tone === 'neutral') {
    bg = withAlpha(brand, theme.isDark ? 0.22 : 0.12);
    fg = theme.isDark && readableOn(brand) === '#FFFFFF' && brand.toLowerCase() < '#333333' ? theme.text : brand;
  } else {
    bg = tone === 'neutral' ? theme.surfaceStrong : c.bg;
    fg = tone === 'neutral' ? theme.text : c.fg;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      {glyph ? (
        <MaterialCommunityIcons name={glyph} size={size * 0.5} color={fg} />
      ) : (
        <AppText variant="title" weight="bold" color={fg} style={{ fontSize: size * 0.42, lineHeight: size * 0.5 }}>
          {s?.letter ?? '?'}
        </AppText>
      )}
    </View>
  );
};

export const SectionHeader: React.FC<{ title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({
  title,
  action,
  onAction,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.section, style]}>
      <AppText variant="overline" muted accessibilityRole="header">
        {title}
      </AppText>
      {action ? (
        <PressableScale onPress={onAction} accessibilityRole="button" accessibilityLabel={action} hitSlop={10}>
          <AppText variant="label" weight="semibold" color={theme.primary}>
            {action}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
};

/**
 * Explanatory box ("Why this is secure", "You stay in control"…). With a
 * `dismissKey` it becomes a first-use tip that stays hidden after "Got it".
 */
export const InfoCallout: React.FC<{
  title: string;
  body?: string;
  icon?: Glyph;
  tone?: Tone;
  dismissKey?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}> = ({ title, body, icon = 'shield-check-outline', tone = 'primary', dismissKey, action, onAction, style }) => {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState(!!dismissKey);
  const c = toneColors(theme, tone);

  useEffect(() => {
    if (!dismissKey) return;
    AsyncStorage.getItem(`@upic_tip_${dismissKey}`)
      .then((v) => setHidden(v === 'done'))
      .catch(() => setHidden(false));
  }, [dismissKey]);

  if (hidden) return null;

  return (
    <View style={[styles.callout, { backgroundColor: c.bg, borderColor: c.fg + '30' }, style]}>
      <View style={[styles.calloutIcon, { backgroundColor: c.fg + '22' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={c.fg} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" weight="semibold">
          {title}
        </AppText>
        {body ? (
          <AppText variant="caption" secondary style={{ fontSize: 14, lineHeight: 20 }}>
            {body}
          </AppText>
        ) : null}
        {(action || dismissKey) && (
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 6 }}>
            {action ? (
              <PressableScale onPress={onAction} accessibilityRole="button" accessibilityLabel={action}>
                <AppText variant="label" weight="semibold" color={c.fg}>
                  {action}
                </AppText>
              </PressableScale>
            ) : null}
            {dismissKey ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Got it, hide this tip"
                onPress={() => {
                  setHidden(true);
                  AsyncStorage.setItem(`@upic_tip_${dismissKey}`, 'done').catch(() => undefined);
                }}
              >
                <AppText variant="label" weight="semibold" secondary>
                  Got it
                </AppText>
              </PressableScale>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

export const EmptyState: React.FC<{ icon: Glyph; title: string; body?: string; children?: React.ReactNode }> = ({
  icon,
  title,
  body,
  children,
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accent, borderColor: theme.isDark ? '#FFFFFF' : '#111111' }]}>
        <MaterialCommunityIcons name={icon} size={34} color="#111111" />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" secondary align="center" style={{ maxWidth: 320 }}>
          {body}
        </AppText>
      ) : null}
      {children ? <View style={{ width: '100%', gap: 10, marginTop: 8 }}>{children}</View> : null}
    </View>
  );
};

/** Big number tile for dashboards. */
export const StatTile: React.FC<{ value: string | number; label: string; hint?: string; tone?: Tone; onPress?: () => void }> = ({
  value,
  label,
  hint,
  tone = 'neutral',
  onPress,
}) => {
  const { theme } = useTheme();
  const color = tone === 'neutral' ? theme.text : toneColors(theme, tone).fg;
  const content = (
    <>
      <AppText variant="caption" secondary numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="h2" color={color}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" muted numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </>
  );
  const style = [styles.stat, { backgroundColor: theme.surface, borderColor: theme.ink, borderWidth: theme.outline }];
  return onPress ? (
    <PressableScale style={style} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      {content}
    </PressableScale>
  ) : (
    <View style={style} accessible accessibilityLabel={`${label}: ${value}`}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
  },
  callout: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  calloutIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 6, transform: [{ rotate: '-6deg' }] },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 2, minWidth: 0 },
});
