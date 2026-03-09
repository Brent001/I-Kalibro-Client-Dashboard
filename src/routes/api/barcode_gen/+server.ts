import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { tbl_user, tbl_student, tbl_faculty } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const GET: RequestHandler = async ({ request, cookies }) => {
    try {
        // Accept token from cookie (set by login) or Authorization header
        const cookieToken = cookies.get('client_token');
        const authHeader = request.headers.get('authorization');
        const token = cookieToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

        if (!token) {
            return new Response(JSON.stringify({ success: false, message: 'No token provided' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        let decoded: any;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // Fetch base user
        const [userRow] = await db
            .select({ id: tbl_user.id, userType: tbl_user.userType })
            .from(tbl_user)
            .where(eq(tbl_user.id, decoded.userId || decoded.id))
            .limit(1);

        if (!userRow) {
            return new Response(JSON.stringify({ success: false, message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        if (userRow.userType === 'student') {
            const [studentRow] = await db
                .select({ enrollmentNo: tbl_student.enrollmentNo })
                .from(tbl_student)
                .where(eq(tbl_student.userId, userRow.id))
                .limit(1);

            if (!studentRow) {
                return new Response(JSON.stringify({ success: false, message: 'Student profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({ success: true, userType: 'student', identifier: studentRow.enrollmentNo }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (userRow.userType === 'faculty') {
            const [facultyRow] = await db
                .select({ facultyNumber: tbl_faculty.facultyNumber })
                .from(tbl_faculty)
                .where(eq(tbl_faculty.userId, userRow.id))
                .limit(1);

            if (!facultyRow) {
                return new Response(JSON.stringify({ success: false, message: 'Faculty profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({ success: true, userType: 'faculty', identifier: facultyRow.facultyNumber }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Fallback for other user types
        return new Response(JSON.stringify({ success: false, message: 'Unsupported user type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Barcode_gen API error:', error);
        return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
