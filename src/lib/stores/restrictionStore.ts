import { derived, writable } from 'svelte/store';

export interface UserRestriction {
  id: number;
  restrictionType: string;
  reason: string | null;
  startDate: string;
  endDate: string | null;
}

export type RestrictedAction = 'reserve' | 'borrow';

export const userRestrictions = writable<UserRestriction[]>([]);

export const restrictedActions = derived(userRestrictions, (restrictions) => {
  const activeTypes = new Set(restrictions.map(({ restrictionType }) => restrictionType));

  return {
    reserve: activeTypes.has('ban_reservation') || activeTypes.has('temporary_suspension'),
    borrow: activeTypes.has('ban_borrowing') || activeTypes.has('temporary_suspension')
  };
});