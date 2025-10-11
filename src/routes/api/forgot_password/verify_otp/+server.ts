import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

// In-memory storage for OTPs (shared across serverless functions via module scope)
const otpStorage = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const stored = otpStorage.get(normalizedEmail);

    if (!stored) {
      return json({ success: false, message: 'OTP not found or expired. Please request a new one.' }, { status: 404 });
    }

    if (Date.now() > stored.expiresAt) {
      otpStorage.delete(normalizedEmail);
      return json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (stored.attempts >= 5) {
      otpStorage.delete(normalizedEmail);
      return json(
        { success: false, message: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

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

    return json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};

export { otpStorage };