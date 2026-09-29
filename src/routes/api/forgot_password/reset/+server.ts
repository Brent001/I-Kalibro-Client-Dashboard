import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { tbl_user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '$lib/server/db/cache.js';
import { logUserActivity } from '$lib/server/db/activity.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return json(
        { success: false, message: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOTP = otp.trim();

    // Verify OTP from Redis FIRST
    const key = `otp:${normalizedEmail}`;
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
    } catch (parseError) {
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

    // Validate user exists using the email from OTP data
    const [userRow] = await db
      .select({ id: tbl_user.id, email: tbl_user.email })
      .from(tbl_user)
      .where(eq(tbl_user.email, normalizedEmail))
      .limit(1);

    if (!userRow) {
      await redisClient.del(key);
      return json({ 
        success: false, 
        message: 'No account found for this email' 
      }, { status: 404 });
    }

    // Validate password requirements
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Update password in database
    await db
      .update(tbl_user)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(tbl_user.email, normalizedEmail));

    await logUserActivity({
      userId: userRow.id,
      activityType: 'password_reset',
      details: 'Reset account password'
    });

    // Delete OTP from Redis after successful reset
    await redisClient.del(key);

    // Send confirmation email
    try {
      if (!resend) throw new Error('Email service is not configured');
      await resend.emails.send({
        from: 'i-Kalibro <no-reply@i-kalibro.online>',
        to: normalizedEmail,
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
                .logo {
                  display: flex;
                  align-items: center;
                  margin-bottom: 20px;
                }
                .logo-box {
                  background: #ffffff;
                  border-radius: 50%;
                  padding: 10px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  margin-right: 10px;
                }
                .logo img {
                  display: block;
                  margin: 0 auto;
                }
                .logo-text {
                  font-size: 24px;
                  font-weight: 600;
                  color: #0f172a;
                  margin: 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <div class="logo-box">
                    <img src="https://i-kalibro.netlify.app/assets/logo/logo_email.png" alt="i-Kalibro Logo" width="32" height="32" style="display:block;margin:0 auto;" />
                  </div>
                  <p class="logo-text">i-Kalibro</p>
                </div>
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
      console.error('[Reset Password] Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails - password was already reset
    }

    return json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
};