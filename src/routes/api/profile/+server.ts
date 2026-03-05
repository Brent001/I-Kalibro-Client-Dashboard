import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
    tbl_user,
    tbl_student,
    tbl_faculty,
    tbl_book_borrowing,
    tbl_magazine_borrowing,
    tbl_thesis_borrowing,
    tbl_journal_borrowing,
    tbl_library_visit
} from '$lib/server/db/schema/schema.js';
import { eq, or, and, count, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function getAuthUserId(cookies: any): number | null {
    try {
        const token = cookies.get('client_token');
        if (!token) return null;
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.userId || decoded.id || null;
    } catch {
        return null;
    }
}

// ────────────────────────────────────────────────────
// GET  /api/profile
// Returns merged tbl_user + tbl_student | tbl_faculty
// plus computed stats from borrowing & visit tables
// ────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ cookies }) => {
    const userId = getAuthUserId(cookies);
    if (!userId) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        // ── Core user row ──────────────────────────────
        const [userData] = await db
            .select()
            .from(tbl_user)
            .where(eq(tbl_user.id, userId))
            .limit(1);

        if (!userData) {
            return json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // ── Type-specific profile ──────────────────────
        let profile: Record<string, any> = {};
        if (userData.userType === 'student') {
            const [row] = await db
                .select()
                .from(tbl_student)
                .where(eq(tbl_student.userId, userId))
                .limit(1);
            if (row) profile = row;
        } else if (userData.userType === 'faculty') {
            const [row] = await db
                .select()
                .from(tbl_faculty)
                .where(eq(tbl_faculty.userId, userId))
                .limit(1);
            if (row) profile = row;
        }

        // ── Stats ──────────────────────────────────────
        // Total items ever borrowed (all types combined)
        const [bookCount] = await db
            .select({ c: count() })
            .from(tbl_book_borrowing)
            .where(eq(tbl_book_borrowing.userId, userId));

        const [magCount] = await db
            .select({ c: count() })
            .from(tbl_magazine_borrowing)
            .where(eq(tbl_magazine_borrowing.userId, userId));

        const [thesisCount] = await db
            .select({ c: count() })
            .from(tbl_thesis_borrowing)
            .where(eq(tbl_thesis_borrowing.userId, userId));

        const [journalCount] = await db
            .select({ c: count() })
            .from(tbl_journal_borrowing)
            .where(eq(tbl_journal_borrowing.userId, userId));

        const totalBorrowedEver =
            Number(bookCount.c) +
            Number(magCount.c) +
            Number(thesisCount.c) +
            Number(journalCount.c);

        // Currently active borrows (not yet returned)
        const [activeBooksCount] = await db
            .select({ c: count() })
            .from(tbl_book_borrowing)
            .where(
                and(
                    eq(tbl_book_borrowing.userId, userId),
                    or(
                        eq(tbl_book_borrowing.status, 'borrowed'),
                        eq(tbl_book_borrowing.status, 'overdue')
                    )
                )
            );

        const [activeMagCount] = await db
            .select({ c: count() })
            .from(tbl_magazine_borrowing)
            .where(
                and(
                    eq(tbl_magazine_borrowing.userId, userId),
                    or(
                        eq(tbl_magazine_borrowing.status, 'borrowed'),
                        eq(tbl_magazine_borrowing.status, 'overdue')
                    )
                )
            );

        const [activeThesisCount] = await db
            .select({ c: count() })
            .from(tbl_thesis_borrowing)
            .where(
                and(
                    eq(tbl_thesis_borrowing.userId, userId),
                    or(
                        eq(tbl_thesis_borrowing.status, 'borrowed'),
                        eq(tbl_thesis_borrowing.status, 'overdue')
                    )
                )
            );

        const [activeJournalCount] = await db
            .select({ c: count() })
            .from(tbl_journal_borrowing)
            .where(
                and(
                    eq(tbl_journal_borrowing.userId, userId),
                    or(
                        eq(tbl_journal_borrowing.status, 'borrowed'),
                        eq(tbl_journal_borrowing.status, 'overdue')
                    )
                )
            );

        const currentlyBorrowed =
            Number(activeBooksCount.c) +
            Number(activeMagCount.c) +
            Number(activeThesisCount.c) +
            Number(activeJournalCount.c);

        // Library visit count
        const [visitCount] = await db
            .select({ c: count() })
            .from(tbl_library_visit)
            .where(eq(tbl_library_visit.userId, userId));

        // ── Build merged user object (no password) ─────
        const { password, ...userSafe } = userData;

        return json({
            success: true,
            user: {
                // tbl_user fields
                ...userSafe,
                // tbl_student / tbl_faculty fields (flattened)
                enrollmentNo:  profile.enrollmentNo  ?? null,
                facultyNumber: profile.facultyNumber ?? null,
                gender:        profile.gender        ?? null,
                age:           profile.age           ?? null,
                course:        profile.course        ?? null,
                year:          profile.year          ?? null,
                department:    profile.department    ?? null,
                position:      profile.position      ?? null,
            },
            stats: {
                totalBorrowedEver,
                currentlyBorrowed,
                libraryVisits: Number(visitCount.c),
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return json({ success: false, message: 'Failed to fetch profile' }, { status: 500 });
    }
};

// ────────────────────────────────────────────────────
// PUT  /api/profile
// Updates tbl_user (name, email, phone) and
// tbl_student or tbl_faculty for type-specific fields.
// enrollmentNo / facultyNumber are NOT user-editable
// (set by admin at registration).
// ────────────────────────────────────────────────────
export const PUT: RequestHandler = async ({ request, cookies }) => {
    const userId = getAuthUserId(cookies);
    if (!userId) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            name, email, phone,
            // student fields
            gender, age, department, course, year,
            // faculty-only
            position
        } = body;

        // ── Validate ───────────────────────────────────
        if (!name || !String(name).trim()) {
            return json({ success: false, message: 'Name is required' }, { status: 400 });
        }

        // Guard: email uniqueness (if provided and different)
        if (email) {
            const [taken] = await db
                .select({ id: tbl_user.id })
                .from(tbl_user)
                .where(eq(tbl_user.email, email.trim()))
                .limit(1);

            if (taken && taken.id !== userId) {
                return json({ success: false, message: 'Email is already in use' }, { status: 400 });
            }
        }

        // ── Update tbl_user ────────────────────────────
        const userUpdate: Record<string, any> = {
            name:      String(name).trim(),
            updatedAt: new Date()
        };
        if (email !== undefined) userUpdate.email = email?.trim() || null;
        if (phone !== undefined) userUpdate.phone = phone?.trim() || null;

        await db.update(tbl_user).set(userUpdate).where(eq(tbl_user.id, userId));
        // record activity for later viewing
        import('$lib/server/db/activity.js').then(({ logUserActivity }) => {
            logUserActivity({
                userId,
                activityType: 'profile_update',
                details: `Updated profile information`
            });
        }).catch(console.error);

        // ── Update type-specific table ─────────────────
        const [userRow] = await db
            .select({ userType: tbl_user.userType })
            .from(tbl_user)
            .where(eq(tbl_user.id, userId))
            .limit(1);

        if (userRow.userType === 'student') {
            await db
                .update(tbl_student)
                .set({
                    gender:     gender     ?? null,
                    age:        age != null ? Number(age) : null,
                    department: department ?? null,
                    course:     course     ?? null,
                    year:       year       ?? null,
                    updatedAt:  new Date()
                })
                .where(eq(tbl_student.userId, userId));

        } else if (userRow.userType === 'faculty') {
            await db
                .update(tbl_faculty)
                .set({
                    gender:     gender     ?? null,
                    age:        age != null ? Number(age) : null,
                    department: department ?? null,
                    position:   position   ?? null,
                    updatedAt:  new Date()
                })
                .where(eq(tbl_faculty.userId, userId));
        }

        return json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        return json({ success: false, message: 'Failed to update profile' }, { status: 500 });
    }
};