import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user, student, faculty, bookBorrowing, bookReservation, book, userActivity } from '$lib/server/db/schema/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper: Get authenticated user and join student/faculty info
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

        // Attach student/faculty info
        let extraInfo = null;
        if (userRow.role === 'student') {
            const [studentRow] = await db.select().from(student).where(eq(student.userId, userId)).limit(1);
            if (studentRow) extraInfo = studentRow;
        } else if (userRow.role === 'faculty') {
            const [facultyRow] = await db.select().from(faculty).where(eq(faculty.userId, userId)).limit(1);
            if (facultyRow) extraInfo = facultyRow;
        }
        return { userRow, extraInfo };
    } catch {
        return null;
    }
}

export const GET: RequestHandler = async ({ request }) => {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
    }

    const { userRow, extraInfo } = currentUser;

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
        .where(and(eq(bookBorrowing.userId, userRow.id), eq(bookBorrowing.status, 'borrowed')));

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
        .where(and(eq(bookReservation.userId, userRow.id), eq(bookReservation.status, 'active')));

    // Recent activity (last 10)
    const activities = await db
        .select({
            id: userActivity.id,
            type: userActivity.activityType,
            details: userActivity.activityDetails,
            timestamp: userActivity.timestamp
        })
        .from(userActivity)
        .where(eq(userActivity.userId, userRow.id))
        .orderBy(desc(userActivity.timestamp))
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
        .where(and(eq(bookBorrowing.userId, userRow.id), gt(bookBorrowing.fine, 0), eq(bookBorrowing.status, 'overdue')));

    // Compose user info with extra fields from student/faculty
    let userInfo: any = {
        id: userRow.id,
        name: userRow.name,
        username: userRow.username,
        email: userRow.email,
        role: userRow.role,
        isActive: userRow.isActive
    };

    if (userRow.role === 'student' && extraInfo) {
        userInfo = {
            ...userInfo,
            gender: extraInfo.gender,
            age: extraInfo.age,
            enrollmentNo: 'enrollmentNo' in extraInfo ? extraInfo.enrollmentNo : null,
            course: 'course' in extraInfo ? extraInfo.course : null,
            year: 'year' in extraInfo ? extraInfo.year : null,
            department: extraInfo.department
        };
    } else if (userRow.role === 'faculty' && extraInfo) {
        userInfo = {
            ...userInfo,
            gender: extraInfo.gender,
            age: extraInfo.age,
            department: extraInfo.department,
            facultyNumber: 'facultyNumber' in extraInfo ? extraInfo.facultyNumber : null
        };
    }

    return new Response(JSON.stringify({
        success: true,
        user: userInfo,
        borrowedBooks,
        reservations,
        activities,
        penalties
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};