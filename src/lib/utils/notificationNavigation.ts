type NotificationTarget = {
  type: string;
  relatedItemType?: string | null;
  relatedItemId?: number | null;
};

export function getNotificationDestination(notification: NotificationTarget): string {
  const type = notification.type.toLowerCase();
  const params = new URLSearchParams();
  let path = '/dashboard/issued';

  if (type === 'return_confirmation') {
    path = '/dashboard/history';
  } else if (type === 'overdue') {
    params.set('tab', 'overdue');
  } else if (type === 'due_reminder') {
    params.set('tab', 'borrowed');
  } else if (type === 'reservation_ready') {
    params.set('tab', 'all');
  } else if (type.includes('request') || type.includes('reservation')) {
    params.set('tab', 'reserved');
  } else {
    params.set('tab', 'all');
  }

  if (notification.relatedItemId != null) {
    params.set('focusItemId', String(notification.relatedItemId));
  }
  if (notification.relatedItemType) {
    params.set('focusItemType', notification.relatedItemType.toLowerCase());
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}