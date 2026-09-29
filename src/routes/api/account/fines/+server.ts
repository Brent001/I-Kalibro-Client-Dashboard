import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import { tbl_fine } from '$lib/server/db/schema/schema.js';

export const GET: RequestHandler = async ({ request, cookies }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const records = await db
    .select({
      id: tbl_fine.id,
      itemType: tbl_fine.itemType,
      borrowingId: tbl_fine.borrowingId,
      amount: tbl_fine.fineAmount,
      daysOverdue: tbl_fine.daysOverdue,
      status: tbl_fine.status,
      calculatedAt: tbl_fine.calculatedAt,
      createdAt: tbl_fine.createdAt
    })
    .from(tbl_fine)
    .where(eq(tbl_fine.userId, user.id))
    .orderBy(desc(tbl_fine.createdAt))
    .limit(100);

  const fines = records.map((record) => ({
    ...record,
    amount: Number(record.amount),
    status: record.status ?? 'unpaid'
  }));
  const outstandingAmount = fines
    .filter((fine) => fine.status === 'unpaid')
    .reduce((sum, fine) => sum + (Number.isFinite(fine.amount) ? fine.amount : 0), 0);

  return json({ success: true, data: { fines, outstandingAmount } });
};
