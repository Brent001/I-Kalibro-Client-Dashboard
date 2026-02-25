import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import {
  tbl_book_reservation,
  tbl_book,
  tbl_magazine_reservation,
  tbl_magazine,
  tbl_thesis_reservation,
  tbl_thesis,
  tbl_journal_reservation,
  tbl_journal,
  tbl_user
} from '$lib/server/db/schema/schema.js';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function authenticateStaff(request: Request) {
  try {
    let token: string | null = null;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
        token = cookies.client_token || cookies.token || null;
      }
    }
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    if (!userId) return null;

    // very small check: ensure user exists (permission checks can be added later)
    const [userRow] = await db.select({ id: tbl_user.id, userType: tbl_user.userType }).from(tbl_user).where(eq(tbl_user.id, userId)).limit(1);
    if (!userRow) return null;
    if (!['staff', 'admin'].includes(userRow.userType || '')) return null;
    return userRow;
  } catch (err) {
    console.error('auth error', err);
    return null;
  }
}

export const GET: RequestHandler = async ({ url, request }) => {
  const staff = await authenticateStaff(request);
  if (!staff) return error(401, { message: 'Unauthorized' });

  try {
    const itemType = (url.searchParams.get('itemType') || 'book').toLowerCase();

    let rows;
    if (itemType === 'book') {
      rows = await db
        .select({
          id: tbl_book_reservation.id,
          itemId: tbl_book.id,
          itemTitle: tbl_book.title,
          reservedDate: tbl_book_reservation.reservationDate,
          userId: tbl_user.id,
          userName: tbl_user.name,
          status: tbl_book_reservation.status
        })
        .from(tbl_book_reservation)
        .leftJoin(tbl_book, eq(tbl_book_reservation.bookId, tbl_book.id))
        .leftJoin(tbl_user, eq(tbl_book_reservation.userId, tbl_user.id))
        .where(and(eq(tbl_book_reservation.status, 'borrow_request')))
        .orderBy(tbl_book_reservation.createdAt || tbl_book_reservation.reservationDate);
    } else if (itemType === 'magazine') {
      rows = await db
        .select({
          id: tbl_magazine_reservation.id,
          itemId: tbl_magazine.id,
          itemTitle: tbl_magazine.title,
          reservedDate: tbl_magazine_reservation.requestDate,
          userId: tbl_user.id,
          userName: tbl_user.name,
          status: tbl_magazine_reservation.status
        })
        .from(tbl_magazine_reservation)
        .leftJoin(tbl_magazine, eq(tbl_magazine_reservation.magazineId, tbl_magazine.id))
        .leftJoin(tbl_user, eq(tbl_magazine_reservation.userId, tbl_user.id))
        .where(and(eq(tbl_magazine_reservation.status, 'borrow_request')))
        .orderBy(tbl_magazine_reservation.createdAt || tbl_magazine_reservation.requestDate);
    } else if (itemType === 'thesis') {
      rows = await db
        .select({
          id: tbl_thesis_reservation.id,
          itemId: tbl_thesis.id,
          itemTitle: tbl_thesis.title,
          reservedDate: tbl_thesis_reservation.requestDate,
          userId: tbl_user.id,
          userName: tbl_user.name,
          status: tbl_thesis_reservation.status
        })
        .from(tbl_thesis_reservation)
        .leftJoin(tbl_thesis, eq(tbl_thesis_reservation.thesisId, tbl_thesis.id))
        .leftJoin(tbl_user, eq(tbl_thesis_reservation.userId, tbl_user.id))
        .where(and(eq(tbl_thesis_reservation.status, 'borrow_request')))
        .orderBy(tbl_thesis_reservation.createdAt || tbl_thesis_reservation.requestDate);
    } else if (itemType === 'journal') {
      rows = await db
        .select({
          id: tbl_journal_reservation.id,
          itemId: tbl_journal.id,
          itemTitle: tbl_journal.title,
          reservedDate: tbl_journal_reservation.requestDate,
          userId: tbl_user.id,
          userName: tbl_user.name,
          status: tbl_journal_reservation.status
        })
        .from(tbl_journal_reservation)
        .leftJoin(tbl_journal, eq(tbl_journal_reservation.journalId, tbl_journal.id))
        .leftJoin(tbl_user, eq(tbl_journal_reservation.userId, tbl_user.id))
        .where(and(eq(tbl_journal_reservation.status, 'borrow_request')))
        .orderBy(tbl_journal_reservation.createdAt || tbl_journal_reservation.requestDate);
    } else {
      return error(400, { message: 'Unsupported itemType' });
    }

    return json({ success: true, data: rows });
  } catch (err: any) {
    console.error('Error listing borrow requests', err);
    return error(500, { message: 'Internal server error' });
  }
};
