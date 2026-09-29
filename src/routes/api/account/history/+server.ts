import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import {
  tbl_book,
  tbl_book_borrowing,
  tbl_book_copy,
  tbl_journal,
  tbl_journal_borrowing,
  tbl_journal_copy,
  tbl_magazine,
  tbl_magazine_borrowing,
  tbl_magazine_copy,
  tbl_thesis,
  tbl_thesis_borrowing,
  tbl_thesis_copy
} from '$lib/server/db/schema/schema.js';

export const GET: RequestHandler = async ({ request, cookies }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const [books, journals, magazines, theses] = await Promise.all([
    db.select({
      id: tbl_book_borrowing.id,
      catalogId: tbl_book.bookId,
      title: tbl_book.title,
      author: tbl_book.author,
      copyNumber: tbl_book_copy.copyNumber,
      borrowDate: tbl_book_borrowing.borrowDate,
      dueDate: tbl_book_borrowing.dueDate,
      returnDate: tbl_book_borrowing.returnDate,
      status: tbl_book_borrowing.status,
      createdAt: tbl_book_borrowing.createdAt,
      itemType: sql<string>`'book'`
    }).from(tbl_book_borrowing)
      .leftJoin(tbl_book, eq(tbl_book_borrowing.bookId, tbl_book.id))
      .leftJoin(tbl_book_copy, eq(tbl_book_borrowing.bookCopyId, tbl_book_copy.id))
      .where(eq(tbl_book_borrowing.userId, user.id))
      .orderBy(desc(tbl_book_borrowing.createdAt))
      .limit(100),
    db.select({
      id: tbl_journal_borrowing.id,
      catalogId: tbl_journal.journalId,
      title: tbl_journal.title,
      author: tbl_journal.publisher,
      copyNumber: tbl_journal_copy.copyNumber,
      borrowDate: tbl_journal_borrowing.borrowDate,
      dueDate: tbl_journal_borrowing.dueDate,
      returnDate: tbl_journal_borrowing.returnDate,
      status: tbl_journal_borrowing.status,
      createdAt: tbl_journal_borrowing.createdAt,
      itemType: sql<string>`'journal'`
    }).from(tbl_journal_borrowing)
      .leftJoin(tbl_journal, eq(tbl_journal_borrowing.journalId, tbl_journal.id))
      .leftJoin(tbl_journal_copy, eq(tbl_journal_borrowing.journalCopyId, tbl_journal_copy.id))
      .where(eq(tbl_journal_borrowing.userId, user.id))
      .orderBy(desc(tbl_journal_borrowing.createdAt))
      .limit(100),
    db.select({
      id: tbl_magazine_borrowing.id,
      catalogId: tbl_magazine.magazineId,
      title: tbl_magazine.title,
      author: tbl_magazine.publisher,
      copyNumber: tbl_magazine_copy.copyNumber,
      borrowDate: tbl_magazine_borrowing.borrowDate,
      dueDate: tbl_magazine_borrowing.dueDate,
      returnDate: tbl_magazine_borrowing.returnDate,
      status: tbl_magazine_borrowing.status,
      createdAt: tbl_magazine_borrowing.createdAt,
      itemType: sql<string>`'magazine'`
    }).from(tbl_magazine_borrowing)
      .leftJoin(tbl_magazine, eq(tbl_magazine_borrowing.magazineId, tbl_magazine.id))
      .leftJoin(tbl_magazine_copy, eq(tbl_magazine_borrowing.magazineCopyId, tbl_magazine_copy.id))
      .where(eq(tbl_magazine_borrowing.userId, user.id))
      .orderBy(desc(tbl_magazine_borrowing.createdAt))
      .limit(100),
    db.select({
      id: tbl_thesis_borrowing.id,
      catalogId: tbl_thesis.thesisId,
      title: tbl_thesis.title,
      author: tbl_thesis.author,
      copyNumber: tbl_thesis_copy.copyNumber,
      borrowDate: tbl_thesis_borrowing.borrowDate,
      dueDate: tbl_thesis_borrowing.dueDate,
      returnDate: tbl_thesis_borrowing.returnDate,
      status: tbl_thesis_borrowing.status,
      createdAt: tbl_thesis_borrowing.createdAt,
      itemType: sql<string>`'thesis'`
    }).from(tbl_thesis_borrowing)
      .leftJoin(tbl_thesis, eq(tbl_thesis_borrowing.thesisId, tbl_thesis.id))
      .leftJoin(tbl_thesis_copy, eq(tbl_thesis_borrowing.thesisCopyId, tbl_thesis_copy.id))
      .where(eq(tbl_thesis_borrowing.userId, user.id))
      .orderBy(desc(tbl_thesis_borrowing.createdAt))
      .limit(100)
  ]);

  const history = [...books, ...journals, ...magazines, ...theses]
    .sort((left, right) => new Date(String(right.returnDate ?? right.createdAt ?? '')).getTime() - new Date(String(left.returnDate ?? left.createdAt ?? '')).getTime())
    .slice(0, 200);

  return json({ success: true, data: { history } });
};
