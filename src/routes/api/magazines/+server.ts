import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import { tbl_category, tbl_magazine, tbl_magazine_copy } from '$lib/server/db/schema/schema.js';

export const GET: RequestHandler = async ({ request, cookies, url }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const search = url.searchParams.get('search')?.trim().slice(0, 120) ?? '';
  const categoryValue = url.searchParams.get('category');
  const yearValue = url.searchParams.get('year');
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '12', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 12;
  const filters = [eq(tbl_magazine.isActive, true)];

  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(
      ilike(tbl_magazine.title, pattern),
      ilike(tbl_magazine.publisher, pattern),
      ilike(tbl_magazine.issn, pattern),
      ilike(tbl_magazine.magazineId, pattern),
      ilike(tbl_magazine.description, pattern)
    )!);
  }

  if (categoryValue && categoryValue !== 'all') {
    const categoryId = Number.parseInt(categoryValue, 10);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw error(400, { message: 'Invalid category filter' });
    }
    filters.push(eq(tbl_magazine.categoryId, categoryId));
  }

  if (yearValue && yearValue !== 'all') {
    const year = Number.parseInt(yearValue, 10);
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      throw error(400, { message: 'Invalid year filter' });
    }
    filters.push(sql`extract(year from ${tbl_magazine.publishedDate})::int = ${year}`);
  }

  const where = and(...filters);
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tbl_magazine)
    .where(where);
  const totalItems = Number(countResult?.count ?? 0);

  const magazines = await db
    .select({
      id: tbl_magazine.id,
      magazineId: tbl_magazine.magazineId,
      title: tbl_magazine.title,
      publisher: tbl_magazine.publisher,
      issn: tbl_magazine.issn,
      issueNumber: tbl_magazine.issueNumber,
      volume: tbl_magazine.volume,
      publishedDate: tbl_magazine.publishedDate,
      language: tbl_magazine.language,
      categoryId: tbl_magazine.categoryId,
      category: tbl_category.name,
      location: tbl_magazine.location,
      description: tbl_magazine.description,
      coverImage: tbl_magazine.coverImage
    })
    .from(tbl_magazine)
    .leftJoin(tbl_category, eq(tbl_magazine.categoryId, tbl_category.id))
    .where(where)
    .orderBy(desc(tbl_magazine.publishedDate), desc(tbl_magazine.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const magazineIds = magazines.map((magazine) => magazine.id);
  const copyCounts = magazineIds.length
    ? await db
      .select({
        magazineId: tbl_magazine_copy.magazineId,
        total: sql<number>`count(*)::int`,
        available: sql<number>`count(*) filter (where ${tbl_magazine_copy.status} = 'available')::int`
      })
      .from(tbl_magazine_copy)
      .where(and(
        inArray(tbl_magazine_copy.magazineId, magazineIds),
        eq(tbl_magazine_copy.isActive, true)
      ))
      .groupBy(tbl_magazine_copy.magazineId)
    : [];
  const copyCountByMagazine = new Map(copyCounts.map((row) => [row.magazineId, row]));

  return json({
    success: true,
    data: {
      magazines: magazines.map((magazine) => {
        const counts = copyCountByMagazine.get(magazine.id);
        return {
          ...magazine,
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
