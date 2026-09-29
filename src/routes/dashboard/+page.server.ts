import type { PageServerLoad } from './$types.js';
import { error, redirect } from '@sveltejs/kit';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import { getUserActivities } from '$lib/server/db/activity.js';

export const load: PageServerLoad = async ({ cookies, fetch, request }) => {
    const token = cookies.get('client_token');
    const authenticatedUser = await authenticateClientRequest(request, token);
    if (!authenticatedUser) {
        cookies.delete('client_token', { path: '/' });
        throw redirect(302, '/');
    }

    const response = await fetch('/api/dashboard', {
        headers: { authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw error(502, { message: 'Dashboard data is unavailable' });

    const result = await response.json();
    if (!result.success) throw error(502, { message: 'Dashboard data is unavailable' });

    const overdueByKey = new Map<string, any>(
        (result.overdue ?? []).map((item: any) => [`${item.itemType}:${item.id}`, item])
    );
    const borrowedByKey = new Map<string, any>();
    for (const item of [...(result.borrowed ?? []), ...(result.overdue ?? [])]) {
        borrowedByKey.set(`${item.itemType}:${item.id}`, item);
    }

    const borrowedBooks = [...borrowedByKey.entries()].map(([key, item]) => {
        const dueDate = new Date(item.dueDate);
        const now = new Date();
        const dueDay = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const daysLeft = Math.ceil((dueDay - today) / 86_400_000);
        return {
            ...item,
            status: overdueByKey.has(key) ? 'overdue' : item.status,
            daysLeft
        };
    });

    const activities = (await getUserActivities(authenticatedUser.id, 5)).map((activity) => ({
        id: activity.id,
        type: activity.activityType,
        details: activity.details ?? activity.activityType,
        timestamp: activity.timestamp
    }));

    return {
        user: result.user,
        borrowedBooks,
        reservations: result.reserved ?? [],
        activities,
        penalties: (result.overdue ?? []).map((item: any) => ({ ...item, status: 'unpaid', amount: item.fine }))
    };
};