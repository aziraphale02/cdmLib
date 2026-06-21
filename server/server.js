import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
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
    const librarian = db.prepare('SELECT * FROM librarians WHERE username = ? AND password = ?').get(username, password);
    if (!librarian) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    if (librarian.status !== 'active') {
      return res.status(403).json({ error: 'Your account is pending administrator approval.' });
    }
    res.json({
      username: librarian.username,
      firstName: librarian.first_name,
      lastName: librarian.last_name,
      name: `${librarian.first_name} ${librarian.last_name}`,
      role: librarian.role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, phone, employeeId, role, username, password } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO librarians (first_name, last_name, email, phone, employee_id, role, username, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(firstName, lastName, email, phone, employeeId, role, username, password);
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
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
app.get('/api/transactions', (req, res) => {
  try {
    const txns = db.prepare('SELECT * FROM transactions').all();
    res.json(txns.map(mapTransaction));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions/borrow', (req, res) => {
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

app.post('/api/transactions/return', (req, res) => {
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
app.get('/api/reservations', (req, res) => {
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
app.post('/api/books', (req, res) => {
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

app.put('/api/books/:id', (req, res) => {
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

app.delete('/api/books/:id', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`[Server] Express API server running on http://localhost:${PORT}`);
});
