import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user, libraryVisit } from '$lib/server/db/schema/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Verify authentication
    const token = cookies.get('client_token');
    if (!token) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;

    // Verify user exists and is active
    const [userRow] = await db
      .select({ id: user.id, isActive: user.isActive, username: user.username, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body for extra info
    const body = await request.json();
    const username = body.username || userRow.username;
    const fullName = body.fullName || userRow.name;

    // Only handle time in
    await db.insert(libraryVisit).values({
      userId,
      username,
      fullName,
      timeIn: new Date(),
      status: 'checked_in'
    });

    return json({
      success: true,
      action: 'time_in',
      message: 'Time in recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Library visit save API error:', error);
    return json(
      { error: 'Failed to save time in' },
      { status: 500 }
    );
  }
};