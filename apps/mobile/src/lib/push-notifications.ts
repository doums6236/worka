import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { notificationsApi } from '../api/endpoints';

let tokenRegistered = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Remote push tokens (Expo Push) are NOT available in Expo Go since SDK 53.
 * They only work in a dev-client / standalone (EAS) build.
 * Local scheduled notifications work everywhere.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registerPushTokenAsync(): Promise<string | null> {
  if (tokenRegistered) return null;
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A91FF',
    });
  }

  if (isExpoGo) {
    // Expo Go cannot get remote push tokens since SDK 53. Local reminders still work.
    tokenRegistered = true;
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    const platform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await notificationsApi.registerPushToken(token, platform);
    tokenRegistered = true;
    return token;
  } catch {
    return null;
  }
}

/**
 * Schedule two local reminders for an appointment: 24h and 1h before.
 * Returns the scheduled notification identifiers (for cancellation).
 */
export async function scheduleAppointmentReminders(
  datetime: string,
  title: string,
  body: string,
): Promise<string[]> {
  const target = new Date(datetime).getTime();
  const now = Date.now();
  const ids: string[] = [];

  const reminders = [
    { offset: 24 * 60 * 60 * 1000, label: 'Demain' },
    { offset: 60 * 60 * 1000, label: 'Dans 1h' },
  ];

  for (const r of reminders) {
    const fire = target - r.offset;
    if (fire <= now + 5000) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${r.label} · ${title}`,
        body,
        data: { type: 'appointment_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fire),
      },
    });
    ids.push(id);
  }

  return ids;
}

export async function cancelScheduled(ids: string[]) {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }
}
