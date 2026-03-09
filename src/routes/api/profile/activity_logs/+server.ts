import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { getUserActivities } from '$lib/server/db/activity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function getAuthUserId(cookies: any): number | null {
    try {
        const token = cookies.get('client_token');
        if (!token) return null;
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.userId || decoded.id || null;
    } catch {
        return null;
    }
}

export const GET: RequestHandler = async ({ cookies, url }) => {
    const userId = getAuthUserId(cookies);
    if (!userId) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // optional query param ?limit=xx
        const limParam = url.searchParams.get('limit');
        let limit = limParam ? Number(limParam) : 100;
        if (isNaN(limit) || limit < 1) limit = 100;

        const logs = await getUserActivities(userId, limit);
        return json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return json({ success: false, message: 'Failed to fetch activity logs' }, { status: 500 });
    }
};