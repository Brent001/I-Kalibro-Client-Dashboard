import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Device detection utilities
function detectDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();
  return {
    isMobile: /mobi|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua),
    isAndroid: /android/i.test(ua),
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
    isChrome: /chrome/i.test(ua) && !/edge/i.test(ua),
    isFirefox: /firefox/i.test(ua),
    isEdge: /edge/i.test(ua)
  };
}

// Browser capability check
function checkBrowserCapabilities(userAgent: string) {
  const device = detectDeviceType(userAgent);
  
  // Most modern browsers support getUserMedia
  const supportsCamera = device.isChrome || device.isFirefox || device.isEdge || 
                        device.isSafari || device.isAndroid;
  
  return {
    supportsCamera,
    recommendedSettings: {
      fps: device.isMobile ? 6 : 10,
      qrboxPercentage: device.isMobile ? 0.8 : 0.7,
      preferredCamera: device.isMobile ? 'environment' : 'user'
    }
  };
}

// QR code processing logic
function processQRCode(content: string) {
  // Add your business logic here
  try {
    // Example: Validate format, extract data, log to database, etc.
    console.log('Processing QR code:', content.substring(0, 50) + '...');
    
    // You can add database operations here
    // Example: await db.insert(scanLogs).values({ content, userId, timestamp: new Date() });
    
    return {
      success: true,
      processed: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('QR processing error:', error);
    return {
      success: false,
      error: 'Failed to process QR code',
      timestamp: new Date().toISOString()
    };
  }
}

export const load: PageServerLoad = async ({ cookies, url, request }) => {
  const token = cookies.get('client_token');
  
  if (!token) {
    throw redirect(302, '/');
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.warn('Token missing user ID');
      cookies.delete('client_token', { path: '/' });
      throw redirect(302, '/');
    }

    // Verify user exists and is active
    const [userRow] = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) {
      console.warn('User not found or inactive:', userId);
      cookies.delete('client_token', { path: '/' });
      throw redirect(302, '/');
    }

    // Get device and browser info
    const userAgent = request.headers.get('user-agent') || '';
    const device = detectDeviceType(userAgent);
    const capabilities = checkBrowserCapabilities(userAgent);
    
    // Check if HTTPS (for camera access)
    const isSecureContext = url.protocol === 'https:' || 
                           url.hostname === 'localhost' || 
                           url.hostname === '127.0.0.1';

    return {
      user: {
        id: userRow.id,
        name: userRow.name,
        username: userRow.username,
        email: userRow.email,
        role: userRow.role
      },
      scanner: {
        device,
        capabilities,
        isSecureContext,
        config: capabilities.recommendedSettings,
        errors: {
          httpsRequired: !isSecureContext ? 'Camera access requires HTTPS or localhost' : null,
          unsupportedBrowser: !capabilities.supportsCamera ? 'Browser does not support camera access' : null
        }
      }
    };

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      console.warn('Invalid or expired token:', error.message);
      cookies.delete('client_token', { path: '/' });
      throw redirect(302, '/');
    }
    
    console.error('Dashboard auth check error:', error);
    cookies.delete('client_token', { path: '/' });
    throw redirect(302, '/');
  }
};