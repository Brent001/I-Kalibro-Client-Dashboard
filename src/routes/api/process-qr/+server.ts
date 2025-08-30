import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user, qrCodeToken } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';

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
      .select({ id: user.id, isActive: user.isActive })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const { content } = await request.json();
    if (!content || typeof content !== 'string') {
      return json({ error: 'Invalid QR content' }, { status: 400 });
    }

    // Check if QR code exists in qrCodeToken table
    const [qrRow] = await db
      .select()
      .from(qrCodeToken)
      .where(eq(qrCodeToken.token, content))
      .limit(1);

    if (!qrRow) {
      return json({ error: 'QR code is not valid or not recognized.' }, { status: 400 });
    }

    // Here you would process time in (e.g., insert into libraryVisit table)
    // Example pseudo-logic:
    // await db.insert(libraryVisit).values({ userId, timeIn: new Date(), qrToken: content });

    return json({
      success: true,
      processed: true,
      timestamp: new Date().toISOString(),
      message: 'Time in recorded successfully'
    });

  } catch (error) {
    console.error('QR processing API error:', error);
    return json(
      { error: 'Failed to process QR code' },
      { status: 500 }
    );
  }
};