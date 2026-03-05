import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
    const token = cookies.get('client_token');
    if (!token) throw redirect(302, '/');

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId || decoded.id;
        if (!userId) {
            cookies.delete('client_token', { path: '/' });
            throw redirect(302, '/');
        }

        const res = await fetch('/api/profile/activity_logs', {
            headers: { authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw redirect(302, '/dashboard/profile');
        const data = await res.json();
        if (!data.success) throw redirect(302, '/dashboard/profile');

        return {
            logs: data.logs || []
        };
    } catch (error) {
        if (
            error instanceof jwt.JsonWebTokenError ||
            error instanceof jwt.TokenExpiredError
        ) {
            cookies.delete('client_token', { path: '/' });
        }
        throw redirect(302, '/');
    }
};
