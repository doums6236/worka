import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let tokenRegistered = false;

/**
 * SDK 53+ : `expo-notifications` plante au chargement en Expo Go (l'erreur
 * "expo-notifications: Android Push notifications functionality was removed
 * from Expo Go" est levée par addPushTokenListener au moment du `require`).
 *
 * On évite donc TOUT import top-level du module, et on le charge dynamiquement
 * uniquement quand on est en dev-client / EAS Build.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function loadNotifs() {
  if (isExpoGo) return null;
  try {
    const mod = await import('expo-notifications');
    return mod;
  } catch {
    return null;
  }
}

export async function registerPushTokenAsync(): Promise<string | null> {
  if (tokenRegistered) return null;
  if (isExpoGo) {
    // Pas de push distantes possibles, mais on ne crash pas. Les rappels locaux
    // sont aussi désactivés ici (ils nécessitent le module natif).
    tokenRegistered = true;
    return null;
  }

  const Notifications = await loadNotifs();
  if (!Notifications) return null;

  // Configure how notifications behave when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) return null;
  } catch {
    return null;
  }

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

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    const { notificationsApi } = await import('../api/endpoints');
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
 * Programme des rappels locaux 24h et 1h avant un rendez-vous.
 * En Expo Go : no-op (le module natif n'est pas dispo).
 */
export async function scheduleAppointmentReminders(
  datetime: string,
  title: string,
  body: string,
): Promise<string[]> {
  if (isExpoGo) return [];

  const Notifications = await loadNotifs();
  if (!Notifications) return [];

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
  if (isExpoGo) return;
  const Notifications = await loadNotifs();
  if (!Notifications) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }
}
