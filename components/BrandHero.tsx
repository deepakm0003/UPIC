import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, IconTile } from './ui';
import { readableOn, withAlpha } from '../utils/brandColor';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export interface HeroAction {
  icon: Glyph;
  label: string;
  onPress: () => void;
  active?: boolean;
}

/** Full-width header painted in the app's brand colour, with a white logo tile. */
export const BrandHero: React.FC<{
  color: string;
  title: string;
  subtitle?: string;
  site?: string;
  icon?: Glyph;
  logoUrl?: string;
  onBack: () => void;
  actions?: HeroAction[];
}> = ({ color, title, subtitle, site, icon, logoUrl, onBack, actions = [] }) => {
  const insets = useSafeAreaInsets();
  const fg = readableOn(color);
  const chip = withAlpha(fg === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.16);

  const roundBtn = (a: HeroAction | { icon: Glyph; label: string; onPress: () => void; active?: boolean }) => (
    <Pressable
      key={a.label}
      onPress={a.onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={a.label}
      style={[styles.round, { backgroundColor: chip }]}
    >
      <MaterialCommunityIcons name={a.icon} size={22} color={fg} />
    </Pressable>
  );

  return (
    <View style={[styles.hero, { backgroundColor: color, paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        {roundBtn({ icon: 'chevron-left', label: 'Go back', onPress: onBack })}
        <View style={{ flexDirection: 'row', gap: 8 }}>{actions.map(roundBtn)}</View>
      </View>
      <View style={styles.body}>
        <View style={styles.tileWrap}>
          <IconTile site={site} icon={icon} size={64} inverse color={color} logoUrl={logoUrl} />
        </View>
        <AppText variant="h1" color={fg} align="center" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" color={withAlpha(fg, 0.8)} align="center" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 16, paddingBottom: 56 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 560, alignSelf: 'center' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', gap: 6, marginTop: 4 },
  tileWrap: { borderRadius: 24, padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 8 },
});
