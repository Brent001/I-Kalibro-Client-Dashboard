// src/routes/api/categories/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import jwt from 'jsonwebtoken';
import { db } from '$lib/server/db/index.js';
import { user, category, book } from '$lib/server/db/schema/schema.js'; // <-- use user table
import { eq, not, count } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

interface AuthenticatedUser {
  id: number;
  role: string;
  username: string;
  email: string;
}

// Function to normalize category names for comparison
function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

// Function to check if a category name already exists (case-insensitive)
async function checkDuplicateName(name: string, excludeId?: number): Promise<boolean> {
  const normalizedName = normalizeCategoryName(name);
  
  const query = db
    .select({ id: category.id, name: category.name })
    .from(category);
    
  if (excludeId) {
    const existing = await query.where(not(eq(category.id, excludeId)));
    return existing.some(cat => normalizeCategoryName(cat.name) === normalizedName);
  } else {
    const existing = await query;
    return existing.some(cat => normalizeCategoryName(cat.name) === normalizedName);
  }
}

async function authenticateUser(request: Request): Promise<AuthenticatedUser | null> {
  try {
    let token: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split('; ').map(c => c.split('='))
        );
        token = cookies.client_token;
      }
    }

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;

    if (!userId) return null;

    const [userRow] = await db
      .select({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        tokenVersion: user.tokenVersion
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow || !userRow.isActive) return null;

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== userRow.tokenVersion) {
      return null;
    }

    return {
      id: userRow.id,
      role: userRow.role || '',
      username: userRow.username || '',
      email: userRow.email || ''
    };
  } catch (err) {
    console.error('Authentication error:', err);
    return null;
  }
}

export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      throw error(401, { message: 'Unauthorized' });
    }

    // Fetch categories from the database
    const categoriesResult = await db
      .select({
        id: category.id,
        name: category.name,
        description: category.description
      })
      .from(category)
      .orderBy(category.name);

    return json({
      success: true,
      data: { categories: categoriesResult }
    });

  } catch (err: any) {
    console.error('Error fetching categories:', err);

    if (err?.status) {
      throw err;
    }

    throw error(500, { message: 'Internal server error' });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      throw error(401, { message: 'Unauthorized' });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    const description = (body.description || '').trim();

    // Validate according to schema
    if (!name) {
      throw error(400, { message: 'Category name is required.' });
    }
    if (name.length > 50) {
      throw error(400, { message: 'Category name must be at most 50 characters.' });
    }
    if (description.length > 255) {
      throw error(400, { message: 'Description must be at most 255 characters.' });
    }

    // Check for duplicate category name (case-insensitive)
    const normalizedName = normalizeCategoryName(name);
    const existing = await db
      .select({ id: category.id, name: category.name })
      .from(category);
    
    const duplicate = existing.find(cat => 
      normalizeCategoryName(cat.name ?? '') === normalizedName
    );

    if (duplicate) {
      throw error(409, { 
        message: `A category with the name "${duplicate.name}" already exists.` 
      });
    }

    // Insert new category with the original casing preserved
    const [inserted] = await db
      .insert(category)
      .values({
        name,
        description: description || null
      })
      .returning({
        id: category.id,
        name: category.name,
        description: category.description
      });

    return json({
      success: true,
      data: { category: inserted },
      message: 'Category added successfully.'
    });

  } catch (err: any) {
    console.error('Error adding category:', err);

    if (err?.status) {
      throw err;
    }

    throw error(500, { message: 'Internal server error' });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      throw error(401, { message: 'Unauthorized' });
    }

    const body = await request.json();
    const id = Number(body.id);
    const name = (body.name || '').trim();
    const description = (body.description || '').trim();

    // Validate ID
    if (!id || isNaN(id)) {
      throw error(400, { message: 'Invalid category ID.' });
    }

    // Validate input
    if (!name) {
      throw error(400, { message: 'Category name is required.' });
    }
    if (name.length > 50) {
      throw error(400, { message: 'Category name must be at most 50 characters.' });
    }
    if (description.length > 255) {
      throw error(400, { message: 'Description must be at most 255 characters.' });
    }

    // Check if category exists
    const [existingCategory] = await db
      .select()
      .from(category)
      .where(eq(category.id, id))
      .limit(1);

    if (!existingCategory) {
      throw error(404, { message: 'Category not found.' });
    }

    // Check for duplicate name (case-insensitive, excluding current category)
    const normalizedName = normalizeCategoryName(name);
    const allCategories = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(not(eq(category.id, id)));
    
    const duplicate = allCategories.find(cat => 
      normalizeCategoryName(cat.name ?? '') === normalizedName
    );

    if (duplicate) {
      throw error(409, { 
        message: `A category with the name "${duplicate.name}" already exists.` 
      });
    }

    // Update category
    const [updated] = await db
      .update(category)
      .set({ 
        name, 
        description: description || null
      })
      .where(eq(category.id, id))
      .returning({
        id: category.id,
        name: category.name,
        description: category.description
      });

    return json({
      success: true,
      data: { category: updated },
      message: 'Category updated successfully.'
    });

  } catch (err: any) {
    console.error('Error updating category:', err);
    
    if (err?.status) {
      throw err;
    }
    
    throw error(500, { message: 'Internal server error' });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      throw error(401, { message: 'Unauthorized' });
    }

    const body = await request.json();
    const id = Number(body.id);

    // Validate ID
    if (!id || isNaN(id)) {
      throw error(400, { message: 'Invalid category ID.' });
    }

    // Check if category exists
    const [existingCategory] = await db
      .select()
      .from(category)
      .where(eq(category.id, id))
      .limit(1);

    if (!existingCategory) {
      throw error(404, { message: 'Category not found.' });
    }

    // Check if category is used by any books
    const usedByBooks = await db.select({ count: count() }).from(book).where(eq(book.categoryId, id));
    if (usedByBooks[0]?.count > 0) {
      throw error(400, { message: 'Cannot delete category: It is assigned to one or more books.' });
    }

    // Delete category
    const [deleted] = await db
      .delete(category)
      .where(eq(category.id, id))
      .returning({
        id: category.id,
        name: category.name,
        description: category.description
      });

    return json({
      success: true,
      data: { category: deleted },
      message: 'Category deleted successfully.'
    });

  } catch (err: any) {
    console.error('Error deleting category:', err);
    
    if (err?.status) {
      throw err;
    }
    
    throw error(500, { message: 'Internal server error' });
  }
};