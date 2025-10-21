import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
    const token = cookies.get('client_token');
    if (!token) throw redirect(302, '/');

    try {
        // Decode and verify JWT
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId || decoded.id;
        if (!userId) {
            cookies.delete('client_token', { path: '/' });
            throw redirect(302, '/');
        }

        // Fetch user profile
        const res = await fetch('/api/profile', {
            headers: { authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw redirect(302, '/');
        const data = await res.json();
        if (!data.success) throw redirect(302, '/');

        // Merge extraInfo into user for easier access in Svelte page
        let mergedUser = data.user;
        if (data.extraInfo) {
            mergedUser = { ...data.user, ...data.extraInfo };
        }

        // Optionally fetch stats
        let stats = {};
        const statsRes = await fetch('/api/dashboard/stats', {
            headers: { authorization: `Bearer ${token}` }
        });
        if (statsRes.ok) {
            const statsData = await statsRes.json();
            if (statsData.success) stats = statsData.stats;
        }

        return {
            user: mergedUser,
            stats
        };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            cookies.delete('client_token', { path: '/' });
        }
        throw redirect(302, '/');
    }
};