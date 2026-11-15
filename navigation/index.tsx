import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ThemeScope, useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { TabBar } from './TabBar';

import { SplashScreen } from '../screens/SplashScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { MasterPasswordSetupScreen } from '../screens/auth/MasterPasswordSetupScreen';
import { RecoveryKeyScreen } from '../screens/auth/RecoveryKeyScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { UnlockScreen } from '../screens/auth/UnlockScreen';
import { ForgotMasterPasswordScreen } from '../screens/auth/ForgotMasterPasswordScreen';
import { ForgotUsernameScreen } from '../screens/auth/ForgotUsernameScreen';
import { WalkthroughScreen } from '../screens/onboarding/WalkthroughScreen';
import { SecurityOverviewScreen } from '../screens/home/SecurityOverviewScreen';
import { PasswordListScreen } from '../screens/passwords/PasswordListScreen';
import { PasswordDetailsScreen } from '../screens/passwords/PasswordDetailsScreen';
import { PasswordEditScreen } from '../screens/passwords/PasswordEditScreen';
import { PasswordGeneratorScreen } from '../screens/passwords/PasswordGeneratorScreen';
import { PasswordHealthScreen } from '../screens/passwords/PasswordHealthScreen';
import { ImportExportScreen } from '../screens/passwords/ImportExportScreen';
import { MFAApprovalScreen } from '../screens/mfa/MFAApprovalScreen';
import { MFAHistoryScreen } from '../screens/mfa/MFAHistoryScreen';
import { RelayIntroScreen } from '../screens/relay/RelayIntroScreen';
import { RelayDashboardScreen } from '../screens/relay/RelayDashboardScreen';
import { CreateAliasScreen } from '../screens/relay/CreateAliasScreen';
import { AliasDetailsScreen } from '../screens/relay/AliasDetailsScreen';
import { PrivacyDashboardScreen } from '../screens/privacy/PrivacyDashboardScreen';
import { HowUPICProtectsScreen } from '../screens/privacy/HowUPICProtectsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { RecoverySettingsScreen } from '../screens/settings/RecoverySettingsScreen';
import { ChangeMasterPasswordScreen } from '../screens/settings/ChangeMasterPasswordScreen';
import { AppearanceScreen } from '../screens/settings/AppearanceScreen';
import { AboutScreen } from '../screens/settings/AboutScreen';

import type { AuthStackParamList, MainStackParamList, MainTabParamList } from '../types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const LockedStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const stackOptions = { headerShown: false, animation: 'slide_from_right' as const, contentStyle: { backgroundColor: 'transparent' } };

const MainTabs = () => (
  <Tabs.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="Home" component={SecurityOverviewScreen} />
    <Tabs.Screen name="Passwords" component={PasswordListScreen} />
    <Tabs.Screen name="MFA" component={MFAApprovalScreen} />
    <Tabs.Screen name="Relay" component={RelayDashboardScreen} />
    <Tabs.Screen name="Settings" component={SettingsScreen} />
  </Tabs.Navigator>
);

const MainNavigator: React.FC<{ walkthroughDone: boolean }> = ({ walkthroughDone }) => (
  <MainStack.Navigator screenOptions={stackOptions} initialRouteName={walkthroughDone ? 'Tabs' : 'Walkthrough'}>
    <MainStack.Screen name="Tabs" component={MainTabs} />
    <MainStack.Screen name="Walkthrough" component={WalkthroughScreen} options={{ animation: 'fade' }} />
    <MainStack.Screen name="PasswordDetails" component={PasswordDetailsScreen as any} />
    <MainStack.Screen name="PasswordEdit" component={PasswordEditScreen as any} />
    <MainStack.Screen name="PasswordGenerator" component={PasswordGeneratorScreen as any} />
    <MainStack.Screen name="PasswordHealth" component={PasswordHealthScreen} />
    <MainStack.Screen name="ImportExport" component={ImportExportScreen} />
    <MainStack.Screen name="MFAHistory" component={MFAHistoryScreen} />
    <MainStack.Screen name="RelayIntro" component={RelayIntroScreen} options={{ animation: 'slide_from_bottom' }} />
    <MainStack.Screen name="CreateAlias" component={CreateAliasScreen} />
    <MainStack.Screen name="AliasDetails" component={AliasDetailsScreen as any} />
    <MainStack.Screen name="PrivacyDashboard" component={PrivacyDashboardScreen} />
    <MainStack.Screen name="HowUPICProtects" component={HowUPICProtectsScreen as any} />
    <MainStack.Screen name="RecoverySettings" component={RecoverySettingsScreen} />
    <MainStack.Screen name="RecoveryKey" component={RecoveryKeyScreen as any} />
    <MainStack.Screen name="ChangeMasterPassword" component={ChangeMasterPasswordScreen} />
    <MainStack.Screen name="Appearance" component={AppearanceScreen} />
    <MainStack.Screen name="About" component={AboutScreen} />
  </MainStack.Navigator>
);

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={stackOptions}>
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    <AuthStack.Screen name="MasterPasswordSetup" component={MasterPasswordSetupScreen} />
    <AuthStack.Screen name="RecoveryKey" component={RecoveryKeyScreen as any} />
    <AuthStack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
    <AuthStack.Screen name="HowUPICProtects" component={HowUPICProtectsScreen as any} />
    <AuthStack.Screen name="ForgotMasterPassword" component={ForgotMasterPasswordScreen as any} />
    <AuthStack.Screen name="ForgotUsername" component={ForgotUsernameScreen} />
  </AuthStack.Navigator>
);

const LockedNavigator = () => (
  <LockedStack.Navigator screenOptions={stackOptions}>
    <LockedStack.Screen name="Unlock" component={UnlockScreen} options={{ animation: 'fade' }} />
    <LockedStack.Screen name="ForgotMasterPassword" component={ForgotMasterPasswordScreen as any} />
    <LockedStack.Screen name="RecoveryKey" component={RecoveryKeyScreen as any} />
  </LockedStack.Navigator>
);

/** Which navigator is shown depends only on the vault state — there is no way to reach vault screens while locked. */
export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { status, walkthroughDone, user } = useAuth();

  const navTheme = {
    ...(theme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDark ? DarkTheme : DefaultTheme).colors,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      primary: theme.primary,
      border: theme.border,
    },
  };

  if (status === 'loading') return <SplashScreen />;

  return (
    // Keyed by status: switching between sign-up, lock and app must start a fresh
    // navigation state, otherwise screens that exist in both stacks are reused.
    <NavigationContainer key={status} theme={navTheme}>
      {status === 'unlocked' ? (
        <MainNavigator key={user?.id ?? 'main'} walkthroughDone={walkthroughDone} />
      ) : status === 'locked' ? (
        <ThemeScope mode="light">
          <LockedNavigator />
        </ThemeScope>
      ) : (
        <ThemeScope mode="light">
          <AuthNavigator />
        </ThemeScope>
      )}
    </NavigationContainer>
  );
};
