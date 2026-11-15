import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuroraBackground } from './AuroraBackground';
import { useTheme } from '../../contexts/ThemeContext';

export const TAB_BAR_SPACE = 84;

export interface ScreenProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  /** Sticky area at the bottom (primary actions). */
  footer?: React.ReactNode;
  scroll?: boolean;
  /** Leaves room for the floating tab bar on tab screens. */
  tabBarSpace?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  auroraIntensity?: number;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  header,
  footer,
  scroll = true,
  tabBarSpace,
  contentStyle,
  refreshControl,
  auroraIntensity,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const bottomPad = tabBarSpace ? TAB_BAR_SPACE + insets.bottom : footer ? 16 : 32 + insets.bottom;

  const inner = (
    <View style={[styles.content, { paddingBottom: bottomPad }, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <AuroraBackground intensity={auroraIntensity} />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.flex}>
        {header}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {inner}
            </ScrollView>
          ) : (
            <View style={[styles.flex, styles.scrollContent]}>{inner}</View>
          )}
          {footer ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.footerInner}>{footer}</View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: 560, paddingHorizontal: 20, paddingTop: 8, flexGrow: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 12, alignItems: 'center' },
  footerInner: { width: '100%', maxWidth: 560, gap: 10 },
});
