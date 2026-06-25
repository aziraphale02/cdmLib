import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../library.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

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
`);

// Seed default data if empty
const librarianCount = db.prepare('SELECT COUNT(*) AS count FROM librarians').get();
if (librarianCount.count === 0) {
  db.prepare(`
    INSERT INTO librarians (first_name, last_name, email, phone, employee_id, role, username, password, status)
    VALUES ('Ana', 'Reyes', 'ana.reyes@cdm.edu.ph', '09123456789', 'EMP-0001', 'Head Librarian', 'admin', 'admin123', 'active')
  `).run();
}

const bookCount = db.prepare('SELECT COUNT(*) AS count FROM books').get();
if (bookCount.count === 0) {
  const defaultBooks = [
    {
      id: "B001", title: "Noli Me Tangere", author: "José Rizal", isbn: "978-971-27-2016-5",
      category: "Literature", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop&auto=format",
      abstract: "Noli Me Tangere (Touch Me Not) is a novel written by José Rizal, one of the national heroes of the Philippines. The novel exposes the negative effects of Spanish colonialism on the native Filipino, through the story of Crisostomo Ibarra, a young Filipino idealist who returns home after studying in Europe.",
      available: 2, total: 5, borrow_count: 247, publish_year: 1887,
    },
    {
      id: "B002", title: "El Filibusterismo", author: "José Rizal", isbn: "978-971-27-2017-2",
      category: "Literature", cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200&h=280&fit=crop&auto=format",
      abstract: "El Filibusterismo (The Subversive or Reign of Greed) is the second novel written by José Rizal. It is the sequel to Noli Me Tangere and follows the protagonist Simoun, a rich jeweler who turns out to be Crisostomo Ibarra in disguise, seeking revenge.",
      available: 1, total: 4, borrow_count: 198, publish_year: 1891,
    },
    {
      id: "B003", title: "Philippine History", author: "Teodoro A. Agoncillo", isbn: "978-971-8789-14-4",
      category: "History", cover: "https://images.unsplash.com/photo-1481627834770-b7833e8f5570?w=200&h=280&fit=crop&auto=format",
      abstract: "A comprehensive account of Philippine history from pre-colonial times to the modern era, covering the Spanish colonization, American period, Commonwealth era, and the struggle for independence. This book is considered one of the most important works on Philippine history.",
      available: 3, total: 6, borrow_count: 185, publish_year: 1990,
    },
    {
      id: "B004", title: "Introduction to Computing", author: "P.K. Sinha", isbn: "978-81-224-1374-2",
      category: "Technology", cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&h=280&fit=crop&auto=format",
      abstract: "This book provides a comprehensive introduction to computing fundamentals. It covers hardware components, operating systems, programming concepts, networking, internet technologies, and emerging trends in computing. Ideal for first-year IT and Computer Science students.",
      available: 0, total: 4, borrow_count: 172, publish_year: 2018,
    },
    {
      id: "B005", title: "Florante at Laura", author: "Francisco Balagtas", isbn: "978-971-27-0001-3",
      category: "Literature", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=280&fit=crop&auto=format",
      abstract: "Florante at Laura is an awit (metrical romance) written by Francisco Balagtas while he was imprisoned for unknown reasons. The narrative is set in the fictional kingdom of Albania and tells the story of Florante, a Christian Albanian nobleman, and his love for Laura.",
      available: 4, total: 5, borrow_count: 156, publish_year: 1838,
    },
    {
      id: "B006", title: "Calculus for Engineers", author: "Dennis G. Zill", isbn: "978-1-284-18610-6",
      category: "Mathematics", cover: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=200&h=280&fit=crop&auto=format",
      abstract: "A clear and precise presentation of calculus concepts tailored specifically for engineering students. Covers differential and integral calculus, differential equations, series, and their applications in engineering problems with real-world examples.",
      available: 2, total: 5, borrow_count: 143, publish_year: 2020,
    },
    {
      id: "B007", title: "The Art of War", author: "Sun Tzu", isbn: "978-0-14-044-5-0-3",
      category: "Philosophy", cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=200&h=280&fit=crop&auto=format",
      abstract: "The Art of War is an ancient Chinese military treatise dating from the 5th century BC. It is attributed to the ancient Chinese military strategist Sun Tzu. The text is composed of 13 chapters, each devoted to one aspect of warfare and has been applied to business, law, sports, and everyday life.",
      available: 3, total: 4, borrow_count: 132, publish_year: 500,
    },
    {
      id: "B008", title: "Statistics and Probability", author: "Walpole, Myers & Myers", isbn: "978-0-321-62994-9",
      category: "Mathematics", cover: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&h=280&fit=crop&auto=format",
      abstract: "This classic textbook in probability and statistics covers the basic concepts of probability, random variables, probability distributions, sampling distributions, estimation, hypothesis testing, simple linear regression, and analysis of variance with numerous applications and examples.",
      available: 1, total: 4, borrow_count: 121, publish_year: 2017,
    },
  ];

  const insertBook = db.prepare(`
    INSERT INTO books (id, title, author, isbn, category, cover, abstract, available, total, borrow_count, publish_year)
    VALUES (@id, @title, @author, @isbn, @category, @cover, @abstract, @available, @total, @borrow_count, @publish_year)
  `);

  defaultBooks.forEach(b => insertBook.run(b));
}

const transactionCount = db.prepare('SELECT COUNT(*) AS count FROM transactions').get();
if (transactionCount.count === 0) {
  const defaultTransactions = [
    { id: "TXN-2024-001", book_id: "B001", book_title: "Noli Me Tangere", student_name: "Maria Santos", student_id: "2024-0001", librarian_name: "Ana Reyes", borrow_date: "2024-06-10", due_date: "2024-06-17", return_date: null, status: "active", book_condition: null, penalty: 0 },
    { id: "TXN-2024-002", book_id: "B003", book_title: "Philippine History", student_name: "Juan dela Cruz", student_id: "2024-0042", librarian_name: "Ana Reyes", borrow_date: "2024-06-08", due_date: "2024-06-15", return_date: "2024-06-14", status: "returned", book_condition: "good", penalty: 0 },
    { id: "TXN-2024-003", book_id: "B004", book_title: "Introduction to Computing", student_name: "Pedro Reyes", student_id: "2023-0158", librarian_name: "Carlo Lim", borrow_date: "2024-06-01", due_date: "2024-06-08", return_date: null, status: "overdue", book_condition: null, penalty: 0 },
    { id: "TXN-2024-004", book_id: "B006", book_title: "Calculus for Engineers", student_name: "Rosa Garcia", student_id: "2024-0087", librarian_name: "Ana Reyes", borrow_date: "2024-06-12", due_date: "2024-06-19", return_date: null, status: "active", book_condition: null, penalty: 0 },
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
    { id: "RES-2024-001", book_id: "B004", book_title: "Introduction to Computing", student_name: "Lito Manalo", student_id: "2024-0099", reservation_date: "2024-06-18", pickup_date: "2024-06-19", status: "pending" },
    { id: "RES-2024-002", book_id: "B002", book_title: "El Filibusterismo", student_name: "Carla Bautista", student_id: "2023-0221", reservation_date: "2024-06-17", pickup_date: "2024-06-18", status: "fulfilled" },
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
