import express from 'express';
import cors from 'cors';
import db from './db.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
  
  req.user = user;
  next();
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5002;

// Disable technology disclosure header
app.disable('x-powered-by');

// ─── Security Headers (OWASP Recommended) ──────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ─── Security Audit Logging Helper ──────────────────────────────────────────
function logAudit(req, { action, resource = '', status = 'SUCCESS', details = '' }) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userId = req.user?.id || req.user?.username || req.body?.studentId || req.body?.username || 'GUEST';
    const userRole = req.user?.role || 'GUEST';
    db.prepare(`
      INSERT INTO audit_logs (timestamp, ip_address, user_id, user_role, action, resource, status, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(new Date().toISOString(), String(ip), String(userId), String(userRole), String(action), String(resource), String(status), String(details));
  } catch (err) {
    console.error('[AuditLog Error]', err.message);
  }
}

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
];

const envOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === 'null' || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }
}));
app.use(express.json());

// ─── Rate Limiting & Brute-Force Protection ─────────────────────────────────
function getClientIp(req) {
  const rawForwarded = req.headers['x-forwarded-for'];
  return (typeof rawForwarded === 'string' ? rawForwarded.split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

function createRateLimiter({ prefix = 'rate', windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' }) {
  const requests = new Map();

  // Periodic cleanup of expired rate limit records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const ip = getClientIp(req);
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let record = requests.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(key, record);
    }

    record.count++;

    // Standard RateLimit Headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// ─── Dedicated Login Rate Limiter (Brute-Force Protection) ─────────────────
// Specifically tracks consecutive failed login attempts per client IP.
// Triggers lockout only after 5 failed authentication attempts within 15 minutes.
const loginFailures = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginFailures.entries()) {
    if (now > data.resetTime) {
      loginFailures.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function recordFailedLogin(req) {
  const ip = getClientIp(req);
  const key = `login:${ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  let record = loginFailures.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    loginFailures.set(key, record);
  }
  record.count++;
  return record.count;
}

function clearFailedLogins(req) {
  const ip = getClientIp(req);
  const key = `login:${ip}`;
  loginFailures.delete(key);
}

