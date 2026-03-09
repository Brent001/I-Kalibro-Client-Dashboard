// src/routes/api/journals/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import {
  tbl_user,
  tbl_journal,
  tbl_journal_copy,
  tbl_category
} from '$lib/server/db/schema/schema.js';
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
      const coversMatch = coverImage.match(/covers\/[^^?]*/);
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

    const conditions: any[] = [];

    if (searchTerm.length > 0) {
      const searchPattern = `%${searchTerm}%`;
      conditions.push(
        or(
          ilike(tbl_journal.title,  searchPattern),
          ilike(tbl_journal.publisher, searchPattern),
          ilike(tbl_journal.journalId, searchPattern)
        )
      );
    }

    if (categoryFilter !== 'all') {
      conditions.push(eq(tbl_journal.categoryId, Number(categoryFilter)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(tbl_journal)
      .leftJoin(tbl_category, eq(tbl_journal.categoryId, tbl_category.id));

    if (whereClause) countQuery.where(whereClause);

    const [countResult] = await countQuery;
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Main journals query
    const journalsQuery = db
      .select({
        id:            tbl_journal.id,
        bookId:        tbl_journal.journalId, // alias to keep client code unchanged
        title:         tbl_journal.title,
        publisher:     tbl_journal.publisher,
        issn:          tbl_journal.issn,
        volume:        tbl_journal.volume,
        issueNumber:   tbl_journal.issueNumber,
        publishedDate: tbl_journal.publishedDate,
        language:      tbl_journal.language,
        categoryId:    tbl_journal.categoryId,
        category:      tbl_category.name,
        location:      tbl_journal.location,
        totalCopies:   tbl_journal.totalCopies,
        description:   tbl_journal.description,
        coverImage:    tbl_journal.coverImage,
      })
      .from(tbl_journal)
      .leftJoin(tbl_category, eq(tbl_journal.categoryId, tbl_category.id));

    if (whereClause) journalsQuery.where(whereClause);

    const journals = await journalsQuery
      .orderBy(desc(tbl_journal.createdAt))
      .limit(limit)
      .offset(offset);

    // compute copy counts similar to books
    const journalIds = journals.map(j => j.id);
    let copyCountMap: Record<number, { available: number; total: number }> = {};

    if (journalIds.length > 0) {
      const copyCounts = await db
        .select({
          journalId: tbl_journal_copy.journalId,
          total:     sql<number>`count(*)::int`,
          available: sql<number>`COUNT(*) FILTER (WHERE ${tbl_journal_copy.status} = 'available' AND ${tbl_journal_copy.isActive} = true)`
        })
        .from(tbl_journal_copy)
        .where(and(
          inArray(tbl_journal_copy.journalId, journalIds),
          eq(tbl_journal_copy.isActive, true)
        ))
        .groupBy(tbl_journal_copy.journalId);

      for (const row of copyCounts) {
        copyCountMap[row.journalId] = {
          available: Number(row.available),
          total:     Number(row.total)
        };
      }
    }

    const processed = journals.map(journal => ({
      ...journal,
      coverImage:      journal.coverImage ? extractCoverPath(journal.coverImage) : null,
      availableCopies: copyCountMap[journal.id]?.available ?? 0,
      totalCopies:     copyCountMap[journal.id]?.total ?? journal.totalCopies
    }));

    return json({
      success: true,
      data: {
        journals: processed,
        pagination: {
          totalPages,
          totalItems: total
        }
      }
    });

  } catch (err: any) {
    console.error('GET /api/journals error:', err);
    if (err.status) throw err;
    throw error(500, { message: 'Internal server error' });
  }
};
