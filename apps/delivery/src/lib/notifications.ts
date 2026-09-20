export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function showNotification(title: string, options?: NotificationOptions, onClickRoute?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const notification = new Notification(title, options);
  
  if (onClickRoute) {
    notification.onclick = () => {
      window.focus();
      // Use history or simple navigation if window.location works
      window.location.href = onClickRoute;
      notification.close();
    };
  }
}
