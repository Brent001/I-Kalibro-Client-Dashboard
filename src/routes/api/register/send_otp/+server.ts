import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { tbl_user } from '$lib/server/db/schema/schema.js';
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

function buildOTPEmail(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>e-Kalibro – Verify Your Email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f4f0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text in inbox) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0f4f0;">
    Your e-Kalibro registration code is ${otp} — valid for 10 minutes.
  </div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f0;min-width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Email card -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(13,92,41,0.10);border:1px solid #d4e8d4;">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D5C29 0%,#0a4620 100%);padding:36px 40px 28px;text-align:center;">
              <!-- Gold accent top bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:3px solid #E8B923;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Logo icon area -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0;">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <img src="https://i-kalibro.online/assets/logo.png" alt="e-Kalibro Logo" width="64" height="64" style="display:block;border:0;outline:none;text-decoration:none;margin-bottom:16px;" />
                    <br/>
                    <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">e-Kalibro</span>
                    <br/>
                    <span style="font-size:12px;color:#a8d5b5;letter-spacing:1.5px;text-transform:uppercase;">Library Management System</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="padding:36px 40px 20px;">

              <!-- Greeting -->
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0D5C29;letter-spacing:-0.3px;">
                Complete Your Registration
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                Hello! You're almost there. Use the verification code below to confirm your email address and activate your e-Kalibro account.
              </p>

              <!-- OTP box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#f4faf6;border:2px solid #0D5C29;border-radius:10px;padding:28px 20px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#64748b;">
                      Your Verification Code
                    </p>
                    <!-- OTP digits -->
                    <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#0D5C29;font-family:'Courier New',Courier,monospace;padding-left:14px;">
                      ${otp}
                    </p>
                    <!-- Divider -->
                    <table width="120" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 12px;">
                      <tr>
                        <td style="border-top:2px solid #E8B923;font-size:0;">&nbsp;</td>
                      </tr>
                    </table>
                    <!-- Expiry badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="background:#E8B923;border-radius:20px;padding:5px 16px;">
                          <span style="font-size:12px;font-weight:600;color:#0D5C29;">
                            ⏱ Expires in 10 minutes
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
                Enter this 6-digit code on the registration page to verify your email. Do not close that tab while retrieving this code.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Not you notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                <tr>
                  <td style="background:#f8fafc;border-left:4px solid #94a3b8;border-radius:0 6px 6px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                      <strong style="color:#334155;">Didn't request this?</strong>
                      You can safely ignore this email. No account will be created without completing verification.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background:#fef9ec;border-left:4px solid #E8B923;border-radius:0 6px 6px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;">
                      <strong>🔒 Security Notice:</strong>
                      Never share this code with anyone. e-Kalibro staff will <strong>never</strong> ask for your verification code via email, phone, or chat.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background:#f4faf6;border-top:1px solid #d4e8d4;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0D5C29;">
                e-Kalibro Client Portal
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:#64748b;">
                Metro-Dagupan Colleges, Inc. · Library Management System
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px;">
                <tr>
                  <td style="border-top:2px solid #E8B923;width:40px;font-size:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                This is an automated message from the e-Kalibro system.<br/>
                Please do not reply to this email — this mailbox is not monitored.<br/>
                © ${new Date().getFullYear()} e-Kalibro · Metro-Dagupan Colleges, Inc.
              </p>
            </td>
          </tr>

        </table>
        <!-- End email card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || email.trim().length === 0) {
      return json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const [existingUser] = await db
      .select({ id: tbl_user.id })
      .from(tbl_user)
      .where(eq(tbl_user.email, normalizedEmail))
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

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in Redis with attempts counter
    const otpData = {
      otp,
      expiresAt,
      attempts: 0,
      email: normalizedEmail
    };

    const saved = await redisClient.setex(
      key,
      10 * 60,
      JSON.stringify(otpData)
    );

    if (!saved) {
      return json(
        { success: false, message: 'Failed to generate OTP. Please try again.' },
        { status: 500 }
      );
    }

    // Mask email for display
    const maskedEmail = normalizedEmail.replace(/^(.{2})(.*)(@.*)$/, (_: string, start: string, middle: string, domain: string) => {
      return start + '*'.repeat(middle.length) + domain;
    });

    // Send email
    try {
      await resend.emails.send({
        from: 'e-Kalibro Registration <register@i-kalibro.online>',
        to: normalizedEmail,
        subject: `${otp} is your e-Kalibro verification code`,
        html: buildOTPEmail(otp),
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