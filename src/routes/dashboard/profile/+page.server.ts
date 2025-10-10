import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
    const token = cookies.get('client_token');
    if (!token) throw redirect(302, '/');

    try {
        jwt.verify(token, JWT_SECRET);

        // Fetch dashboard data from API
        const res = await fetch('/api/dashboard', {
            headers: { authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw redirect(302, '/');
        const data = await res.json();
        if (!data.success) throw redirect(302, '/');

        // Pass all dashboard data to the page
        return {
            user: data.user,
            myBooks: data.borrowedBooks,
            myReservations: data.reservations,
            recentActivity: data.activities,
            penalties: data.penalties
        };
    } catch {
        cookies.delete('token', { path: '/' });
        throw redirect(302, '/');
    }
};