import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
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

    // Verify user exists
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

    // Process QR code (add your business logic here)
    const result = processQRCodeServerSide(content, userId);

    // Log the scan (optional)
    // await db.insert(scanLogs).values({
    //   userId,
    //   content,
    //   timestamp: new Date(),
    //   processed: result.success
    // });

    return json({
      success: true,
      processed: result.processed,
      timestamp: new Date().toISOString(),
      message: result.message || 'QR code processed successfully'
    });

  } catch (error) {
    console.error('QR processing API error:', error);
    return json(
      { error: 'Failed to process QR code' },
      { status: 500 }
    );
  }
};

function processQRCodeServerSide(content: string, userId: string) {
  try {
    // Add your QR processing logic here
    // Examples:
    // - Validate QR format
    // - Extract library card number
    // - Check against database
    // - Update visit logs
    // - Send notifications
    
    console.log(`Processing QR for user ${userId}:`, content.substring(0, 50) + '...');
    
    // Example: Library card validation
    if (content.startsWith('LIBRARY_CARD:')) {
      const cardNumber = content.replace('LIBRARY_CARD:', '');
      // Validate card number format
      if (!/^\d{10}$/.test(cardNumber)) {
        return {
          success: false,
          processed: false,
          message: 'Invalid library card format'
        };
      }
      
      // Process valid library card
      return {
        success: true,
        processed: true,
        message: `Library card ${cardNumber} processed`
      };
    }
    
    // Default processing
    return {
      success: true,
      processed: true,
      message: 'QR code content logged'
    };
    
  } catch (error) {
    console.error('QR processing error:', error);
    return {
      success: false,
      processed: false,
      message: 'Processing failed'
    };
  }
}