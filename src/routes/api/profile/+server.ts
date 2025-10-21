import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user, student, faculty } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// GET - Fetch user profile (student/faculty)
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
    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userData) {
      return json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Fetch student/faculty info
    let extraInfo = null;
    if (userData.role === 'student') {
      [extraInfo] = await db.select().from(student).where(eq(student.userId, userId)).limit(1);
    } else if (userData.role === 'faculty') {
      [extraInfo] = await db.select().from(faculty).where(eq(faculty.userId, userId)).limit(1);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = userData;

    return json({
      success: true,
      user: userWithoutPassword,
      extraInfo
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
    const { name, email, phone, gender, age, department, course, year, enrollmentNo, facultyNumber } = body;

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

    // Update student/faculty info
    const [userRow] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    let extraInfo = null;
    if (userRow.role === 'student') {
      await db.update(student).set({
        gender: gender || null,
        age: age !== undefined ? age : null,
        department: department || null,
        course: course || null,
        year: year || null,
        enrollmentNo: enrollmentNo || null
      }).where(eq(student.userId, userId));
      [extraInfo] = await db.select().from(student).where(eq(student.userId, userId)).limit(1);
    } else if (userRow.role === 'faculty') {
      await db.update(faculty).set({
        gender: gender || null,
        age: age !== undefined ? age : null,
        department: department || null,
        facultyNumber: facultyNumber || null
      }).where(eq(faculty.userId, userId));
      [extraInfo] = await db.select().from(faculty).where(eq(faculty.userId, userId)).limit(1);
    }

    // Fetch updated user data
    const [updatedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return json({
      success: true,
      message: 'Profile updated successfully',
      user: userWithoutPassword,
      extraInfo
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
};