import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { Resend } from 'resend';
import bcrypt from 'bcrypt';
import { env } from '$env/dynamic/private';

const resend = new Resend(env.VITE_RESEND_API_KEY);

// In-memory storage for OTPs (use Redis or database in production)
const otpStorage = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

// In-memory storage for rate limiting (use Redis in production)
const rateLimitStorage = new Map<string, { count: number; resetAt: number }>();

// Helper function to generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to check rate limit
function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = rateLimitStorage.get(email);

  if (!limit || now > limit.resetAt) {
    rateLimitStorage.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 minutes
    return true;
  }

  if (limit.count >= 5) {
    return false; // Max 5 attempts per 15 minutes
  }

  limit.count++;
  return true;
}

// ============================================
// ENDPOINT 1: Send OTP to Email
// ============================================
// File: src/routes/api/forgot_password/send_otp/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return json({ success: false, message: 'Invalid email address' }, { status: 400 });
    }

    // Check rate limit
    if (!checkRateLimit(email)) {
      return json(
        { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // TODO: Check if email exists in your database
    // const user = await db.user.findUnique({ where: { email } });
    // if (!user) {
    //   return json({ success: false, message: 'Email not found' }, { status: 404 });
    // }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStorage.set(email, { otp, expiresAt, attempts: 0 });

    // Send email using Resend
    try {
      await resend.emails.send({
        from: 'i-Kalibro <noreply@yourdomain.com>', // Change to your verified domain
        to: email,
        subject: 'Password Reset - OTP Verification',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #334155;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background: linear-gradient(to bottom right, #f8fafc, #f1f5f9);
                  border-radius: 12px;
                  padding: 40px;
                  border: 1px solid #e2e8f0;
                }
                .logo {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo-box {
                  display: inline-block;
                  background: #0f172a;
                  padding: 12px;
                  border-radius: 8px;
                  margin-bottom: 10px;
                }
                .logo-text {
                  font-size: 24px;
                  font-weight: bold;
                  color: #0f172a;
                  margin: 0;
                }
                .otp-box {
                  background: white;
                  border: 2px solid #0f172a;
                  border-radius: 8px;
                  padding: 20px;
                  text-align: center;
                  margin: 30px 0;
                }
                .otp-code {
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  color: #0f172a;
                  margin: 0;
                }
                .warning {
                  background: #fef2f2;
                  border-left: 4px solid #ef4444;
                  padding: 12px;
                  border-radius: 4px;
                  margin-top: 20px;
                  font-size: 14px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 12px;
                  color: #64748b;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <div class="logo-box">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <p class="logo-text">i-Kalibro</p>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 10px;">Password Reset Request</h2>
                <p>You requested to reset your password for your i-Kalibro account. Use the OTP code below to verify your identity:</p>
                
                <div class="otp-box">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                  <p class="otp-code">${otp}</p>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Valid for 10 minutes</p>
                </div>
                
                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                
                <div class="warning">
                  <strong>Security Notice:</strong> Never share this OTP with anyone. i-Kalibro staff will never ask for your OTP.
                </div>
                
                <div class="footer">
                  <p>© 2024 i-Kalibro Library Management System<br>Metro Dagupan Colleges</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      return json({ success: true, message: 'OTP sent to your email' });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return json(
        { success: false, message: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};

// ============================================
// ENDPOINT 2: Verify OTP
// ============================================
// File: src/routes/api/forgot_password/verify_otp/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    const stored = otpStorage.get(email);

    if (!stored) {
      return json({ success: false, message: 'OTP not found or expired' }, { status: 404 });
    }

    // Check if OTP expired
    if (Date.now() > stored.expiresAt) {
      otpStorage.delete(email);
      return json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts (max 5 attempts)
    if (stored.attempts >= 5) {
      otpStorage.delete(email);
      return json(
        { success: false, message: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // Verify OTP
    if (stored.otp !== otp) {
      stored.attempts++;
      return json(
        { 
          success: false, 
          message: `Invalid OTP. ${5 - stored.attempts} attempts remaining.` 
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

// ============================================
// ENDPOINT 3: Reset Password
// ============================================
// File: src/routes/api/forgot_password/reset/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return json(
        { success: false, message: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return json(
        { success: false, message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return json(
        { success: false, message: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(newPassword)) {
      return json(
        { success: false, message: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return json(
        { success: false, message: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    const stored = otpStorage.get(email);

    if (!stored) {
      return json({ success: false, message: 'OTP not found or expired' }, { status: 404 });
    }

    // Verify OTP one more time
    if (stored.otp !== otp) {
      return json({ success: false, message: 'Invalid OTP' }, { status: 400 });
    }

    // Check if OTP expired
    if (Date.now() > stored.expiresAt) {
      otpStorage.delete(email);
      return json({ success: false, message: 'OTP has expired' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // TODO: Update password in your database
    // await db.user.update({
    //   where: { email },
    //   data: { password: hashedPassword }
    // });

    // Remove OTP from storage after successful reset
    otpStorage.delete(email);

    // Optional: Send confirmation email
    try {
      await resend.emails.send({
        from: 'i-Kalibro <noreply@yourdomain.com>',
        to: email,
        subject: 'Password Reset Successful',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #334155;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background: linear-gradient(to bottom right, #f8fafc, #f1f5f9);
                  border-radius: 12px;
                  padding: 40px;
                  border: 1px solid #e2e8f0;
                }
                .success-box {
                  background: #f0fdf4;
                  border-left: 4px solid #22c55e;
                  padding: 20px;
                  border-radius: 4px;
                  margin: 20px 0;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 12px;
                  color: #64748b;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2 style="color: #0f172a;">Password Reset Successful</h2>
                
                <div class="success-box">
                  <strong>✓ Your password has been successfully reset.</strong>
                </div>
                
                <p>You can now log in to your i-Kalibro account using your new password.</p>
                
                <p>If you did not perform this action, please contact our support team immediately.</p>
                
                <div class="footer">
                  <p>© 2024 i-Kalibro Library Management System<br>Metro Dagupan Colleges</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if confirmation email fails
    }

    return json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};