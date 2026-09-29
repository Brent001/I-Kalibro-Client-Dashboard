import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { getUserActivities } from '$lib/server/db/activity.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';

export const GET: RequestHandler = async ({ request, cookies, url }) => {
    const user = await authenticateClientRequest(request, cookies.get('client_token'));
    if (!user) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requestedLimit = Number(url.searchParams.get('limit') ?? '1000');
        const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 1000)
            : 1000;
        const logs = await getUserActivities(user.id, limit);
        return json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return json({ success: false, message: 'Failed to fetch activity logs' }, { status: 500 });
    }
};