function loginLimiter(req, res, next) {
  const ip = getClientIp(req);
  const key = `login:${ip}`;
  const now = Date.now();
  const max = 5;
  const windowMs = 15 * 60 * 1000;

  const record = loginFailures.get(key);
  if (record && now <= record.resetTime) {
    if (record.count >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      res.setHeader('Retry-After', Math.max(1, Math.ceil((record.resetTime - now) / 1000)));

      logAudit(req, {
        action: 'LOGIN_LOCKOUT',
        resource: req.body?.username || req.body?.studentId || ip,
        status: 'BLOCKED',
        details: 'Exceeded maximum 5 failed login attempts'
      });
      return res.status(429).json({
        error: 'Too many authentication attempts (maximum 5 attempts per 15 minutes). Please try again after 15 minutes.'
      });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
  } else {
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
  }

  next();
}

// ─── Dedicated Registration Rate Limiter (Anti-Abuse / Spam Prevention) ─────
// Completely isolated from login brute-force tracking. Max 20 registrations / 15 mins.
const registrationLimiter = createRateLimiter({
  prefix: 'registration',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many registration attempts from this IP. Please try again after 15 minutes.'
});

// ─── Dedicated Password Reset & OTP Rate Limiter (Anti-Flood Protection) ────
// Completely isolated from login and registration tracking. Max 10 reset requests / 15 mins.
const passwordResetLimiter = createRateLimiter({
  prefix: 'password-reset',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset requests from this IP. Please try again after 15 minutes.'
});

// Backward-compatibility alias
const authLimiter = loginLimiter;

// General API Rate Limiter (Max 10,000 requests per 15 mins per IP to support real-time polling)
const apiLimiter = createRateLimiter({
  prefix: 'api',
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: 'Too many requests from this IP. Please try again after 15 minutes.'
});

app.use('/api', apiLimiter);

// ─── Health & Telemetry Check Endpoint ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as alive').get();
    const memory = process.memoryUsage();
    res.json({
      status: 'UP',
      system: 'Colegio de Montalban - Integrated Library Management System',
      database: dbCheck.alive === 1 ? 'CONNECTED' : 'DISCONNECTED',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(503).json({
      status: 'DEGRADED',
      database: 'ERROR',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── Dynamic Server-Side QR Code Engine ────────────────────────────────────
app.get('/api/qr/generate', async (req, res) => {
  const text = (req.query.text || 'CDM-LMS').trim();
  const size = Math.min(800, Math.max(100, parseInt(req.query.size || '300', 10)));
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    res.json({ text, dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code payload.' });
  }
});

// ─── Security Audit Log Inspection API ──────────────────────────────────────
app.get('/api/admin/audit-logs', authenticateToken, (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Automated SMS Warning Dispatch Endpoint ────────────────────────────────
app.post('/api/notifications/send-overdue-sms', authenticateToken, (req, res) => {
  const { studentId, studentName, bookTitle, daysOverdue, phone } = req.body;
  const targetPhone = phone || '09123456789';
  const message = `[CDM LIBRARY NOTICE] Hi ${studentName || 'Student'}, your borrowed book '${bookTitle}' is ${daysOverdue || 1} day(s) overdue. Please return it to the CDM Library circulation desk as soon as possible to avoid account hold. Thank you!`;

  logAudit(req, {
    action: 'SMS_OVERDUE_WARNING_SENT',
    resource: studentId || targetPhone,
    status: 'DISPATCHED',
    details: `SMS notice dispatched to ${targetPhone} for '${bookTitle}' (${daysOverdue}d overdue)`
  });

  res.json({
    success: true,
    recipient: targetPhone,
    message,
    sentAt: new Date().toISOString()
  });
});

// Helper to map DB columns to frontend camelCase keys
function mapBook(b) {
  let parsedMarcTags = [];
  if (b.marc_tags) {
    try {
      parsedMarcTags = typeof b.marc_tags === 'string' ? JSON.parse(b.marc_tags) : b.marc_tags;
    } catch {
      parsedMarcTags = [b.marc_tags];
    }
  }
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
    publishYear: b.publish_year,
    callNo: b.call_no || '',
    institute: b.institute || '',
    yearLevel: b.year_level || '',
    semester: b.semester || '',
    marcTags: Array.isArray(parsedMarcTags) ? parsedMarcTags : [],
    pdfUrl: b.pdf_url || ''
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
    penalty: t.penalty,
    replacementStatus: t.replacement_status || 'not_applicable',
    replacementVerifiedBy: t.replacement_verified_by || undefined,
    replacementVerifiedAt: t.replacement_verified_at || undefined
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
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  try {
    const librarian = db.prepare('SELECT * FROM librarians WHERE username = ?').get(username);
    if (!librarian) {
      recordFailedLogin(req);
      logAudit(req, { action: 'LIBRARIAN_LOGIN_FAILED', resource: username, status: 'FAILED', details: 'User not found' });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const isValid = verifyPassword(password, librarian.password);
    if (!isValid) {
      recordFailedLogin(req);
      logAudit(req, { action: 'LIBRARIAN_LOGIN_FAILED', resource: username, status: 'FAILED', details: 'Invalid password' });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Auto-migration to secure hash if password was stored as plaintext
    if (!librarian.password.includes(':')) {
      const secureHash = hashPassword(password);
      db.prepare('UPDATE librarians SET password = ? WHERE id = ?').run(secureHash, librarian.id);
      console.log(`[Auth] Migrated legacy plaintext password to secure hash for user: ${username}`);
    }

    if (librarian.status !== 'active') {
      logAudit(req, { action: 'LIBRARIAN_LOGIN_FAILED', resource: username, status: 'BLOCKED', details: 'Account pending approval' });
      return res.status(403).json({ error: 'Your account is pending administrator approval.' });
    }

    // Reset failed login counter on successful authentication
    clearFailedLogins(req);

    const token = signJwt({
      id: librarian.id,
      username: librarian.username,
      name: `${librarian.first_name} ${librarian.last_name}`,
      role: librarian.role
    });

    logAudit(req, { action: 'LIBRARIAN_LOGIN_SUCCESS', resource: username, details: `Role: ${librarian.role}` });

    res.json({
      id: librarian.id,
      username: librarian.username,
      employeeId: librarian.employee_id,
      email: librarian.email,
      phone: librarian.phone,
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

app.post('/api/auth/register', registrationLimiter, (req, res) => {
  const { firstName, lastName, email, phone, employeeId, role, username, password } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO librarians (first_name, last_name, email, phone, employee_id, role, username, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(firstName, lastName, email, phone, employeeId, role, username, hashedPassword);
    logAudit(req, { action: 'LIBRARIAN_REGISTER', resource: username, details: `Employee ID: ${employeeId}` });
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

// In-Memory Store for Email OTP Reset Tokens
const otpStore = new Map();

// 1. Send OTP to Email for Password Reset
app.post('/api/auth/send-otp', passwordResetLimiter, (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let librarian = db.prepare('SELECT id, username, email FROM librarians WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    let student = null;
    let accountType = 'librarian';

    if (!librarian) {
      student = db.prepare('SELECT id, name, email FROM students WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
      accountType = 'student';
    }

    if (!librarian && !student) {
      return res.status(404).json({ error: 'No user account found matching this email address.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes

    otpStore.set(cleanEmail, {
      otp,
      expiresAt,
      accountType,
      id: librarian ? librarian.id : student.id,
      name: librarian ? librarian.username : student.name
    });

    logAudit(req, { 
      action: 'OTP_SENT', 
      resource: cleanEmail, 
      details: `OTP sent for ${accountType} password reset` 
    });

    res.json({ 
      success: true, 
      message: `A 6-digit OTP verification code has been sent to ${cleanEmail}.`,
      otp, // Included for instant demo & testing
      email: cleanEmail
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify OTP Code
app.post('/api/auth/verify-otp', passwordResetLimiter, (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP verification code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: 'No active OTP request found for this email. Please request a new OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: 'OTP code has expired. Please request a new code.' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Incorrect OTP code. Please check your code and try again.' });
  }

  res.json({ success: true, message: 'OTP verified successfully.' });
});

// 3. Reset Password via OTP
app.post('/api/auth/reset-password-otp', passwordResetLimiter, (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP code, and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: 'OTP session expired or invalid. Please request a new OTP.' });
  }

  if (record.otp !== otp.trim() || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Invalid or expired OTP code.' });
  }

  try {
    const hashedPassword = hashPassword(newPassword);

    if (record.accountType === 'librarian') {
      db.prepare('UPDATE librarians SET password = ? WHERE id = ?').run(hashedPassword, record.id);
    } else {
      db.prepare('UPDATE students SET password = ? WHERE id = ?').run(hashedPassword, record.id);
    }

    otpStore.delete(cleanEmail);

    logAudit(req, { 
      action: 'PASSWORD_RESET_OTP_SUCCESS', 
      resource: cleanEmail, 
      details: `Password reset successfully via OTP for ${record.accountType}` 
    });

    res.json({ success: true, message: 'Password updated successfully! You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy Self-service Password Reset via Employee ID
app.post('/api/auth/reset-password', passwordResetLimiter, (req, res) => {
  const { identifier, employeeId, newPassword } = req.body;
  if (!identifier || !employeeId || !newPassword) {
    return res.status(400).json({ error: 'Please provide your Username/Email, Employee ID, and New Password.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }
  try {
    const cleanId = identifier.trim();
    const cleanEmp = employeeId.trim();
    const librarian = db.prepare(`
      SELECT * FROM librarians 
      WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) 
        AND LOWER(employee_id) = LOWER(?)
    `).get(cleanId, cleanId, cleanEmp);

    if (!librarian) {
      logAudit(req, { action: 'PASSWORD_RESET_FAILED', resource: cleanId, status: 'FAILED', details: 'Invalid employee verification details' });
      return res.status(404).json({ error: 'No matching librarian account found with the provided credentials and Employee ID.' });
    }

    const hashedPassword = hashPassword(newPassword);
    db.prepare('UPDATE librarians SET password = ? WHERE id = ?').run(hashedPassword, librarian.id);

    logAudit(req, { action: 'PASSWORD_RESET_SUCCESS', resource: librarian.username, details: `Reset via Employee ID: ${librarian.employee_id}` });
    res.json({ success: true, message: 'Password updated successfully. You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated Change Password
app.put('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.user.username;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  try {
    const librarian = db.prepare('SELECT * FROM librarians WHERE username = ?').get(username);
    if (!librarian) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const isValid = verifyPassword(currentPassword, librarian.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    const hashedPassword = hashPassword(newPassword);
    db.prepare('UPDATE librarians SET password = ? WHERE id = ?').run(hashedPassword, librarian.id);

    logAudit(req, { action: 'PASSWORD_CHANGED', resource: username, details: 'User updated password via profile settings' });
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated Profile info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const librarian = db.prepare('SELECT id, first_name, last_name, email, phone, employee_id, role, username, status FROM librarians WHERE username = ?').get(req.user.username);
    if (!librarian) {
      return res.status(404).json({ error: 'Librarian profile not found.' });
    }
    res.json(librarian);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Student Authentication API ─────────────────────────────────────────────
app.post('/api/auth/student-login', loginLimiter, (req, res) => {
  const { studentId, email, password } = req.body;
  const lookup = (studentId || email || '').trim();

  try {
    let student = db.prepare('SELECT * FROM students WHERE id = ? OR email = ?').get(lookup, lookup);
    if (!student) {
      // Auto create demo record for valid CDM student ID if not existing
      if (lookup.startsWith('202') || lookup.includes('@cdm.edu.ph')) {
        const id = lookup.includes('@') ? `2024-${Math.floor(1000 + Math.random() * 9000)}` : lookup;
        const name = 'Jay Deguzman';
        const defaultHashedPassword = hashPassword(password || 'student123');
        db.prepare(`
          INSERT OR IGNORE INTO students (id, name, email, phone, course, year_level, status, password)
          VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
        `).run(id, name, lookup.includes('@') ? lookup : `${id.toLowerCase()}@cdm.edu.ph`, '09123456789', 'BSIT', '4th Year', defaultHashedPassword);
        student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
      }
    }

    if (!student) {
      recordFailedLogin(req);
      logAudit(req, { action: 'STUDENT_LOGIN_FAILED', resource: lookup, status: 'FAILED', details: 'Student account not found' });
      return res.status(401).json({ error: 'Student account not found. Please register.' });
    }

    if (student.password && password) {
      const isValid = verifyPassword(password, student.password);
      if (!isValid) {
        recordFailedLogin(req);
        logAudit(req, { action: 'STUDENT_LOGIN_FAILED', resource: student.id, status: 'FAILED', details: 'Incorrect password' });
        return res.status(401).json({ error: 'Incorrect password. Please verify your credentials.' });
      }
    }

    // Reset failed login attempts on successful student login
    clearFailedLogins(req);

    const token = signJwt({
      id: student.id,
      name: student.name,
      email: student.email,
      course: student.course,
      role: 'student'
    });

    logAudit(req, { action: 'STUDENT_LOGIN_SUCCESS', resource: student.id, details: `Student ${student.name} logged in` });

    res.json({
      success: true,
      token,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone || '09123456789',
        course: student.course || 'BSIT',
        yearLevel: student.year_level || '4th Year',
        status: student.status || 'active'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/student-register', registrationLimiter, (req, res) => {
  const studentId = req.body.studentId || req.body.student_id;
  const fullName = req.body.fullName || req.body.name || `${req.body.first_name || ''} ${req.body.last_name || ''}`.trim();
  const email = req.body.email;
  const phone = req.body.phone || '';
  const course = req.body.course || req.body.program || 'BSIT';
  const yearLevel = req.body.yearLevel || req.body.year_level || '1st Year';
  const password = req.body.password || 'student123';

  if (!studentId || !fullName || !email) {
    return res.status(400).json({ error: 'Student ID, full name, and email are required.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM students WHERE id = ? OR email = ?').get(studentId, email);
    if (existing) {
      return res.status(400).json({ error: 'Student ID or Email is already registered.' });
    }

    const hashedPassword = hashPassword(password);

    db.prepare(`
      INSERT INTO students (id, name, email, phone, course, year_level, status, password)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(studentId, fullName, email, phone, course, yearLevel, hashedPassword);

    const created = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    const token = signJwt({
      id: created.id,
      name: created.name,
      email: created.email,
      course: created.course,
      role: 'student'
    });

    logAudit(req, { action: 'STUDENT_REGISTER_SUCCESS', resource: studentId, details: `New student ${fullName} registered` });

    res.status(201).json({
      success: true,
      token,
      student: {
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        course: created.course,
        yearLevel: created.year_level,
        status: created.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin / Staff Mobile Monitor Endpoint (Read-Only) ──────────────────────
app.get('/api/admin/mobile-monitor', (req, res) => {
  try {
    const totalBooks = db.prepare('SELECT COUNT(*) as count, SUM(available) as available, SUM(total) as total FROM books').get();
    const activeLoans = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status IN ('active', 'overdue')").get();
    const overdueLoans = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'overdue'").get();
    const pendingReservations = db.prepare("SELECT * FROM reservations WHERE status = 'pending' ORDER BY reservation_date DESC LIMIT 10").all();
    const pendingReplacements = db.prepare("SELECT t.*, b.isbn as original_isbn, b.author as original_author FROM transactions t LEFT JOIN books b ON t.book_id = b.id WHERE t.replacement_status = 'pending'").all();
    const recentActivity = db.prepare("SELECT * FROM transactions ORDER BY borrow_date DESC LIMIT 5").all();

    res.json({
      systemStatus: 'ONLINE · HEALTHY',
      timestamp: new Date().toISOString(),
      metrics: {
        totalBooks: totalBooks.count || 0,
        availableCopies: totalBooks.available || 0,
        totalCopies: totalBooks.total || 0,
        activeLoansCount: activeLoans.count || 0,
        overdueLoansCount: overdueLoans.count || 0,
        pendingReservationsCount: pendingReservations.length || 0,
        pendingReplacementsCount: pendingReplacements.length || 0
      },
      pendingReservations: pendingReservations.map(mapReservation),
      pendingReplacements: pendingReplacements.map(mapTransaction),
      recentActivity: recentActivity.map(mapTransaction)
    });
  } catch (err) {
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
    if (txn.status === 'returned' || txn.status === 'closed') {
      throw new Error('Book has already been returned.');
    }

    const isLost = bookCondition === 'lost';
    const replacementStatus = isLost ? 'pending' : 'not_applicable';

    // 2. Update transaction details
    const updateTxnStmt = db.prepare(`
      UPDATE transactions 
      SET status = 'returned', return_date = ?, book_condition = ?, penalty = ?, replacement_status = ?
      WHERE id = ?
    `);
    updateTxnStmt.run(returnDate, bookCondition, penalty || 0, replacementStatus, transactionId);

    // 3. Stock adjustment:
    // If not lost, increment available count.
    // If lost, decrement total copies from catalog until a physical replacement is verified.
    if (!isLost) {
      const updateBookStmt = db.prepare(`
        UPDATE books 
        SET available = available + 1 
        WHERE id = ?
      `);
      updateBookStmt.run(txn.book_id);
    } else {
      const updateBookTotalStmt = db.prepare(`
        UPDATE books 
        SET total = MAX(0, total - 1) 
        WHERE id = ?
      `);
      updateBookTotalStmt.run(txn.book_id);
    }

    return true;
  });

  try {
    returnTxn();
    res.json({ success: true, status: 'returned', transactionId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/transactions/:id/verify-replacement', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, new_barcode } = req.body || {};

  try {
    const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (txn.replacement_status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot verify replacement. Current replacement status is '${txn.replacement_status || 'not_applicable'}' (expected 'pending').` 
      });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(txn.book_id);
    if (!book) {
      return res.status(404).json({ error: 'Associated catalog book record not found.' });
    }

    // Normalization Helpers
    const cleanText = (str) => (str || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
    const cleanIsbn = (str) => (str || '').toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const inputTitle = cleanText(title);
    const inputAuthor = cleanText(author);
    const inputIsbn = cleanIsbn(isbn);

    const catalogTitle = cleanText(book.title);
    const catalogAuthor = cleanText(book.author);
    const catalogIsbn = cleanIsbn(book.isbn);

    const mismatched_fields = [];
    if (inputTitle !== catalogTitle) mismatched_fields.push('title');
    if (inputAuthor !== catalogAuthor) mismatched_fields.push('author');
    if (inputIsbn !== catalogIsbn) mismatched_fields.push('isbn');

    if (mismatched_fields.length > 0) {
      return res.status(400).json({
        error: 'Replacement details do not match original catalog record.',
        mismatched_fields
      });
    }

    // On Match: Execute Transaction
    const verifiedAt = new Date().toISOString();
    const verifiedBy = req.user?.id || req.user?.employee_id || 1;
    const finalStatus = (txn.penalty && txn.penalty > 0) ? 'pending_fines' : 'closed';

    const verifyTxn = db.transaction(() => {
      db.prepare(`
        UPDATE transactions
        SET replacement_status = 'verified',
            replacement_verified_by = ?,
            replacement_verified_at = ?,
            status = ?
        WHERE id = ?
      `).run(verifiedBy, verifiedAt, finalStatus, id);

      // Increment available and total copies back into catalog
      db.prepare(`
        UPDATE books
        SET available = available + 1,
            total = total + 1
        WHERE id = ?
      `).run(txn.book_id);

      return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    });

    const updated = verifyTxn();
    res.json({
      success: true,
      message: 'Replacement copy verified successfully.',
      transaction: mapTransaction(updated)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reservations API ────────────────────────────────────────────────────────
app.get('/api/reservations', (req, res) => {
  try {
    const reservations = db.prepare('SELECT * FROM reservations ORDER BY reservation_date DESC').all();
    res.json(reservations.map(mapReservation));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', (req, res) => {
  const bookId = req.body.bookId || req.body.book_id;
  const studentName = req.body.studentName || req.body.student_name || 'Jay Deguzman';
  const studentId = req.body.studentId || req.body.student_id || '2024-0042';
  const reservationDate = req.body.reservationDate || req.body.reservation_date || new Date().toISOString().split('T')[0];
  const pickupDate = req.body.pickupDate || req.body.pickup_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

  try {
    let book = db.prepare('SELECT id, title, available FROM books WHERE id = ?').get(String(bookId));
    if (!book) {
      const num = Number(bookId);
      if (!isNaN(num)) {
        const formatted = `B${String(num).padStart(3, '0')}`;
        book = db.prepare('SELECT id, title, available FROM books WHERE id = ? OR rowid = ?').get(formatted, num);
      }
    }
    if (!book && (req.body.bookTitle || req.body.book_title || req.body.title)) {
      const titleSearch = req.body.bookTitle || req.body.book_title || req.body.title;
      book = db.prepare('SELECT id, title, available FROM books WHERE title LIKE ?').get(`%${titleSearch}%`);
    }
    if (!book) {
      // Fallback to first available book in collection
      book = db.prepare('SELECT id, title, available FROM books LIMIT 1').get();
    }
    if (!book) {
      return res.status(404).json({ error: 'No cataloged books found in library.' });
    }

    // Decrement available stock
    try {
      db.prepare('UPDATE books SET available = MAX(0, available - 1) WHERE id = ?').run(book.id);
    } catch (_) {}

    const resId = `RES-${Date.now()}`;
    const stmt = db.prepare(`
      INSERT INTO reservations (id, book_id, book_title, student_name, student_id, reservation_date, pickup_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(resId, book.id, book.title, studentName, studentId, reservationDate, pickupDate);
    const created = db.prepare('SELECT * FROM reservations WHERE id = ?').get(resId);
    res.status(201).json({ success: true, id: resId, reservationId: resId, reservation: mapReservation(created) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fulfill / Confirm Pickup of a Reservation
app.patch('/api/reservations/:id/fulfill', (req, res) => {
  const { id } = req.params;
  const librarianName = req.body.librarianName || req.user?.name || 'Staff Librarian';

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: `Reservation is already ${reservation.status}.` });
    }

    const fulfillTxn = db.transaction(() => {
      // 1. Mark reservation as fulfilled
      db.prepare("UPDATE reservations SET status = 'fulfilled' WHERE id = ?").run(id);

      // 2. Create active loan in transactions
      const txnId = `TXN-${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + (86400000 * 3)).toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO transactions (id, book_id, book_title, student_name, student_id, librarian_name, borrow_date, due_date, status, penalty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
      `).run(txnId, reservation.book_id, reservation.book_title, reservation.student_name, reservation.student_id, librarianName, today, dueDate);

      // 3. Increment book borrow count
      db.prepare('UPDATE books SET borrow_count = borrow_count + 1 WHERE id = ?').run(reservation.book_id);

      return { txnId, dueDate };
    });

    const result = fulfillTxn();
    logAudit(req, {
      action: 'RESERVATION_FULFILLED',
      resource: id,
      details: `Released ${reservation.book_title} to ${reservation.student_name} (${reservation.student_id}) by ${librarianName}`
    });

    res.json({
      success: true,
      message: `Book successfully released to ${reservation.student_name}.`,
      transactionId: result.txnId,
      dueDate: result.dueDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a Reservation and restock inventory
app.patch('/api/reservations/:id/cancel', (req, res) => {
  const { id } = req.params;
  const reason = req.body.reason || 'Unclaimed / Cancelled by Staff';

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: `Reservation is already ${reservation.status}.` });
    }

    const cancelTxn = db.transaction(() => {
      // 1. Mark as cancelled
      db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(id);

      // 2. Restock book availability
      db.prepare('UPDATE books SET available = available + 1 WHERE id = ?').run(reservation.book_id);
    });

    cancelTxn();
    logAudit(req, {
      action: 'RESERVATION_CANCELLED',
      resource: id,
      details: `Cancelled reservation for ${reservation.book_title} - Reason: ${reason}`
    });

    res.json({
      success: true,
      message: `Reservation cancelled and 1 copy of '${reservation.book_title}' restocked to shelves.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Student Portal Real-Time Synchronization API ───────────────────────────
app.get('/api/student-portal/:studentId', (req, res) => {
  const { studentId } = req.params;
  try {
    let student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) {
      student = {
        id: studentId,
        name: 'Jay Deguzman',
        email: 'jay.deguzman@cdm.edu.ph',
        phone: '09123456790',
        course: 'BSIT',
        year_level: '3rd Year',
        status: 'active'
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare("UPDATE transactions SET status = 'overdue' WHERE status = 'active' AND due_date < ?").run(todayStr);

    const loans = db.prepare(`
      SELECT t.*, b.isbn as original_isbn, b.author as original_author, b.cover as book_cover, b.call_no as book_call_no
      FROM transactions t
      LEFT JOIN books b ON t.book_id = b.id
      WHERE t.student_id = ? AND (t.status IN ('active', 'overdue', 'pending_fines') OR t.replacement_status = 'pending')
      ORDER BY t.due_date ASC
    `).all(studentId);

    const reservations = db.prepare(`
      SELECT r.*, b.cover as book_cover, b.call_no, b.available
      FROM reservations r
      LEFT JOIN books b ON r.book_id = b.id
      WHERE r.student_id = ?
      ORDER BY r.reservation_date DESC
    `).all(studentId);

    const pendingReplacements = loans.filter(l => l.replacement_status === 'pending');
    const totalPenalty = loans.reduce((sum, l) => sum + (Number(l.penalty) || 0), 0);
    const hasHold = pendingReplacements.length > 0 || totalPenalty > 0 || loans.some(l => l.status === 'overdue');

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone || '09123456789',
        course: student.course || 'BSIT',
        yearLevel: student.year_level || '3rd Year',
        status: hasHold ? 'hold' : (student.status || 'active')
      },
      loans: loans.map(mapTransaction),
      reservations: reservations.map(mapReservation),
      pendingReplacements: pendingReplacements.map(l => ({
        transactionId: l.id,
        bookId: l.book_id,
        bookTitle: l.book_title,
        requiredAuthor: l.original_author || 'N/A',
        requiredIsbn: l.original_isbn || 'N/A',
        dueDate: l.due_date,
        status: l.replacement_status
      })),
      totalPenalty,
      hasHold
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Book CRUD API ───────────────────────────────────────────────────────────
app.post('/api/books', authenticateToken, (req, res) => {
  const { id, title, author, isbn, category, cover, abstract, total, publishYear, callNo, marcTags, institute, yearLevel, semester, pdfUrl } = req.body;
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

    const marcTagsJson = marcTags ? (Array.isArray(marcTags) ? JSON.stringify(marcTags) : JSON.stringify([marcTags])) : null;

    const stmt = db.prepare(`
      INSERT INTO books (id, title, author, isbn, category, cover, abstract, available, total, borrow_count, publish_year, call_no, marc_tags, institute, year_level, semester, pdf_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, title, author, isbn, category, cover || '', abstract || '', total, total, publishYear || null, callNo || '', marcTagsJson, institute || '', yearLevel || '', semester || '', pdfUrl || '');
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, category, cover, abstract, total, publishYear, callNo, marcTags, institute, yearLevel, semester, pdfUrl } = req.body;
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
    const marcTagsJson = marcTags ? (Array.isArray(marcTags) ? JSON.stringify(marcTags) : JSON.stringify([marcTags])) : (book.marc_tags || null);

    const stmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, isbn = ?, category = ?, cover = ?, abstract = ?, available = ?, total = ?, publish_year = ?, call_no = ?, marc_tags = ?, institute = ?, year_level = ?, semester = ?, pdf_url = ?
      WHERE id = ?
    `);
    stmt.run(
      title, author, isbn, category, cover || '', abstract || '', newAvailable, total, publishYear || null,
      callNo !== undefined ? callNo : book.call_no,
      marcTagsJson,
      institute !== undefined ? institute : book.institute,
      yearLevel !== undefined ? yearLevel : book.year_level,
      semester !== undefined ? semester : book.semester,
      pdfUrl !== undefined ? pdfUrl : (book.pdf_url || ''),
      id
    );
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
      status: s.status,
      avatarUrl: s.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=faces&auto=format'
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', authenticateToken, (req, res) => {
  const { id, name, email, phone, course, yearLevel, status, avatarUrl } = req.body;
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
      INSERT INTO students (id, name, email, phone, course, year_level, status, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, email, phone || '', course || '', yearLevel || '', status || 'active', avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=faces&auto=format');
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, course, yearLevel, status, avatarUrl } = req.body;
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
      SET name = ?, email = ?, phone = ?, course = ?, year_level = ?, status = ?, avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `);
    const result = stmt.run(name, email, phone || '', course || '', yearLevel || '', status || 'active', avatarUrl || null, id);
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

// ─── Librarian Management API (Role-Based Access Control) ───────────────────
function canManageLibrarians(role) {
  if (!role) return false;
  const normalized = String(role).toLowerCase().trim();
  return (
    normalized === 'admin' ||
    normalized === 'head librarian' ||
    normalized === 'librarian head' ||
    normalized === 'head' ||
    normalized === 'administrator' ||
    normalized.includes('head') ||
    normalized.includes('admin')
  );
}

app.get('/api/librarians', authenticateToken, (req, res) => {
  if (!canManageLibrarians(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
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
  if (!canManageLibrarians(req.user?.role)) {
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
  if (!canManageLibrarians(req.user?.role)) {
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
  if (!canManageLibrarians(req.user?.role)) {
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

// ─── Production Static File Serving & SPA Fallback ──────────────────────────
const distPath = path.join(__dirname, '../dist');
const promoPath = path.join(__dirname, '../promotional-website');
const publicPath = path.join(__dirname, '../public');
const previewsPath = path.join(__dirname, '../public/previews');

app.use(express.static(distPath));
app.use(express.static(publicPath));
app.use('/promo', express.static(promoPath));
app.use('/previews', express.static(previewsPath));

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Express API server running on http://localhost:${PORT}`);
});
