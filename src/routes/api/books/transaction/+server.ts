import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import {
  tbl_book,
  tbl_book_borrowing,
  tbl_book_reservation,
  tbl_user,
  tbl_notification,
  tbl_magazine,
  tbl_magazine_reservation,
  tbl_magazine_borrowing,
  tbl_thesis,
  tbl_thesis_reservation,
  tbl_thesis_borrowing,
  tbl_journal,
  tbl_journal_reservation,
  tbl_journal_borrowing,
  tbl_book_copy,
  tbl_magazine_copy,
  tbl_thesis_copy,
  tbl_journal_copy
} from '$lib/server/db/schema/schema.js';
import jwt from 'jsonwebtoken';
import { eq, and, or } from 'drizzle-orm';

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
        id: tbl_user.id,
        username: tbl_user.username,
        email: tbl_user.email,
        userType: tbl_user.userType,
        isActive: tbl_user.isActive
      })
      .from(tbl_user)
      .where(eq(tbl_user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) return null;

    return {
      id: userRow.id,
      userType: userRow.userType,
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

    // accept either `itemId` (preferred) or legacy `bookId`
    const { bookId, itemId, userId, requestType, itemType = 'book' } = requestBody;
    const idRaw = itemId ?? bookId;
    if (!idRaw || !userId) {
      return error(400, { message: 'Item ID and User ID are required' });
    }

    const itemIdNum = parseInt(idRaw);
    const userIdNum = parseInt(userId);

    if (isNaN(itemIdNum) || isNaN(userIdNum)) {
      return error(400, { message: 'Item ID and User ID must be valid numbers' });
    }

    // support multiple item types (book, magazine, thesis, journal)
    const type = (itemType || 'book').toLowerCase();

    const mapping: Record<string, any> = {
      book: {
        itemTable: tbl_book,
        reservationTable: tbl_book_reservation,
        borrowingTable: tbl_book_borrowing,
        copyTable: tbl_book_copy,
        foreignKey: 'bookId'
      },
      magazine: {
        itemTable: tbl_magazine,
        reservationTable: tbl_magazine_reservation,
        borrowingTable: tbl_magazine_borrowing,
        copyTable: tbl_magazine_copy,
        foreignKey: 'magazineId'
      },
      thesis: {
        itemTable: tbl_thesis,
        reservationTable: tbl_thesis_reservation,
        borrowingTable: tbl_thesis_borrowing,
        copyTable: tbl_thesis_copy,
        foreignKey: 'thesisId'
      },
      journal: {
        itemTable: tbl_journal,
        reservationTable: tbl_journal_reservation,
        borrowingTable: tbl_journal_borrowing,
        copyTable: tbl_journal_copy,
        foreignKey: 'journalId'
      }
    };

    const cfg = mapping[type];
    if (!cfg) return error(400, { message: 'Unsupported itemType' });

    // Check if user exists (include name for notification)
    const [userExists] = await db.select({ id: tbl_user.id, name: tbl_user.name }).from(tbl_user).where(eq(tbl_user.id, userIdNum)).limit(1);
    if (!userExists) {
      return error(404, { message: 'User not found' });
    }

    // Check item existence
    const [targetItem] = await db.select().from(cfg.itemTable).where(eq(cfg.itemTable.id, itemIdNum)).limit(1);
    if (!targetItem) {
      return error(404, { message: `${type} not found` });
    }

    // REMOVED: The check that prevented reservations when copies are available
    // Users can now reserve books regardless of availability

    // Check if user already has an active reservation for this book
    // Check existing reservation for this user+item
    const [existingReservation] = await db
      .select()
      .from(cfg.reservationTable)
      .where(
        and(
          eq(cfg.reservationTable.userId, userIdNum),
          eq(cfg.reservationTable[cfg.foreignKey], itemIdNum),
          eq(cfg.reservationTable.status, 'active')
        )
      )
      .limit(1);

    if (existingReservation) {
      return error(400, { message: 'You already have an active reservation for this book' });
    }

    // Check if user currently has this book borrowed
    const [activeBorrowing] = await db
      .select()
      .from(cfg.borrowingTable)
      .where(
        and(
          eq(cfg.borrowingTable.userId, userIdNum),
          eq(cfg.borrowingTable[cfg.foreignKey], itemIdNum),
          eq(cfg.borrowingTable.status, 'borrowed')
        )
      )
      .limit(1);

    if (activeBorrowing) {
      return error(400, { message: 'You already have this book borrowed' });
    }

    // Find current queue position
    const queue = await db
      .select()
      .from(cfg.reservationTable)
      .where(
        and(
          eq(cfg.reservationTable[cfg.foreignKey], itemIdNum),
          eq(cfg.reservationTable.status, 'active')
        )
      );

    // Determine reservation status based on request type
    const reservationStatus = requestType === 'borrow_request' ? 'borrow_request' : 'active';

    // Create reservation record (used for both regular reservations and borrow requests)
    const insertObj: any = {
      userId: userIdNum,
      requestDate: getTodaysDate(),
      // requestedBorrowDate and requestedDueDate are required by schema
      requestedBorrowDate: requestBody.requestedBorrowDate || getTodaysDate(),
      requestedDueDate: requestBody.requestedDueDate || calculateDueDate(),
      expiryDate: calculateDueDate(),
      status: reservationStatus
    };
    insertObj[cfg.foreignKey] = itemIdNum;

    try {
      await db.insert(cfg.reservationTable).values(insertObj);
    } catch (dbErr) {
      console.error('DB insert error for reservation:', dbErr, 'insertObj:', insertObj);
      return error(500, { message: 'Failed to create reservation record' });
    }

    // User's position is queue.length + 1 (since we just added them)
    const queuePosition = queue.length + 1;

    // Create notifications for staff and admin so they see reservation in their notification box
    try {
      // fetch all staff and admin ids
      const schema = await import('$lib/server/db/schema/schema.js');
      const staffRows = await db.select({ id: schema.tbl_staff.id }).from(schema.tbl_staff);
      const adminRows = await db.select({ id: schema.tbl_admin.id }).from(schema.tbl_admin);
      const superAdminRows = await db.select({ id: schema.tbl_super_admin.id }).from(schema.tbl_super_admin);

      const title = 'New Reservation';
      const message = `${targetItem.title} reserved by ${userExists.name ?? 'a member'} (ID:${userIdNum})`;
      const notifVals: any[] = [];

      staffRows.forEach((r: any) => {
        notifVals.push({ recipientId: r.id, recipientType: 'staff', title, message, type: 'reservation', relatedItemType: type, relatedItemId: itemIdNum });
      });
      adminRows.forEach((r: any) => {
        notifVals.push({ recipientId: r.id, recipientType: 'admin', title, message, type: 'reservation', relatedItemType: type, relatedItemId: itemIdNum });
      });
      superAdminRows.forEach((r: any) => {
        notifVals.push({ recipientId: r.id, recipientType: 'super_admin', title, message, type: 'reservation', relatedItemType: type, relatedItemId: itemIdNum });
      });

      if (notifVals.length) {
        // pass array directly to values() to satisfy TypeScript and Drizzle
        await db.insert(tbl_notification).values(notifVals as any);
      }
    } catch (notifyErr) {
      console.error('Failed to create reservation notifications:', notifyErr);
      // non-fatal: reservation already created, continue
    }

    return json({
      success: true,
      message: requestType === 'borrow_request' ? 'Borrow request submitted' : `${type} reserved successfully`,
      data: {
        itemType: type,
        itemId: itemIdNum,
        userId: userIdNum,
        queuePosition,
        reservationDate: getTodaysDate(),
        requestType: reservationStatus
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
export const GET: RequestHandler = async ({ url, request }) => {
  const username = url.searchParams.get('user');
  const userIdParam = url.searchParams.get('userId');

  // If no explicit params provided, try to authenticate the request and use token user
  let userRow: { id: number } | undefined;
  if (!username && !userIdParam) {
    const authUser = await authenticateUser(request as Request);
    if (authUser && authUser.id) {
      userRow = { id: authUser.id } as any;
    } else {
      return error(400, { message: 'Missing user or userId parameter' });
    }
  } else {
    // Find user by username or userId
    if (username) {
      [userRow] = await db.select({ id: tbl_user.id }).from(tbl_user).where(eq(tbl_user.username, username)).limit(1);
    } else if (userIdParam) {
      [userRow] = await db.select({ id: tbl_user.id }).from(tbl_user).where(eq(tbl_user.id, Number(userIdParam))).limit(1);
    }
  }

  if (!userRow) {
    return error(404, { message: 'User not found' });
  }

  // Get borrowed books (status = 'borrowed' OR 'overdue')
  const borrowed = await db
    .select({ bookId: tbl_book_borrowing.bookId })
    .from(tbl_book_borrowing)
    .where(
      and(
        eq(tbl_book_borrowing.userId, userRow.id),
        or(eq(tbl_book_borrowing.status, 'borrowed'), eq(tbl_book_borrowing.status, 'overdue'))
      )
    );

  // Get reserved books (status = 'active' OR 'borrow_request')
  const reserved = await db
    .select({ bookId: tbl_book_reservation.bookId })
    .from(tbl_book_reservation)
    .where(
      and(
        eq(tbl_book_reservation.userId, userRow.id),
        or(eq(tbl_book_reservation.status, 'active'), eq(tbl_book_reservation.status, 'borrow_request'))
      )
    );

  return json({
    borrowedBookIds: borrowed.map(b => b.bookId),
    reservedBookIds: reserved.map(r => r.bookId)
  });
};