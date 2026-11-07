/**
 * Notification management utility
 * Handles permission requests at login and triggers desktop notifications for incoming messages.
 */

export const notificationSettings = {
  get notificationsEnabled(): boolean {
    const val = localStorage.getItem('nexus_notifications_enabled');
    return val === null ? true : val === 'true';
  },
  set notificationsEnabled(enabled: boolean) {
    localStorage.setItem('nexus_notifications_enabled', enabled ? 'true' : 'false');
  },
  get askedPermission(): boolean {
    return localStorage.getItem('nexus_asked_notification_perm') === 'true';
  },
  set askedPermission(val: boolean) {
    localStorage.setItem('nexus_asked_notification_perm', val ? 'true' : 'false');
  },
};

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  notificationSettings.askedPermission = true;
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      notificationSettings.notificationsEnabled = true;
    }
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return Notification.permission;
  }
}

export function sendDesktopNotification(
  title: string,
  body: string,
  options?: { tag?: string; icon?: string; onClick?: () => void }
): Notification | null {
  if (!notificationSettings.notificationsEnabled) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(title, {
      body,
      icon: options?.icon || '💬',
      tag: options?.tag || 'nexus-chat-message',
      silent: true, // We already use our synthesized Web Audio API for custom sound
    });

    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    } else {
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      try {
        notif.close();
      } catch {}
    }, 5000);

    return notif;
  } catch (err) {
    console.debug('Notification could not be spawned:', err);
    return null;
  }
}
