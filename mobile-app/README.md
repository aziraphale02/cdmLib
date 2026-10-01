# CDM LibHub · Mobile Student Subsystem 📱

> **Colegio de Montalban — Integrated Library Management System (ILMS)**  
> **Student Mobile Portal & Digital Pass Subsystem**  
> Developed for Academic Capstone (BSIT 4C Capstone Group 9)

---

## 🎯 Overview

This is the standalone **Mobile Student Subsystem** of the **Colegio de Montalban Integrated Library Management System (ILMS)**. It provides students with an interactive, mobile-optimized experience to:

1. **Digital Student Library Pass (Dynamic QR Code):** Scan at the entrance kiosk or library circulation desk for instant attendance and loan processing.
2. **OPAC Book Catalog Search & Discovery:** Real-time search across titles, authors, categories, ISBNs, and availability.
3. **Instant Book Reservations:** Reserve physical books from mobile; reservations immediately sync to the Desktop Librarian Portal for approval and pickup staging.
4. **Loan History & Due Date Tracking:** Track currently borrowed books, return due dates, penalty computation, and borrowing history.
5. **Integrated Authentication:** Supports student sign-in with institutional Student Number / Email.

---

## 🚀 Quick Start (Standalone Development)

### 1. Install Dependencies
\`\`\`bash
cd mobile-app
npm install
\`\`\`

### 2. Configure Backend API Endpoint
Copy `.env.example` to `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`

Inside `.env`, verify the API URL pointing to the Desktop Library Backend:
\`\`\`env
VITE_LIBRARY_API_URL=http://localhost:5002/api
\`\`\`

### 3. Run Dev Server
\`\`\`bash
npm run dev
\`\`\`
The mobile web app will run at `http://localhost:5174`.

### 4. Build for Production
\`\`\`bash
npm run build
\`\`\`
Outputs production-ready static assets to `dist/`.

---

## 🔄 Live Data Flow to Desktop App

All actions performed on this Mobile Subsystem directly mutate and read from the central Library Database (`library.db`) via the Express REST API (`http://localhost:5002`):

\`\`\`
┌──────────────────────────────┐
│  Mobile Student App (PWA)    │
│  - Book Reservations         │
│  - Student Digital Pass QR   │
│  - Loan Status & Inquiries   │
└──────────────┬───────────────┘
               │  HTTP REST (JSON)
               ▼
┌──────────────────────────────┐
│  Library Express API Server  │  (:5002)
│  (server/server.js)          │
└──────────────┬───────────────┘
               │  SQLite Engine
               ▼
┌──────────────────────────────┐
│  Central Database            │  (library.db)
└──────────────▲───────────────┘
               │
               │  Real-time / REST
┌──────────────┴───────────────┐
│  Desktop Librarian App       │  (:5173)
│  - Reservations Tab          │
│  - Circulation (Borrow/Ret)  │
│  - Attendance Logs           │
│  - Book Catalog Management   │
└──────────────────────────────┘
\`\`\`

---

## 📖 Mother System Integration Guide
For the full guide on embedding this mobile module into the **CDM OneServe / OneStudent Mother System**, see [`MOTHER_SYSTEM_INTEGRATION_GUIDE.md`](./MOTHER_SYSTEM_INTEGRATION_GUIDE.md).
