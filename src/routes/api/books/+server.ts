// src/routes/api/books/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user, book, category } from '$lib/server/db/schema/schema.js';
import { eq, or, ilike, sql, desc, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

interface AuthenticatedUser {
  id: number;
  role: string;
  username: string;
  email: string;
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
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) return null;

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== userRow.tokenVersion) {
      return null;
    }

    return {
      id: userRow.id,
      role: userRow.role || '',
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

    // Get query parameters
    const searchTerm = url.searchParams.get('search')?.trim() || '';
    const categoryFilter = url.searchParams.get('category') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions = [];

    // Apply search filter - search across title, author, and bookId
    if (searchTerm.length > 0) {
      const searchPattern = `%${searchTerm}%`;
      conditions.push(
        or(
          ilike(book.title, searchPattern),
          ilike(book.author, searchPattern),
          ilike(book.bookId, searchPattern)
        )
      );
    }

    // Apply category filter (by category ID)
    if (categoryFilter !== 'all') {
      // categoryFilter is the category id (number as string)
      conditions.push(eq(book.categoryId, Number(categoryFilter)));
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(book)
      .leftJoin(category, eq(book.categoryId, category.id));

    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const totalBooks = countResult?.count || 0;
    const totalPages = Math.ceil(totalBooks / limit);

    // Build and execute main query with pagination
    const booksQuery = db
      .select({
        id: book.id,
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        publishedYear: book.publishedYear,
        copiesAvailable: book.copiesAvailable,
        category: category.name,
        publisher: book.publisher,
        location: book.location,
        description: sql<string>`''`, // Add if you have description field
        language: book.language,
      })
      .from(book)
      .leftJoin(category, eq(book.categoryId, category.id));

    if (whereClause) {
      booksQuery.where(whereClause);
    }

    const books = await booksQuery
      .orderBy(desc(book.createdAt))
      .limit(limit)
      .offset(offset);

    return json({
      success: true,
      data: {
        books,
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

    if (err?.status) {
      throw err;
    }

    throw error(500, { message: 'Internal server error' });
  }
};