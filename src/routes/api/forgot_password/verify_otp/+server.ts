import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { redisClient } from '$lib/server/db/cache.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const key = `otp:${normalizedEmail}`;
    const storedRaw = await redisClient.get(key);
    const stored = storedRaw ? JSON.parse(storedRaw) : null;

    if (!stored) {
      return json({ success: false, message: 'OTP not found or expired. Please request a new one.' }, { status: 404 });
    }

    if (Date.now() > stored.expiresAt) {
      await redisClient.del(key);
      return json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (stored.attempts >= 5) {
      await redisClient.del(key);
      return json(
        { success: false, message: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    if (stored.otp !== otp.trim()) {
      stored.attempts++;
      await redisClient.setex(key, Math.ceil((stored.expiresAt - Date.now()) / 1000), JSON.stringify(stored));
      return json(
        { 
          success: false, 
          message: `Invalid OTP. ${5 - stored.attempts} attempt${5 - stored.attempts !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      );
    }

    return json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};