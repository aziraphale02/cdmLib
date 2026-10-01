# CDM OneServe / Mother System Integration Guide 🔌

> **Documentation for Developers of the Mother System (CDM OneServe / OneStudent)**  
> **Topic:** Integrating the CDM LibHub Mobile Subsystem & Connecting Data to the Desktop CDM ILMS  
> **Capstone:** BSIT 4C Capstone Group 9

---

## 🏛️ Architecture Overview

The **CDM LibHub Mobile Subsystem** is designed as an independent client module that connects directly to the **CDM Library Backend REST API (CDM ILMS)**. 

When a student performs an action inside the Mobile App (such as reserving a book or presenting their QR pass at the entrance), the data is transmitted to the Library API, immediately updating the central database and reflecting in the **Desktop Librarian Portal**.

```
┌─────────────────────────────────────────────────────────────┐
│                 CDM OneServe Mother System                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Embedded Library Subsystem / Mobile Pass Module     │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │  REST API Calls (CORS enabled)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          CDM OneLib Desktop ILMS Backend (:5002)            │
│  - Express REST API with JWT Auth & CORS                    │
│  - SQLite Database (library.db)                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Desktop Librarian Management Portal              │
│  - Instant Reservation Notifications                        │
│  - Circulation Desk (Issue / Return / Overdue Penalty)      │
│  - Student Attendance & Kiosk Scan Records                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Integration Options for Mother System Developers

### Option 1: Direct Component Embed (React / Next.js / Vite)
Copy the `mobile-app/src/App.jsx` component into your Mother System project under `src/modules/library/`:

```jsx
import LibraryMobileApp from './modules/library/App.jsx';

// In your router or tab view:
function StudentLibraryTab() {
  return (
    <div className="w-full h-full max-w-md mx-auto">
      <LibraryMobileApp />
    </div>
  );
}
```

Make sure to set the environment variable in the Mother System `.env`:
```env
VITE_LIBRARY_API_URL=http://<LIBRARY_SERVER_IP_OR_DOMAIN>:5002/api
```

---

### Option 2: Standalone PWA / Micro-Frontend (Iframe or Subdomain)
Run the `mobile-app` as an independent service on a dedicated port or subdomain (e.g., `https://library.cdmconnect.online` or `http://localhost:5174`):
1. In the Mother System student dashboard, add a navigation card: **"Library Portal & Digital Pass"**.
2. Point the link or iframe to the hosted Mobile Subsystem URL.

---

## 📡 REST API Reference (Connecting Data to Desktop App)

The Library Backend API runs on port `5002` (or your configured production domain). All endpoints return JSON and accept standard HTTP methods.

### 1. Book Catalog & Search (OPAC)
- **Endpoint:** `GET /api/books`
- **Query Parameters:** `?search=query&category=ICS&status=Available`
- **Response:**
```json
[
  {
    "id": 1,
    "accession_no": "ACC-2026-0001",
    "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
    "author": "Robert C. Martin",
    "category": "Computer Studies (ICS)",
    "isbn": "978-0132350884",
    "total_copies": 5,
    "available_copies": 4,
    "status": "Available",
    "cover_image": "https://..."
  }
]
```

---

### 2. Student Book Reservation (Live Sync to Desktop App)
When a student reserves a book via mobile, it instantly creates a record in the database. The Head Librarian sees it immediately in the **Reservations** tab of the Desktop App.

- **Endpoint:** `POST /api/reservations`
- **Payload:**
```json
{
  "bookId": 1,
  "studentId": 12,
  "studentNumber": "2022-00123-MN-0",
  "studentName": "Juan Dela Cruz",
  "pickupDate": "2026-09-18"
}
```
- **Response:**
```json
{
  "success": true,
  "id": 45,
  "reservationId": 45,
  "status": "pending",
  "message": "Reservation submitted successfully! Please claim at the circulation counter before the pickup deadline."
}
```

---

### 3. Student Digital Pass Attendance & Kiosk Scan
When the student scans their Digital Pass QR at the library entrance kiosk or mobile check-in:

- **Endpoint:** `POST /api/attendance`
- **Payload:**
```json
{
  "studentNumber": "2022-00123-MN-0",
  "studentName": "Juan Dela Cruz",
  "institute": "ICS",
  "purpose": "Study / Research",
  "timestamp": "2026-09-17T11:00:00.000Z"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "student": {
    "name": "Juan Dela Cruz",
    "program": "BSIT",
    "activeLoans": 1,
    "overdueCount": 0
  }
}
```

---

### 4. Student Active Loans & Penalty Inquiries
Allows the Mother System to display active borrowed books and overdue notices:

- **Endpoint:** `GET /api/students/:id/loans`
- **Response:**
```json
[
  {
    "loan_id": 101,
    "book_title": "Database System Concepts",
    "borrow_date": "2026-09-10",
    "due_date": "2026-09-17",
    "status": "Active",
    "penalty_amount": 0
  }
]
```

---

### 5. Student Authentication & Profile Sync
- **Student Login:** `POST /api/auth/student-login`
  - Body: `{ "studentNumber": "2022-00123-MN-0", "password": "password123" }`
  - Response: `{ "token": "jwt_token", "student": { "id": 12, "studentNumber": "2022-00123-MN-0", "name": "Juan Dela Cruz", "institute": "ICS", "program": "BSIT" } }`

- **Student Registration:** `POST /api/auth/student-register`
  - Body: `{ "studentNumber": "...", "firstName": "...", "lastName": "...", "email": "...", "program": "BSIT", "yearLevel": "4th Year", "password": "..." }`

---

## 🔒 Security & CORS Configuration

The Library Backend server is pre-configured to allow cross-origin requests from the Mother System:
- Default allowed origins: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`, `https://student.cdmconnect.online`
- In production, set `FRONTEND_URL` in the Library API `.env` to include the Mother System domain:
  ```env
  FRONTEND_URL=https://student.cdmconnect.online,https://oneserve.cdm.edu.ph
  ```

---

## 📞 Support & Contacts

For any questions regarding API payloads or database schema details:
- **Project:** Colegio de Montalban Integrated Library Management System
- **Development Team:** BSIT 4C Capstone Group 9
- **Repository:** `aziraphale02/cdmLib`
