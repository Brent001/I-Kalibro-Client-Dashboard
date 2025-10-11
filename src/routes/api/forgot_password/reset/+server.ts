import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { otpStorage } from '$lib/server/otpUtils';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';

const resend = new Resend(env.VITE_RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return json(
        { success: false, message: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [userRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);

    if (!userRow) {
      return json({ success: false, message: 'No account found for this email' }, { status: 404 });
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

    // Update password in database
    await db
      .update(user)
      .set({ password: hashedPassword })
      .where(eq(user.email, email.toLowerCase()));

    // Remove OTP from storage after successful reset
    otpStorage.delete(email);

    // Optional: Send confirmation email
    try {
      await resend.emails.send({
        from: 'i-Kalibro ikalibro@metrodagupancolleges.edu.ph',
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
                  <p>© 2025 i-Kalibro Library Management System<br>Metro Dagupan Colleges</p>
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