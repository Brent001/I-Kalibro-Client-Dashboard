import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { otpStorage } from '$lib/server/otpUtils';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase();
    const stored = otpStorage.get(normalizedEmail);

    if (!stored) {
      return json({ success: false, message: 'OTP not found or expired. Please request a new one.' }, { status: 404 });
    }

    // Check if OTP expired
    if (Date.now() > stored.expiresAt) {
      otpStorage.delete(normalizedEmail);
      return json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts (max 5 attempts)
    if (stored.attempts >= 5) {
      otpStorage.delete(normalizedEmail);
      return json(
        { success: false, message: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // Verify OTP
    if (stored.otp !== otp.trim()) {
      stored.attempts++;
      return json(
        { 
          success: false, 
          message: `Invalid OTP. ${5 - stored.attempts} attempt${5 - stored.attempts !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      );
    }

    // OTP verified successfully
    return json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};