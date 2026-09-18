import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../library.db');
const db = new Database(dbPath);

// Enable foreign keys and high-throughput WAL mode for high concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB memory page cache
db.pragma('temp_store = MEMORY');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS librarians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    employee_id TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'Librarian',
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    cover TEXT,
    abstract TEXT,
    available INTEGER NOT NULL,
    total INTEGER NOT NULL,
    borrow_count INTEGER DEFAULT 0,
    publish_year INTEGER
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    librarian_name TEXT NOT NULL,
    borrow_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL,
    book_condition TEXT,
    penalty REAL DEFAULT 0,
    replacement_status TEXT DEFAULT 'not_applicable',
    replacement_verified_by INTEGER REFERENCES librarians(id),
    replacement_verified_at TEXT,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    reservation_date TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    course TEXT,
    year_level TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    ip_address TEXT,
    user_id TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    status TEXT DEFAULT 'SUCCESS',
    details TEXT
  );
`);

// Database Migration Check for existing transactions table
const txnColumns = db.prepare("PRAGMA table_info(transactions)").all().map(c => c.name);
if (!txnColumns.includes('replacement_status')) {
  db.exec("ALTER TABLE transactions ADD COLUMN replacement_status TEXT DEFAULT 'not_applicable'");
}
if (!txnColumns.includes('replacement_verified_by')) {
  db.exec("ALTER TABLE transactions ADD COLUMN replacement_verified_by INTEGER REFERENCES librarians(id)");
}
if (!txnColumns.includes('replacement_verified_at')) {
  db.exec("ALTER TABLE transactions ADD COLUMN replacement_verified_at TEXT");
}

// Database Migration Check for books table
const bookColumns = db.prepare("PRAGMA table_info(books)").all().map(c => c.name);
if (!bookColumns.includes('call_no')) {
  db.exec("ALTER TABLE books ADD COLUMN call_no TEXT");
}
if (!bookColumns.includes('marc_tags')) {
  db.exec("ALTER TABLE books ADD COLUMN marc_tags TEXT");
}
if (!bookColumns.includes('institute')) {
  db.exec("ALTER TABLE books ADD COLUMN institute TEXT");
}
if (!bookColumns.includes('year_level')) {
  db.exec("ALTER TABLE books ADD COLUMN year_level TEXT");
}
if (!bookColumns.includes('semester')) {
  db.exec("ALTER TABLE books ADD COLUMN semester TEXT");
}
if (!bookColumns.includes('pdf_url')) {
  db.exec("ALTER TABLE books ADD COLUMN pdf_url TEXT");
}

// Database Migration Check for students table
const studentColumns = db.prepare("PRAGMA table_info(students)").all().map(c => c.name);
if (!studentColumns.includes('password')) {
  db.exec("ALTER TABLE students ADD COLUMN password TEXT");
}
if (!studentColumns.includes('avatar_url')) {
  db.exec("ALTER TABLE students ADD COLUMN avatar_url TEXT");
}
// Ensure Juan dela Cruz has the unified CDM Student Profile Avatar
db.prepare("UPDATE students SET avatar_url = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=faces&auto=format' WHERE id = '2024-0042' OR name LIKE '%Juan dela Cruz%'").run();

// Seed default data if empty
const librarianCount = db.prepare('SELECT COUNT(*) AS count FROM librarians').get();
if (librarianCount.count === 0) {
  const hashedPassword = hashPassword('admin123');
  db.prepare(`
    INSERT INTO librarians (first_name, last_name, email, phone, employee_id, role, username, password, status)
    VALUES ('Ana', 'Reyes', 'ana.reyes@cdm.edu.ph', '09123456789', 'EMP-0001', 'Head Librarian', 'admin', ?, 'active')
  `).run(hashedPassword);
}

import { CURATED_BOOKS } from './books_data.js';

const bookCount = db.prepare('SELECT COUNT(*) AS count FROM books').get();
if (bookCount.count === 0) {
  const insertBook = db.prepare(`
    INSERT INTO books (id, title, author, isbn, category, institute, year_level, semester, call_no, cover, abstract, available, total, borrow_count, publish_year, marc_tags)
    VALUES (@id, @title, @author, @isbn, @category, @institute, @year_level, @semester, @call_no, @cover, @abstract, @available, @total, @borrow_count, @publish_year, @marc_tags)
  `);

  CURATED_BOOKS.forEach(b => insertBook.run(b));
}

const transactionCount = db.prepare('SELECT COUNT(*) AS count FROM transactions').get();
if (transactionCount.count === 0) {
  const defaultTransactions = [
    { id: "TXN-2024-001", book_id: "ICS-101", book_title: "Introduction to Computing and Information Technology", student_name: "Maria Santos", student_id: "2024-0001", librarian_name: "Ana Reyes", borrow_date: "2024-06-10", due_date: "2024-06-17", return_date: null, status: "active", book_condition: null, penalty: 0 },
    { id: "TXN-2024-002", book_id: "ICS-201", book_title: "Database Systems: Design, Implementation, and Management", student_name: "Juan dela Cruz", student_id: "2024-0042", librarian_name: "Ana Reyes", borrow_date: "2024-06-08", due_date: "2024-06-15", return_date: "2024-06-14", status: "returned", book_condition: "good", penalty: 0 },
    { id: "TXN-2024-003", book_id: "ITE-101", book_title: "Foundations of Special and Inclusive Education", student_name: "Pedro Reyes", student_id: "2023-0158", librarian_name: "Carlo Lim", borrow_date: "2024-06-01", due_date: "2024-06-08", return_date: null, status: "overdue", book_condition: null, penalty: 0 },
    { id: "TXN-2024-004", book_id: "IBE-101", book_title: "Financial Accounting and Reporting: Conceptual Framework", student_name: "Rosa Garcia", student_id: "2024-0087", librarian_name: "Ana Reyes", borrow_date: "2024-06-12", due_date: "2024-06-19", return_date: null, status: "active", book_condition: null, penalty: 0 },
  ];

  const insertTxn = db.prepare(`
    INSERT INTO transactions (id, book_id, book_title, student_name, student_id, librarian_name, borrow_date, due_date, return_date, status, book_condition, penalty)
    VALUES (@id, @book_id, @book_title, @student_name, @student_id, @librarian_name, @borrow_date, @due_date, @return_date, @status, @book_condition, @penalty)
  `);

  defaultTransactions.forEach(t => insertTxn.run(t));
}

const reservationCount = db.prepare('SELECT COUNT(*) AS count FROM reservations').get();
if (reservationCount.count === 0) {
  const defaultReservations = [
    { id: "RES-2024-001", book_id: "ICS-101", book_title: "Introduction to Computing and Information Technology", student_name: "Lito Manalo", student_id: "2024-0099", reservation_date: "2024-06-18", pickup_date: "2024-06-19", status: "pending" },
    { id: "RES-2024-002", book_id: "IBE-101", book_title: "Financial Accounting and Reporting: Conceptual Framework", student_name: "Carla Bautista", student_id: "2023-0221", reservation_date: "2024-06-17", pickup_date: "2024-06-18", status: "fulfilled" },
  ];

  const insertRes = db.prepare(`
    INSERT INTO reservations (id, book_id, book_title, student_name, student_id, reservation_date, pickup_date, status)
    VALUES (@id, @book_id, @book_title, @student_name, @student_id, @reservation_date, @pickup_date, @status)
  `);

  defaultReservations.forEach(r => insertRes.run(r));
}

const studentCount = db.prepare('SELECT COUNT(*) AS count FROM students').get();
if (studentCount.count === 0) {
  const defaultStudents = [
    { id: "2024-0001", name: "Maria Santos", email: "maria.santos@cdm.edu.ph", phone: "09123456789", course: "BSIT", year_level: "3rd Year", status: "active" },
    { id: "2024-0042", name: "Juan dela Cruz", email: "juan.delacruz@cdm.edu.ph", phone: "09123456790", course: "BSIT", year_level: "3rd Year", status: "active" },
    { id: "2023-0158", name: "Pedro Reyes", email: "pedro.reyes@cdm.edu.ph", phone: "09123456791", course: "BSCE", year_level: "4th Year", status: "active" },
    { id: "2024-0087", name: "Rosa Garcia", email: "rosa.garcia@cdm.edu.ph", phone: "09123456792", course: "BSEd", year_level: "2nd Year", status: "active" },
    { id: "2024-0099", name: "Lito Manalo", email: "lito.manalo@cdm.edu.ph", phone: "09123456793", course: "BSIT", year_level: "1st Year", status: "active" },
    { id: "2023-0221", name: "Carla Bautista", email: "carla.bautista@cdm.edu.ph", phone: "09123456794", course: "BSIT", year_level: "4th Year", status: "active" }
  ];

  const insertStudent = db.prepare(`
    INSERT INTO students (id, name, email, phone, course, year_level, status)
    VALUES (@id, @name, @email, @phone, @course, @year_level, @status)
  `);

  defaultStudents.forEach(s => insertStudent.run(s));
}

export default db;
