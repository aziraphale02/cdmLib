import express from 'express';
import cors from 'cors';
import db from './db.js';
import crypto from 'crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword.includes(':')) {
    // Legacy plaintext password migration fallback
    return password === storedPassword;
  }
  const [salt, originalHash] = storedPassword.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

const JWT_SECRET = process.env.JWT_SECRET || 'cdm_library_default_secret_key_123';

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours expiration
  })));
  
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const encodedSignature = base64url(signature);
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function verifyJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const computedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const computedEncoded = base64url(computedSignature);
    
    if (!crypto.timingSafeEqual(Buffer.from(encodedSignature), Buffer.from(computedEncoded))) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }
  
  const user = verifyJwt(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
  
  req.user = user;
  next();
}

const app = express();
const PORT = process.env.PORT || 5002;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }
}));
app.use(express.json());

// Helper helper to map DB columns to frontend camelCase keys
function mapBook(b) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    category: b.category,
    cover: b.cover,
    abstract: b.abstract,
    available: b.available,
    total: b.total,
    borrowCount: b.borrow_count,
    publishYear: b.publish_year
  };
}

function mapTransaction(t) {
  return {
    id: t.id,
    bookId: t.book_id,
    bookTitle: t.book_title,
    studentName: t.student_name,
    studentId: t.student_id,
    librarianName: t.librarian_name,
    borrowDate: t.borrow_date,
    dueDate: t.due_date,
    returnDate: t.return_date || undefined,
    status: t.status,
    bookCondition: t.book_condition || undefined,
    penalty: t.penalty
  };
}

function mapReservation(r) {
  return {
    id: r.id,
    bookId: r.book_id,
    bookTitle: r.book_title,
    studentName: r.student_name,
    studentId: r.student_id,
    reservationDate: r.reservation_date,
    pickupDate: r.pickup_date,
    status: r.status
  };
}

