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

// Reserve a book
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

    // Check if user already has an active reservation for this book
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

// Borrow a book
export const PUT: RequestHandler = async ({ request }) => {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return error(400, { message: 'Invalid JSON in request body' });
    }

    const { bookId, userId } = requestBody;
    
    // Validate input
    if (!bookId || !userId) {
      return error(400, { message: 'Book ID and User ID are required' });
    }

    // Validate that IDs are numbers
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

    // Check book availability
    const [targetBook] = await db.select().from(book).where(eq(book.id, bookIdNum)).limit(1);
    if (!targetBook) {
      return error(404, { message: 'Book not found' });
    }
    
    if (!targetBook.copiesAvailable || targetBook.copiesAvailable < 1) {
      return error(400, { message: 'No copies available to borrow' });
    }

    // Check if user already has an active borrow for this book
    const [existingBorrow] = await db
      .select()
      .from(bookBorrowing)
      .where(
        and(
          eq(bookBorrowing.userId, userIdNum),
          eq(bookBorrowing.bookId, bookIdNum),
          eq(bookBorrowing.status, 'borrowed')
        )
      )
      .limit(1);

    if (existingBorrow) {
      return error(400, { message: 'You already have this book borrowed' });
    }

    // --- Sequential operations (no transaction) ---
    try {
      // Create borrow record
      await db.insert(bookBorrowing).values({
        userId: userIdNum,
        bookId: bookIdNum,
        borrowDate: getTodaysDate(),
        dueDate: calculateDueDate(),
        status: 'borrowed'
      });

      // Decrement available copies (optimistic update)
      await db
        .update(book)
        .set({ copiesAvailable: targetBook.copiesAvailable! - 1 })
        .where(
          and(
            eq(book.id, bookIdNum),
            // Prevent race condition: only update if copiesAvailable > 0
            // This is not atomic, but helps reduce errors
            eq(book.copiesAvailable, targetBook.copiesAvailable)
          )
        );

      // If user had a reservation for this book, mark it as fulfilled
      await db
        .update(bookReservation)
        .set({ status: 'fulfilled' })
        .where(
          and(
            eq(bookReservation.userId, userIdNum),
            eq(bookReservation.bookId, bookIdNum),
            eq(bookReservation.status, 'active')
          )
        );
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error('Failed to process book borrowing');
    }

    return json({ 
      success: true, 
      message: 'Book borrowed successfully',
      data: {
        bookId: bookIdNum,
        userId: userIdNum,
        borrowDate: getTodaysDate(),
        dueDate: calculateDueDate(),
        remainingCopies: targetBook.copiesAvailable - 1
      }
    });

  } catch (err: any) {
    console.error('PUT /borrow error:', err);
    
    // Handle different types of errors
    if (err.status) {
      return error(err.status, { message: err.message });
    }
    
    return error(500, { message: 'Internal server error during borrowing' });
  }
};

// Return a book
export const PATCH: RequestHandler = async ({ request }) => {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return error(400, { message: 'Invalid JSON in request body' });
    }

    const { bookId, userId } = requestBody;
    
    // Validate input
    if (!bookId || !userId) {
      return error(400, { message: 'Book ID and User ID are required' });
    }

    const bookIdNum = parseInt(bookId);
    const userIdNum = parseInt(userId);
    
    if (isNaN(bookIdNum) || isNaN(userIdNum)) {
      return error(400, { message: 'Book ID and User ID must be valid numbers' });
    }

    // Find the active borrow record
    const [borrowRecord] = await db
      .select()
      .from(bookBorrowing)
      .where(
        and(
          eq(bookBorrowing.userId, userIdNum),
          eq(bookBorrowing.bookId, bookIdNum),
          eq(bookBorrowing.status, 'borrowed')
        )
      )
      .limit(1);

    if (!borrowRecord) {
      return error(404, { message: 'No active borrow record found for this book and user' });
    }

    // Get book info for updating copies
    const [targetBook] = await db.select().from(book).where(eq(book.id, bookIdNum)).limit(1);
    if (!targetBook) {
      return error(404, { message: 'Book not found' });
    }

    // Execute operations sequentially (Neon HTTP doesn't support transactions)
    try {
      // Update borrow record
      await db
        .update(bookBorrowing)
        .set({ 
          returnDate: getTodaysDate(),
          status: 'returned'
        })
        .where(eq(bookBorrowing.id, borrowRecord.id));

      // Increment available copies
      await db
        .update(book)
        .set({ copiesAvailable: (targetBook.copiesAvailable || 0) + 1 })
        .where(eq(book.id, bookIdNum));
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error('Failed to process book return');
    }

    return json({
      success: true,
      message: 'Book returned successfully',
      data: {
        bookId: bookIdNum,
        userId: userIdNum,
        returnDate: getTodaysDate(),
        newAvailableCopies: (targetBook.copiesAvailable || 0) + 1
      }
    });

  } catch (err: any) {
    console.error('PATCH /return error:', err);
    
    if (err.status) {
      return error(err.status, { message: err.message });
    }
    
    return error(500, { message: 'Internal server error during book return' });
  }
};