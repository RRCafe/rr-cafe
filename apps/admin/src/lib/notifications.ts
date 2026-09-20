import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  }

  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export async function showNotification(title: string, options?: NotificationOptions, onClickRoute?: string) {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body: options?.body || '',
          id: new Date().getTime(),
          schedule: { at: new Date(Date.now() + 100) },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: { route: onClickRoute }
        }
      ]
    });
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification(title, options);
  if (onClickRoute) {
    notification.onclick = () => {
      window.focus();
      window.location.href = onClickRoute;
      notification.close();
    };
  }
}

if (Capacitor.isNativePlatform()) {
  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    const route = notification.notification.extra?.route;
    if (route) window.location.href = route;
  });
}
