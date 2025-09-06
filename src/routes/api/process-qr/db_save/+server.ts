import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user, libraryVisit } from '$lib/server/db/schema/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';

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
      return json({ error: 'User not found or inactive' }, { status: 404 });
    }

    // Parse request body for extra info
    const body = await request.json();
    const username = body.username || userRow.username;
    const fullName = body.fullName || userRow.name;

    // Check for recent entries to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    const recentEntry = await db
      .select()
      .from(libraryVisit)
      .where(
        and(
          eq(libraryVisit.userId, userId),
          gte(libraryVisit.timeIn, fiveMinutesAgo)
        )
      )
      .orderBy(desc(libraryVisit.timeIn))
      .limit(1);

    if (recentEntry.length > 0) {
      return json({
        error: 'You have already checked in within the last 5 minutes. Please wait before scanning again.',
        lastCheckIn: recentEntry[0].timeIn
      }, { status: 409 }); // 409 Conflict
    }

    // Insert new library visit
    const [newVisit] = await db.insert(libraryVisit).values({
      userId,
      username,
      fullName,
      timeIn: new Date(),
      status: 'checked_in'
    }).returning({
      id: libraryVisit.id,
      timeIn: libraryVisit.timeIn
    });

    return json({
      success: true,
      action: 'time_in',
      message: 'Time in recorded successfully',
      timestamp: newVisit.timeIn.toISOString(),
      visitId: newVisit.id
    });
    
  } catch (error) {
    console.error('Library visit save API error:', error);
    
    // Handle database constraint errors (if you have unique constraints)
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return json({
        error: 'Duplicate entry detected. You may have already checked in recently.',
      }, { status: 409 });
    }
    
    return json(
      { error: 'Failed to save time in' },
      { status: 500 }
    );
  }
};