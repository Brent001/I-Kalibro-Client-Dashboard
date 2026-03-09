import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
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
import jwt from 'jsonwebtoken';
import { eq, and, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function todayISO() {
  // return a Date object; callers can convert to ISO if needed
  return new Date();
}

function dueISO(days = 14) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

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

    const [userRow] = await db
      .select({ id: tbl_user.id, userType: tbl_user.userType })
      .from(tbl_user)
      .where(eq(tbl_user.id, userId))
      .limit(1);

    if (!userRow) return null;
    if (!['staff', 'admin'].includes(userRow.userType || '')) return null;

    return { id: userRow.id, userType: userRow.userType };
  } catch (err) {
    console.error('auth error', err);
    return null;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const staff = await authenticateStaff(request);
  if (!staff) return error(401, { message: 'Unauthorized - staff only' });

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return error(400, { message: 'Invalid JSON' });
  }

  const reservationId = body?.reservationId ? Number(body.reservationId) : null;
  const itemType = (body?.itemType || 'book').toLowerCase();
  if (!reservationId) return error(400, { message: 'reservationId is required' });

  const mapping: Record<string, any> = {
    book: {
      reservationTable: tbl_book_reservation,
      copyTable: tbl_book_copy,
      borrowingTable: tbl_book_borrowing,
      itemTable: tbl_book,
      fk: 'bookId'
    },
    magazine: {
      reservationTable: tbl_magazine_reservation,
      copyTable: tbl_magazine_copy,
      borrowingTable: tbl_magazine_borrowing,
      itemTable: tbl_magazine,
      fk: 'magazineId'
    },
    thesis: {
      reservationTable: tbl_thesis_reservation,
      copyTable: tbl_thesis_copy,
      borrowingTable: tbl_thesis_borrowing,
      itemTable: tbl_thesis,
      fk: 'thesisId'
    },
    journal: {
      reservationTable: tbl_journal_reservation,
      copyTable: tbl_journal_copy,
      borrowingTable: tbl_journal_borrowing,
      itemTable: tbl_journal,
      fk: 'journalId'
    }
  };

  const cfg = mapping[itemType];
  if (!cfg) return error(400, { message: 'Unsupported itemType' });

  try {
    const result = await db.transaction(async (tx) => {
      // Load reservation (must be a borrow_request)
      const [reservation] = await tx
        .select()
        .from(cfg.reservationTable)
        .where(and(eq(cfg.reservationTable.id, reservationId), eq(cfg.reservationTable.status, 'borrow_request')))
        .limit(1);

      if (!reservation) {
        throw { status: 404, message: 'Borrow request not found' };
      }

      // Find an available copy
      const [copy] = await tx
        .select()
        .from(cfg.copyTable)
        .where(and(eq(cfg.copyTable[cfg.fk], reservation[cfg.fk]), eq(cfg.copyTable.status, 'available')))
        .limit(1);

      if (!copy) {
        throw { status: 409, message: 'No available copies to confirm borrow' };
      }

      // Create borrowing record
      const insertBorrow: any = {
        userId: reservation.userId,
        borrowDate: todayISO(), // already a Date
        dueDate: dueISO(14),    // already a Date
        status: 'borrowed',
        approvedBy: staff.id
      };
      insertBorrow[cfg.fk] = reservation[cfg.fk];
      insertBorrow[`${cfg.fk.replace(/Id$/,'CopyId')}`] = copy.id; // e.g., bookCopyId

      await tx.insert(cfg.borrowingTable).values(insertBorrow);

      // Update copy status
      await tx.update(cfg.copyTable).set({ status: 'borrowed' }).where(eq(cfg.copyTable.id, copy.id));

      // Decrement availableCopies on item
      await tx.update(cfg.itemTable).set({ availableCopies: sql`${cfg.itemTable.availableCopies} - 1` }).where(eq(cfg.itemTable.id, reservation[cfg.fk]));

      // Mark reservation fulfilled
      await tx.update(cfg.reservationTable).set({ status: 'fulfilled' }).where(eq(cfg.reservationTable.id, reservationId));

      return { itemType, itemId: reservation[cfg.fk], copyId: copy.id };
    });

    return json({ success: true, message: 'Borrow confirmed', data: result });
  } catch (err: any) {
    console.error('confirm borrow error', err);
    if (err?.status) return error(err.status, { message: err.message });
    return error(500, { message: 'Internal server error' });
  }
};
