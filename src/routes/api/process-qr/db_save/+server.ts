import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user, libraryVisit } from '$lib/server/db/schema/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';

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
      .select({ id: user.id, isActive: user.isActive, username: user.username, name: user.name, role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) {
      return json({ error: 'User not found or inactive' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const action = body.action; // 'time_in' or 'time_out'
    const username = body.username || userRow.username;
    const fullName = body.fullName || userRow.name;
    const visitorType = body.visitorType || userRow.role || 'user';
    const purpose = body.purpose || ''; // Only for time_in

    if (!action || (action !== 'time_in' && action !== 'time_out')) {
      return json({ error: 'Invalid action. Must be "time_in" or "time_out"' }, { status: 400 });
    }

    // Handle TIME IN
    if (action === 'time_in') {
      // Check for recent time-in entries to prevent duplicates
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentEntry = await db
        .select()
        .from(libraryVisit)
        .where(
          and(
            eq(libraryVisit.userId, userId),
            isNull(libraryVisit.timeOut) // Only check entries without time out
          )
        )
        .orderBy(desc(libraryVisit.timeIn))
        .limit(1);

      if (recentEntry.length > 0) {
        const timeDiff = Date.now() - recentEntry[0].timeIn.getTime();
        if (timeDiff < 5 * 60 * 1000) {
          return json({
            error: 'You already have an active time-in entry. Please time out first.',
            lastCheckIn: recentEntry[0].timeIn
          }, { status: 409 });
        }
      }

      // Insert new library visit with purpose
      const [newVisit] = await db.insert(libraryVisit).values({
        userId,
        username,
        fullName,
        visitorType,
        purpose, // Store the purpose
        timeIn: new Date(),
        timeOut: null,
        createdAt: new Date()
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
    }

    // Handle TIME OUT
    if (action === 'time_out') {
      // Find the most recent active visit (without time out)
      const [activeVisit] = await db
        .select()
        .from(libraryVisit)
        .where(
          and(
            eq(libraryVisit.userId, userId),
            isNull(libraryVisit.timeOut)
          )
        )
        .orderBy(desc(libraryVisit.timeIn))
        .limit(1);

      if (!activeVisit) {
        return json({
          error: 'No active time-in entry found. Please time in first.',
        }, { status: 404 });
      }

      // Update the visit with time out
      const timeOutTimestamp = new Date();
      await db
        .update(libraryVisit)
        .set({ timeOut: timeOutTimestamp })
        .where(eq(libraryVisit.id, activeVisit.id));

      return json({
        success: true,
        action: 'time_out',
        message: 'Time out recorded successfully',
        timestamp: timeOutTimestamp.toISOString(),
        visitId: activeVisit.id,
        timeIn: activeVisit.timeIn.toISOString()
      });
    }
    
  } catch (error) {
    console.error('Library visit save API error:', error);
    
    // Handle JWT errors
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Handle database constraint errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return json({
        error: 'Duplicate entry detected.',
      }, { status: 409 });
    }
    
    return json(
      { error: 'Failed to save library visit' },
      { status: 500 }
    );
  }
};