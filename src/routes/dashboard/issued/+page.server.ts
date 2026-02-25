import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { tbl_user } from '$lib/server/db/schema/schema.js'; // <-- use tbl_user table
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const load: PageServerLoad = async ({ cookies, url }) => {
    const token = cookies.get('client_token');
    
    if (!token) {
        // Not logged in, redirect to login page
        throw redirect(302, '/');
    }

    try {
        // Verify and decode the JWT token
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId || decoded.id;
        
        if (!userId) {
            console.warn('Token missing user ID');
            cookies.delete('token', { path: '/' });
            throw redirect(302, '/');
        }

        // Verify user still exists and is active in database
        const [userRow] = await db
            .select({
                id: tbl_user.id,
                name: tbl_user.name,
                username: tbl_user.username,
                email: tbl_user.email,
                userType: tbl_user.userType,
                isActive: tbl_user.isActive
            })
            .from(tbl_user)
            .where(eq(tbl_user.id, userId))
            .limit(1);

        if (!userRow || !userRow.isActive) {
            console.warn('User not found or inactive:', userId);
            cookies.delete('token', { path: '/' });
            throw redirect(302, '/');
        }

        // Return user data to the page component (optional)
        return {
            user: {
                id: userRow.id,
                name: userRow.name,
                username: userRow.username,
                email: userRow.email,
                userType: userRow.userType
            }
        };

    } catch (error) {
        // Token is invalid or expired
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            console.warn('Invalid or expired token:', error.message);
            cookies.delete('token', { path: '/' });
            throw redirect(302, '/');
        }
        
        // Database or other errors
        console.error('Dashboard auth check error:', error);
        
        // Still redirect to login on any auth error
        cookies.delete('token', { path: '/' });
        throw redirect(302, '/');
    }
};