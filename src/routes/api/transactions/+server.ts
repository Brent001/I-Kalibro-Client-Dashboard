import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { eq, and, gt, or } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { book, bookTransaction, user } from '$lib/server/db/schema/schema.js';

// Reuse your authenticateUser function from books API
import { authenticateUser } from '../books/+server.ts';

// Borrow a book
export const POST: RequestHandler = async ({ request }) => {
  try {
    const userObj = await authenticateUser(request);
    if (!userObj) throw error(401, { message: 'Unauthorized' });

    const body = await request.json();
    const { bookId } = body;

    // Check book availability
    const [bookRow] = await db.select().from(book).where(eq(book.id, bookId)).limit(1);
    if (!bookRow) throw error(404, { message: 'Book not found' });
    if (bookRow.copiesAvailable < 1) throw error(400, { message: 'No copies available' });

    // Insert transaction
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days borrow period

    await db.insert(bookTransaction).values({
      userId: userObj.id,
      bookId,
      transactionType: 'borrow',
      issueDate: new Date(),
      dueDate,
      status: 'active'
    });

    // Update book copies
    await db.update(book)
      .set({ copiesAvailable: bookRow.copiesAvailable - 1 })
      .where(eq(book.id, bookId));

    return json({ success: true, message: 'Book borrowed successfully', dueDate });
  } catch (err) {
    console.error('Borrow error:', err);
    throw error(500, { message: 'Error borrowing book' });
  }
};

// Return a book
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const userObj = await authenticateUser(request);
    if (!userObj) throw error(401, { message: 'Unauthorized' });

    const body = await request.json();
    const { transactionId } = body;

    // Find transaction
    const [tx] = await db.select().from(bookTransaction)
      .where(and(eq(bookTransaction.id, transactionId), eq(bookTransaction.userId, userObj.id), eq(bookTransaction.status, 'active')))
      .limit(1);

    if (!tx) throw error(404, { message: 'Active borrow transaction not found' });

    // Update transaction
    await db.update(bookTransaction)
      .set({
        status: 'returned',
        actualReturnDate: new Date()
      })
      .where(eq(bookTransaction.id, transactionId));

    // Update book copies
    await db.update(book)
      .set({ copiesAvailable: gt(book.copiesAvailable, 0) ? book.copiesAvailable + 1 : 1 })
      .where(eq(book.id, tx.bookId));

    return json({ success: true, message: 'Book returned successfully' });
  } catch (err) {
    console.error('Return error:', err);
    throw error(500, { message: 'Error returning book' });
  }
};

// Get overdue books for current user
export const GET: RequestHandler = async ({ request }) => {
  try {
    const userObj = await authenticateUser(request);
    if (!userObj) throw error(401, { message: 'Unauthorized' });

    const now = new Date();

    const overdueTxs = await db
      .select({
        id: bookTransaction.id,
        bookId: bookTransaction.bookId,
        dueDate: bookTransaction.dueDate,
        issueDate: bookTransaction.issueDate,
        status: bookTransaction.status,
        title: book.title
      })
      .from(bookTransaction)
      .leftJoin(book, eq(bookTransaction.bookId, book.id))
      .where(and(
        eq(bookTransaction.userId, userObj.id),
        eq(bookTransaction.status, 'active'),
        gt(now, bookTransaction.dueDate)
      ));

    return json({
      success: true,
      data: overdueTxs
    });
  } catch (err) {
    console.error('Overdue error:', err);
    throw error(500, { message: 'Error fetching overdue books' });
  }
};