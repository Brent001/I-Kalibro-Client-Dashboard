import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';

export const load: PageServerLoad = async ({ cookies, fetch, request }) => {
    const token = cookies.get('client_token');
    const user = await authenticateClientRequest(request, token);
    if (!user) {
        cookies.delete('client_token', { path: '/' });
        throw redirect(302, '/');
    }

    try {
        const response = await fetch('/api/profile/activity_logs?limit=1000', {
            headers: { authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Unable to load activity logs');
        const result = await response.json();
        if (!result.success) throw new Error('Unable to load activity logs');

        return {
            logs: result.logs || [],
            loadError: ''
        };
    } catch (cause) {
        console.error('Failed to load activity logs:', cause);
        return {
            logs: [],
            loadError: 'Activity logs could not be loaded. Retry to check again.'
        };
    }
};
