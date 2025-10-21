import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
import { count } from 'drizzle-orm';

// Query the user table for the number of users
async function getUserCount(): Promise<number> {
    const [{ count: userCount }] = await db.select({ count: count() }).from(user);
    return Number(userCount) || 0;
}

export const load: PageServerLoad = async ({ cookies }) => {
    // Check for session cookie (should be 'client_token')
    const session = cookies.get('client_token');
    if (session) {
        // If session exists, redirect to dashboard
        throw redirect(302, '/dashboard');
    }

    const userCount = await getUserCount();

    if (userCount === 0) {
        // No users: redirect to setup page
        throw redirect(302, '/register');
    }

    // Otherwise, allow access to login page
    return {};
};