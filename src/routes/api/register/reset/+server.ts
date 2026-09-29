import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { tbl_user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '$lib/server/db/cache.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp, password } = await request.json();

    if (!email || !otp || !password) {
      return json(
        { success: false, message: 'Email, OTP, and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOTP = otp.trim();

    // Verify OTP from Redis
    const key = `otp:register:${normalizedEmail}`;
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

    // Check if OTP expired
    if (Date.now() > stored.expiresAt) {
      await redisClient.del(key);
      return json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      }, { status: 400 });
    }

    // Verify OTP matches
    if (stored.otp !== normalizedOTP) {
      return json({
        success: false,
        message: 'Invalid OTP. Please verify your OTP again.'
      }, { status: 400 });
    }

    // Validate password requirements
    if (password.length < 8) {
      return json(
        { success: false, message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return json(
        { success: false, message: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return json(
        { success: false, message: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return json(
        { success: false, message: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    // Check if user already exists (should not exist for registration)
    const [existingUser] = await db
      .select({ id: tbl_user.id })
      .from(tbl_user)
      .where(eq(tbl_user.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      await redisClient.del(key);
      return json({
        success: false,
        message: 'Email is already registered. Please login or use forgot password.'
      }, { status: 409 });
    }

    // This legacy endpoint cannot create a valid account without the verified registration form fields.
    await redisClient.del(key);
    return json({
      success: false,
      message: 'This registration endpoint is retired. Use the verified registration form.'
    }, { status: 410 });
  } catch (error) {
    return json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
};