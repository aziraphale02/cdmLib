# 📅 7-Day Code Masterclass: CDM Library System Codebase

This daily study curriculum breaks down your entire Capstone codebase step-by-step. Study **1 topic per day** to master how your code works and effortlessly answer code-level questions during your defense!

---

## 🗓️ DAY 1: Database Setup & Schema (`server/db.js`)

### 📂 **File to Open:** `server/db.js`

### 🔍 **Key Functions & Lines to Study:**
1. **SQLite Database Initialization (Lines 13-17):**
   ```javascript
   const db = new Database(dbPath);
   db.pragma('foreign_keys = ON');
   ```
   * **Plain English Explanation:** Connects to the local `library.db` file and enforces foreign key integrity so orphaned transaction records cannot exist.
2. **Schema Table Creation (Lines 19-85):**
   * Creates 5 tables: `librarians`, `books`, `transactions`, `reservations`, `students`.
3. **Database Auto-Seeding (Lines 87-207):**
   * Checks if tables are empty (`SELECT COUNT(*)`) and inserts default initial data (e.g. admin account, starter books) automatically upon first launch.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "Where are database relations enforced?"**
  * **Answer:** *"In `server/db.js` line 17 (`db.pragma('foreign_keys = ON')`), and via `FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE` inside table definitions."*

---

## 🗓️ DAY 2: Express Server Setup & Rate Limiter (`server/server.js`)

### 📂 **File to Open:** `server/server.js`

### 🔍 **Key Functions & Lines to Study:**
1. **Express & CORS Initialization (Lines 94-112):**
   * Configures Express server on Port 5002 and sets up `cors()` to restrict requests to authorized origins.
2. **In-Memory Rate Limiting Engine (Lines 114-160):**
   ```javascript
   function createRateLimiter({ windowMs, max, message }) { ... }
   ```
   * Tracks client IP addresses in a JavaScript `Map()`.
   * **`apiLimiter`:** Allows max 300 API calls per 15 mins.
   * **`authLimiter`:** Allows max 15 login attempts per 15 mins to prevent brute-force attacks.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "How does your server block brute-force password guessing?"**
  * **Answer:** *"We created a custom `createRateLimiter` middleware in `server/server.js`. It tracks client IP addresses in memory and returns an HTTP 429 status code if an IP exceeds 15 auth attempts in 15 minutes."*

---

## 🗓️ DAY 3: Authentication & Security Engine (`server/server.js`)

### 📂 **File to Open:** `server/server.js`

### 🔍 **Key Functions & Lines to Study:**
1. **PBKDF2 Password Hashing (Lines 6-21):**
   * `hashPassword(password)`: Generates a 16-byte random salt and computes a SHA-512 key derivation (`crypto.pbkdf2Sync`).
   * `verifyPassword()`: Re-hashes user input with the saved salt and uses `crypto.timingSafeEqual` to prevent timing attacks.
2. **JSON Web Token Handling (Lines 25-92):**
   * `signJwt(payload)`: Creates a 24-hour signed JWT using HMAC-SHA256.
   * `authenticateToken(req, res, next)`: Express middleware that inspects the HTTP `Authorization` header and rejects invalid/expired tokens with HTTP 401/403.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "How do you store passwords and verify login sessions?"**
  * **Answer:** *"Passwords are hashed with PBKDF2 SHA-512 and a random salt. Sessions are authenticated via 24-hour JWT tokens using our `authenticateToken` middleware."*

---

## 🗓️ DAY 4: Book Catalog & Inventory Logic (`server/server.js`)

### 📂 **File to Open:** `server/server.js`

### 🔍 **Key Functions & Lines to Study:**
1. **Catalog CRUD Endpoints (Lines 230-452):**
   * `GET /api/books`: Returns all books mapped to camelCase frontend properties.
   * `POST /api/books`: Validates title, author, category, total copies, and checks for unique ISBN before inserting.
   * `PUT /api/books/:id`: Updates book details and automatically recalculates available copies (`newAvailable = total - copiesBorrowed`).
   * `DELETE /api/books/:id`: Prevents book deletion if there are active or overdue loans.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "What happens to available stock if a librarian edits the total copy count?"**
  * **Answer:** *"In `PUT /api/books/:id`, the server calculates `copiesBorrowed = total - available`, then sets `newAvailable = Math.max(0, newTotal - copiesBorrowed)` to preserve active loan integrity."*

---

## 🗓️ DAY 5: Loans, Overdue Engine & Penalties (`server/server.js`)

### 📂 **File to Open:** `server/server.js`

### 🔍 **Key Functions & Lines to Study:**
1. **Transaction Management Endpoints (Lines 240-390):**
   * `GET /api/transactions`: Runs an automated SQL update (`UPDATE transactions SET status = 'overdue' WHERE due_date < today`) before returning transaction history.
   * `POST /api/transactions`: Checks if book `available > 0`, decrements available count, and creates active loan record.
   * `PUT /api/transactions/:id/return`: Logs return date, evaluates condition (`Good`, `Damaged`, `Lost`), calculates penalties, and increments available book stock.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "How does the system detect overdue loans and calculate fines?"**
  * **Answer:** *"Every time transaction records are requested or returns are processed, Express compares `due_date` against current date timestamps and dynamically computes fine penalties."*

---

## 🗓️ DAY 6: Frontend React Architecture (`src/app/App.tsx`)

### 📂 **File to Open:** `src/app/App.tsx`

### 🔍 **Key Functions & Lines to Study:**
1. **State Management & Authentication Hook:**
   * Uses React `useState` for active views, user sessions, book lists, student records, and modal states.
   * Uses `useEffect` to fetch initial data from Express API endpoints upon login.
2. **API Interaction & Token Passing:**
   * Passes `Authorization: Bearer <token>` in headers for fetch calls to Express backend.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "How does the React frontend communicate securely with the backend?"**
  * **Answer:** *"React stores the JWT token in state upon successful login and attaches it to the HTTP Authorization header for all API fetch calls."*

---

## 🗓️ DAY 7: Public Promotional Portal (`promotional-website/app.js` & `index.html`)

### 📂 **Files to Open:** `promotional-website/index.html` & `promotional-website/app.js`

### 🔍 **Key Functions & Lines to Study:**
1. **Zero-Login Live Catalog Search (`app.js`):**
   * `fetchBooks()`: Sends a public `GET` request to `http://localhost:5002/api/books` to populate the live search preview without requiring student login.
2. **APK Download Link (`index.html`):**
   * Provides direct download badge targeting `downloads/cdm-library-app.apk`.

### 🗣️ **Panel Defense Code Questions & Answers:**
* **Q: "Can guests search the library catalog without logging in?"**
  * **Answer:** *"Yes! The public promotional web portal uses client-side JavaScript to query the public `/api/books` REST endpoint, rendering live search results in real time."*

---

🎉 *Follow this 7-day plan, and you will understand every single line of code in your Capstone project!*
