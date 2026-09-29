import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { tbl_user, tbl_student, tbl_faculty } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const authenticatedUser = await authenticateClientRequest(request, cookies.get('client_token'));
    if (!authenticatedUser) return json({ error: 'Unauthorized' }, { status: 401 });

    const [userRow] = await db
      .select({ id: tbl_user.id, isActive: tbl_user.isActive, userType: tbl_user.userType })
      .from(tbl_user)
      .where(eq(tbl_user.id, authenticatedUser.id))
      .limit(1);

    if (!userRow || !userRow.isActive) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const { content } = await request.json();
    if (!content || typeof content !== 'string') {
      return json({ error: 'Invalid QR content' }, { status: 400 });
    }

    let ownIdentifier: string | undefined;
    if (userRow.userType === 'student') {
      const [student] = await db
        .select({ enrollmentNo: tbl_student.enrollmentNo })
        .from(tbl_student)
        .where(eq(tbl_student.userId, userRow.id))
        .limit(1);
      ownIdentifier = student?.enrollmentNo;
    } else if (userRow.userType === 'faculty') {
      const [faculty] = await db
        .select({ facultyNumber: tbl_faculty.facultyNumber })
        .from(tbl_faculty)
        .where(eq(tbl_faculty.userId, userRow.id))
        .limit(1);
      ownIdentifier = faculty?.facultyNumber;
    }

    if (!ownIdentifier || content.trim() !== ownIdentifier.trim()) {
      return json({ error: 'You can only scan your own library ID' }, { status: 403 });
    }

    return json({ success: true, processed: true });

  } catch (error) {
    console.error('QR processing API error:', error);
    return json(
      { error: 'Failed to process QR code' },
      { status: 500 }
    );
  }
};