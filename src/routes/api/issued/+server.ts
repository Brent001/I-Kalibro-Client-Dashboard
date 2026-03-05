import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { eq, and, gt, lt, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
  tbl_user,
  tbl_book,
  tbl_book_copy,
  tbl_book_borrowing,
  tbl_book_reservation,
  tbl_magazine,
  tbl_magazine_copy,
  tbl_magazine_borrowing,
  tbl_magazine_reservation,
  tbl_thesis,
  tbl_thesis_copy,
  tbl_thesis_borrowing,
  tbl_thesis_reservation,
  tbl_journal,
  tbl_journal_copy,
  tbl_journal_borrowing,
  tbl_journal_reservation
} from '$lib/server/db/schema/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const FINE_PER_HOUR = 5; // 5 pesos per hour

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
    .select({ id: tbl_user.id, name: tbl_user.name, username: tbl_user.username, email: tbl_user.email, userType: tbl_user.userType, isActive: tbl_user.isActive })
    .from(tbl_user)
    .where(eq(tbl_user.id, userId))
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

  // Borrowed items (books, magazines, theses, journals)
  const borrowedBooks = await db
    .select({
      id: tbl_book_borrowing.id,
      itemId: tbl_book.id,
      bookId: tbl_book.bookId,
      title: tbl_book.title,
      author: tbl_book.author,
      copyId: tbl_book_copy.id,
      copyNumber: tbl_book_copy.copyNumber,
      copyCallNumber: tbl_book_copy.callNumber,
      dueDate: tbl_book_borrowing.dueDate,
      borrowDate: tbl_book_borrowing.borrowDate,
      status: tbl_book_borrowing.status,
      itemType: sql`'book'`
    })
    .from(tbl_book_borrowing)
    .leftJoin(tbl_book, eq(tbl_book_borrowing.bookId, tbl_book.id))
    .leftJoin(tbl_book_copy, eq(tbl_book_borrowing.bookCopyId, tbl_book_copy.id))
    .where(and(eq(tbl_book_borrowing.userId, currentUser.id), eq(tbl_book_borrowing.status, 'borrowed')));

  const borrowedMagazines = await db
    .select({
      id: tbl_magazine_borrowing.id,
      itemId: tbl_magazine.id,
      bookId: tbl_magazine.magazineId,
      title: tbl_magazine.title,
      author: tbl_magazine.publisher,
      copyId: tbl_magazine_copy.id,
      copyNumber: tbl_magazine_copy.copyNumber,
      copyCallNumber: tbl_magazine_copy.callNumber,
      dueDate: tbl_magazine_borrowing.dueDate,
      borrowDate: tbl_magazine_borrowing.borrowDate,
      status: tbl_magazine_borrowing.status,
      itemType: sql`'magazine'`
    })
    .from(tbl_magazine_borrowing)
    .leftJoin(tbl_magazine, eq(tbl_magazine_borrowing.magazineId, tbl_magazine.id))
    .leftJoin(tbl_magazine_copy, eq(tbl_magazine_borrowing.magazineCopyId, tbl_magazine_copy.id))
    .where(and(eq(tbl_magazine_borrowing.userId, currentUser.id), eq(tbl_magazine_borrowing.status, 'borrowed')));

  const borrowedTheses = await db
    .select({
      id: tbl_thesis_borrowing.id,
      itemId: tbl_thesis.id,
      bookId: tbl_thesis.thesisId,
      title: tbl_thesis.title,
      author: tbl_thesis.author,
      copyId: tbl_thesis_copy.id,
      copyNumber: tbl_thesis_copy.copyNumber,
      copyCallNumber: tbl_thesis_copy.callNumber,
      dueDate: tbl_thesis_borrowing.dueDate,
      borrowDate: tbl_thesis_borrowing.borrowDate,
      status: tbl_thesis_borrowing.status,
      itemType: sql`'thesis'`
    })
    .from(tbl_thesis_borrowing)
    .leftJoin(tbl_thesis, eq(tbl_thesis_borrowing.thesisId, tbl_thesis.id))
    .leftJoin(tbl_thesis_copy, eq(tbl_thesis_borrowing.thesisCopyId, tbl_thesis_copy.id))
    .where(and(eq(tbl_thesis_borrowing.userId, currentUser.id), eq(tbl_thesis_borrowing.status, 'borrowed')));

  const borrowedJournals = await db
    .select({
      id: tbl_journal_borrowing.id,
      itemId: tbl_journal.id,
      bookId: tbl_journal.journalId,
      title: tbl_journal.title,
      author: tbl_journal.publisher,
      copyId: tbl_journal_copy.id,
      copyNumber: tbl_journal_copy.copyNumber,
      copyCallNumber: tbl_journal_copy.callNumber,
      dueDate: tbl_journal_borrowing.dueDate,
      borrowDate: tbl_journal_borrowing.borrowDate,
      status: tbl_journal_borrowing.status,
      itemType: sql`'journal'`
    })
    .from(tbl_journal_borrowing)
    .leftJoin(tbl_journal, eq(tbl_journal_borrowing.journalId, tbl_journal.id))
    .leftJoin(tbl_journal_copy, eq(tbl_journal_borrowing.journalCopyId, tbl_journal_copy.id))
    .where(and(eq(tbl_journal_borrowing.userId, currentUser.id), eq(tbl_journal_borrowing.status, 'borrowed')));

  // Reserved items (books, magazines, theses, journals)
  const reservedBooks = await db
    .select({
      id: tbl_book_reservation.id,
      itemId: tbl_book.id,
      bookId: tbl_book.bookId,
      title: tbl_book.title,
      author: tbl_book.author,
      copyId: tbl_book_copy.id,
      copyNumber: tbl_book_copy.copyNumber,
      copyCallNumber: tbl_book_copy.callNumber,
      reservedDate: tbl_book_reservation.requestDate,
      status: tbl_book_reservation.status,
      itemType: sql`'book'`
    })
    .from(tbl_book_reservation)
    .leftJoin(tbl_book, eq(tbl_book_reservation.bookId, tbl_book.id))
    .leftJoin(tbl_book_copy, eq(tbl_book_reservation.bookCopyId, tbl_book_copy.id))
    .where(and(eq(tbl_book_reservation.userId, currentUser.id), or(eq(tbl_book_reservation.status, 'active'), eq(tbl_book_reservation.status, 'borrow_request'))));

  const reservedMagazines = await db
    .select({
      id: tbl_magazine_reservation.id,
      itemId: tbl_magazine.id,
      bookId: tbl_magazine.magazineId,
      title: tbl_magazine.title,
      author: tbl_magazine.publisher,
      copyId: tbl_magazine_copy.id,
      copyNumber: tbl_magazine_copy.copyNumber,
      copyCallNumber: tbl_magazine_copy.callNumber,
      reservedDate: tbl_magazine_reservation.requestDate,
      status: tbl_magazine_reservation.status,
      itemType: sql`'magazine'`
    })
    .from(tbl_magazine_reservation)
    .leftJoin(tbl_magazine, eq(tbl_magazine_reservation.magazineId, tbl_magazine.id))
    .leftJoin(tbl_magazine_copy, eq(tbl_magazine_reservation.magazineCopyId, tbl_magazine_copy.id))
    .where(and(eq(tbl_magazine_reservation.userId, currentUser.id), or(eq(tbl_magazine_reservation.status, 'active'), eq(tbl_magazine_reservation.status, 'borrow_request'))));

  const reservedTheses = await db
    .select({
      id: tbl_thesis_reservation.id,
      itemId: tbl_thesis.id,
      bookId: tbl_thesis.thesisId,
      title: tbl_thesis.title,
      author: tbl_thesis.author,
      copyId: tbl_thesis_copy.id,
      copyNumber: tbl_thesis_copy.copyNumber,
      copyCallNumber: tbl_thesis_copy.callNumber,
      reservedDate: tbl_thesis_reservation.requestDate,
      status: tbl_thesis_reservation.status,
      itemType: sql`'thesis'`
    })
    .from(tbl_thesis_reservation)
    .leftJoin(tbl_thesis, eq(tbl_thesis_reservation.thesisId, tbl_thesis.id))
    .leftJoin(tbl_thesis_copy, eq(tbl_thesis_reservation.thesisCopyId, tbl_thesis_copy.id))
    .where(and(eq(tbl_thesis_reservation.userId, currentUser.id), or(eq(tbl_thesis_reservation.status, 'active'), eq(tbl_thesis_reservation.status, 'borrow_request'))));

  const reservedJournals = await db
    .select({
      id: tbl_journal_reservation.id,
      itemId: tbl_journal.id,
      bookId: tbl_journal.journalId,
      title: tbl_journal.title,
      author: tbl_journal.publisher,
      copyId: tbl_journal_copy.id,
      copyNumber: tbl_journal_copy.copyNumber,
      copyCallNumber: tbl_journal_copy.callNumber,
      reservedDate: tbl_journal_reservation.requestDate,
      status: tbl_journal_reservation.status,
      itemType: sql`'journal'`
    })
    .from(tbl_journal_reservation)
    .leftJoin(tbl_journal, eq(tbl_journal_reservation.journalId, tbl_journal.id))
    .leftJoin(tbl_journal_copy, eq(tbl_journal_reservation.journalCopyId, tbl_journal_copy.id))
    .where(and(eq(tbl_journal_reservation.userId, currentUser.id), or(eq(tbl_journal_reservation.status, 'active'), eq(tbl_journal_reservation.status, 'borrow_request'))));

  // Overdue items (books, magazines, theses, journals)
  const today = new Date();
  const overdueBooks = await db
    .select({
      id: tbl_book_borrowing.id,
      itemId: tbl_book.id,
      bookId: tbl_book.bookId,
      title: tbl_book.title,
      author: tbl_book.author,
      copyId: tbl_book_copy.id,
      copyNumber: tbl_book_copy.copyNumber,
      copyCallNumber: tbl_book_copy.callNumber,
      dueDate: tbl_book_borrowing.dueDate,
      borrowDate: tbl_book_borrowing.borrowDate,
      status: tbl_book_borrowing.status,
      itemType: sql`'book'`
    })
    .from(tbl_book_borrowing)
    .leftJoin(tbl_book, eq(tbl_book_borrowing.bookId, tbl_book.id))
    .leftJoin(tbl_book_copy, eq(tbl_book_borrowing.bookCopyId, tbl_book_copy.id))
    .where(and(
      eq(tbl_book_borrowing.userId, currentUser.id),
      or(
        eq(tbl_book_borrowing.status, 'overdue'),
        and(eq(tbl_book_borrowing.status, 'borrowed'), lt(tbl_book_borrowing.dueDate, today))
      )
    ));

  const overdueMagazines = await db
    .select({
      id: tbl_magazine_borrowing.id,
      itemId: tbl_magazine.id,
      bookId: tbl_magazine.magazineId,
      title: tbl_magazine.title,
      author: tbl_magazine.publisher,
      copyId: tbl_magazine_copy.id,
      copyNumber: tbl_magazine_copy.copyNumber,
      copyCallNumber: tbl_magazine_copy.callNumber,
      dueDate: tbl_magazine_borrowing.dueDate,
      borrowDate: tbl_magazine_borrowing.borrowDate,
      status: tbl_magazine_borrowing.status,
      itemType: sql`'magazine'`
    })
    .from(tbl_magazine_borrowing)
    .leftJoin(tbl_magazine, eq(tbl_magazine_borrowing.magazineId, tbl_magazine.id))
    .leftJoin(tbl_magazine_copy, eq(tbl_magazine_borrowing.magazineCopyId, tbl_magazine_copy.id))
    .where(and(
      eq(tbl_magazine_borrowing.userId, currentUser.id),
      or(
        eq(tbl_magazine_borrowing.status, 'overdue'),
        and(eq(tbl_magazine_borrowing.status, 'borrowed'), lt(tbl_magazine_borrowing.dueDate, today))
      )
    ));

  const overdueTheses = await db
    .select({
      id: tbl_thesis_borrowing.id,
      itemId: tbl_thesis.id,
      bookId: tbl_thesis.thesisId,
      title: tbl_thesis.title,
      author: tbl_thesis.author,
      copyId: tbl_thesis_copy.id,
      copyNumber: tbl_thesis_copy.copyNumber,
      copyCallNumber: tbl_thesis_copy.callNumber,
      dueDate: tbl_thesis_borrowing.dueDate,
      borrowDate: tbl_thesis_borrowing.borrowDate,
      status: tbl_thesis_borrowing.status,
      itemType: sql`'thesis'`
    })
    .from(tbl_thesis_borrowing)
    .leftJoin(tbl_thesis, eq(tbl_thesis_borrowing.thesisId, tbl_thesis.id))
    .leftJoin(tbl_thesis_copy, eq(tbl_thesis_borrowing.thesisCopyId, tbl_thesis_copy.id))
    .where(and(
      eq(tbl_thesis_borrowing.userId, currentUser.id),
      or(
        eq(tbl_thesis_borrowing.status, 'overdue'),
        and(eq(tbl_thesis_borrowing.status, 'borrowed'), lt(tbl_thesis_borrowing.dueDate, today))
      )
    ));

  const overdueJournals = await db
    .select({
      id: tbl_journal_borrowing.id,
      itemId: tbl_journal.id,
      bookId: tbl_journal.journalId,
      title: tbl_journal.title,
      author: tbl_journal.publisher,
      copyId: tbl_journal_copy.id,
      copyNumber: tbl_journal_copy.copyNumber,
      copyCallNumber: tbl_journal_copy.callNumber,
      dueDate: tbl_journal_borrowing.dueDate,
      borrowDate: tbl_journal_borrowing.borrowDate,
      status: tbl_journal_borrowing.status,
      itemType: sql`'journal'`
    })
    .from(tbl_journal_borrowing)
    .leftJoin(tbl_journal, eq(tbl_journal_borrowing.journalId, tbl_journal.id))
    .leftJoin(tbl_journal_copy, eq(tbl_journal_borrowing.journalCopyId, tbl_journal_copy.id))
    .where(and(
      eq(tbl_journal_borrowing.userId, currentUser.id),
      or(
        eq(tbl_journal_borrowing.status, 'overdue'),
        and(eq(tbl_journal_borrowing.status, 'borrowed'), lt(tbl_journal_borrowing.dueDate, today))
      )
    ));

  function computeFineForDue(dueDateStr: string | Date) {
    const now = new Date();
    const due = new Date(dueDateStr as string);
    const diffMs = now.getTime() - due.getTime();
    if (diffMs <= 0) return { fine: 0, hoursOverdue: 0 };
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return { fine: hours * FINE_PER_HOUR, hoursOverdue: hours };
  }

  const borrowedAll = [
    ...borrowedBooks.map(b => {
      const { fine, hoursOverdue } = computeFineForDue(b.dueDate);
      return { id: b.id, itemId: b.itemId, title: b.title, author: b.author, dueDate: b.dueDate, borrowDate: b.borrowDate, status: b.status, itemType: 'book', fine, hoursOverdue };
    }),
    ...borrowedMagazines.map(b => {
      const { fine, hoursOverdue } = computeFineForDue(b.dueDate);
      return { id: b.id, itemId: b.itemId, title: b.title, author: b.author, dueDate: b.dueDate, borrowDate: b.borrowDate, status: b.status, itemType: 'magazine', fine, hoursOverdue };
    }),
    ...borrowedTheses.map(b => {
      const { fine, hoursOverdue } = computeFineForDue(b.dueDate);
      return { id: b.id, itemId: b.itemId, title: b.title, author: b.author, dueDate: b.dueDate, borrowDate: b.borrowDate, status: b.status, itemType: 'thesis', fine, hoursOverdue };
    }),
    ...borrowedJournals.map(b => {
      const { fine, hoursOverdue } = computeFineForDue(b.dueDate);
      return { id: b.id, itemId: b.itemId, title: b.title, author: b.author, dueDate: b.dueDate, borrowDate: b.borrowDate, status: b.status, itemType: 'journal', fine, hoursOverdue };
    })
  ];

  const reservedAll = [
    ...reservedBooks.map(r => ({ id: r.id, itemId: r.itemId, title: r.title, author: r.author, reservedDate: r.reservedDate, status: r.status, itemType: 'book' })),
    ...reservedMagazines.map(r => ({ id: r.id, itemId: r.itemId, title: r.title, author: r.author, reservedDate: r.reservedDate, status: r.status, itemType: 'magazine' })),
    ...reservedTheses.map(r => ({ id: r.id, itemId: r.itemId, title: r.title, author: r.author, reservedDate: r.reservedDate, status: r.status, itemType: 'thesis' })),
    ...reservedJournals.map(r => ({ id: r.id, itemId: r.itemId, title: r.title, author: r.author, reservedDate: r.reservedDate, status: r.status, itemType: 'journal' }))
  ];

  const overdueAll = [
    ...overdueBooks.map(o => {
      const { fine, hoursOverdue } = computeFineForDue(o.dueDate);
      return { id: o.id, itemId: o.itemId, title: o.title, author: o.author, dueDate: o.dueDate, borrowDate: o.borrowDate, status: o.status, itemType: 'book', fine, hoursOverdue };
    }),
    ...overdueMagazines.map(o => {
      const { fine, hoursOverdue } = computeFineForDue(o.dueDate);
      return { id: o.id, itemId: o.itemId, title: o.title, author: o.author, dueDate: o.dueDate, borrowDate: o.borrowDate, status: o.status, itemType: 'magazine', fine, hoursOverdue };
    }),
    ...overdueTheses.map(o => {
      const { fine, hoursOverdue } = computeFineForDue(o.dueDate);
      return { id: o.id, itemId: o.itemId, title: o.title, author: o.author, dueDate: o.dueDate, borrowDate: o.borrowDate, status: o.status, itemType: 'thesis', fine, hoursOverdue };
    }),
    ...overdueJournals.map(o => {
      const { fine, hoursOverdue } = computeFineForDue(o.dueDate);
      return { id: o.id, itemId: o.itemId, title: o.title, author: o.author, dueDate: o.dueDate, borrowDate: o.borrowDate, status: o.status, itemType: 'journal', fine, hoursOverdue };
    })
  ];

  return json({
    user: {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      email: currentUser.email,
      userType: currentUser.userType
    },
    borrowed: borrowedAll,
    reserved: reservedAll,
    overdue: overdueAll
  });
};