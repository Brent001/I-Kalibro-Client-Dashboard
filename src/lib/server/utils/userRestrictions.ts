import { error } from '@sveltejs/kit';
import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { tbl_user_restriction } from '$lib/server/db/schema/schema.js';

export const activeRestrictionWhere = (userId: number, now = new Date()) => and(
  eq(tbl_user_restriction.userId, userId),
  eq(tbl_user_restriction.isActive, true),
  lte(tbl_user_restriction.startDate, now),
  or(isNull(tbl_user_restriction.endDate), gte(tbl_user_restriction.endDate, now))
);

export async function getActiveUserRestrictions(userId: number) {
  return db
    .select({
      id: tbl_user_restriction.id,
      restrictionType: tbl_user_restriction.restrictionType,
      reason: tbl_user_restriction.reason,
      startDate: tbl_user_restriction.startDate,
      endDate: tbl_user_restriction.endDate
    })
    .from(tbl_user_restriction)
    .where(activeRestrictionWhere(userId));
}

async function assertUserCanPerform(userId: number, blockedTypes: string[], action: string) {
  const restrictions = await getActiveUserRestrictions(userId);
  const blockingRestriction = restrictions.find(({ restrictionType }) => blockedTypes.includes(restrictionType));

  if (blockingRestriction) {
    throw error(403, {
      message: blockingRestriction.reason || `Your account is currently restricted from ${action}.`
    });
  }
}

export function assertUserCanReserve(userId: number) {
  return assertUserCanPerform(userId, ['ban_reservation', 'temporary_suspension'], 'making reservations');
}

export function assertUserCanBorrow(userId: number) {
  return assertUserCanPerform(userId, ['ban_borrowing', 'temporary_suspension'], 'borrowing items');
}