import { db } from './index.js';
import { tbl_user_activity } from './schema/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface UserActivityParams {
    userId: number;
    activityType: string;
    itemType?: string | null;
    itemId?: number | null;
    details?: string | null;
}

/**
 * Insert a row into the user_activity table. Other server
 * code can call this after performing an action on behalf of
 * a logged-in user so that they can later review what they did.
 */
export async function logUserActivity(params: UserActivityParams) {
    try {
        await db.insert(tbl_user_activity).values({
            userId: params.userId,
            activityType: params.activityType,
            itemType: params.itemType || null,
            itemId: params.itemId || null,
            details: params.details || null,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Failed to log user activity:', err);
    }
}

/**
 * Retrieve the most recent activities for a given user.
 * `limit` defaults to 100 and is capped at 1000 to avoid
 * accidentally returning huge result sets.
 */
export async function getUserActivities(userId: number, limit = 100) {
    if (limit > 1000) limit = 1000;
    try {
        const rows = await db
            .select()
            .from(tbl_user_activity)
            .where(eq(tbl_user_activity.userId, userId))
            .orderBy(desc(tbl_user_activity.timestamp))
            .limit(limit);
        return rows;
    } catch (err) {
        console.error('Failed to fetch user activities:', err);
        return [];
    }
}
