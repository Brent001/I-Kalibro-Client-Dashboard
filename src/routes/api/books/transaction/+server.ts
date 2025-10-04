import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { book, bookBorrowing, bookReservation, user } from '$lib/server/db/schema/schema.js';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper: Authenticate user
async function authenticateUser(request: Request) {
  let token: string | null = null;

  // Get token from Authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return null;
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }

  const userId = decoded.userId || decoded.id;
  if (!userId) return null;

  try {
    const [userRow] = await db
      .select({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) return null;

    return {
      id: userRow.id,
      role: userRow.role,
      username: userRow.username,
      email: userRow.email
    };
  } catch (dbError) {
    console.error('Database error in authenticateUser:', dbError);
    return null;
  }
}

// Helper: Calculate due date (14 days from today)
function calculateDueDate(): string {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  return dueDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// Helper: Get today's date
function getTodaysDate(): string {
  return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// Reserve a book (users can only reserve ONE book at a time)
export const POST: RequestHandler = async ({ request }) => {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return error(400, { message: 'Invalid JSON in request body' });
    }

    const { bookId, userId } = requestBody;
    if (!bookId || !userId) {
      return error(400, { message: 'Book ID and User ID are required' });
    }

    const bookIdNum = parseInt(bookId);
    const userIdNum = parseInt(userId);

    if (isNaN(bookIdNum) || isNaN(userIdNum)) {
      return error(400, { message: 'Book ID and User ID must be valid numbers' });
    }

    // Check if user exists
    const [userExists] = await db.select({ id: user.id }).from(user).where(eq(user.id, userIdNum)).limit(1);
    if (!userExists) {
      return error(404, { message: 'User not found' });
    }

    // Check book existence
    const [targetBook] = await db.select().from(book).where(eq(book.id, bookIdNum)).limit(1);
    if (!targetBook) {
      return error(404, { message: 'Book not found' });
    }

    // Only allow reservation if no copies are available
    if (targetBook.copiesAvailable && targetBook.copiesAvailable > 0) {
      return error(400, { message: 'Book is currently available. Please borrow instead.' });
    }

    // Check if user already has ANY active reservation (for any book)
    const [anyActiveReservation] = await db
      .select()
      .from(bookReservation)
      .where(
        and(
          eq(bookReservation.userId, userIdNum),
          eq(bookReservation.status, 'active')
        )
      )
      .limit(1);

    if (anyActiveReservation) {
      return error(400, { message: 'You can only reserve one book at a time. Please cancel your existing reservation first.' });
    }

    // Check if user already has an active reservation for this book (redundant, but safe)
    const [existingReservation] = await db
      .select()
      .from(bookReservation)
      .where(
        and(
          eq(bookReservation.userId, userIdNum),
          eq(bookReservation.bookId, bookIdNum),
          eq(bookReservation.status, 'active')
        )
      )
      .limit(1);

    if (existingReservation) {
      return error(400, { message: 'You already have an active reservation for this book' });
    }

    // Find current queue position
    const queue = await db
      .select()
      .from(bookReservation)
      .where(
        and(
          eq(bookReservation.bookId, bookIdNum),
          eq(bookReservation.status, 'active')
        )
      );

    // Create reservation record
    await db.insert(bookReservation).values({
      userId: userIdNum,
      bookId: bookIdNum,
      reservationDate: getTodaysDate(),
      status: 'active'
    });

    // User's position is queue.length + 1 (since we just added them)
    const queuePosition = queue.length + 1;

    return json({
      success: true,
      message: 'Book reserved successfully',
      data: {
        bookId: bookIdNum,
        userId: userIdNum,
        queuePosition,
        reservationDate: getTodaysDate()
      }
    });

  } catch (err: any) {
    console.error('POST /reserve error:', err);
    if (err.status) {
      return error(err.status, { message: err.message });
    }
    return error(500, { message: 'Internal server error during reservation' });
  }
};

// Borrow a book (disable for users)
export const PUT: RequestHandler = async ({ request }) => {
  return error(403, { message: 'Borrowing can only be confirmed by a librarian at the library.' });
};

// Return a book (optional: keep or restrict as needed)
export const PATCH: RequestHandler = async ({ request }) => {
  return error(403, { message: 'Returning can only be confirmed by a librarian at the library.' });
};

// GET /api/books/transaction?user=username or ?userId=123
export const GET: RequestHandler = async ({ url }) => {
  const username = url.searchParams.get('user');
  const userIdParam = url.searchParams.get('userId');

  if (!username && !userIdParam) {
    return error(400, { message: 'Missing user or userId parameter' });
  }

  // Find user by username or userId
  let userRow;
  if (username) {
    [userRow] = await db.select({ id: user.id }).from(user).where(eq(user.username, username)).limit(1);
  } else if (userIdParam) {
    [userRow] = await db.select({ id: user.id }).from(user).where(eq(user.id, Number(userIdParam))).limit(1);
  }

  if (!userRow) {
    return error(404, { message: 'User not found' });
  }

  // Get borrowed books (status = 'borrowed')
  const borrowed = await db
    .select({ bookId: bookBorrowing.bookId })
    .from(bookBorrowing)
    .where(
      and(
        eq(bookBorrowing.userId, userRow.id),
        eq(bookBorrowing.status, 'borrowed')
      )
    );

  // Get reserved books (status = 'active')
  const reserved = await db
    .select({ bookId: bookReservation.bookId })
    .from(bookReservation)
    .where(
      and(
        eq(bookReservation.userId, userRow.id),
        eq(bookReservation.status, 'active')
      )
    );

  return json({
    borrowedBookIds: borrowed.map(b => b.bookId),
    reservedBookIds: reserved.map(r => r.bookId)
  });
};