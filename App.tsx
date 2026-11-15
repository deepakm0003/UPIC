import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { AppNavigator } from './navigation';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui';

/** Records touches so auto-lock knows the user is still active. Never captures the touch itself. */
const ActivityBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reportActivity } = useAuth();
  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        reportActivity();
        return false;
      }}
    >
      {children}
    </View>
  );
};

const Root: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <ToastProvider>
        <ActivityBoundary>
          <AppNavigator />
        </ActivityBoundary>
      </ToastProvider>
    </View>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  // Never block the app on fonts: fall back to system fonts after a short wait.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded && !fontError && !timedOut) return <View style={{ flex: 1, backgroundColor: '#F2F3F7' }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
