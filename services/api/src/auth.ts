import { Router, Request, Response } from 'express';
import { randomInt } from 'node:crypto';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

export const JWT_SECRET = process.env.JWT_SECRET ?? 'harbor_dev_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '30d';

// ─── OTP helpers ──────────────────────────────────────────────────────────────

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { error } = await getResendClient().emails.send({
    from: 'Harbor <onboarding@resend.dev>',
    to: email,
    subject: `Your Harbor code: ${code}`,
    html: `<!DOCTYPE html>
<html>
  <head>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;padding:0;background:#F3E7D3;font-family:'DM Sans',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:80px 24px 40px;">
          <p style="font-size:48px;font-weight:300;color:#27231C;letter-spacing:0.2em;margin:0 0 32px;font-family:'DM Sans',sans-serif;">
            ${code}
          </p>
          <p style="font-size:14px;font-weight:300;color:rgba(39,35,28,0.60);margin:0;max-width:320px;line-height:1.6;font-family:'DM Sans',sans-serif;">
            This code expires in 10 minutes. If you didn't request this, you can ignore it.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });

  if (error) {
    throw new Error(`Resend error: ${(error as { message?: string }).message ?? String(error)}`);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Auth router ──────────────────────────────────────────────────────────────

export const authRouter = Router();

// POST /auth/request-otp
authRouter.post('/request-otp', async (req: Request, res: Response): Promise<void> => {
  const { email: rawEmail } = req.body;

  if (!rawEmail || typeof rawEmail !== 'string' || !isValidEmail(rawEmail.trim())) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    // Clear any existing unused codes for this email
    await pool.query(
      'DELETE FROM otp_codes WHERE email = $1 AND used = false',
      [email],
    );

    const code = generateOtp();

    await pool.query(
      `INSERT INTO otp_codes (email, code, expires_at)
       VALUES ($1, $2, now() + interval '10 minutes')`,
      [email, code],
    );

    // Always log in dev so we can test without real email delivery
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${email}: ${code}`);
    }

    try {
      await sendOtpEmail(email, code);
    } catch (err) {
      console.error('Failed to send OTP email:', err);
      res.status(500).json({ error: 'Failed to send code' });
      return;
    }

    res.json({ message: 'Code sent' });
  } catch (err) {
    console.error('request-otp error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-otp
authRouter.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { email: rawEmail, code } = req.body;

  if (!rawEmail || !code || typeof rawEmail !== 'string' || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing email or code' });
    return;
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const { rows: otpRows } = await pool.query(
      `SELECT id FROM otp_codes
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, code],
    );

    if (!otpRows[0]) {
      res.status(401).json({ error: 'Invalid or expired code' });
      return;
    }

    await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpRows[0].id]);

    const { rows: userRows } = await pool.query(
      `INSERT INTO users (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, created_at`,
      [email],
    );
    const user = userRows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
