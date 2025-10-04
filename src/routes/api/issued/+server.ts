import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { eq, and, gt, or } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { user, book, bookBorrowing, bookReservation } from '$lib/server/db/schema/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper: Authenticate user from request
async function authenticateUser(request: Request) {
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
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
  const userId = decoded.userId || decoded.id;
  if (!userId) return null;
  const [userRow] = await db
    .select({ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, isActive: user.isActive })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!userRow || !userRow.isActive) return null;
  return userRow;
}

// GET /api/issued - Get user's borrowed, reserved, overdue books
export const GET: RequestHandler = async ({ request }) => {
  const currentUser = await authenticateUser(request);
  if (!currentUser) {
    throw error(401, { message: 'Unauthorized' });
  }

  // Borrowed books (status = 'borrowed')
  const borrowed = await db
    .select({
      id: bookBorrowing.id,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      dueDate: bookBorrowing.dueDate,
      borrowDate: bookBorrowing.borrowDate,
      status: bookBorrowing.status
    })
    .from(bookBorrowing)
    .leftJoin(book, eq(bookBorrowing.bookId, book.id))
    .where(and(eq(bookBorrowing.userId, currentUser.id), eq(bookBorrowing.status, 'borrowed')));

  // Reserved books (status = 'active')
  const reserved = await db
    .select({
      id: bookReservation.id,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      reservedDate: bookReservation.reservationDate,
      status: bookReservation.status
    })
    .from(bookReservation)
    .leftJoin(book, eq(bookReservation.bookId, book.id))
    .where(and(eq(bookReservation.userId, currentUser.id), eq(bookReservation.status, 'active')));

  // Overdue books (status = 'overdue' OR borrowed and dueDate < today)
  const today = new Date().toISOString().split('T')[0];
  const overdue = await db
    .select({
      id: bookBorrowing.id,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      dueDate: bookBorrowing.dueDate,
      borrowDate: bookBorrowing.borrowDate,
      status: bookBorrowing.status
    })
    .from(bookBorrowing)
    .leftJoin(book, eq(bookBorrowing.bookId, book.id))
    .where(and(
      eq(bookBorrowing.userId, currentUser.id),
      or(
        eq(bookBorrowing.status, 'overdue'),
        and(eq(bookBorrowing.status, 'borrowed'), gt(today, bookBorrowing.dueDate))
      )
    ));

  return json({
    user: {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      email: currentUser.email,
      role: currentUser.role
    },
    borrowed,
    reserved,
    overdue
  });
};