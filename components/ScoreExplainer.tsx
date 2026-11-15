import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, BottomSheet, Button } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import { SCORE_EXPLANATION, SecurityReport } from '../services/securityScore';

/** "What is this score based on?" — answers the Phase 1 confusion about the score. */
export const ScoreExplainer: React.FC<{ visible: boolean; onClose: () => void; report: SecurityReport }> = ({ visible, onClose, report }) => {
  const { theme } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">How your score works</AppText>
      <AppText variant="body" secondary style={{ marginTop: 6, marginBottom: 16 }}>
        {SCORE_EXPLANATION}
      </AppText>
      <View style={[styles.table, { borderColor: theme.border }]}>
        {report.factors.map((f, i) => (
          <View key={f.key} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <MaterialCommunityIcons
              name={f.pointsLost > 0 ? 'minus-circle-outline' : 'check-circle-outline'}
              size={20}
              color={f.pointsLost > 0 ? theme.warning : theme.success}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="semibold">
                {f.label}
              </AppText>
              <AppText variant="caption" secondary>
                {f.affected} affected · {f.explanation}
              </AppText>
            </View>
            <AppText variant="label" weight="bold" color={f.pointsLost > 0 ? theme.warning : theme.success}>
              {f.pointsLost > 0 ? `−${f.pointsLost}` : '0'}
            </AppText>
          </View>
        ))}
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.borderStrong }]}>
          <AppText variant="label" weight="bold" style={{ flex: 1 }}>
            Your score
          </AppText>
          <AppText variant="title">{report.score ?? '—'}</AppText>
        </View>
      </View>
      <Button title="Got it" onPress={onClose} style={{ marginTop: 18 }} />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
});
