import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user, bookBorrowing, bookReservation, book, userActivity } from '$lib/server/db/schema/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function getAuthenticatedUser(request: Request) {
    let token: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    if (!token) {
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
            const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
            token = cookies.client_token;
        }
    }
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId || decoded.id;
        if (!userId) return null;
        const [userRow] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
        if (!userRow || !userRow.isActive) return null;
        return userRow;
    } catch {
        return null;
    }
}

export const GET: RequestHandler = async ({ request }) => {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
    }

    // Borrowed books (not returned)
    const borrowedBooks = await db
        .select({
            id: bookBorrowing.id,
            title: book.title,
            author: book.author,
            dueDate: bookBorrowing.dueDate,
            status: bookBorrowing.status,
            fine: bookBorrowing.fine
        })
        .from(bookBorrowing)
        .leftJoin(book, eq(bookBorrowing.bookId, book.id))
        .where(and(eq(bookBorrowing.userId, currentUser.id), eq(bookBorrowing.status, 'borrowed')));

    // Reservations
    const reservations = await db
        .select({
            id: bookReservation.id,
            title: book.title,
            author: book.author,
            reservedDate: bookReservation.reservationDate,
            status: bookReservation.status
        })
        .from(bookReservation)
        .leftJoin(book, eq(bookReservation.bookId, book.id))
        .where(and(eq(bookReservation.userId, currentUser.id), eq(bookReservation.status, 'active')));

    // Recent activity (last 10)
    const activities = await db
        .select({
            id: userActivity.id,
            type: userActivity.activityType,
            details: userActivity.activityDetails,
            timestamp: userActivity.timestamp
        })
        .from(userActivity)
        .where(eq(userActivity.userId, currentUser.id))
        .orderBy(userActivity.timestamp) // <-- FIXED
        .limit(10);

    // Penalties/fines (unpaid)
    const penalties = await db
        .select({
            id: bookBorrowing.id,
            title: book.title,
            fine: bookBorrowing.fine,
            status: bookBorrowing.status,
            dueDate: bookBorrowing.dueDate
        })
        .from(bookBorrowing)
        .leftJoin(book, eq(bookBorrowing.bookId, book.id))
        .where(and(eq(bookBorrowing.userId, currentUser.id), gt(bookBorrowing.fine, 0), eq(bookBorrowing.status, 'overdue')));

    return new Response(JSON.stringify({
        success: true,
        user: {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            email: currentUser.email,
            role: currentUser.role,
            course: currentUser.course,
            department: currentUser.department,
            enrollmentNo: currentUser.enrollmentNo
        },
        borrowedBooks,
        reservations,
        activities,
        penalties
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};