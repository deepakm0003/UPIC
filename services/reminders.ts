import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ID_KEY = '@upic_reminder_id';

/**
 * Weekly local reminder about passwords that need attention. The notification
 * text is generic on purpose — it never names a website on the lock screen.
 */
export async function scheduleHealthReminder(issueCount: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await cancelHealthReminder();
    if (issueCount === 0) return true;
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'UPIC password check-up',
        body: `${issueCount} password${issueCount === 1 ? '' : 's'} could be stronger. Open UPIC to fix ${issueCount === 1 ? 'it' : 'them'} in a tap.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 7 * 24 * 3600, repeats: true },
    });
    await AsyncStorage.setItem(ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export async function cancelHealthReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const id = await AsyncStorage.getItem(ID_KEY);
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(ID_KEY);
  } catch {
    // Nothing scheduled.
  }
}