// ─── Authentication API ──────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const librarian = db.prepare('SELECT * FROM librarians WHERE username = ?').get(username);
    if (!librarian) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const isValid = verifyPassword(password, librarian.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Auto-migration to secure hash if password was stored as plaintext
    if (!librarian.password.includes(':')) {
      const secureHash = hashPassword(password);
      db.prepare('UPDATE librarians SET password = ? WHERE id = ?').run(secureHash, librarian.id);
      console.log(`[Auth] Migrated legacy plaintext password to secure hash for user: ${username}`);
    }

    if (librarian.status !== 'active') {
      return res.status(403).json({ error: 'Your account is pending administrator approval.' });
    }
    const token = signJwt({
      username: librarian.username,
      name: `${librarian.first_name} ${librarian.last_name}`,
      role: librarian.role
    });
    res.json({
      username: librarian.username,
      firstName: librarian.first_name,
      lastName: librarian.last_name,
      name: `${librarian.first_name} ${librarian.last_name}`,
      role: librarian.role,
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, phone, employeeId, role, username, password } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO librarians (first_name, last_name, email, phone, employee_id, role, username, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(firstName, lastName, email, phone, employeeId, role, username, hashedPassword);
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      if (err.message.includes('librarians.username')) {
        return res.status(400).json({ error: 'Username is already registered.' });
      }
      if (err.message.includes('librarians.email')) {
        return res.status(400).json({ error: 'Email address is already registered.' });
      }
      if (err.message.includes('librarians.employee_id')) {
        return res.status(400).json({ error: 'Employee ID is already registered.' });
      }
      return res.status(400).json({ error: 'Username, Email, or Employee ID already registered.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── Books API ───────────────────────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  try {
    const books = db.prepare('SELECT * FROM books').all();
    res.json(books.map(mapBook));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Transactions API ────────────────────────────────────────────────────────
app.get('/api/transactions', authenticateToken, (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare("UPDATE transactions SET status = 'overdue' WHERE status = 'active' AND due_date < ?").run(todayStr);
    const txns = db.prepare('SELECT * FROM transactions').all();
    res.json(txns.map(mapTransaction));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions/borrow', authenticateToken, (req, res) => {
  const { bookId, studentName, studentId, librarianName, borrowDate, dueDate } = req.body;
  
  // Wrap database operations in a transaction
  const borrowTxn = db.transaction(() => {
    // 1. Get book and check availability
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      throw new Error('Book not found.');
    }
    if (book.available <= 0) {
      throw new Error('Book is currently unavailable.');
    }

    // 2. Insert transaction
    const txnId = `TXN-${Date.now()}`;
    const insertStmt = db.prepare(`
      INSERT INTO transactions (id, book_id, book_title, student_name, student_id, librarian_name, borrow_date, due_date, status, penalty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
    `);
    insertStmt.run(txnId, bookId, book.title, studentName, studentId, librarianName, borrowDate, dueDate);

    // 3. Decrement book stock and increment borrow count
    const updateStmt = db.prepare(`
      UPDATE books 
      SET available = available - 1, borrow_count = borrow_count + 1 
      WHERE id = ?
    `);
    updateStmt.run(bookId);

    return {
      id: txnId,
      bookId,
      bookTitle: book.title,
      studentName,
      studentId,
      librarianName,
      borrowDate,
      dueDate,
      status: 'active',
      penalty: 0
    };
  });

  try {
    const result = borrowTxn();
    res.status(201).json({ success: true, transaction: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/transactions/return', authenticateToken, (req, res) => {
  const { transactionId, bookCondition, penalty } = req.body;
  const returnDate = new Date().toISOString().split('T')[0];

  const returnTxn = db.transaction(() => {
    // 1. Get transaction
    const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
    if (!txn) {
      throw new Error('Transaction not found.');
    }
    if (txn.status === 'returned') {
      throw new Error('Book has already been returned.');
    }

    // 2. Update transaction details
    const updateTxnStmt = db.prepare(`
      UPDATE transactions 
      SET status = 'returned', return_date = ?, book_condition = ?, penalty = ?
      WHERE id = ?
    `);
    updateTxnStmt.run(returnDate, bookCondition, penalty, transactionId);

    // 3. If not lost, increment book stock
    if (bookCondition !== 'lost') {
      const updateBookStmt = db.prepare(`
        UPDATE books 
        SET available = available + 1 
        WHERE id = ?
      `);
      updateBookStmt.run(txn.book_id);
    }

    return true;
  });

  try {
    returnTxn();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Reservations API ────────────────────────────────────────────────────────
app.get('/api/reservations', authenticateToken, (req, res) => {
  try {
    const reservations = db.prepare('SELECT * FROM reservations').all();
    res.json(reservations.map(mapReservation));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', (req, res) => {
  const { bookId, studentName, studentId, reservationDate, pickupDate } = req.body;
  try {
    const book = db.prepare('SELECT title FROM books WHERE id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const resId = `RES-${Date.now()}`;
    const stmt = db.prepare(`
      INSERT INTO reservations (id, book_id, book_title, student_name, student_id, reservation_date, pickup_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(resId, bookId, book.title, studentName, studentId, reservationDate, pickupDate);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Book CRUD API ───────────────────────────────────────────────────────────
app.post('/api/books', authenticateToken, (req, res) => {
  const { id, title, author, isbn, category, cover, abstract, total, publishYear } = req.body;
  if (!id || !title || !author || !isbn || !category || total === undefined) {
    return res.status(400).json({ error: 'Please fill in all required fields (ID, Title, Author, ISBN, Category, Total Copies).' });
  }
  try {
    const existingId = db.prepare('SELECT id FROM books WHERE id = ?').get(id);
    if (existingId) {
      return res.status(400).json({ error: 'Book ID already exists.' });
    }
    const existingIsbn = db.prepare('SELECT isbn FROM books WHERE isbn = ?').get(isbn);
    if (existingIsbn) {
      return res.status(400).json({ error: 'ISBN already exists.' });
    }

    const stmt = db.prepare(`
      INSERT INTO books (id, title, author, isbn, category, cover, abstract, available, total, borrow_count, publish_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    stmt.run(id, title, author, isbn, category, cover || '', abstract || '', total, total, publishYear || null);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, category, cover, abstract, total, publishYear } = req.body;
  if (!title || !author || !isbn || !category || total === undefined) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }
  try {
    const existingIsbn = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(isbn, id);
    if (existingIsbn) {
      return res.status(400).json({ error: 'ISBN is already in use by another book.' });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const copiesBorrowed = book.total - book.available;
    const newAvailable = Math.max(0, total - copiesBorrowed);

    const stmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, isbn = ?, category = ?, cover = ?, abstract = ?, available = ?, total = ?, publish_year = ?
      WHERE id = ?
    `);
    stmt.run(title, author, isbn, category, cover || '', abstract || '', newAvailable, total, publishYear || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const activeTxn = db.prepare("SELECT id FROM transactions WHERE book_id = ? AND status IN ('active', 'overdue')").get(id);
    if (activeTxn) {
      return res.status(400).json({ error: 'Cannot delete book: There are active or overdue borrowing records for this book.' });
    }

    const stmt = db.prepare('DELETE FROM books WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Student CRUD API ────────────────────────────────────────────────────────
app.get('/api/students', authenticateToken, (req, res) => {
  try {
    const students = db.prepare('SELECT * FROM students').all();
    // Map column year_level to yearLevel for camelCase alignment in frontend
    res.json(students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      course: s.course,
      yearLevel: s.year_level,
      status: s.status
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', authenticateToken, (req, res) => {
  const { id, name, email, phone, course, yearLevel, status } = req.body;
  if (!id || !name || !email) {
    return res.status(400).json({ error: 'Please provide Student ID, Full Name, and Email.' });
  }
  try {
    const existingStudent = db.prepare('SELECT id FROM students WHERE id = ?').get(id);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student ID already registered.' });
    }
    const existingEmail = db.prepare('SELECT email FROM students WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email address already registered.' });
    }

    const stmt = db.prepare(`
      INSERT INTO students (id, name, email, phone, course, year_level, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, email, phone || '', course || '', yearLevel || '', status || 'active');
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, course, yearLevel, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Please provide Full Name and Email.' });
  }
  try {
    const existingEmail = db.prepare('SELECT id FROM students WHERE email = ? AND id != ?').get(email, id);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email address already registered to another student.' });
    }

    const stmt = db.prepare(`
      UPDATE students
      SET name = ?, email = ?, phone = ?, course = ?, year_level = ?, status = ?
      WHERE id = ?
    `);
    const result = stmt.run(name, email, phone || '', course || '', yearLevel || '', status || 'active', id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const activeTxn = db.prepare("SELECT id FROM transactions WHERE student_id = ? AND status IN ('active', 'overdue')").get(id);
    if (activeTxn) {
      return res.status(400).json({ error: 'Cannot delete student: There are active or overdue borrowing records for this student.' });
    }

    const stmt = db.prepare('DELETE FROM students WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Librarian Management API ────────────────────────────────────────────────
app.get('/api/librarians', authenticateToken, (req, res) => {
  try {
    const librarians = db.prepare('SELECT id, first_name, last_name, email, phone, employee_id, role, username, status FROM librarians').all();
    res.json(librarians.map(u => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      phone: u.phone,
      employeeId: u.employee_id,
      role: u.role,
      username: u.username,
      status: u.status
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/librarians/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Head Librarian') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const target = db.prepare('SELECT username FROM librarians WHERE id = ?').get(id);
    if (target && target.username === req.user.username) {
      return res.status(400).json({ error: 'You cannot change your own status.' });
    }
    db.prepare('UPDATE librarians SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/librarians/:id/role', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Head Librarian') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  const { id } = req.params;
  const { role } = req.body;
  try {
    const target = db.prepare('SELECT username FROM librarians WHERE id = ?').get(id);
    if (target && target.username === req.user.username) {
      return res.status(400).json({ error: 'You cannot demote yourself.' });
    }
    db.prepare('UPDATE librarians SET role = ? WHERE id = ?').run(role, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/librarians/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Head Librarian') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  const { id } = req.params;
  try {
    const target = db.prepare('SELECT username FROM librarians WHERE id = ?').get(id);
    if (target && target.username === req.user.username) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    db.prepare('DELETE FROM librarians WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reporting API ───────────────────────────────────────────────────────────
app.get('/api/reports/export', authenticateToken, (req, res) => {
  const { type, filter } = req.query;
  const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const timeStr = new Date().toLocaleTimeString('en-US', { timeStyle: 'short' });

  if (type === 'transactions') {
    let query = 'SELECT * FROM transactions';
    let params = [];
    if (filter && filter !== 'all') {
      query += ' WHERE status = ?';
      params.push(filter);
    }
    query += ' ORDER BY borrow_date DESC';
    const txns = db.prepare(query).all(...params);

    const rowsHtml = txns.map(t => `
      <tr>
        <td><strong>${t.id}</strong></td>
        <td>${t.book_title}<br><small style="color: #666;">ID: ${t.book_id}</small></td>
        <td>${t.student_name}<br><small style="color: #666;">ID: ${t.student_id}</small></td>
        <td>${t.borrow_date}</td>
        <td>${t.due_date}</td>
        <td>${t.return_date || '-'}</td>
        <td>
          <span class="status-badge status-${t.status}">${t.status}</span>
        </td>
        <td>PHP ${t.penalty || 0}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CDM Library System - Transactions Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; }
          .header { text-align: center; border-bottom: 3px double #106A2E; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #106A2E; margin: 0; font-size: 24px; text-transform: uppercase; }
          .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
          .meta-item { font-size: 13px; }
          .meta-item strong { color: #106A2E; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
          th { background-color: #106A2E; color: white; padding: 10px; text-align: left; border: 1px solid #106A2E; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; text-transform: uppercase; }
          .status-active { background: #dbeafe; color: #1e40af; }
          .status-overdue { background: #fee2e2; color: #991b1b; }
          .status-returned { background: #d1fae5; color: #065f46; }
          .footer { text-align: center; font-size: 11px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
          .no-print-btn { display: inline-block; background-color: #106A2E; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; text-decoration: none; margin-bottom: 20px; transition: background 0.2s; }
          .no-print-btn:hover { background-color: #0b4f21; }
          @media print {
            .no-print { display: none; }
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right;">
          <button class="no-print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
        <div class="header">
          <h1>Colegio de Montalban</h1>
          <p>Integrated Library Management System · Transaction Report</p>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Generated Date:</strong> ${dateStr} at ${timeStr}</div>
          <div class="meta-item"><strong>Generated By:</strong> ${req.user.name} (${req.user.role})</div>
          <div class="meta-item"><strong>Filtered Status:</strong> ${filter ? filter.toUpperCase() : 'ALL'}</div>
          <div class="meta-item"><strong>Total Records:</strong> ${txns.length} transactions</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Book Title</th>
              <th>Student Name</th>
              <th>Borrow Date</th>
              <th>Due Date</th>
              <th>Return Date</th>
              <th>Status</th>
              <th>Penalty</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align: center; color: #999;">No transaction records found matching filter.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <p>Colegio de Montalban Integrated Library Management System · Rodriguez, Rizal</p>
          <p>This is a computer-generated system report.</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } else if (type === 'inventory') {
    let query = 'SELECT * FROM books';
    let params = [];
    if (filter && filter !== 'all') {
      query += ' WHERE category = ?';
      params.push(filter);
    }
    query += ' ORDER BY title ASC';
    const books = db.prepare(query).all(...params);

    const rowsHtml = books.map(b => `
      <tr>
        <td><strong>${b.id}</strong></td>
        <td>${b.title}</td>
        <td>${b.author}</td>
        <td>${b.isbn}</td>
        <td>${b.category}</td>
        <td>${b.total}</td>
        <td>${b.available}</td>
        <td>${b.borrow_count}</td>
        <td>${b.publish_year || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CDM Library System - Book Inventory Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; }
          .header { text-align: center; border-bottom: 3px double #106A2E; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #106A2E; margin: 0; font-size: 24px; text-transform: uppercase; }
          .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
          .meta-item { font-size: 13px; }
          .meta-item strong { color: #106A2E; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
          th { background-color: #106A2E; color: white; padding: 10px; text-align: left; border: 1px solid #106A2E; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          .footer { text-align: center; font-size: 11px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
          .no-print-btn { display: inline-block; background-color: #106A2E; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; text-decoration: none; margin-bottom: 20px; transition: background 0.2s; }
          .no-print-btn:hover { background-color: #0b4f21; }
          @media print {
            .no-print { display: none; }
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right;">
          <button class="no-print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
        <div class="header">
          <h1>Colegio de Montalban</h1>
          <p>Integrated Library Management System · Book Inventory Report</p>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Generated Date:</strong> ${dateStr} at ${timeStr}</div>
          <div class="meta-item"><strong>Generated By:</strong> ${req.user.name} (${req.user.role})</div>
          <div class="meta-item"><strong>Filtered Category:</strong> ${filter ? filter.toUpperCase() : 'ALL'}</div>
          <div class="meta-item"><strong>Total Book Titles:</strong> ${books.length} records</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Category</th>
              <th>Total Copies</th>
              <th>Available Copies</th>
              <th>Times Borrowed</th>
              <th>Publish Year</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9" style="text-align: center; color: #999;">No books found matching category.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <p>Colegio de Montalban Integrated Library Management System · Rodriguez, Rizal</p>
          <p>This is a computer-generated system report.</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } else {
    res.status(400).json({ error: 'Invalid report type.' });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Express API server running on http://localhost:${PORT}`);
});
