// src/routes/api/books/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { tbl_user, tbl_book, tbl_book_copy, tbl_category } from '$lib/server/db/schema/schema.js';
import { eq, or, ilike, sql, desc, and, inArray } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

interface AuthenticatedUser {
  id: number;
  userType: string;
  username: string;
  email: string;
}

// Extract relative path from full B2 URL
function extractCoverPath(coverImage: string): string {
  if (!coverImage) return '';

  if (coverImage.startsWith('http')) {
    try {
      const url = new URL(coverImage);
      let pathname = url.pathname;
      if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
      }
      return pathname;
    } catch (e) {
      console.error('Error parsing cover URL:', coverImage, e);
      const coversMatch = coverImage.match(/covers\/[^?]*/);
      if (coversMatch) return coversMatch[0];
      return '';
    }
  }

  if (coverImage.startsWith('covers/')) return coverImage;

  console.warn('Unexpected cover path format:', coverImage);
  return coverImage;
}

async function authenticateUser(request: Request): Promise<AuthenticatedUser | null> {
  try {
    let token: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split('; ').map(c => c.split('='))
        );
        token = cookies.client_token;
      }
    }

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    if (!userId) return null;

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
      userType: userRow.userType || '',
      username: userRow.username || '',
      email: userRow.email || ''
    };
  } catch (err) {
    console.error('Authentication error:', err);
    return null;
  }
}

export const GET: RequestHandler = async ({ request, url }: { request: Request; url: URL }) => {
  try {
    const authenticatedUser = await authenticateUser(request);
    if (!authenticatedUser) {
      throw error(401, { message: 'Unauthorized' });
    }

    const searchTerm    = url.searchParams.get('search')?.trim() || '';
    const categoryFilter = url.searchParams.get('category') || 'all';
    const page          = parseInt(url.searchParams.get('page')  || '1');
    const limit         = parseInt(url.searchParams.get('limit') || '10');
    const offset        = (page - 1) * limit;

    const conditions = [];

    if (searchTerm.length > 0) {
      const searchPattern = `%${searchTerm}%`;
      conditions.push(
        or(
          ilike(tbl_book.title,  searchPattern),
          ilike(tbl_book.author, searchPattern),
          ilike(tbl_book.bookId, searchPattern)
        )
      );
    }

    if (categoryFilter !== 'all') {
      conditions.push(eq(tbl_book.categoryId, Number(categoryFilter)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(tbl_book)
      .leftJoin(tbl_category, eq(tbl_book.categoryId, tbl_category.id));

    if (whereClause) countQuery.where(whereClause);

    const [countResult] = await countQuery;
    const totalBooks = countResult?.count || 0;
    const totalPages = Math.ceil(totalBooks / limit);

    // Main books query
    const booksQuery = db
      .select({
        id:            tbl_book.id,
        bookId:        tbl_book.bookId,
        title:         tbl_book.title,
        author:        tbl_book.author,
        isbn:          tbl_book.isbn,
        publisher:     tbl_book.publisher,
        publishedYear: tbl_book.publishedYear,
        edition:       tbl_book.edition,
        language:      tbl_book.language,
        pages:         tbl_book.pages,
        categoryId:    tbl_book.categoryId,
        category:      tbl_category.name,
        location:      tbl_book.location,
        totalCopies:   tbl_book.totalCopies,
        description:   tbl_book.description,
        coverImage:    tbl_book.coverImage,
      })
      .from(tbl_book)
      .leftJoin(tbl_category, eq(tbl_book.categoryId, tbl_category.id));

    if (whereClause) booksQuery.where(whereClause);

    const books = await booksQuery
      .orderBy(desc(tbl_book.createdAt))
      .limit(limit)
      .offset(offset);

    // ── FIX: real-time available copy counts from tbl_book_copy ──────────────
    // Replaces the stale denormalized availableCopies column on tbl_book.
    const bookIds = books.map(b => b.id);
    let copyCountMap: Record<number, { available: number; total: number }> = {};

    if (bookIds.length > 0) {
      const copyCounts = await db
        .select({
          bookId:    tbl_book_copy.bookId,
          total:     sql<number>`count(*)::int`,
          available: sql<number>`COUNT(*) FILTER (WHERE ${tbl_book_copy.status} = 'available' AND ${tbl_book_copy.isActive} = true)`
        })
        .from(tbl_book_copy)
        .where(and(
          inArray(tbl_book_copy.bookId, bookIds),
          eq(tbl_book_copy.isActive, true)
        ))
        .groupBy(tbl_book_copy.bookId);

      for (const row of copyCounts) {
        copyCountMap[row.bookId] = {
          available: Number(row.available),
          total:     Number(row.total)
        };
      }
    }

    const processedBooks = books.map(book => ({
      ...book,
      coverImage:      book.coverImage ? extractCoverPath(book.coverImage) : null,
      availableCopies: copyCountMap[book.id]?.available ?? 0,
      totalCopies:     copyCountMap[book.id]?.total     ?? book.totalCopies
    }));

    return json({
      success: true,
      data: {
        books: processedBooks,
        pagination: {
          currentPage: page,
          totalPages,
          totalBooks,
          limit
        }
      }
    });

  } catch (err: any) {
    console.error('Error fetching books:', err);
    if (err?.status) throw err;
    throw error(500, { message: 'Internal server error' });
  }
};