import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { tbl_user } from '$lib/server/db/schema/schema.js';
import { eq } from 'drizzle-orm';

// POST: Check username availability and suggest alternatives
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username, name, email } = await request.json();

    if (!username || typeof username !== 'string') {
      return json({ success: false, message: 'Username is required' }, { status: 400 });
    }

    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return json({ success: false, message: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return json({ success: false, message: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    // Check if username is available
    const existingUser = await db.select({ id: tbl_user.id }).from(tbl_user).where(eq(tbl_user.username, trimmedUsername)).limit(1);
    const available = existingUser.length === 0;

    let suggestions: string[] = [];
    if (!available) {
      // Generate complex suggestions
      const baseUsername = trimmedUsername;

      // 1. Simple number append
      for (let i = 1; i <= 3; i++) {
        const suggestion = `${baseUsername}${i}`;
        if (await isUsernameAvailable(suggestion)) {
          suggestions.push(suggestion);
        }
      }

      // 2. With separators
      const separators = ['_', '.', '-'];
      for (const sep of separators) {
        for (let i = 1; i <= 2; i++) {
          const suggestion = `${baseUsername}${sep}${i}`;
          if (await isUsernameAvailable(suggestion)) {
            suggestions.push(suggestion);
          }
        }
      }

      // 3. If name is provided, generate name-based suggestions
      if (name && typeof name === 'string') {
        const nameParts = name.trim().toLowerCase().split(/\s+/);
        if (nameParts.length >= 1) {
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          
          // firstname.lastname
          if (lastName) {
            const nameSuggestion = `${firstName}.${lastName}`;
            if (await isUsernameAvailable(nameSuggestion)) {
              suggestions.push(nameSuggestion);
            }
            // firstname_lastname
            const nameSuggestion2 = `${firstName}_${lastName}`;
            if (await isUsernameAvailable(nameSuggestion2)) {
              suggestions.push(nameSuggestion2);
            }
          }
          
          // firstname + number
          for (let i = 1; i <= 2; i++) {
            const nameSuggestion = `${firstName}${i}`;
            if (await isUsernameAvailable(nameSuggestion)) {
              suggestions.push(nameSuggestion);
            }
          }
        }
      }

      // 4. If email is provided, use email prefix
      if (email && typeof email === 'string') {
        const emailPrefix = email.split('@')[0].toLowerCase();
        if (emailPrefix !== baseUsername && emailPrefix.length >= 3) {
          const emailSuggestion = emailPrefix;
          if (await isUsernameAvailable(emailSuggestion)) {
            suggestions.push(emailSuggestion);
          }
          // emailprefix + number
          for (let i = 1; i <= 2; i++) {
            const emailSuggestionNum = `${emailPrefix}${i}`;
            if (await isUsernameAvailable(emailSuggestionNum)) {
              suggestions.push(emailSuggestionNum);
            }
          }
        }
      }

      // 5. Random additions
      const randomSuffixes = ['123', '2024', 'lib', 'user', 'new'];
      for (const suffix of randomSuffixes) {
        const suggestion = `${baseUsername}${suffix}`;
        if (await isUsernameAvailable(suggestion)) {
          suggestions.push(suggestion);
        }
      }

      // Limit to 5 unique suggestions
      suggestions = [...new Set(suggestions)].slice(0, 5);
    }

    return json({
      success: true,
      available,
      suggestions
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return json({ success: false, message: 'Server error' }, { status: 500 });
  }
};

// Helper function to check if a username is available
async function isUsernameAvailable(username: string): Promise<boolean> {
  const existing = await db.select({ id: tbl_user.id }).from(tbl_user).where(eq(tbl_user.username, username.toLowerCase())).limit(1);
  return existing.length === 0;
}