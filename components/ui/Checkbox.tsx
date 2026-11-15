import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { haptic } from './motion';

export const Checkbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => {
  const { theme } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptic.select();
        onChange(!checked);
      }}
      hapticFeedback={false}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      aria-checked={checked}
      accessibilityLabel={label}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          { borderColor: checked ? theme.primary : theme.ink, backgroundColor: checked ? theme.primary : 'transparent' },
        ]}
      >
        {checked ? <MaterialCommunityIcons name="check-bold" size={16} color={theme.onPrimary} /> : null}
      </View>
      <AppText variant="body" secondary style={{ flex: 1 }}>
        {label}
      </AppText>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
