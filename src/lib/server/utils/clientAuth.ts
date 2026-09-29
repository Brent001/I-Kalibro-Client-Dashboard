import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { tbl_user } from '$lib/server/db/schema/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function authenticateClientRequest(request: Request, cookieToken?: string) {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : undefined;
  const token = bearerToken || cookieToken;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      userId?: number | string;
      id?: number | string;
    };
    const userId = Number(decoded.userId ?? decoded.id);
    if (!Number.isInteger(userId) || userId < 1) return null;

    const [user] = await db
      .select({ id: tbl_user.id, username: tbl_user.username })
      .from(tbl_user)
      .where(and(eq(tbl_user.id, userId), eq(tbl_user.isActive, true)))
      .limit(1);

    return user ?? null;
  } catch {
    return null;
  }
}