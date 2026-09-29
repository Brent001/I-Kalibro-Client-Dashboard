import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import {
  tbl_category,
  tbl_thesis,
  tbl_thesis_copy
} from '$lib/server/db/schema/schema.js';

export const GET: RequestHandler = async ({ request, cookies, url }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const search = url.searchParams.get('search')?.trim().slice(0, 120) ?? '';
  const categoryValue = url.searchParams.get('category');
  const yearValue = url.searchParams.get('year');
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '12', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, requestedLimit))
    : 12;

  const filters = [eq(tbl_thesis.isActive, true)];
  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(
      ilike(tbl_thesis.title, pattern),
      ilike(tbl_thesis.author, pattern),
      ilike(tbl_thesis.advisor, pattern),
      ilike(tbl_thesis.abstract, pattern),
      ilike(tbl_thesis.department, pattern),
      ilike(tbl_thesis.thesisId, pattern)
    )!);
  }

  if (categoryValue && categoryValue !== 'all') {
    const categoryId = Number.parseInt(categoryValue, 10);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw error(400, { message: 'Invalid category filter' });
    }
    filters.push(eq(tbl_thesis.categoryId, categoryId));
  }

  if (yearValue && yearValue !== 'all') {
    const year = Number.parseInt(yearValue, 10);
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      throw error(400, { message: 'Invalid year filter' });
    }
    filters.push(eq(tbl_thesis.publicationYear, year));
  }

  const where = and(...filters);
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tbl_thesis)
    .where(where);
  const totalItems = Number(countResult?.count ?? 0);

  const theses = await db
    .select({
      id: tbl_thesis.id,
      thesisId: tbl_thesis.thesisId,
      title: tbl_thesis.title,
      author: tbl_thesis.author,
      advisor: tbl_thesis.advisor,
      department: tbl_thesis.department,
      publicationYear: tbl_thesis.publicationYear,
      abstract: tbl_thesis.abstract,
      categoryId: tbl_thesis.categoryId,
      category: tbl_category.name,
      location: tbl_thesis.location,
      pdfAvailable: sql<boolean>`${tbl_thesis.pdfFile} IS NOT NULL AND ${tbl_thesis.pdfFile} <> ''`
    })
    .from(tbl_thesis)
    .leftJoin(tbl_category, eq(tbl_thesis.categoryId, tbl_category.id))
    .where(where)
    .orderBy(desc(tbl_thesis.publicationYear), desc(tbl_thesis.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const thesisIds = theses.map((thesis) => thesis.id);
  const copyCounts = thesisIds.length
    ? await db
      .select({
        thesisId: tbl_thesis_copy.thesisId,
        total: sql<number>`count(*)::int`,
        available: sql<number>`count(*) filter (where ${tbl_thesis_copy.status} = 'available')::int`
      })
      .from(tbl_thesis_copy)
      .where(and(
        inArray(tbl_thesis_copy.thesisId, thesisIds),
        eq(tbl_thesis_copy.isActive, true)
      ))
      .groupBy(tbl_thesis_copy.thesisId)
    : [];
  const copyCountByThesis = new Map(copyCounts.map((row) => [row.thesisId, row]));

  return json({
    success: true,
    data: {
      theses: theses.map((thesis) => {
        const counts = copyCountByThesis.get(thesis.id);
        return {
          ...thesis,
          totalCopies: counts?.total ?? 0,
          availableCopies: counts?.available ?? 0
        };
      }),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    }
  });
};
