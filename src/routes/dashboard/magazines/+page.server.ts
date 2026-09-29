import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import { db } from '$lib/server/db/index.js';
import { tbl_category, tbl_magazine } from '$lib/server/db/schema/schema.js';

export const load: PageServerLoad = async ({ cookies, request, url }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) {
    cookies.delete('client_token', { path: '/' });
    throw redirect(302, '/');
  }

  const categories = await db
    .select({ id: tbl_category.id, name: tbl_category.name })
    .from(tbl_category)
    .where(eq(tbl_category.itemType, 'magazine'))
    .orderBy(tbl_category.name);

  const yearExpression = sql<number>`extract(year from ${tbl_magazine.publishedDate})::int`;
  const yearRows = await db
    .selectDistinct({ year: yearExpression })
    .from(tbl_magazine)
    .where(and(eq(tbl_magazine.isActive, true), isNotNull(tbl_magazine.publishedDate)))
    .orderBy(desc(yearExpression));

  return {
    user: { id: user.id, username: user.username },
    categories,
    years: yearRows.map(({ year }) => year),
    initialSearch: url.searchParams.get('q') ?? '',
    initialCategory: url.searchParams.get('category') ?? 'all',
    initialYear: url.searchParams.get('year') ?? 'all',
    initialPage: Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  };
};
