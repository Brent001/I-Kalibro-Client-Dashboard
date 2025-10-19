import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { bookReservation } from '$lib/server/db/schema/schema.js';
import { eq, and } from 'drizzle-orm';

// Cancel a reservation
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { bookId, userId } = await request.json();

    if (!bookId || !userId) {
      return error(400, { message: 'Book ID and User ID are required' });
    }

    const bookIdNum = parseInt(bookId);
    const userIdNum = parseInt(userId);

    if (isNaN(bookIdNum) || isNaN(userIdNum)) {
      return error(400, { message: 'Book ID and User ID must be valid numbers' });
    }

    // Find active reservation
    const [reservation] = await db
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

    if (!reservation) {
      return error(404, { message: 'Active reservation not found' });
    }

    // Mark reservation as cancelled
    await db
      .update(bookReservation)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(bookReservation.userId, userIdNum),
          eq(bookReservation.bookId, bookIdNum),
          eq(bookReservation.status, 'active')
        )
      );

    return json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: {
        bookId: bookIdNum,
        userId: userIdNum
      }
    });
  } catch (err: any) {
    console.error('Cancel reservation error:', err);
    return error(500, { message: 'Internal server error during cancellation' });
  }
};