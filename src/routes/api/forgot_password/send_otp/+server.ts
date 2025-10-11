import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
import { eq, or } from 'drizzle-orm';

// In-memory storage for OTPs
const otpStorage = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
const rateLimitStorage = new Map<string, { count: number; resetAt: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const normalizedIdentifier = identifier.toLowerCase();
  const limit = rateLimitStorage.get(normalizedIdentifier);

  if (!limit || now > limit.resetAt) {
    rateLimitStorage.set(normalizedIdentifier, { 
      count: 1, 
      resetAt: now + 15 * 60 * 1000
    });
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}

const resend = new Resend(env.VITE_RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { identifier } = await request.json();

    if (!identifier || identifier.trim().length === 0) {
      return json({ success: false, message: 'Email or username is required' }, { status: 400 });
    }

    const trimmedIdentifier = identifier.trim();

    const [userRow] = await db
      .select({ 
        id: user.id, 
        email: user.email,
        username: user.username 
      })
      .from(user)
      .where(
        or(
          eq(user.email, trimmedIdentifier.toLowerCase()),
          eq(user.username, trimmedIdentifier)
        )
      )
      .limit(1);

    if (!userRow) {
      return json({ 
        success: false, 
        message: 'No account found with this email or username. Please check your credentials or contact support.' 
      }, { status: 404 });
    }

    const userEmail = userRow.email;

    if (!checkRateLimit(userEmail)) {
      return json(
        { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStorage.set(userEmail.toLowerCase(), { otp, expiresAt, attempts: 0 });

    const maskedEmail = userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, domain) => {
      return start + '*'.repeat(middle.length) + domain;
    });

    try {
      await resend.emails.send({
        from: 'i-Kalibro <onboarding@resend.dev>',
        to: userEmail,
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
                  <p>© 2025 i-Kalibro Library Management System<br>Metro Dagupan Colleges</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log(`OTP sent to ${userEmail}: ${otp}`);

      return json({ 
        success: true, 
        message: 'OTP has been sent to your email',
        email: userEmail,
        maskedEmail: maskedEmail
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return json(
        { success: false, message: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};

// Export storage for use by other endpoints
export { otpStorage };