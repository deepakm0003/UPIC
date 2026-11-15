import React from 'react';
import { StyleProp, StyleSheet, Switch, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { haptic } from './motion';

/** Card that stacks rows with hairline separators. */
export const ListGroup: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const { theme } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.ink, borderWidth: theme.outline }, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={[styles.sep, { backgroundColor: theme.border }]} /> : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
};

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
  chevron?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  meta,
  left,
  right,
  onPress,
  onLongPress,
  destructive,
  accessibilityHint,
  chevron,
}) => {
  const { theme } = useTheme();
  const content = (
    <View style={styles.row}>
      {left}
      <View style={styles.texts}>
        <AppText variant="label" weight="semibold" color={destructive ? theme.error : theme.text} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" secondary numberOfLines={1} style={{ fontSize: 14, lineHeight: 19 }}>
            {subtitle}
          </AppText>
        ) : null}
        {meta ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </View>
      {right}
      {(chevron ?? (!!onPress && !right)) ? (
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress && !onLongPress) return content;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </PressableScale>
  );
};

export const ToggleRow: React.FC<{
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  left?: React.ReactNode;
  disabled?: boolean;
}> = ({ title, subtitle, value, onValueChange, left, disabled }) => {
  const { theme } = useTheme();
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      left={left}
      right={
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={(v) => {
            haptic.select();
            onValueChange(v);
          }}
          trackColor={{ false: theme.surfaceStrong, true: theme.primary }}
          thumbColor={theme.isDark ? '#fff' : value ? '#fff' : '#f4f4f5'}
          ios_backgroundColor={theme.surfaceStrong}
          accessibilityLabel={title}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 60 },
  texts: { flex: 1, gap: 2, minWidth: 0 },
});
