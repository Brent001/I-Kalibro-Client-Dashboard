import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { redisClient } from '$lib/server/db/cache.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOTP = otp.trim();
    const key = `otp:register:${normalizedEmail}`;

    // Get OTP data from Redis
    const storedRaw = await redisClient.get(key);

    if (!storedRaw) {
      return json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.'
      }, { status: 404 });
    }

    let stored;
    try {
      stored = JSON.parse(storedRaw);
    } catch {
      await redisClient.del(key);
      return json({
        success: false,
        message: 'Invalid OTP data. Please request a new one.'
      }, { status: 500 });
    }

    // Check if OTP has expired
    if (Date.now() > stored.expiresAt) {
      await redisClient.del(key);
      return json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      }, { status: 400 });
    }

    // Check if too many failed attempts
    if (stored.attempts >= 5) {
      await redisClient.del(key);
      return json(
        { success: false, message: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // Verify OTP
    if (stored.otp !== normalizedOTP) {
      stored.attempts = (stored.attempts || 0) + 1;
      const remainingAttempts = 5 - stored.attempts;

      // Update attempts in Redis
      const ttl = Math.ceil((stored.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        await redisClient.setex(key, ttl, JSON.stringify(stored));
      }

      return json(
        {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
        },
        { status: 400 }
      );
    }

    // OTP verified, delete from Redis
    await redisClient.del(key);

    return json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};