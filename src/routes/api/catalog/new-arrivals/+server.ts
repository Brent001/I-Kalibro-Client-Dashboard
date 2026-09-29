import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, count, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import {
  tbl_book,
  tbl_book_borrowing,
  tbl_book_reservation,
  tbl_category,
  tbl_journal,
  tbl_journal_borrowing,
  tbl_journal_reservation,
  tbl_magazine,
  tbl_magazine_borrowing,
  tbl_magazine_reservation,
  tbl_thesis,
  tbl_thesis_borrowing,
  tbl_thesis_reservation
} from '$lib/server/db/schema/schema.js';

export const GET: RequestHandler = async ({ request, cookies }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const url = new URL(request.url);
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '12', 10);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 100)
    : 12;

  const [bookCount, journalCount, magazineCount, thesisCount] = await Promise.all([
    db.select({ total: count() }).from(tbl_book).where(eq(tbl_book.isActive, true)),
    db.select({ total: count() }).from(tbl_journal).where(eq(tbl_journal.isActive, true)),
    db.select({ total: count() }).from(tbl_magazine).where(eq(tbl_magazine.isActive, true)),
    db.select({ total: count() }).from(tbl_thesis).where(eq(tbl_thesis.isActive, true))
  ]);
  const totalItems = Number(bookCount[0]?.total ?? 0)
    + Number(journalCount[0]?.total ?? 0)
    + Number(magazineCount[0]?.total ?? 0)
    + Number(thesisCount[0]?.total ?? 0);
  const totalPages = Math.ceil(totalItems / limit);
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, Math.max(totalPages, 1))
    : 1;
  const offset = (page - 1) * limit;
  const queryLimit = offset + limit;

  const [books, journals, magazines, theses] = await Promise.all([
    db.select({
      id: tbl_book.id,
      catalogId: tbl_book.bookId,
      title: tbl_book.title,
      author: tbl_book.author,
      publisher: tbl_book.publisher,
      isbn: tbl_book.isbn,
      edition: tbl_book.edition,
      pages: tbl_book.pages,
      language: tbl_book.language,
      description: tbl_book.description,
      year: tbl_book.publishedYear,
      category: tbl_category.name,
      coverImage: tbl_book.coverImage,
      totalCopies: tbl_book.totalCopies,
      availableCopies: tbl_book.availableCopies,
      createdAt: tbl_book.createdAt
    }).from(tbl_book)
      .leftJoin(tbl_category, eq(tbl_book.categoryId, tbl_category.id))
      .where(eq(tbl_book.isActive, true))
      .orderBy(desc(tbl_book.createdAt), desc(tbl_book.id))
      .limit(queryLimit),
    db.select({
      id: tbl_journal.id,
      catalogId: tbl_journal.journalId,
      title: tbl_journal.title,
      author: tbl_journal.publisher,
      issn: tbl_journal.issn,
      volume: tbl_journal.volume,
      issueNumber: tbl_journal.issueNumber,
      language: tbl_journal.language,
      description: tbl_journal.description,
      year: tbl_journal.publishedDate,
      category: tbl_category.name,
      coverImage: tbl_journal.coverImage,
      totalCopies: tbl_journal.totalCopies,
      availableCopies: tbl_journal.availableCopies,
      createdAt: tbl_journal.createdAt
    }).from(tbl_journal)
      .leftJoin(tbl_category, eq(tbl_journal.categoryId, tbl_category.id))
      .where(eq(tbl_journal.isActive, true))
      .orderBy(desc(tbl_journal.createdAt), desc(tbl_journal.id))
      .limit(queryLimit),
    db.select({
      id: tbl_magazine.id,
      catalogId: tbl_magazine.magazineId,
      title: tbl_magazine.title,
      author: tbl_magazine.publisher,
      issn: tbl_magazine.issn,
      volume: tbl_magazine.volume,
      issueNumber: tbl_magazine.issueNumber,
      language: tbl_magazine.language,
      description: tbl_magazine.description,
      year: tbl_magazine.publishedDate,
      category: tbl_category.name,
      coverImage: tbl_magazine.coverImage,
      totalCopies: tbl_magazine.totalCopies,
      availableCopies: tbl_magazine.availableCopies,
      createdAt: tbl_magazine.createdAt
    }).from(tbl_magazine)
      .leftJoin(tbl_category, eq(tbl_magazine.categoryId, tbl_category.id))
      .where(eq(tbl_magazine.isActive, true))
      .orderBy(desc(tbl_magazine.createdAt), desc(tbl_magazine.id))
      .limit(queryLimit),
    db.select({
      id: tbl_thesis.id,
      catalogId: tbl_thesis.thesisId,
      title: tbl_thesis.title,
      author: tbl_thesis.author,
      advisor: tbl_thesis.advisor,
      department: tbl_thesis.department,
      description: tbl_thesis.abstract,
      pdfAvailable: sql<boolean>`${tbl_thesis.pdfFile} is not null`,
      year: tbl_thesis.publicationYear,
      category: tbl_category.name,
      totalCopies: tbl_thesis.totalCopies,
      availableCopies: tbl_thesis.availableCopies,
      createdAt: tbl_thesis.createdAt
    }).from(tbl_thesis)
      .leftJoin(tbl_category, eq(tbl_thesis.categoryId, tbl_category.id))
      .where(eq(tbl_thesis.isActive, true))
      .orderBy(desc(tbl_thesis.createdAt), desc(tbl_thesis.id))
      .limit(queryLimit)
  ]);

  const [
    bookReservations, journalReservations, magazineReservations, thesisReservations,
    bookBorrowings, journalBorrowings, magazineBorrowings, thesisBorrowings
  ] = await Promise.all([
    db.select({ id: tbl_book_reservation.bookId }).from(tbl_book_reservation)
      .where(and(eq(tbl_book_reservation.userId, user.id), or(eq(tbl_book_reservation.status, 'active'), eq(tbl_book_reservation.status, 'borrow_request')))),
    db.select({ id: tbl_journal_reservation.journalId }).from(tbl_journal_reservation)
      .where(and(eq(tbl_journal_reservation.userId, user.id), or(eq(tbl_journal_reservation.status, 'active'), eq(tbl_journal_reservation.status, 'borrow_request')))),
    db.select({ id: tbl_magazine_reservation.magazineId }).from(tbl_magazine_reservation)
      .where(and(eq(tbl_magazine_reservation.userId, user.id), or(eq(tbl_magazine_reservation.status, 'active'), eq(tbl_magazine_reservation.status, 'borrow_request')))),
    db.select({ id: tbl_thesis_reservation.thesisId }).from(tbl_thesis_reservation)
      .where(and(eq(tbl_thesis_reservation.userId, user.id), or(eq(tbl_thesis_reservation.status, 'active'), eq(tbl_thesis_reservation.status, 'borrow_request')))),
    db.select({ id: tbl_book_borrowing.bookId }).from(tbl_book_borrowing)
      .where(and(eq(tbl_book_borrowing.userId, user.id), or(eq(tbl_book_borrowing.status, 'borrowed'), eq(tbl_book_borrowing.status, 'overdue')))),
    db.select({ id: tbl_journal_borrowing.journalId }).from(tbl_journal_borrowing)
      .where(and(eq(tbl_journal_borrowing.userId, user.id), or(eq(tbl_journal_borrowing.status, 'borrowed'), eq(tbl_journal_borrowing.status, 'overdue')))),
    db.select({ id: tbl_magazine_borrowing.magazineId }).from(tbl_magazine_borrowing)
      .where(and(eq(tbl_magazine_borrowing.userId, user.id), or(eq(tbl_magazine_borrowing.status, 'borrowed'), eq(tbl_magazine_borrowing.status, 'overdue')))),
    db.select({ id: tbl_thesis_borrowing.thesisId }).from(tbl_thesis_borrowing)
      .where(and(eq(tbl_thesis_borrowing.userId, user.id), or(eq(tbl_thesis_borrowing.status, 'borrowed'), eq(tbl_thesis_borrowing.status, 'overdue'))))
  ]);

  const reservedKeys = new Set([
    ...bookReservations.map(({ id }) => `book:${id}`),
    ...journalReservations.map(({ id }) => `journal:${id}`),
    ...magazineReservations.map(({ id }) => `magazine:${id}`),
    ...thesisReservations.map(({ id }) => `thesis:${id}`)
  ]);
  const borrowedKeys = new Set([
    ...bookBorrowings.map(({ id }) => `book:${id}`),
    ...journalBorrowings.map(({ id }) => `journal:${id}`),
    ...magazineBorrowings.map(({ id }) => `magazine:${id}`),
    ...thesisBorrowings.map(({ id }) => `thesis:${id}`)
  ]);

  const arrivals = [
    ...books.map((item) => ({ ...item, itemType: 'book' as const, destination: '/dashboard/books' })),
    ...journals.map((item) => ({ ...item, itemType: 'journal' as const, destination: '/dashboard/journal' })),
    ...magazines.map((item) => ({ ...item, itemType: 'magazine' as const, destination: '/dashboard/magazines' })),
    ...theses.map((item) => ({ ...item, itemType: 'thesis' as const, destination: '/dashboard/research' }))
  ]
    .sort((left, right) => {
      const dateOrder = (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0);
      if (dateOrder !== 0) return dateOrder;
      const typeOrder = left.itemType.localeCompare(right.itemType);
      return typeOrder !== 0 ? typeOrder : right.id - left.id;
    })
    .slice(offset, offset + limit)
    .map(({ createdAt, ...item }) => ({
      ...item,
      isReserved: reservedKeys.has(`${item.itemType}:${item.id}`) && !borrowedKeys.has(`${item.itemType}:${item.id}`),
      isBorrowed: borrowedKeys.has(`${item.itemType}:${item.id}`),
      createdAt: createdAt?.toISOString() ?? null,
      year: typeof item.year === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.year)
        ? item.year.slice(0, 4)
        : item.year
    }));

  return json({
    success: true,
    data: { arrivals, pagination: { page, limit, totalItems, totalPages } }
  });
};
