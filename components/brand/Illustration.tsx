import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export type IllustrationKind =
  | 'keys'
  | 'encrypt'
  | 'tap'
  | 'mail'
  | 'score'
  | 'lock'
  | 'recovery'
  | 'fingerprint'
  | 'empty'
  | 'account';

const GLYPHS: Record<IllustrationKind, [Glyph, Glyph]> = {
  keys: ['key-variant', 'lock'],
  encrypt: ['shield-lock-outline', 'eye-off'],
  tap: ['gesture-tap', 'check-bold'],
  mail: ['email-fast-outline', 'incognito'],
  score: ['shield-check-outline', 'star-four-points'],
  lock: ['lock-outline', 'key-variant'],
  recovery: ['lifebuoy', 'key-variant'],
  fingerprint: ['fingerprint', 'check-bold'],
  empty: ['tray-plus', 'plus'],
  account: ['account-outline', 'star-four-points'],
};

/** Mirror some compositions so screens don't all look identical. */
const FLIP: Partial<Record<IllustrationKind, boolean>> = { encrypt: true, mail: true, recovery: true, account: true };

/**
 * Static doodle artwork in the reference style: thick black ink, blue / pink /
 * yellow shapes, lightning bolts, stars and squiggles. No animation.
 */
export const Illustration: React.FC<{ kind: IllustrationKind; size?: number }> = ({ kind, size = 240 }) => {
  const { theme } = useTheme();
  const ink = theme.isDark ? '#FFFFFF' : '#111111';
  const paper = theme.isDark ? '#141414' : '#FFFFFF';
  const blue = theme.primary;
  const pink = theme.secondary;
  const yellow = theme.accent;
  const [main, badge] = GLYPHS[kind];
  const flip = !!FLIP[kind];
  const s = size / 240;
  const h = size * 0.85;
  const x = (v: number) => (flip ? 240 - v : v);

  return (
    <View style={{ width: size, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={h} viewBox="0 0 240 204">
        <G transform={flip ? 'translate(240,0) scale(-1,1)' : undefined}>
          {/* dot grid */}
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2].map((c) => <Circle key={`${r}-${c}`} cx={194 + c * 10} cy={150 + r * 10} r={2.2} fill={ink} opacity={0.75} />)
          )}
          {/* yellow blob */}
          <Circle cx="58" cy="62" r="38" fill={yellow} stroke={ink} strokeWidth="4" />
          {/* pink triangle */}
          <Path d="M190 18 L224 78 L156 78 Z" fill={pink} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
          {/* blue tile */}
          <Rect x="146" y="124" width="54" height="54" rx="12" fill={blue} stroke={ink} strokeWidth="4" transform="rotate(12 173 151)" />
          {/* lightning bolt */}
          <Path d="M30 116 L46 116 L38 136 L54 136 L28 168 L36 144 L22 144 Z" fill={yellow} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
          {/* squiggle */}
          <Path d="M196 102 q8 -10 16 0 t16 0" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          {/* sparkle star */}
          <Path d="M100 18 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill={ink} />
          {/* motion lines */}
          <Path d="M58 182 l18 0 M50 194 l14 0" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          {/* main card */}
          <Rect x="72" y="44" width="100" height="124" rx="20" fill={paper} stroke={ink} strokeWidth="5" />
          <Rect x="88" y="138" width="68" height="10" rx="5" fill={ink} />
          <Rect x="88" y="152" width="40" height="6" rx="3" fill={ink} opacity="0.35" />
          {/* badge */}
          <Circle cx="168" cy="54" r="21" fill={pink} stroke={ink} strokeWidth="5" />
        </G>
      </Svg>
      <View style={{ position: 'absolute', left: x(72) * s - (flip ? 100 * s : 0), width: 100 * s, top: 66 * s, alignItems: 'center' }}>
        <MaterialCommunityIcons name={main} size={54 * s} color={ink} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: (x(168) - 21) * s,
          top: 33 * s,
          width: 42 * s,
          height: 42 * s,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={badge} size={20 * s} color="#FFFFFF" />
      </View>
    </View>
  );
};
