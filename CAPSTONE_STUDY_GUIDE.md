# 🎓 CDM Integrated Library Management System
## Master Capstone Defense Study & Demonstration Guide

---

## 📑 Table of Contents
1. [Executive Summary & 30-Second Elevator Pitch](#1-executive-summary--30-second-elevator-pitch)
2. [Complete System Architecture & Ecosystem](#2-complete-system-architecture--ecosystem)
3. [Component Breakdown & Tech Stack](#3-component-breakdown--tech-stack)
4. [Curated 160-Book Academic Catalog & MARC 21 System](#4-curated-160-book-academic-catalog--marc-21-system)
5. [Core Business Logic & Workflows](#5-core-business-logic--workflows)
   - 5.1 Real-Time Mobile-to-Desktop Reservation Pipeline
   - 5.2 Circulation Management (Borrowing & Returning)
   - 5.3 Mandatory Physical Lost Book Replacement Workflow
   - 5.4 Automated Overdue Calculation & Penalty Engine
6. [Security, Authentication & Data Protection](#6-security-authentication--data-protection)
7. [Database Schema & Entity Relationships](#7-database-schema--entity-relationships)
8. [Step-by-Step Live Defense Demonstration Script](#8-step-by-step-live-defense-demonstration-script)
9. [Comprehensive Panel Q&A (Technical & Defense Prep)](#9-comprehensive-panel-qa-technical--defense-prep)
10. [Troubleshooting & Emergency Demo Cheat Sheet](#10-troubleshooting--emergency-demo-cheat-sheet)

---

## 1. Executive Summary & 30-Second Elevator Pitch

### What is the Project?
The **CDM Integrated Library Management System (ILMS)** is a multi-platform, full-stack library automation and student engagement ecosystem developed for the **Colegio de Montalban (CDM)** library.

### 🎙️ The 30-Second Elevator Pitch (Memorize This!)
> *"Good morning/afternoon, members of the panel. Our capstone project is the **CDM Integrated Library Management System**. It is an integrated, tri-platform solution consisting of an **Android/Web Mobile Application** for students, a **Desktop Management Panel** for librarians, and a **Public Web Portal** for online public access cataloging (OPAC).
> 
> Our system addresses long borrowing lines, misplaced book tracking, and lack of real-time reservation capabilities by providing **real-time bi-directional synchronization**, **MARC 21 library catalog standards**, **automated overdue penalty calculations**, and a **strict physical replacement verification workflow** for lost books. All platforms communicate seamlessly through a centralized REST API and SQLite database."*

---

## 2. Complete System Architecture & Ecosystem

The CDM ILMS comprises three distinct client applications connected to one centralized backend API:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TRI-PLATFORM CLIENTS                           │
├──────────────────────────┬─────────────────────────┬────────────────────┤
│   STUDENT MOBILE APP     │  LIBRARIAN DESKTOP APP  │ PUBLIC WEB PORTAL  │
│  (React / Mobile View)   │     (React + Vite)      │   (HTML/CSS/JS)    │
│   http://localhost:5175  │  http://localhost:5173  │ http://localhost:5002/promo│
└────────────┬─────────────┴────────────┬────────────┴──────────┬─────────┘
             │                          │                       │
             ▼                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CDM REST API BACKEND SERVER                          │
│                      (Node.js + Express.js v5)                          │
│                        http://localhost:5002                            │
│                                                                         │
│  • JWT Auth & PBKDF2 Password Hashing    • Real-Time Sync Engine        │
│  • In-Memory IP Rate Limiting            • Penalty & Overdue Calculator │
│  • MARC 21 Metadata Handler              • Physical Replacement Verifier│
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   CENTRALIZED RELATIONAL DATABASE                       │
│                     (SQLite 3 via better-sqlite3)                       │
│                              library.db                                 │
│                                                                         │
│  • books (168 records)          • transactions (loans & returns)        │
│  • students (directory)         • reservations (live pickup requests)   │
│  • librarians (staff auth)      • system_logs (audit trails)            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown & Tech Stack

| Component | Technology | Purpose & Responsibility |
|:---|:---|:---|
| **Librarian Desktop** | React 19, TypeScript, Vite 6, TailwindCSS 4, Lucide Icons, Recharts | Primary administration dashboard for librarians: circulation desk, catalog management, MARC editor, reservations queue, reports, and staff approvals. |
| **Student Mobile App** | React, Lucide Icons, Responsive Mobile Framework | Student self-service mobile client: catalog search, 1-tap book reservation, live loan countdown, overdue alerts, physical replacement notification, and digital QR library pass. |
| **Public OPAC Portal** | Vanilla HTML5, CSS3, Modern ES6+ JavaScript | Public-facing landing page and catalog search for students outside campus, showcasing library hours, institute filters, and mobile app download. |
| **Backend REST API** | Node.js, Express.js (v5) | Centralized API server handling all business logic, routing, security, data sanitization, and transaction atomicity. |
| **Database Engine** | SQLite 3 (`better-sqlite3`) | High-performance, zero-latency, file-based relational database storing all persistent data in `library.db`. |
| **Security Layer** | JWT (JSON Web Tokens), PBKDF2 SHA-512, Custom Rate Limiter | Secure authentication, role-based authorization, brute-force defense, and SQL injection prevention. |

---

## 4. Curated 160-Book Academic Catalog & MARC 21 System

### A. Academic Catalog Structure
The library contains a meticulously seeded catalog of **168 books**:
- **4 Institutes**:
  1. **ICS** — Institute of Computer Studies (BSIT)
  2. **IBE** — Institute of Business and Entrepreneurship (BSBA / BSHM)
  3. **IED** — Institute of Education (BSEd / BEEd)
  4. **ICJ** — Institute of Criminal Justice (BSCrim)
- **4 Year Levels** (1st Year, 2nd Year, 3rd Year, 4th Year)
- **2 Semesters per Year** (1st Sem & 2nd Sem)
- **5 Subject-Specific Books per Semester**: $4 \text{ institutes} \times 4 \text{ years} \times 2 \text{ semesters} \times 5 \text{ books} = \mathbf{160 \text{ core books}}$.
- **8 General Education (GENED) Books** (e.g., Rizal's *Noli Me Tangere*, *Philippine History*, *Ethics*, *Understanding the Self*).
- **Total:** **168 Books** fully cataloged with exact Call Numbers, ISBNs, Authors, Publishers, and MARC tags.

### B. MARC 21 Standard Compliance
Our catalog complies with the international **MARC 21 (Machine-Readable Cataloging)** bibliographic standard used by university libraries worldwide:
- **MARC 020**: International Standard Book Number (ISBN)
- **MARC 082**: Dewey Decimal Classification (DDC) & Call Number (e.g., `004.01 P39c 2002`)
- **MARC 100**: Personal Name (Author / Creator)
- **MARC 245**: Title Statement & Subtitle
- **MARC 260**: Publication, Distribution, and Year

---

## 5. Core Business Logic & Workflows

### 5.1 Real-Time Mobile-to-Desktop Reservation Pipeline
1. **Student Initiates:** The student browses the catalog on their mobile app, selects an available book, picks a target pickup date, and taps **"Reserve Book"**.
2. **API Processing (`POST /api/reservations`):** The server generates a unique reservation ID (`RES-...`), verifies book availability, and stores the reservation with a `pending` status.
3. **Desktop Real-Time Synchronization:**
   - The Desktop Header **Notification Bell** increments its badge counter.
   - The **Reservations Page** immediately displays the new request with student details, book title, and target pickup date.
4. **Librarian Action:** The librarian clicks **"Approve"** or **"Fulfill"** when the student arrives to collect the physical copy.

### 5.2 Circulation Management (Borrowing & Returning)
- **Borrowing Flow:** Librarian enters/scans Student ID, selects book from catalog, chooses loan duration (standard 3 days for students), and clicks **"Issue Loan"** (`POST /api/loans`). The book's available count decrements by 1.
- **Return Flow:** Librarian navigates to **"Return Books"**, searches the active transaction, inspects physical book condition (`Good`, `Damaged`, or `Lost`), and submits return (`POST /api/returns`).
- **Condition Outcomes:**
  - `Good`: Transaction marked `closed`; inventory copy restored (`available + 1`).
  - `Damaged`: Penalty assessed for physical repair/rebinding.
  - `Lost`: Triggers the **Mandatory Physical Lost Book Replacement Workflow**.

### 5.3 Mandatory Physical Lost Book Replacement Workflow (CDM Library Policy)
> [!IMPORTANT]
> **Key Capstone Feature:** Under Colegio de Montalban library policy, students who lose library books **cannot pay a cash buyout**. They must submit an **identical physical replacement copy** matching the catalog's ISBN, Title, and Author.

```
[ Student reports book Lost ] ──► [ Librarian marks status 'Lost' on Desktop ]
                                                   │
                                                   ▼
                                  [ Transaction 'replacement_status' = 'pending' ]
                                  [ Student account status = 'HOLD' ]
                                                   │
                                                   ▼
                                  [ Mobile App displays amber Replacement Alert ]
                                  [ Shows required ISBN, Title, and Author ]
                                                   │
                                                   ▼
[ Student brings physical copy ] ─► [ Librarian clicks 'Verify Physical Replacement' ]
                                                   │
                                                   ▼
                                  [ System verifies Title, Author, ISBN match ]
                                  [ Restores catalog inventory copy count (+1) ]
                                  [ Clears account HOLD back to 'Cleared' ]
```

### 5.4 Automated Overdue Calculation & Penalty Engine
- **Daily Rate:** ₱5.00 per day past the due date.
- **Dynamic Check:** Whenever `/api/student-portal/:studentId` or `/api/transactions` is accessed, the server compares `due_date` against the current server date:
  $$\text{Days Overdue} = \max(0, \text{Today} - \text{Due Date})$$
  $$\text{Penalty Amount} = \text{Days Overdue} \times ₱5.00$$
- If a loan is overdue, the student's clearance status automatically transitions to **"Hold"** until returned and cleared.

---

## 6. Security, Authentication & Data Protection

| Security Mechanism | Implementation in CDM ILMS | Protection Provided |
|:---|:---|:---|
| **Password Hashing** | Node.js `crypto.pbkdf2Sync` with SHA-512 and a 16-byte random salt per user (10,000 iterations). | Defends against plaintext exposure and Rainbow Table attacks. |
| **Constant-Time Comparison** | `crypto.timingSafeEqual` during login authentication. | Eliminates timing attacks where attackers guess password hashes based on response latency. |
| **Token-Based Auth** | Signed JSON Web Tokens (JWT) with 24-hour expiration (`authenticateToken` middleware). | Stateless session security; protects restricted endpoints against unauthorized requests. |
| **Brute-Force Rate Limiting** | In-Memory Sliding-Window Rate Limiter (`authLimiter`: 15 requests / 15 mins; `apiLimiter`: 300 requests / 15 mins). | Blocks automated dictionary attacks, credential stuffing, and Denial of Service (DoS) attempts. |
| **SQL Injection Prevention** | `better-sqlite3` parameterized prepared statements (`?` placeholders). | Sanitizes all inputs, completely eliminating SQL injection vulnerabilities. |
| **Staff Role Hierarchy** | `Head Librarian` vs. `Librarian` with admin approval workflow. | Prevents unauthorized staff registrations from accessing sensitive patron or system data. |

---

## 7. Database Schema & Entity Relationships

The system operates on **5 normalized relational tables** in `library.db`:

```
┌──────────────────────┐         ┌──────────────────────┐
│      librarians      │         │       students       │
├──────────────────────┤         ├──────────────────────┤
│ id (PK)              │         │ id (PK: Student ID)  │
│ email (UNIQUE)       │         │ name                 │
│ password_hash        │         │ email (UNIQUE)       │
│ salt                 │         │ phone                │
│ role (Head / Staff)  │         │ course (BSIT/etc)    │
│ status (active/pend) │         │ year_level           │
└──────────────────────┘         │ status (active/hold) │
                                 └──────────┬───────────┘
                                            │ 1
                                            │
                                            │ M
┌──────────────────────┐ 1       M ┌────────┴───────────┐
│        books         ├───────────┤    transactions    │
├──────────────────────┤           ├──────────────────────┤
│ id (PK: B001 / CUR)  │           │ id (PK: TXN-...)     │
│ title                │           │ book_id (FK -> books)│
│ author               │           │ student_id (FK)      │
│ isbn (UNIQUE)        │           │ borrow_date          │
│ category (ICS/etc)   │           │ due_date             │
│ call_no (MARC 082)   │           │ return_date          │
│ marc_tag             │           │ condition            │
│ available            │           │ penalty              │
│ total                │           │ replacement_status   │
│ cover (Hex Color)    │           │ status (active/over) │
└──────────┬───────────┘           └──────────────────────┘
           │ 1
           │
           │ M
┌──────────┴───────────┐
│     reservations     │
├──────────────────────┤
│ id (PK: RES-...)     │
│ book_id (FK -> books)│
│ student_id (FK)      │
│ reservation_date     │
│ pickup_date          │
│ status (pend/fulfill)│
└──────────────────────┘
```

---

## 8. Step-by-Step Live Defense Demonstration Script

Follow this exact 5-step sequence during your live presentation:

### Step 1: Open the System Tri-Platform View
- Open **Desktop App**: `http://localhost:5173`
- Open **Mobile App Simulator**: `http://localhost:5175`
- Open **Public Web Portal**: `http://localhost:5002/promo`
- **Say to Panel:** *"As you can see, our system consists of three synchronized platforms: the Librarian Desktop Panel, the Student Mobile Application, and the Public Catalog Portal."*

### Step 2: Demonstrate the 160-Book Catalog & MARC 21 Standard
- On Desktop, click **"Book Catalog"**.
- Filter by **Institute** (e.g., `ICS`), **Year Level** (`4th Year`), and **Semester** (`1st Sem`).
- Click **"MARC Record"** on any title to show MARC 020, 082 Call Number, and 245 Title tags.
- **Say to Panel:** *"Our catalog is built specifically for CDM curricula, categorized across 4 institutes and 4 year levels, fully compliant with international MARC 21 standards."*

### Step 3: Demonstrate Real-Time Mobile Book Reservation
- Switch to the **Mobile App** (`http://localhost:5175`).
- Search for a book (e.g., *"Cloud Computing"* or *"Algorithms"*).
- Tap the book, select a **Target Pickup Date**, and tap **"Reserve Book"**.
- Switch immediately back to the **Desktop App**:
  - Point out the **Notification Bell** showing the new unread reservation.
  - Open **"Reservations"** to show the live entry.
- **Say to Panel:** *"Notice that the moment the student reserves on mobile, the desktop panel receives it instantly without any page refresh."*

### Step 4: Demonstrate Loan Issuance & Overdue Tracking
- On Desktop, go to **"Borrow Book"** and issue a loan to Student ID `2024-0042`.
- Switch to Mobile **"My Library -> Active loans"** to show the loan appearing with real-time due date tracking.
- Show how late loans trigger a daily ₱5.00 penalty calculation.

### Step 5: Demonstrate the Mandatory Physical Lost Book Replacement Workflow
- On Desktop, go to **"Return Books"** and select a loan.
- Mark the condition as **"Lost"** and submit.
- Switch to Mobile: show the amber **"Book Replacement Required"** card with the exact required ISBN, Title, and Author, and the account status marked **"HOLD"**.
- On Desktop, click **"Verify Physical Replacement"**, match the physical copy, and submit.
- Switch back to Mobile: show the account instantly cleared back to **"Good Standing / Cleared"** and catalog copies restored!
- **Say to Panel:** *"This completes the full cycle of student self-service, staff administration, and institutional inventory compliance."*

---

## 9. Comprehensive Panel Q&A (Technical & Defense Prep)

### Q1: *"Why did you choose SQLite over MySQL or MongoDB?"*
> **Answer:** *"We chose SQLite 3 (`better-sqlite3`) because it provides zero-latency synchronous execution, is completely serverless, stores the entire relational dataset in a single portable file (`library.db`), and requires zero external database server administration. For an institutional library deployment running on a campus intranet or local server, SQLite delivers over 50,000 queries per second with minimal memory footprint."*

### Q2: *"How do you handle real-time synchronization between Mobile and Desktop?"*
> **Answer:** *"Synchronization is powered by our centralized Express REST API. The Student Mobile App utilizes active polling and on-action refetches to endpoints like `/api/student-portal/:studentId`, `/api/books`, and `/api/reservations`. Any transaction, condition update, or reservation processed on either client immediately updates the database state and reflects on the other client."*

### Q3: *"How does the system ensure data integrity during simultaneous borrowing?"*
> **Answer:** *"We utilize atomic database transactions in SQLite (`db.transaction()`). When a book is borrowed or returned, the deduction or addition of available copies and the creation of transaction logs are executed as a single atomic unit. If any step fails, the entire transaction rolls back, preventing negative inventory or phantom checkouts."*

### Q4: *"What is the significance of MARC 21 in your capstone?"*
> **Answer:** *"MARC 21 (Machine-Readable Cataloging) is the global standard for library bibliographic data. By structuring our catalog with MARC 020 (ISBN), MARC 082 (Dewey Decimal / Call Numbers), MARC 100 (Author), and MARC 245 (Title), our system ensures interoperability with national and global library networks and trains CDM students and librarians on industry-standard cataloging."*

### Q5: *"How do you prevent brute force password guessing?"*
> **Answer:** *"We implemented an in-memory rate limiter (`authLimiter`) on the `/api/auth/login` route. It tracks IP addresses in sliding 15-minute windows and limits attempts to 15 requests. Exceeding this threshold results in an HTTP 429 'Too Many Requests' response, completely mitigating automated dictionary attacks."*

### Q6: *"Why is there a physical replacement rule instead of paying a cash fine for lost books?"*
> **Answer:** *"In academic institutions, out-of-print textbooks and specialized curriculum references are difficult for librarians to procure quickly with cash. Requiring the student to provide the exact physical title and ISBN guarantees that library academic holdings and physical stock counts remain complete for succeeding batches of students."*

---

## 10. Troubleshooting & Emergency Demo Cheat Sheet

| Situation / Question | Action / What to Check |
|:---|:---|
| **API Server not responding** | Verify Terminal: Server runs on `http://localhost:5002`. Run `node server/server.js`. |
| **Desktop App not loading** | Run `npm run dev` in workspace (Port 5173). |
| **Mobile Simulator not loading** | Run `npx vite --port 5175 --host` (Port 5175). |
| **Database Reset / Seed Needed** | Run `node seed.js` or `node seed_curriculum_catalog.js` to reset all 168 books and sample students. |
| **Default Login Credentials** | **Email:** `admin@cdm.edu.ph` / **Password:** `admin123` |
| **Default Sample Student ID** | `2024-0042` (Jay Deguzman, BSIT 4th Year) |

---
*Created for Colegio de Montalban (CDM) Capstone Project Defense. All Rights Reserved.*
