# 🎓 Master Capstone Study Guide: CDM Library System

Welcome to your study guide! This document breaks down your **Integrated Library Management System (CDM Library)** in plain, easy-to-understand language so you can confidently present and answer any question during your Capstone Defense.

---

## 1. 🚀 30-Second Elevator Pitch (What to say when panel asks: *"What is your project?"*)

> *"Our Capstone project is the **Integrated Library Management System for Colegio de Montalban (CDM)**. It is a multi-platform solution consisting of an **Android Mobile App** for students to search books, track due dates, and reserve titles 24/7, a **Desktop Admin Panel** for librarians to manage books, checkouts, returns, and penalty fines, and a **Public Web Portal** for live catalog search and app downloads. It eliminates long library queues, prevents late return penalties, and automates physical book inventory management."*

---

## 2. 🧩 How Everything Works Together (System Architecture)

Your project has **3 front-facing parts** that all talk to **1 central backend server**:

```
[ Student Mobile App (Android) ] ────┐
                                     │  (HTTP / JSON REST API)
[ Public Web Portal (HTML/CSS/JS) ] ─┼──────────────► [ Express.js Backend Server ] ◄──► [ SQLite Database ]
                                     │                     (Port 5002)                    (library.db)
[ Librarian Desktop (React/Vite) ] ──┘
```

1. **The Client Apps (Frontend):** Student Mobile App, Web Portal, and Librarian Desktop.
2. **The Server (Backend):** Built with **Node.js + Express.js**. It receives requests, checks security rules, and processes data.
3. **The Database:** **SQLite 3** (`library.db`). Holds all tables for books, users, transactions, and reservations.

---

## 3. 🛠️ Tech Stack Explained in Simple Terms

| Component | Technology | Plain English Explanation |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript** | Powers the interactive Librarian Dashboard UI with strong type-checking to prevent code bugs. |
| **Build Tool** | **Vite 6** | A fast tool that compiles React code for instant browser loading. |
| **Styling & UI** | **TailwindCSS 4 + Radix UI** | Handles beautiful layouts, badges, modals, and responsive design. |
| **Charts** | **Recharts** | Generates visual graphs for borrowing trends and book category statistics. |
| **Backend Framework**| **Express.js (v5 on Node.js)**| The web server engine handling all API routes (`/api/books`, `/api/auth/login`, etc.). |
| **Database** | **SQLite 3 (`better-sqlite3`)**| A fast, file-based relational database that stores all data locally in `library.db`. |
| **Security** | **JWT + PBKDF2 Hashing** | Secures user login tokens and safely encrypts passwords before saving them. |
| **Rate Limiter** | **Custom In-Memory Limiter** | Blocks hackers/bots if they send too many requests or attempt to brute-force logins. |

---

## 4. 🔑 Core Features & How They Work Behind the Scenes

### A. Authentication & Registration
* **How it works:** When a librarian logs in, the server checks their password against the stored **PBKDF2 hash** using `crypto.timingSafeEqual`.
* **Token Issuance:** If valid, the server returns a signed **JSON Web Token (JWT)** that lasts 24 hours. The browser saves this token and attaches it to every future API request.
* **Approval Rule:** Newly registered staff accounts have a `pending` status until an Admin/Head Librarian approves them.

### B. Book Inventory Management
* **Book Properties:** Stores Title, Author, ISBN (unique), Category, Abstract, Total Copies, Available Copies, and Borrow Count.
* **Stock Logic:** When a book is borrowed or reserved, `available` count automatically decreases. When returned, `available` count increases.

### C. Loan Transactions & Automated Penalties
* **Borrowing:** Links a Student ID to a Book ID with a `borrow_date` and `due_date`.
* **Overdue Detection:** The server checks `due_date < today`. If past due, status automatically becomes `overdue`.
* **Fine Calculation:** Calculates elapsed days past the due date and computes penalty fees dynamically.
* **Book Condition Check:** When a book is returned, librarians select `Good`, `Damaged`, or `Lost` to update records accordingly.

### D. Book Reservations
* **Mobile Holding:** Students can request a book from their phone.
* **Workflow:** Status moves from `pending` $\rightarrow$ `fulfilled` (when picked up) or `cancelled`.

---

## 5. 🛡️ Security Features (Crucial for Defense Questions!)

1. **Password Hashing (PBKDF2 SHA-512 + 16-byte Salt):**
   * Passwords are *never* saved in plain text.
   * `Salt` is a random string added to the password before hashing to prevent rainbow table attacks.
2. **JWT Authentication:**
   * Protects API routes so unauthorized users cannot access or alter library records.
3. **Rate Limiting Middleware:**
   * `authLimiter`: Max **15 login attempts per 15 minutes** (prevents brute-force attacks).
   * `apiLimiter`: Max **300 API calls per 15 minutes** per IP (prevents DoS overloading).
4. **SQL Injection Prevention:**
   * Uses `better-sqlite3` **parameterized statements** (`?` and `@parameter` placeholders) instead of raw string concatenation.

---

## 6. 🗄️ Database Tables (5 Key Tables)

1. `librarians`: Stores staff user accounts, hashed passwords, roles (`Head Librarian`, `Librarian`), and approval status.
2. `books`: Stores book catalog metadata and physical inventory counts.
3. `transactions`: Stores borrowing history, due dates, return dates, book condition, and penalties.
4. `reservations`: Stores student book reservation requests and pickup target dates.
5. `students`: Stores registered student profiles, email, phone, course, and year level.

---

## 7. 🗣️ Common Panel Defense Questions & Winning Answers

### Q1: *"Why did you choose SQLite instead of MySQL or PostgreSQL?"*
> **Answer:** *"SQLite was chosen because it is lightweight, serverless, zero-configuration, and stores data in a single file (`library.db`). It provides fast performance for desktop and local network setups without needing complex database server management."*

### Q2: *"How do you protect your database against SQL Injection?"*
> **Answer:** *"We use parameterized prepared statements in `better-sqlite3`. User inputs are passed as separate parameters rather than concatenated directly into SQL queries."*

### Q3: *"How does the system prevent unauthorized access?"*
> **Answer:** *"All protected API routes require a valid JSON Web Token (JWT) in the HTTP Authorization header. Additionally, role checks in Express ensure staff members only perform actions permitted for their assigned role."*

### Q4: *"What happens if someone tries to brute-force a librarian login?"*
> **Answer:** *"Our server has an `authLimiter` middleware. It tracks client IP addresses and automatically blocks any IP that exceeds 15 login attempts within a 15-minute window with an HTTP 429 'Too Many Requests' response."*

### Q5: *"How do you calculate overdue fines?"*
> **Answer:** *"The system compares the transaction's `due_date` against the current date or `return_date`. If the return date is past the due date, the system calculates the number of late days and multiplies it by the institution's daily penalty rate."*

---

🎉 *Tip: Keep this guide handy while reviewing your project. You are fully prepared to ace your Capstone defense!*
