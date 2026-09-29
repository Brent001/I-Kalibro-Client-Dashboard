import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';

export const load: PageServerLoad = async ({ cookies, request }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) {
    cookies.delete('client_token', { path: '/' });
    throw redirect(302, '/');
  }
  return { user: { id: user.id, username: user.username } };
};
