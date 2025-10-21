import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { user, student, faculty } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// POST: Client Create Account (Student or Faculty)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Normalize type/role - handle both 'type' and 'role' fields
    let userRole = body.type || body.role;
    if (!userRole) {
      return json({ success: false, message: 'Missing member type (student or faculty)' }, { status: 400 });
    }
    userRole = userRole.toLowerCase();

    // Validate role
    if (userRole !== 'student' && userRole !== 'faculty') {
      return json({ success: false, message: 'Invalid role. Must be student or faculty' }, { status: 400 });
    }

    // Required fields validation
    if (!body.name?.trim()) {
      return json({ success: false, message: 'Name is required' }, { status: 400 });
    }
    if (!body.email?.trim()) {
      return json({ success: false, message: 'Email is required' }, { status: 400 });
    }
    if (!body.username?.trim()) {
      return json({ success: false, message: 'Username is required' }, { status: 400 });
    }
    if (!body.password) {
      return json({ success: false, message: 'Password is required' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }

    // Username validation
    if (body.username.length < 3) {
      return json({ success: false, message: 'Username must be at least 3 characters long' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
      return json({ success: false, message: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    // Password validation
    if (body.password.length < 8) {
      return json({ success: false, message: 'Password must be at least 8 characters long' }, { status: 400 });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.password)) {
      return json({ success: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }, { status: 400 });
    }

    // Role-specific validation
    if (userRole === 'student') {
      if (!body.enrollmentNo?.trim()) {
        return json({ success: false, message: 'Enrollment number is required for students' }, { status: 400 });
      }
      if (!body.course) {
        return json({ success: false, message: 'Course is required for students' }, { status: 400 });
      }
      if (!body.year) {
        return json({ success: false, message: 'Year level is required for students' }, { status: 400 });
      }
    } else if (userRole === 'faculty') {
      if (!body.department) {
        return json({ success: false, message: 'Department is required for faculty' }, { status: 400 });
      }
    }

    // Age validation if provided
    let age: number | null = null;
    if (body.age !== undefined && body.age !== null && body.age !== '') {
      age = parseInt(body.age);
      if (isNaN(age) || age < 16 || age > 100) {
        return json({ success: false, message: 'Age must be between 16 and 100' }, { status: 400 });
      }
    }

    // Check for duplicate email
    const emailExists = await db.select({ id: user.id }).from(user).where(eq(user.email, body.email.toLowerCase())).limit(1);
    if (emailExists.length > 0) {
      return json({ success: false, message: 'Email address is already registered' }, { status: 409 });
    }

    // Check for duplicate username
    const usernameExists = await db.select({ id: user.id }).from(user).where(eq(user.username, body.username.toLowerCase())).limit(1);
    if (usernameExists.length > 0) {
      return json({ success: false, message: 'Username is already taken' }, { status: 409 });
    }

    // For students, check enrollment number uniqueness
    if (userRole === 'student' && body.enrollmentNo) {
      const enrollmentExists = await db.select({ id: student.id }).from(student).where(eq(student.enrollmentNo, body.enrollmentNo)).limit(1);
      if (enrollmentExists.length > 0) {
        return json({ success: false, message: 'Enrollment number is already registered' }, { status: 409 });
      }
    }

    // For faculty, check faculty number uniqueness if provided
    if (userRole === 'faculty' && body.facultyNumber) {
      const facultyNumberExists = await db.select({ id: faculty.id }).from(faculty).where(eq(faculty.facultyNumber, body.facultyNumber)).limit(1);
      if (facultyNumberExists.length > 0) {
        return json({ success: false, message: 'Faculty number is already registered' }, { status: 409 });
      }
    }

    // Hash password
    const passwordSalt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(body.password, passwordSalt);

    // Insert into user table
    const [newUser] = await db.insert(user).values({
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone?.trim() || null,
      username: body.username.toLowerCase().trim(),
      password: hashedPassword,
      role: userRole,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    });

    // Insert into student or faculty table
    if (userRole === 'student') {
      await db.insert(student).values({
        userId: newUser.id,
        age: age,
        enrollmentNo: body.enrollmentNo.trim(),
        course: body.course,
        year: body.year,
        department: body.department || null,
        gender: body.gender || null
      });
    } else if (userRole === 'faculty') {
      await db.insert(faculty).values({
        userId: newUser.id,
        age: age,
        department: body.department,
        facultyNumber: body.facultyNumber?.trim() || null,
        gender: body.gender || null
      });
    }

    // Return success response with user data
    return json({
      success: true,
      message: 'Account created successfully. Please wait for admin approval.',
      data: {
        id: newUser.id,
        type: userRole === 'student' ? 'Student' : 'Faculty',
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        username: newUser.username,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating account:', err);

    // Handle database constraint violations
    if (err.code === '23505') { // PostgreSQL unique constraint violation
      let message = 'A user with this information already exists';
      if (err.detail?.includes('email')) {
        message = 'Email address is already registered';
      } else if (err.detail?.includes('username')) {
        message = 'Username is already taken';
      } else if (err.detail?.includes('enrollment_no')) {
        message = 'Enrollment number is already registered';
      } else if (err.detail?.includes('faculty_number')) {
        message = 'Faculty number is already registered';
      }
      return json({ success: false, message }, { status: 409 });
    }

    // Handle other database errors
    if (err.code) {
      console.error('Database error:', err.code, err.detail);
      return json({ success: false, message: 'Database error occurred' }, { status: 500 });
    }

    // Generic error
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};