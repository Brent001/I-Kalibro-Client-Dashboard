import type { ServerLoad } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { tbl_user, tbl_student, tbl_faculty } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const load: ServerLoad = async (event) => {
  const { cookies } = event;
  try {
    const token = cookies.get('client_token');
    if (!token) return { user: null };

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (err) {
      return { user: null };
    }

    const [userRow] = await db
      .select({ id: tbl_user.id, name: tbl_user.name, username: tbl_user.username, userType: tbl_user.userType })
      .from(tbl_user)
      .where(eq(tbl_user.id, decoded.userId || decoded.id))
      .limit(1);

    if (!userRow) return { user: null };

    const base = {
      id: userRow.id,
      name: userRow.name,
      username: userRow.username,
      userType: userRow.userType
    };

    if (userRow.userType === 'student') {
      const [studentRow] = await db
        .select({ enrollmentNo: tbl_student.enrollmentNo, course: tbl_student.course, year: tbl_student.year, department: tbl_student.department })
        .from(tbl_student)
        .where(eq(tbl_student.userId, userRow.id))
        .limit(1);

      return { user: { ...base, enrollmentNo: studentRow?.enrollmentNo ?? null, course: studentRow?.course ?? null, year: studentRow?.year ?? null, department: studentRow?.department ?? null } };
    }

    if (userRow.userType === 'faculty') {
      const [facultyRow] = await db
        .select({ facultyNumber: tbl_faculty.facultyNumber, department: tbl_faculty.department, position: tbl_faculty.position })
        .from(tbl_faculty)
        .where(eq(tbl_faculty.userId, userRow.id))
        .limit(1);

      return { user: { ...base, facultyNumber: facultyRow?.facultyNumber ?? null, department: facultyRow?.department ?? null, position: facultyRow?.position ?? null } };
    }

    return { user: base };
  } catch (error) {
    console.error('user_id page load error:', error);
    return { user: null };
  }
};
