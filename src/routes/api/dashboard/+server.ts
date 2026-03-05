import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { tbl_user, tbl_student, tbl_faculty, tbl_book_borrowing, tbl_book_reservation, tbl_book } from '$lib/server/db/schema/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { calculateFineAmount, calculateDaysOverdue } from '$lib/server/utils/fineCalculation.js';

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
        const [userRow] = await db.select().from(tbl_user).where(eq(tbl_user.id, userId)).limit(1);
        if (!userRow || !userRow.isActive) return null;

        // Attach student/faculty info
        let extraInfo = null;
        if (userRow.userType === 'student') {
            const [studentRow] = await db.select().from(tbl_student).where(eq(tbl_student.userId, userId)).limit(1);
            if (studentRow) extraInfo = studentRow;
        } else if (userRow.userType === 'faculty') {
            const [facultyRow] = await db.select().from(tbl_faculty).where(eq(tbl_faculty.userId, userId)).limit(1);
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

    // Borrowed books (not returned) - do separate queries to avoid circular references
    const borrowedBorrowings = await db
        .select()
        .from(tbl_book_borrowing)
        .where(and(eq(tbl_book_borrowing.userId, userRow.id), eq(tbl_book_borrowing.status, 'borrowed')));

    const borrowedBooks = await Promise.all(
        borrowedBorrowings.map(async (borrow) => {
            const [book] = await db.select().from(tbl_book).where(eq(tbl_book.id, borrow.bookId)).limit(1);
            return {
                id: borrow.id,
                title: book?.title || 'Unknown',
                author: book?.author || 'Unknown',
                dueDate: borrow.dueDate,
                status: borrow.status
            };
        })
    );

    // Reservations - do separate queries
    const bookReservations = await db
        .select()
        .from(tbl_book_reservation)
        .where(and(eq(tbl_book_reservation.userId, userRow.id), eq(tbl_book_reservation.status, 'active')));

    const reservations = await Promise.all(
        bookReservations.map(async (res) => {
            const [book] = await db.select().from(tbl_book).where(eq(tbl_book.id, res.bookId)).limit(1);
            return {
                id: res.id,
                title: book?.title || 'Unknown',
                author: book?.author || 'Unknown',
                reservedDate: res.reservationDate,
                status: res.status
            };
        })
    );

    // Recent activity (last 10 - using borrowing transactions as activity log) - do separate queries
    const recentBorrowings = await db
        .select()
        .from(tbl_book_borrowing)
        .where(eq(tbl_book_borrowing.userId, userRow.id))
        .orderBy(desc(tbl_book_borrowing.createdAt))
        .limit(10);

    const activities = await Promise.all(
        recentBorrowings.map(async (borrow) => {
            const [book] = await db.select().from(tbl_book).where(eq(tbl_book.id, borrow.bookId)).limit(1);
            return {
                id: borrow.id,
                title: book?.title || 'Unknown',
                type: 'borrow',
                timestamp: borrow.createdAt
            };
        })
    );

    // Penalties/fines (overdue items)
    const overdueBorrowings = await db
        .select()
        .from(tbl_book_borrowing)
        .where(and(eq(tbl_book_borrowing.userId, userRow.id), eq(tbl_book_borrowing.status, 'overdue')));

    const penalties = await Promise.all(
        overdueBorrowings.map(async (borrow) => {
            const [book] = await db.select().from(tbl_book).where(eq(tbl_book.id, borrow.bookId)).limit(1);
            const days = await calculateDaysOverdue(new Date(borrow.dueDate));
            const fine = Number((await calculateFineAmount(new Date(borrow.dueDate))).toFixed(2));
            return {
                id: borrow.id,
                title: book?.title || 'Unknown',
                status: borrow.status,
                dueDate: borrow.dueDate,
                daysOverdue: days,
                fine
            };
        })
    );

    // Compose user info with extra fields from student/faculty
    let userInfo: any = {
        id: userRow.id,
        name: userRow.name,
        username: userRow.username,
        email: userRow.email,
        userType: userRow.userType,
        isActive: userRow.isActive
    };

    if (userRow.userType === 'student' && extraInfo) {
        userInfo = {
            ...userInfo,
            gender: extraInfo.gender,
            age: extraInfo.age,
            enrollmentNo: 'enrollmentNo' in extraInfo ? extraInfo.enrollmentNo : null,
            course: 'course' in extraInfo ? extraInfo.course : null,
            year: 'year' in extraInfo ? extraInfo.year : null,
            department: extraInfo.department
        };
    } else if (userRow.userType === 'faculty' && extraInfo) {
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