import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { tbl_notification } from '$lib/server/db/schema/schema.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import { logUserActivity } from '$lib/server/db/activity.js';

export const GET: RequestHandler = async ({ request, cookies, url }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  const notifications = await db
    .select({
      id: tbl_notification.id,
      title: tbl_notification.title,
      message: tbl_notification.message,
      type: tbl_notification.type,
      relatedItemType: tbl_notification.relatedItemType,
      relatedItemId: tbl_notification.relatedItemId,
      isRead: tbl_notification.isRead,
      sentAt: tbl_notification.sentAt
    })
    .from(tbl_notification)
    .where(and(
      eq(tbl_notification.recipientId, user.id),
      eq(tbl_notification.recipientType, 'user')
    ))
    .orderBy(desc(tbl_notification.sentAt))
    .limit(limit);

  return json({ success: true, data: { notifications } });
};

export const PATCH: RequestHandler = async ({ request, cookies }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  let body: { notificationId?: unknown; markAll?: unknown };
  try {
    body = await request.json();
  } catch {
    throw error(400, { message: 'Invalid request body' });
  }

  const recipient = and(
    eq(tbl_notification.recipientId, user.id),
    eq(tbl_notification.recipientType, 'user')
  );

  if (body.markAll === true) {
    const updated = await db.update(tbl_notification)
      .set({ isRead: true })
      .where(and(recipient, eq(tbl_notification.isRead, false)))
      .returning({ id: tbl_notification.id });
    if (updated.length > 0) {
      await logUserActivity({
        userId: user.id,
        activityType: 'notification_read',
        itemType: 'notification',
        details: `Marked ${updated.length} notifications as read`
      });
    }
  } else {
    const notificationId = Number(body.notificationId);
    if (!Number.isInteger(notificationId) || notificationId < 1) {
      throw error(400, { message: 'A valid notification ID is required' });
    }
    const [updated] = await db.update(tbl_notification)
      .set({ isRead: true })
      .where(and(recipient, eq(tbl_notification.id, notificationId), eq(tbl_notification.isRead, false)))
      .returning({ id: tbl_notification.id });
    if (updated) {
      await logUserActivity({
        userId: user.id,
        activityType: 'notification_read',
        itemType: 'notification',
        itemId: updated.id,
        details: 'Marked a notification as read'
      });
    }
  }

  return json({ success: true });
};
