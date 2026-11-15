import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export const IconButton: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'primary';
  badge?: number;
}> = ({ icon, onPress, label, tone = 'default', badge }) => {
  const { theme } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[
        styles.iconBtn,
        {
          backgroundColor: tone === 'primary' ? theme.primary : theme.surface,
          borderColor: tone === 'primary' ? theme.primary : theme.ink,
          borderWidth: theme.outline,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={tone === 'primary' ? theme.onPrimary : theme.text} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <AppText variant="caption" weight="bold" color="#fff" style={{ fontSize: 11, lineHeight: 14 }}>
            {badge > 9 ? '9+' : badge}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
};

export interface HeaderProps {
  title?: string;
  /** Hide the back button (e.g. on tab roots). */
  noBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

/** Compact navigation header with a glass back button. */
export const Header: React.FC<HeaderProps> = ({ title, noBack, onBack, right }) => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const showBack = !noBack && (onBack || canGoBack);

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showBack ? (
          <IconButton icon="chevron-left" label="Go back" onPress={onBack ?? (() => navigation.goBack())} />
        ) : null}
      </View>
      <AppText variant="title" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title ?? ''}
      </AppText>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
};

/** Big left-aligned title block used at the top of tab screens and forms. */
export const TitleBlock: React.FC<{ eyebrow?: string; title: string; subtitle?: string; center?: boolean }> = ({
  eyebrow,
  title,
  subtitle,
  center,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.titleBlock, center && { alignItems: 'center' }]}>
      {eyebrow ? (
        <AppText variant="overline" color={theme.primary} align={center ? 'center' : 'left'}>
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="h1" accessibilityRole="header" align={center ? 'center' : 'left'}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodyLg" secondary align={center ? 'center' : 'left'}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 60,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  side: { width: 92, flexDirection: 'row' },
  right: { justifyContent: 'flex-end', gap: 8 },
  title: { flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  titleBlock: { gap: 8, marginBottom: 24 },
});
