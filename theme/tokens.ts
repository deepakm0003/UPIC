/**
 * UPIC design tokens — "Aurora Vault".
 *
 * The lo-fi Figma design from Phase 1 defines the screens and flows; this file
 * defines the visual language: a deep-ink vault lit by a soft aurora, glass
 * surfaces, and a mint→violet signature gradient. A light "Pearl" variant keeps
 * the same identity for people who prefer light mode.
 */
import { Platform } from 'react-native';

export type ColorMode = 'dark' | 'light';

export interface Palette {
  name: string;
  isDark: boolean;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceStrong: string;
  surfaceSolid: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  secondary: string;
  accent: string;
  gradient: [string, string];
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  orbs: [string, string, string];
  overlay: string;
  tabBar: string;
  shadow: string;
  /** Outline colour for cards, inputs and secondary buttons (thick black ink on light screens). */
  ink: string;
  /** Outline width for cards and inputs. */
  outline: number;
}

/*
 * "Ink Pop" palettes, after the reference design: onboarding is pure white with
 * thick black ink outlines and doodles; the app itself is black with vivid
 * colour-pop cards. Blue = actions, pink = selection/favourites, yellow =
 * highlights. Saved websites add their own brand colour (utils/brandColor.ts).
 */
export const darkPalette: Palette = {
  name: 'Ink Black',
  isDark: true,
  background: '#000000',
  backgroundAlt: '#0A0A0A',
  surface: '#141414',
  surfaceStrong: '#1F1F1F',
  surfaceSolid: '#141414',
  border: '#262626',
  borderStrong: '#3D3D3D',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  primary: '#2E7BFF',
  onPrimary: '#FFFFFF',
  primarySoft: 'rgba(46,123,255,0.18)',
  secondary: '#FF4D8D',
  accent: '#FFD028',
  gradient: ['#2E7BFF', '#2E7BFF'],
  success: '#3DDC84',
  successSoft: 'rgba(61,220,132,0.16)',
  warning: '#FFD028',
  warningSoft: 'rgba(255,208,40,0.16)',
  error: '#FF4D6A',
  errorSoft: 'rgba(255,77,106,0.16)',
  info: '#2E7BFF',
  infoSoft: 'rgba(46,123,255,0.18)',
  orbs: ['#000000', '#000000', '#000000'],
  overlay: 'rgba(0,0,0,0.75)',
  tabBar: '#000000',
  shadow: '#000000',
  ink: '#2A2A2A',
  outline: 1,
};

export const lightPalette: Palette = {
  name: 'Ink White',
  isDark: false,
  background: '#FFFFFF',
  backgroundAlt: '#F7F7F7',
  surface: '#FFFFFF',
  surfaceStrong: '#F3F3F3',
  surfaceSolid: '#FFFFFF',
  border: '#E8E8E8',
  borderStrong: '#111111',
  text: '#111111',
  textSecondary: '#4D4D4D',
  textMuted: '#7A7A7A',
  primary: '#2E7BFF',
  onPrimary: '#FFFFFF',
  primarySoft: 'rgba(46,123,255,0.10)',
  secondary: '#FF4D8D',
  accent: '#FFD028',
  gradient: ['#2E7BFF', '#2E7BFF'],
  success: '#11864A',
  successSoft: 'rgba(17,134,74,0.10)',
  warning: '#9A6400',
  warningSoft: 'rgba(255,208,40,0.25)',
  error: '#D6264A',
  errorSoft: 'rgba(214,38,74,0.09)',
  info: '#2E7BFF',
  infoSoft: 'rgba(46,123,255,0.10)',
  orbs: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
  overlay: 'rgba(17,17,17,0.5)',
  tabBar: '#FFFFFF',
  shadow: '#111111',
  ink: '#111111',
  outline: 2,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  pill: 999,
};

/** Font families. Falls back to the system font if the custom fonts fail to load. */
export const fonts = {
  display: 'Inter_800ExtraBold',
  displayMedium: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

/**
 * Type scale. The base body size is 16 (larger than the Phase 1 prototype —
 * participants found text too small), and every size is multiplied by the
 * user's text-size preference.
 */
export const typeScale = {
  display: { size: 38, line: 42, font: fonts.display, spacing: -1.2 },
  h1: { size: 28, line: 34, font: fonts.display, spacing: -0.8 },
  h2: { size: 22, line: 28, font: fonts.bodyBold, spacing: -0.4 },
  title: { size: 19, line: 25, font: fonts.bodySemibold, spacing: -0.1 },
  bodyLg: { size: 17, line: 25, font: fonts.body, spacing: 0 },
  body: { size: 16, line: 23, font: fonts.body, spacing: 0 },
  label: { size: 15, line: 20, font: fonts.bodyMedium, spacing: 0 },
  caption: { size: 13, line: 18, font: fonts.body, spacing: 0.1 },
  overline: { size: 12, line: 16, font: fonts.bodySemibold, spacing: 1.4 },
  mono: { size: 20, line: 28, font: fonts.mono, spacing: 1 },
};

export type TypeVariant = keyof typeof typeScale;

export type TextSize = 'standard' | 'large' | 'xlarge';

export const textSizeFactor: Record<TextSize, number> = {
  standard: 1,
  large: 1.12,
  xlarge: 1.25,
};

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export function toneColors(p: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'primary':
      return { fg: p.primary, bg: p.primarySoft };
    case 'success':
      return { fg: p.success, bg: p.successSoft };
    case 'warning':
      return { fg: p.warning, bg: p.warningSoft };
    case 'danger':
      return { fg: p.error, bg: p.errorSoft };
    case 'info':
      return { fg: p.info, bg: p.infoSoft };
    default:
      return { fg: p.textSecondary, bg: p.surfaceStrong };
  }
}
