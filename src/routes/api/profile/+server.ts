import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// GET - Fetch user profile
export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const token = cookies.get('client_token');
    if (!token) {
      return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userData || userData.length === 0) {
      return json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = userData[0];

    return json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
};

// PUT - Update user profile
export const PUT: RequestHandler = async ({ request, cookies }) => {
  try {
    const token = cookies.get('client_token');
    if (!token) {
      return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== userId) {
        return json(
          { success: false, message: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    // Update user data
    const updateData: any = {
      name: name.trim(),
      updatedAt: new Date()
    };

    if (email && email.trim() !== '') {
      updateData.email = email.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone.trim() || null;
    }

    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userId));

    // Fetch updated user data
    const updatedUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!updatedUser || updatedUser.length === 0) {
      return json({ success: false, message: 'User not found after update' }, { status: 404 });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser[0];

    return json({
      success: true,
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
};