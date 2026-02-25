import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import {
  tbl_book_reservation,
  tbl_magazine_reservation,
  tbl_thesis_reservation,
  tbl_journal_reservation
} from '$lib/server/db/schema/schema.js';
import { eq, and, or } from 'drizzle-orm';

// Cancel a reservation
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { itemId, userId, itemType = 'book' } = await request.json();

    if (!itemId || !userId) {
      return error(400, { message: 'Item ID and User ID are required' });
    }

    const itemIdNum = parseInt(itemId);
    const userIdNum = parseInt(userId);

    if (isNaN(itemIdNum) || isNaN(userIdNum)) {
      return error(400, { message: 'Item ID and User ID must be valid numbers' });
    }

    const type = (itemType || 'book').toLowerCase();
    const mapping: Record<string, any> = {
      book: { table: tbl_book_reservation, fk: 'bookId' },
      magazine: { table: tbl_magazine_reservation, fk: 'magazineId' },
      thesis: { table: tbl_thesis_reservation, fk: 'thesisId' },
      journal: { table: tbl_journal_reservation, fk: 'journalId' }
    };

    const cfg = mapping[type];
    if (!cfg) return error(400, { message: 'Unsupported itemType' });

    // Find active reservation or borrow_request
    const [reservation] = await db
      .select()
      .from(cfg.table)
      .where(
        and(
          eq(cfg.table.userId, userIdNum),
          eq(cfg.table[cfg.fk], itemIdNum),
          or(eq(cfg.table.status, 'active'), eq(cfg.table.status, 'borrow_request'))
        )
      )
      .limit(1);

    if (!reservation) {
      return error(404, { message: 'Active reservation not found' });
    }

    // Mark reservation as cancelled
    await db
      .update(cfg.table)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(cfg.table.userId, userIdNum),
          eq(cfg.table[cfg.fk], itemIdNum),
          or(eq(cfg.table.status, 'active'), eq(cfg.table.status, 'borrow_request'))
        )
      );

    return json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: {
        itemType: type,
        itemId: itemIdNum,
        userId: userIdNum
      }
    });
  } catch (err: any) {
    console.error('Cancel reservation error:', err);
    return error(500, { message: 'Internal server error during cancellation' });
  }
};