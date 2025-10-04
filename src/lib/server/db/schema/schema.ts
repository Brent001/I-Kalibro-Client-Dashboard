import { pgTable, serial, integer, varchar, boolean, date, timestamp } from 'drizzle-orm/pg-core';

/* =====================
   ACCOUNT (Admin / Staff)
   ===================== */
export const account = pgTable('account', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }),
    email: varchar('email', { length: 100 }).unique(),
    username: varchar('username', { length: 50 }).unique(),
    password: varchar('password', { length: 255 }),
    role: varchar('role', { length: 20 }), // 'admin' or 'staff'
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

/* =====================
   USER (Student / Faculty)
   ===================== */
export const user = pgTable('user', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 100 }).unique(),
    phone: varchar('phone', { length: 20 }),
    username: varchar('username', { length: 50 }).unique().notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // 'student' or 'faculty'
    age: integer('age'),
    enrollmentNo: varchar('enrollment_no', { length: 30 }).unique(),
    course: varchar('course', { length: 50 }),
    year: varchar('year', { length: 20 }),
    department: varchar('department', { length: 100 }),
    designation: varchar('designation', { length: 50 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

/* =====================
   CATEGORY
   ===================== */
export const category = pgTable('category', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).unique().notNull(),
    description: varchar('description', { length: 255 }).default(''),
    createdAt: timestamp('created_at').defaultNow()
});

/* =====================
   BOOK
   ===================== */
export const book = pgTable('book', {
    id: serial('id').primaryKey(),
    bookId: varchar('book_id', { length: 30 }).unique().notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    author: varchar('author', { length: 100 }),
    language: varchar('language', { length: 50 }),
    qrCode: varchar('qr_code', { length: 255 }).unique(),
    publishedYear: integer('published_year'),
    copiesAvailable: integer('copies_available').default(0),
    categoryId: integer('category_id').references(() => category.id),
    publisher: varchar('publisher', { length: 100 }),
    location: varchar('location', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

/* =====================
   BOOK BORROWING
   ===================== */
export const bookBorrowing = pgTable('book_borrowing', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id).notNull(),
    bookId: integer('book_id').references(() => book.id).notNull(),
    borrowDate: date('borrow_date').notNull(),
    dueDate: date('due_date').notNull(),
    returnDate: date('return_date'), // null if not returned yet
    status: varchar('status', { length: 20 }).default('borrowed'), // borrowed | returned | overdue
    fine: integer('fine').default(0), // stores calculated fine at return
    createdAt: timestamp('created_at').defaultNow()
});

/* =====================
   BOOK RESERVATION
   ===================== */
export const bookReservation = pgTable('book_reservation', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id).notNull(),
    bookId: integer('book_id').references(() => book.id).notNull(),
    reservationDate: date('reservation_date').notNull(),
    status: varchar('status', { length: 20 }).default('active'), // active | fulfilled | cancelled
    createdAt: timestamp('created_at').defaultNow()
});

/* =====================
   LIBRARY VISIT LOG
   ===================== */
export const libraryVisit = pgTable('library_visit', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id),
    username: varchar('username', { length: 50 }),
    fullName: varchar('full_name', { length: 100 }),
    visitorType: varchar('visitor_type', { length: 20 }), // student | faculty | guest
    timeIn: timestamp('time_in').notNull(),
    timeOut: timestamp('time_out'),
    createdAt: timestamp('created_at').defaultNow()
});

/* =====================
   QR CODE TOKENS
   ===================== */
export const qrCodeToken = pgTable('qr_code_token', {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 255 }).unique().notNull()
});

/* =====================
   USER ACTIVITY LOG
   ===================== */
export const userActivity = pgTable('user_activity', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id).notNull(),
    activityType: varchar('activity_type', { length: 50 }).notNull(), // borrow | return | reserve | visit
    activityDetails: varchar('activity_details', { length: 255 }), // optional details (book title, etc.)
    relatedId: integer('related_id'), // e.g. bookBorrowing.id, bookReservation.id, libraryVisit.id
    timestamp: timestamp('timestamp').defaultNow().notNull()
});
