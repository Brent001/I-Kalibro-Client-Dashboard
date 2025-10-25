import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '$lib/server/db/cache.js';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function checkRateLimit(identifier: string): Promise<boolean> {
  const key = `otp_rate:${identifier.toLowerCase()}`;
  const data = await redisClient.get(key);

  let limit = null;
  if (data) {
    try {
      limit = JSON.parse(data);
    } catch {
      limit = null;
    }
  }

  const now = Date.now();

  if (!limit || now > limit.resetAt) {
    const newLimit = { count: 1, resetAt: now + 15 * 60 * 1000 };
    await redisClient.setex(key, 15 * 60, JSON.stringify(newLimit));
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  const ttl = Math.ceil((limit.resetAt - now) / 1000);
  await redisClient.setex(key, ttl, JSON.stringify(limit));
  return true;
}

const resend = new Resend(env.VITE_RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || email.trim().length === 0) {
      return json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return json({
        success: false,
        message: 'Email is already registered. Please use another email or login.'
      }, { status: 409 });
    }

    // Check rate limit
    if (!(await checkRateLimit(normalizedEmail))) {
      return json(
        { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const key = `otp:register:${normalizedEmail}`;

    // Delete old OTP if exists
    const existingOTP = await redisClient.get(key);
    if (existingOTP) {
      await redisClient.del(key);
    }

    // Generate NEW OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store NEW OTP in Redis with attempts counter
    const otpData = {
      otp,
      expiresAt,
      attempts: 0,
      email: normalizedEmail
    };

    const saved = await redisClient.setex(
      key,
      10 * 60, // 10 minutes TTL
      JSON.stringify(otpData)
    );

    if (!saved) {
      return json(
        { success: false, message: 'Failed to generate OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Mask email for display
    const maskedEmail = normalizedEmail.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, domain) => {
      return start + '*'.repeat(middle.length) + domain;
    });

    // Send email
    try {
      await resend.emails.send({
        from: 'i-Kalibro Registration <register@i-kalibro.online>', // Changed sender
        to: normalizedEmail,
        subject: 'Welcome to i-Kalibro - Complete Your Registration',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: 'Segoe UI', Arial, sans-serif;
                  background: #f1f5f9;
                  color: #1e293b;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  background: #fff;
                  border-radius: 16px;
                  box-shadow: 0 4px 24px rgba(16, 30, 54, 0.08);
                  max-width: 520px;
                  margin: 40px auto;
                  padding: 40px 32px;
                  border: 1px solid #e2e8f0;
                }
                .logo {
                  text-align: center;
                  margin-bottom: 24px;
                }
                .logo-box {
                  display: inline-block;
                  background: #0ea5e9;
                  padding: 10px;
                  border-radius: 8px;
                  margin-bottom: 8px;
                }
                .logo-text {
                  font-size: 26px;
                  font-weight: bold;
                  color: #0ea5e9;
                  margin: 0;
                  letter-spacing: 2px;
                }
                .otp-box {
                  background: #f0f9ff;
                  border: 2px solid #0ea5e9;
                  border-radius: 10px;
                  padding: 24px;
                  text-align: center;
                  margin: 32px 0;
                }
                .otp-code {
                  font-size: 40px;
                  font-weight: bold;
                  letter-spacing: 10px;
                  color: #0ea5e9;
                  margin: 0;
                }
                .info {
                  background: #f1f5f9;
                  border-left: 4px solid #0ea5e9;
                  padding: 12px;
                  border-radius: 4px;
                  margin-top: 20px;
                  font-size: 15px;
                }
                .footer {
                  text-align: center;
                  margin-top: 32px;
                  font-size: 13px;
                  color: #64748b;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <div class="logo-box">
                    <img src="https://i-kalibro.netlify.app/assets/logo/logo_email.png" alt="i-Kalibro Logo" width="36" height="36" style="display:block;margin:0 auto;" />
                  </div>
                  <p class="logo-text">i-Kalibro</p>
                </div>
                
                <h2 style="color: #0ea5e9; margin-bottom: 10px;">Complete Your Registration</h2>
                <p>Thank you for signing up! Please use the OTP code below to verify your email address and finish creating your i-Kalibro account:</p>
                
                <div class="otp-box">
                  <p style="margin: 0 0 5px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your Registration OTP</p>
                  <p class="otp-code">${otp}</p>
                  <p style="margin: 10px 0 0 0; font-size: 15px; color: #64748b;">This code is valid for 10 minutes</p>
                </div>
                
                <div class="info">
                  <strong>Note:</strong> If you did not request this registration, you can safely ignore this email.
                </div>
                <div class="info" style="background:#fef2f2;border-left-color:#ef4444;margin-top:10px;">
                  <strong>Security Tip:</strong> Never share this OTP with anyone. i-Kalibro staff will never ask for your OTP.
                </div>
                
                <div class="footer">
                  <p>© 2025 i-Kalibro Library Management System<br>Metro Dagupan Colleges</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      return json({
        success: true,
        message: 'OTP has been sent to your email',
        email: normalizedEmail,
        maskedEmail: maskedEmail
      });
    } catch (emailError) {
      await redisClient.del(key);
      return json(
        { success: false, message: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};