import React, { useState, useEffect, useMemo, useCallback } from "react";
import QRCode from "qrcode";
import {
  Home,
  Search,
  BookMarked,
  QrCode,
  Bell,
  ChevronRight,
  Plus,
  X,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Mail,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Activity,
  Layers,
  AlertTriangle,
  Calendar,
  LogOut,
  SlidersHorizontal,
  Fingerprint,
  Building2,
  BookOpen,
  Check,
  HelpCircle,
  Maximize2,
  ChevronDown,
  Info,
  ScanLine,
  ArrowRight,
  ShieldAlert,
  Archive,
  BarChart3,
  Camera,
  Trash2,
  DollarSign,
  Sun,
  Moon,
  Share2,
  RotateCcw,
  CheckCheck,
  UserPlus,
  FileText,
  Smartphone,
  Download,
  Wifi,
  WifiOff,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Type,
  BookmarkPlus
} from "lucide-react";

/**
 * High-Performance ISO/IEC 18004 Compliant Dynamic QR Code Component
 */
function DigitalQRCode({ value, size = 160, darkColor = "#000000", lightColor = "#FFFFFF" }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (value) {
      QRCode.toDataURL(value, {
        width: size * 2,
        margin: 1,
        color: { dark: darkColor, light: lightColor },
        errorCorrectionLevel: "M"
      })
        .then((url) => {
          if (isMounted) setDataUrl(url);
        })
        .catch((err) => console.error("QR Code Generation Error:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor]);

  if (!dataUrl) {
    return (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: lightColor, borderRadius: 12 }}>
        <QrCode size={size * 0.6} color={darkColor} />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Digital Accession QR"
      style={{
        width: size,
        height: size,
        display: "block",
        borderRadius: 12,
        imageRendering: "pixelated"
      }}
    />
  );
}

/**
 * ============================================================================
 * DESIGN TOKENS & PALETTE
 * ============================================================================
 */
const TOKENS = {
  primary: "#106A2E", // CDM Forest Green
  primaryDark: "#0D5023", // CDM Deep Forest
  primaryGlass: "rgba(16, 106, 46, 0.08)",
  accentGold: "#F4D35E", // Rich Gold / Amber
  accentGoldDark: "#E5B80B", // Deep Metallic Gold
  canvasLight: "#F8F9FA", // Warm Off-White
  cardLight: "#FFFFFF",
  canvasDark: "#0F172A", // Deep Slate (Staff / Telemetry)
  cardDark: "#1E293B",
  emeraldLuminous: "#00F29D", // Telemetry gauge highlight
  borderLight: "rgba(0, 0, 0, 0.07)",
  borderDark: "rgba(255, 255, 255, 0.08)",
};

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_LIBRARY_API_URL) 
  ? import.meta.env.VITE_LIBRARY_API_URL 
  : (typeof window !== "undefined" && window.__LIBRARY_API_BASE__ ? window.__LIBRARY_API_BASE__ : "http://localhost:5002/api");

const INSTITUTES = [
  { id: "ALL", name: "All Institutes", short: "ALL" },
  { id: "ICS", name: "Computer Studies (ICS)", short: "ICS" },
  { id: "ITE", name: "Teacher Education (ITE)", short: "ITE" },
  { id: "IBE", name: "Business & Entrep (IBE)", short: "IBE" },
];

const PROGRAMS_FILTER = [
  { code: "ALL", name: "All Programs", institute: "ALL" },
  { code: "BSIT", name: "BSIT - Info Tech", institute: "ICS" },
  { code: "BSCPE", name: "BSCPE - Computer Eng", institute: "ICS" },
  { code: "BEED GEN", name: "BEED - Elementary", institute: "ITE" },
  { code: "BTLED", name: "BTLED - Tech Voc", institute: "ITE" },
  { code: "BECED", name: "BECED - Early Child", institute: "ITE" },
  { code: "BSED", name: "BSED - Secondary", institute: "ITE" },
  { code: "BSBA", name: "BSBA - Business Admin", institute: "IBE" },
  { code: "BS ENTREP", name: "BS ENTREP - Entrepreneurship", institute: "IBE" },
];

import curatedBooksList from "./curated_books.json";

// ============================================================================
// INITIAL SEED DATA (Synchronized 48-Book Academic Catalog)
// ============================================================================
const INITIAL_BOOKS = curatedBooksList;


// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CDMLibraryMobile() {
  // Global State Machine
  const [role, setRole] = useState("STUDENT_ROLE"); // 'STUDENT_ROLE' | 'STAFF_ROLE'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("tab") || "home";
    }
    return "home";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  
  // Fresh Student Profile
  const [student, setStudent] = useState({
    id: "2024-0042",
    name: "Juan dela Cruz",
    email: "juan.delacruz@cdm.edu.ph",
    institute: "ICS",
    program: "BSIT",
    year: "3rd Year",
    clearanceStatus: "CLEARED", // Fresh clean start
    standing: "CLEARED",
    activeLoansCount: 0,
    pendingReservationsCount: 0
  });

  // UI Interactive States (Starts Fresh and Clean)
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [loans, setLoans] = useState([]); // Zero active loans on clean start!
  const [reservations, setReservations] = useState([]); // Zero reservations on clean start!
  const [loansSubTab, setLoansSubTab] = useState("active");
  const [notifications, setNotifications] = useState([
    {
      id: "NOTIF-WELCOME",
      type: "system",
      title: "Welcome to CDM Library Portal!",
      message: "Your student library account is 100% active and clear to borrow books. Browse the OPAC catalog to get started.",
      time: "Just now",
      unread: true,
      actionTab: "catalog"
    }
  ]);

  // Modals & Drawers
  const [selectedBook, setSelectedBook] = useState(null);
  const [readingBook, setReadingBook] = useState(null);
  const [isPassExpanded, setIsPassExpanded] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // PWA Installation & Offline State
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState("ALL");
  const [selectedProgram, setSelectedProgram] = useState("ALL");
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);

  // PWA Lifecycle & Connection Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Online: Connection restored.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Offline: Serving cached catalog & pass.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      showToast("CDM Library Companion installed to home screen!");
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && window.navigator.standalone)
    ) {
      setIsInstalled(true);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosSafari = /iphone|ipad|ipod/.test(ua) && !/crios|fxios|opios/.test(ua);
    setIsIOS(isIosSafari);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setIsInstalled(true);
        showToast("Installation complete! Enjoy your offline student pass.");
      }
      setInstallPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  // Unread notifications count
  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync with live REST API if available
  useEffect(() => {
    fetch(`${API_BASE}/books`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((b) => ({
            id: b.id || b.accession_no || b.call_number || `CDM-${b.id}`,
            isbn: b.isbn || "978-971-0000-00-0",
            title: b.title,
            author: b.author,
            category: b.institute || (b.category && b.category.includes("ICS") ? "ICS" : b.category && b.category.includes("ITE") ? "ITE" : b.category && b.category.includes("IBE") ? "IBE" : b.category) || "ICS",
            institute: b.institute || (b.category && b.category.includes("ICS") ? "ICS" : b.category && b.category.includes("ITE") ? "ITE" : b.category && b.category.includes("IBE") ? "IBE" : "ICS"),
            program: b.program || (b.institute === "ICS" || (b.category && b.category.includes("ICS")) ? "BSIT" : b.institute === "ITE" || (b.category && b.category.includes("ITE")) ? "BSED" : "BSBA"),
            yearLevel: b.year_level || b.yearLevel || "3rd Year",
            semester: b.semester || "1st Sem",
            ddc: b.dewey_decimal || b.call_number || b.callNo || "005.13",
            shelfLocation: b.location || b.shelfLocation || `Stack ${b.institute || "MAIN"}-1`,
            totalCopies: b.total !== undefined ? b.total : b.copies || 5,
            availableCopies: b.available !== undefined ? b.available : b.available_copies !== undefined ? b.available_copies : 4,
            publisher: b.publisher || "CDM Academic Press",
            year: b.publish_year || b.publishYear || b.year || "2023",
            coverUrl: b.cover || b.coverUrl || b.cover_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=560&fit=crop&auto=format",
            synopsis: b.abstract || b.synopsis || b.description || "Official syllabus textbook cataloged under Colegio de Montalban Library collection."
          }));
          setBooks(mapped);
        }
      })
      .catch(() => {});

    // Fetch existing reservations for current student
    fetch(`${API_BASE}/reservations`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const studentRes = data
            .filter((r) => r.student_id === student.id || r.studentId === student.id || r.student_name === student.name || r.studentName === student.name)
            .map((r) => ({
              reservationId: r.id || r.reservationId,
              id: r.id || r.reservationId,
              bookId: r.book_id || r.bookId,
              bookTitle: r.book_title || r.bookTitle,
              bookAuthor: r.book_author || r.bookAuthor || "CDM Academic Collection",
              shelfLocation: r.shelfLocation || "Main Stacks",
              reservedAt: r.reservation_date || r.reservationDate || "Today",
              pickupDate: r.pickup_date || r.pickupDate,
              pickupSchedule: `Pickup: ${r.pickup_date || r.pickupDate || "Within 48h"} (8:00 AM - 5:00 PM)`,
              expiresAt: `Hold until ${r.pickup_date || r.pickupDate || "48h"}`,
              status: r.status || "pending",
              counter: "Desk #1 (Circulation Desk, 2nd Flr)"
            }));
          if (studentRes.length > 0) {
            setReservations(studentRes);
            setStudent((prev) => ({
              ...prev,
              pendingReservationsCount: studentRes.filter((r) => r.status === "pending").length
            }));
          }
        }
      })
      .catch(() => {});
  }, [student.id, student.name]);

  // Filter Logic
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.isbn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.ddc.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesInstitute =
        selectedInstitute === "ALL" || b.category === selectedInstitute;

      const matchesProgram =
        selectedProgram === "ALL" || b.program === selectedProgram;

      const matchesAvailability =
        !filterAvailableOnly || b.availableCopies > 0;

      return matchesSearch && matchesInstitute && matchesProgram && matchesAvailability;
    });
  }, [books, searchQuery, selectedInstitute, selectedProgram, filterAvailableOnly]);

  // Recommended Books for current student
  const recommendedBooks = useMemo(() => {
    if (!books || books.length === 0) return [];
    const inst = student.institute || "ICS";
    const matched = books.filter((b) => {
      const bInst = b.institute || (b.category && b.category.includes("ICS") ? "ICS" : b.category && b.category.includes("ITE") ? "ITE" : b.category && b.category.includes("IBE") ? "IBE" : "");
      return bInst === inst || (b.category && b.category.includes(inst));
    });
    return matched.length > 0 ? matched : books.slice(0, 8);
  }, [books, student]);

  // PIN Verification for Staff Mode
  const handlePinSubmit = (digit) => {
    const nextPin = pinInput + digit;
    if (nextPin.length <= 4) {
      setPinInput(nextPin);
      if (nextPin === "1234" || nextPin === "2026") {
        setTimeout(() => {
          setRole("STAFF_ROLE");
          setActiveTab("telemetry");
          setIsPinModalOpen(false);
          setPinInput("");
          setPinError("");
          showToast("Staff Telemetry Terminal Activated (PIN Clearance Validated)");
        }, 200);
      } else if (nextPin.length === 4) {
        setPinError("Invalid Clearance PIN. Default is '1234'");
        setTimeout(() => setPinInput(""), 600);
      }
    }
  };

  // 1-Tap Reservation Handler with Real Pickup Schedule
  const handleReserveBook = async (book) => {
    if (!book || book.availableCopies <= 0) {
      showToast("Book is currently unavailable for reservation.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const pickupDateObj = new Date(Date.now() + 86400000 * 2);
    const pickupDateStr = pickupDateObj.toISOString().split('T')[0];
    const pickupFormatted = pickupDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const pickupSchedule = `Pickup: ${pickupFormatted} (8:00 AM - 5:00 PM)`;

    let resId = `RES-${Date.now()}`;

    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          student_name: student.name,
          book_id: book.id,
          book_title: book.title,
          reservation_date: todayStr,
          pickup_date: pickupDateStr,
        }),
      });
      const data = await res.json();
      if (data && (data.id || data.reservationId)) {
        resId = data.id || data.reservationId;
      }
    } catch (_) {}

    setBooks((prev) =>
      prev.map((item) =>
        item.id === book.id
          ? { ...item, availableCopies: Math.max(0, item.availableCopies - 1) }
          : item
      )
    );

    const newRes = {
      reservationId: resId,
      id: resId,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author || "CDM Academic Collection",
      shelfLocation: book.shelfLocation || "Main Stacks",
      reservedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      pickupDate: pickupDateStr,
      pickupSchedule: pickupSchedule,
      expiresAt: `Hold until ${pickupFormatted}`,
      status: "pending",
      counter: "Desk #1 (Circulation Desk, 2nd Flr)"
    };

    setReservations((prev) => [newRes, ...prev.filter(r => (r.reservationId !== resId && r.id !== resId))]);
    setStudent((prev) => ({
      ...prev,
      pendingReservationsCount: (prev.pendingReservationsCount || 0) + 1
    }));
    setSelectedBook(null);
    setLoansSubTab("reservations");
    setActiveTab("loans");
    showToast(`✓ Reserved "${book.title}". Scheduled pickup: ${pickupFormatted}!`);

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        type: "ready",
        title: "Pickup Scheduled",
        message: `Hold confirmed for "${book.title}". Pick up at Desk #1 by ${pickupFormatted}.`,
        time: "Just now",
        unread: true,
        actionTab: "loans"
      },
      ...prev
    ]);
  };

  // Student Action: Cancel Reservation Hold
  const handleCancelReservation = async (resId) => {
    try {
      await fetch(`${API_BASE}/reservations/${resId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by Student Patron via CDM OneLib" })
      });
    } catch (_) {}

    const target = reservations.find(r => r.reservationId === resId || r.id === resId);
    if (target && target.bookId) {
      setBooks(prev => prev.map(b => b.id === target.bookId ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) } : b));
    }

    setReservations(prev => prev.filter(r => r.reservationId !== resId && r.id !== resId));
    setStudent(prev => ({
      ...prev,
      pendingReservationsCount: Math.max(0, (prev.pendingReservationsCount || 1) - 1)
    }));
    showToast("Reservation cancelled and copy restocked.");
  };

  // Loan Renewal Handler
  const handleRenewLoan = (loanId) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.loanId === loanId || loan.id === loanId) {
          const currentDue = loan.dueDate ? new Date(loan.dueDate) : new Date();
          const newDue = new Date(currentDue.getTime() + 7 * 86400000);
          const newDueStr = newDue.toISOString().split('T')[0];
          return {
            ...loan,
            dueDate: newDueStr,
            daysRemaining: Math.max(7, (loan.daysRemaining || 0) + 7),
            status: "active",
            renewalsLeft: Math.max(0, (loan.renewalsLeft !== undefined ? loan.renewalsLeft : 1) - 1)
          };
        }
        return loan;
      })
    );
    showToast("Loan successfully renewed (+7 days extended)!");
  };

  // Report Lost Book Flow
  const handleReportLost = (loan) => {
    setLoans((prev) =>
      prev.map((l) =>
        l.loanId === loan.loanId ? { ...l, status: "replacement_pending" } : l
      )
    );
    setStudent((prev) => ({
      ...prev,
      clearanceStatus: "HOLD_REPLACEMENT",
      standing: "REPLACEMENT PENDING"
    }));
    showToast("Reported as lost. Please surrender exact physical replacement copy.");
  };

  // Staff Action: Fulfill Reservation
  const handleFulfillReservation = (resId) => {
    setReservations((prev) => prev.filter((r) => r.reservationId !== resId));
    showToast(`Reservation ${resId} fulfilled and checked out to student!`);
  };

  // Staff Action: Clear Student Hold
  const handleClearStudentHold = (studentId) => {
    setStudent((prev) => ({
      ...prev,
      clearanceStatus: "CLEARED",
      standing: "CLEARED"
    }));
    showToast(`Student ${studentId} cleared of all holding blocks!`);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: "#090D16",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            background: "#106A2E",
            color: "#FFFFFF",
            padding: "10px 18px",
            borderRadius: 14,
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "90%",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <CheckCircle2 size={16} color="#F4D35E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          NATIVE MOBILE CONTAINER (Full width on phones, cleanly centered on desktop)
          ========================================================================= */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100%",
          maxHeight: "100dvh",
          background: role === "STAFF_ROLE" ? TOKENS.canvasDark : TOKENS.canvasLight,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 0 50px rgba(0, 0, 0, 0.6)",
          transition: "background 0.3s ease",
          overflow: "hidden",
        }}
      >
        {/* Offline Status Pill */}
        {!isOnline && (
          <div
            style={{
              background: "#FEF3C7",
              borderBottom: "1px solid #FDE68A",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "#92400E",
              fontSize: 11,
              fontWeight: 700,
              zIndex: 30,
            }}
          >
            <WifiOff size={13} />
            <span>Offline Mode Active • Cached OPAC & Student Pass</span>
          </div>
        )}

        {/* =========================================================================
            SCREEN ROUTER
            ========================================================================= */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {!isAuthenticated ? (
            <AuthScreen
              onLoginSuccess={(stud, isNewAccount) => {
                if (stud) {
                  setStudent({
                    id: stud.id || "2026-0001",
                    name: stud.name || "Juan Dela Cruz",
                    email: stud.email || "juan.delacruz@cdm.edu.ph",
                    institute: stud.institute || "ICS",
                    program: stud.program || "BSIT",
                    year: stud.year || "3rd Year",
                    clearanceStatus: "CLEARED",
                    activeLoansCount: 0,
                    pendingReservationsCount: 0,
                    fineBalance: 0
                  });
                }
                // Fresh start: Clear any existing loans & reservations
                setLoans([]);
                setReservations([]);
                setIsAuthenticated(true);
                showToast(`Welcome, ${stud?.name || "Juan"}! Fresh account ready (0 loans).`);
              }}
              onOpenStaffPin={() => setIsPinModalOpen(true)}
            />
          ) : role === "STAFF_ROLE" ? (
            <StaffMonitorView
              activeTab={activeTab}
              onExitStaff={() => {
                setRole("STUDENT_ROLE");
                setActiveTab("home");
                showToast("Switched back to Student Portal");
              }}
              books={books}
              loans={loans}
              reservations={reservations}
              onFulfillReservation={handleFulfillReservation}
              onClearStudentHold={handleClearStudentHold}
            />
          ) : (
            <>
              {activeTab === "home" && (
                <StudentHomeScreen
                  student={student}
                  loans={loans}
                  reservations={reservations}
                  recommendedBooks={recommendedBooks}
                  allBooks={books}
                  unreadNotifCount={unreadNotifCount}
                  isInstalled={isInstalled}
                  isOnline={isOnline}
                  onInstallApp={handleInstallApp}
                  onOpenNotif={() => setIsNotifOpen(true)}
                  onOpenPass={() => setIsPassExpanded(true)}
                  onOpenAccount={() => setActiveTab("account")}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSwitchToStaff={() => setIsPinModalOpen(true)}
                />
              )}

              {activeTab === "catalog" && (
                <CatalogScreen
                  books={filteredBooks}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedInstitute={selectedInstitute}
                  setSelectedInstitute={setSelectedInstitute}
                  selectedProgram={selectedProgram}
                  setSelectedProgram={setSelectedProgram}
                  filterAvailableOnly={filterAvailableOnly}
                  setFilterAvailableOnly={setFilterAvailableOnly}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onOpenScanner={() => setIsScannerOpen(true)}
                />
              )}

              {activeTab === "loans" && (
                <LoansAndPolicyScreen
                  loans={loans}
                  reservations={reservations}
                  student={student}
                  subTab={loansSubTab}
                  setSubTab={setLoansSubTab}
                  onRenewLoan={handleRenewLoan}
                  onReportLost={handleReportLost}
                  onCancelReservation={handleCancelReservation}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onExploreCatalog={() => setActiveTab("catalog")}
                />
              )}

              {activeTab === "pass" && (
                <StudentPassScreen
                  student={student}
                  onExpand={() => setIsPassExpanded(true)}
                />
              )}

              {activeTab === "account" && (
                <AccountScreen
                  student={student}
                  isInstalled={isInstalled}
                  isIOS={isIOS}
                  onInstallApp={handleInstallApp}
                  onBack={() => setActiveTab("home")}
                  onInitiateSignOut={() => setShowSignOutConfirm(true)}
                />
              )}
            </>
          )}
        </div>

        {/* =========================================================================
            BOTTOM NAVIGATION BAR (STUDENT vs STAFF)
            ========================================================================= */}
        {isAuthenticated && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              flexShrink: 0,
              background: role === "STAFF_ROLE" ? "#0F172A" : "#FFFFFF",
              borderTop: `1px solid ${role === "STAFF_ROLE" ? TOKENS.borderDark : TOKENS.borderLight}`,
              padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 12px))",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              zIndex: 50,
              boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
            }}
          >
            {role === "STUDENT_ROLE" ? (
              <>
                <NavButton
                  icon={<Home size={20} />}
                  label="Home"
                  active={activeTab === "home"}
                  onClick={() => setActiveTab("home")}
                />
                <NavButton
                  icon={<Search size={20} />}
                  label="Catalog"
                  active={activeTab === "catalog"}
                  onClick={() => setActiveTab("catalog")}
                />
                <NavButton
                  icon={<BookMarked size={20} />}
                  label="My Loans"
                  badge={loans.length}
                  active={activeTab === "loans"}
                  onClick={() => setActiveTab("loans")}
                />
                <NavButton
                  icon={<QrCode size={20} />}
                  label="Digital Pass"
                  active={activeTab === "pass"}
                  onClick={() => setActiveTab("pass")}
                />
              </>
            ) : (
              <>
                <NavButton
                  icon={<Activity size={20} />}
                  label="HUD Stats"
                  dark
                  active={activeTab === "telemetry"}
                  onClick={() => setActiveTab("telemetry")}
                />
                <NavButton
                  icon={<Search size={20} />}
                  label="Quick Lookup"
                  dark
                  active={activeTab === "lookup"}
                  onClick={() => setActiveTab("lookup")}
                />
                <NavButton
                  icon={<Layers size={20} />}
                  label="Pickup Queue"
                  badge={reservations.length}
                  dark
                  active={activeTab === "queue"}
                  onClick={() => setActiveTab("queue")}
                />
                <NavButton
                  icon={<ShieldCheck size={20} />}
                  label="Exit Staff"
                  dark
                  active={false}
                  onClick={() => {
                    setRole("STUDENT_ROLE");
                    setActiveTab("home");
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            MODALS
            ========================================================================= */}
        {isNotifOpen && (
          <NotificationsModal
            notifications={notifications}
            onClose={() => setIsNotifOpen(false)}
            onMarkAllRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
              showToast("All notifications marked as read");
            }}
            onClearNotif={(id) => {
              setNotifications((prev) => prev.filter((n) => n.id !== id));
            }}
            onSelectNotif={(n) => {
              setIsNotifOpen(false);
              if (n.actionTab) setActiveTab(n.actionTab);
            }}
          />
        )}

        {isScannerOpen && (
          <BarcodeScannerModal
            onClose={() => setIsScannerOpen(false)}
            onScan={(code) => {
              setIsScannerOpen(false);
              if (code.includes("ACCESSION") || code.startsWith("202")) {
                setActiveTab("pass");
                showToast(`Accession QR Verified: ${student.id} (${student.name})`);
              } else {
                setSearchQuery(code);
                showToast(`Scanned Barcode: ${code}`);
              }
            }}
          />
        )}

        {selectedBook && (
          <BookDetailModal
            book={selectedBook}
            onClose={() => setSelectedBook(null)}
            onReserve={() => handleReserveBook(selectedBook)}
            onOpenReader={(b) => {
              setSelectedBook(null);
              setReadingBook(b);
            }}
          />
        )}

        {readingBook && (
          <BookReaderModal
            book={readingBook}
            onClose={() => setReadingBook(null)}
            onReserve={() => {
              handleReserveBook(readingBook);
              setReadingBook(null);
            }}
          />
        )}

        {isPassExpanded && (
          <FullScreenPassModal
            student={student}
            onClose={() => setIsPassExpanded(false)}
          />
        )}

        {isPinModalOpen && (
          <StaffPinModal
            pinInput={pinInput}
            pinError={pinError}
            onDigitPress={handlePinSubmit}
            onDelete={() => setPinInput((prev) => prev.slice(0, -1))}
            onClose={() => {
              setIsPinModalOpen(false);
              setPinInput("");
              setPinError("");
            }}
          />
        )}

        {showInstallModal && (
          <InstallPwaModal
            isIOS={isIOS}
            hasDirectInstall={Boolean(installPrompt)}
            onDirectInstall={handleInstallApp}
            onClose={() => setShowInstallModal(false)}
          />
        )}

        {showSignOutConfirm && (
          <SignOutConfirmModal
            onConfirm={() => {
              setShowSignOutConfirm(false);
              setIsAuthenticated(false);
              setActiveTab("home");
              showToast("Signed out successfully from CDM OneLib.");
            }}
            onCancel={() => setShowSignOutConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: SCREEN 1 - DUAL MODE AUTH & REGISTRATION
// ============================================================================
function AuthScreen({ onLoginSuccess, onOpenStaffPin }) {
  const [authTab, setAuthTab] = useState("login");
  const [studentId, setStudentId] = useState("2026-0001");
  const [email, setEmail] = useState("juan.delacruz@cdm.edu.ph");
  const [password, setPassword] = useState("student123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regStudentId, setRegStudentId] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regInstitute, setRegInstitute] = useState("ICS");
  const [regProgram, setRegProgram] = useState("BSIT");
  const [regYear, setRegYear] = useState("3rd Year");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const handleStudentLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/auth/student-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, email, password }),
    })
      .then((res) => (res.ok ? res.json() : res.json().then(data => Promise.reject(data))))
      .then((data) => {
        setLoading(false);
        if (data && data.student) {
          onLoginSuccess(data.student, false);
        } else {
          onLoginSuccess({
            id: studentId || "2026-0001",
            name: "Juan Dela Cruz",
            email: email || "juan.delacruz@cdm.edu.ph",
            institute: "ICS",
            program: "BSIT",
            year: "3rd Year",
          }, false);
        }
      })
      .catch((err) => {
        setLoading(false);
        if (err && err.error) {
          setError(err.error);
        } else {
          // Offline fallback login
          onLoginSuccess({
            id: studentId || "2026-0001",
            name: "Juan Dela Cruz",
            email: email || "juan.delacruz@cdm.edu.ph",
            institute: "ICS",
            program: "BSIT",
            year: "3rd Year",
          }, false);
        }
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError("");

    if (!regFirstName || !regLastName || !regStudentId) {
      setError("Please fill in all required registration fields.");
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    const emailToUse = regEmail || `${regFirstName.toLowerCase().replace(/\s+/g, '')}.${regLastName.toLowerCase().replace(/\s+/g, '')}@cdm.edu.ph`;

    fetch(`${API_BASE}/auth/student-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: regStudentId,
        first_name: regFirstName,
        last_name: regLastName,
        email: emailToUse,
        institute: regInstitute,
        program: regProgram,
        year_level: regYear,
        password: regPassword
      }),
    })
      .then((res) => (res.ok ? res.json() : res.json().then(data => Promise.reject(data))))
      .then((data) => {
        setLoading(false);
        onLoginSuccess({
          id: regStudentId,
          name: `${regFirstName} ${regLastName}`,
          email: emailToUse,
          institute: regInstitute,
          program: regProgram,
          year: regYear,
        }, true);
      })
      .catch((err) => {
        setLoading(false);
        if (err && err.error) {
          setError(err.error);
        } else {
          // Offline fallback
          onLoginSuccess({
            id: regStudentId,
            name: `${regFirstName} ${regLastName}`,
            email: emailToUse,
            institute: regInstitute,
            program: regProgram,
            year: regYear,
          }, true);
        }
      });
  };

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{ textAlign: "center", margin: "20px 0 16px" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 25px -5px rgba(16, 106, 46, 0.4)",
            border: `2px solid ${TOKENS.accentGold}`,
          }}
        >
          <Building2 size={36} color="#FFFFFF" />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "12px 0 2px" }}>
          CDM Library Portal
        </h1>
        <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
          Colegio de Montalban • Integrated LMS
        </p>
      </div>

      <div
        style={{
          display: "flex",
          background: "#E2E8F0",
          borderRadius: 14,
          padding: 4,
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setAuthTab("login");
            setError("");
          }}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 10,
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            background: authTab === "login" ? "#FFFFFF" : "transparent",
            color: authTab === "login" ? TOKENS.primary : "#64748B",
            cursor: "pointer",
          }}
        >
          Student Access
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthTab("register");
            setError("");
          }}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 10,
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            background: authTab === "register" ? "#FFFFFF" : "transparent",
            color: authTab === "register" ? TOKENS.primary : "#64748B",
            cursor: "pointer",
          }}
        >
          New Student
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#B91C1C",
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 12,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {authTab === "login" ? (
        <form onSubmit={handleStudentLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              STUDENT ID (e.g. 2026-0001)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="2026-XXXX"
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 38px",
                  borderRadius: 12,
                  border: "1px solid #CBD5E1",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <User size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 14 }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              CDM STUDENT EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@cdm.edu.ph"
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 38px",
                  borderRadius: 12,
                  border: "1px solid #CBD5E1",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Mail size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 14 }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              PORTAL PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 38px",
                  borderRadius: 12,
                  border: "1px solid #CBD5E1",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Lock size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 14 }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 14,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94A3B8",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 20px -4px rgba(16, 106, 46, 0.4)",
              minHeight: 44,
            }}
          >
            {loading ? "Authenticating..." : "Sign In to Library Companion"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>FIRST NAME</label>
              <input
                type="text"
                required
                value={regFirstName}
                onChange={(e) => setRegFirstName(e.target.value)}
                placeholder="Juan"
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>LAST NAME</label>
              <input
                type="text"
                required
                value={regLastName}
                onChange={(e) => setRegLastName(e.target.value)}
                placeholder="Dela Cruz"
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>STUDENT ID</label>
            <input
              type="text"
              required
              value={regStudentId}
              onChange={(e) => setRegStudentId(e.target.value)}
              placeholder="2026-0123"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>CDM STUDENT EMAIL (OPTIONAL)</label>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="juan.delacruz@cdm.edu.ph"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>ACADEMIC INSTITUTE</label>
            <select
              value={regInstitute}
              onChange={(e) => {
                setRegInstitute(e.target.value);
                if (e.target.value === "ICS") setRegProgram("BSIT");
                else if (e.target.value === "ITE") setRegProgram("BSED");
                else if (e.target.value === "IBE") setRegProgram("BSBA");
              }}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
            >
              <option value="ICS">Institute of Computer Studies (ICS)</option>
              <option value="ITE">Institute of Teacher Education (ITE)</option>
              <option value="IBE">Institute of Business & Entrep (IBE)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>PROGRAM</label>
              <select
                value={regProgram}
                onChange={(e) => setRegProgram(e.target.value)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
              >
                {regInstitute === "ICS" && (
                  <>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCPE">BSCPE</option>
                  </>
                )}
                {regInstitute === "ITE" && (
                  <>
                    <option value="BEED GEN">BEED GEN</option>
                    <option value="BTLED">BTLED</option>
                    <option value="BECED">BECED</option>
                    <option value="BSED">BSED</option>
                  </>
                )}
                {regInstitute === "IBE" && (
                  <>
                    <option value="BSBA">BSBA</option>
                    <option value="BS ENTREP">BS ENTREP</option>
                  </>
                )}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>YEAR LEVEL</label>
              <select
                value={regYear}
                onChange={(e) => setRegYear(e.target.value)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>CREATE PASSWORD (MIN 6 CHARS)</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showRegPassword ? "text" : "password"}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "9px 30px 9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  style={{ position: "absolute", right: 8, top: 10, background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 0 }}
                >
                  {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>CONFIRM PASSWORD</label>
              <input
                type={showRegPassword ? "text" : "password"}
                required
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              padding: "13px 0",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(16, 106, 46, 0.25)"
            }}
          >
            {loading ? "Creating Student Account..." : "Create Account & Complete Enrollment"}
          </button>
        </form>
      )}

      <div style={{ marginTop: "auto", paddingTop: 16, textAlign: "center" }}>
        <button
          type="button"
          onClick={onOpenStaffPin}
          style={{
            background: "none",
            border: "1px dashed #CBD5E1",
            borderRadius: 12,
            padding: "8px 16px",
            fontSize: 11,
            color: "#64748B",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <Fingerprint size={14} color={TOKENS.primary} />
          <span>Librarian / Staff Telemetry Terminal (PIN)</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: SCREEN 2 - STUDENT HOME & DYNAMIC DASHBOARD
// ============================================================================
function StudentHomeScreen({
  student,
  loans,
  reservations,
  recommendedBooks,
  allBooks = [],
  unreadNotifCount,
  isInstalled,
  isOnline,
  onInstallApp,
  onOpenNotif,
  onOpenPass,
  onOpenAccount,
  onSelectBook,
  onNavigate,
  onSwitchToStaff
}) {
  const [showcaseFilter, setShowcaseFilter] = useState("ALL");
  const [showcaseSearch, setShowcaseSearch] = useState("");

  const displayBooksList = allBooks && allBooks.length > 0 ? allBooks : recommendedBooks;

  const showcaseBooks = useMemo(() => {
    return displayBooksList.filter((b) => {
      const bInst = b.institute || (b.category && b.category.includes("ICS") ? "ICS" : b.category && b.category.includes("ITE") ? "ITE" : b.category && b.category.includes("IBE") ? "IBE" : "ALL");
      const matchesInst = showcaseFilter === "ALL" || bInst === showcaseFilter || (b.category && b.category.includes(showcaseFilter));
      const matchesQuery = !showcaseSearch || b.title.toLowerCase().includes(showcaseSearch.toLowerCase()) || b.author.toLowerCase().includes(showcaseSearch.toLowerCase()) || (b.isbn && b.isbn.includes(showcaseSearch)) || (b.yearLevel && b.yearLevel.toLowerCase().includes(showcaseSearch.toLowerCase()));
      return matchesInst && matchesQuery;
    });
  }, [displayBooksList, showcaseFilter, showcaseSearch]);

  return (
    <div style={{ padding: "16px 18px 24px" }}>
      {/* Top App Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div
          onClick={onOpenAccount}
          title="Open Account & Settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            padding: "4px 8px 4px 4px",
            borderRadius: 16,
            transition: "background 0.15s ease",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: `2px solid ${TOKENS.accentGold}`,
              background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.accentGoldDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 16,
              boxShadow: "0 4px 12px rgba(16,106,46,0.2)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {student.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#0F172A" }}>
                Hello, {student.name.split(" ")[0]}!
              </h2>
              <ChevronRight size={14} color="#94A3B8" />
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TOKENS.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <GraduationCap size={13} />
              <span>
                {student.institute} • {student.program} {student.year}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isInstalled && (
            <button
              type="button"
              onClick={onInstallApp}
              title="Install App to Home Screen"
              style={{
                height: 38,
                padding: "0 10px",
                borderRadius: 12,
                border: "1px solid #A7F3D0",
                background: "#ECFDF5",
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: TOKENS.primary,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(4,120,87,0.12)",
              }}
            >
              <Smartphone size={15} />
              <span>Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToStaff}
            title="Librarian Desk Terminal"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            <ShieldCheck size={18} />
          </button>

          <button
            type="button"
            onClick={onOpenNotif}
            title="Notifications"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            <Bell size={18} />
            {unreadNotifCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "#DC2626",
                  color: "#FFFFFF",
                  fontSize: 9,
                  fontWeight: 800,
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadNotifCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modern Virtual Card Widget */}
      <div
        onClick={onOpenPass}
        style={{
          background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
          borderRadius: 22,
          padding: "16px 18px",
          color: "#FFFFFF",
          boxShadow: "0 10px 25px rgba(16, 106, 46, 0.25)",
          marginBottom: 16,
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(244, 211, 94, 0.3)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.06)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: 1,
                opacity: 0.85,
                textTransform: "uppercase",
                background: "rgba(255,255,255,0.2)",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              CDM Virtual Pass
            </span>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: "6px 0 2px", color: "#FFFFFF" }}>
              {student.name}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.9, fontFamily: "monospace" }}>
              ID: {student.id}
            </p>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              padding: 5,
              borderRadius: 10,
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DigitalQRCode value={`CDM-ACCESSION:${student.id}:${student.name}:${student.program || 'BSIT'}:${student.clearanceStatus || 'CLEARED'}`} size={46} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10.5,
            fontWeight: 700,
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            paddingTop: 10,
            marginTop: 4,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,0.18)",
              padding: "3px 8px",
              borderRadius: 999,
              color: student.clearanceStatus === "CLEARED" ? "#86EFAC" : "#FDE047",
            }}
          >
            {student.clearanceStatus === "CLEARED" ? (
              <CheckCircle2 size={13} />
            ) : (
              <AlertCircle size={13} />
            )}
            {student.clearanceStatus === "CLEARED" ? "CLEAR TO BORROW" : "OVERDUE HOLD"}
          </span>
          <span style={{ opacity: 0.8, display: "flex", alignItems: "center", gap: 2 }}>
            Tap to expand <Maximize2 size={11} />
          </span>
        </div>
      </div>

      {/* Horizontal Metric Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <MetricCard
          label="Active Loans"
          value={`${loans.length} Books`}
          highlight={loans.length > 0}
          onClick={() => onNavigate("loans")}
        />
        <MetricCard
          label="Ready Pickup"
          value={`${reservations.length} Ready`}
          color={reservations.length > 0 ? TOKENS.primary : "#64748B"}
          onClick={() => onNavigate("loans")}
        />
        <MetricCard
          label="Clearance"
          value={student.clearanceStatus === "CLEARED" ? "CLEARED" : "HOLD"}
          color={student.clearanceStatus === "CLEARED" ? TOKENS.primary : "#EF4444"}
          warning={student.clearanceStatus !== "CLEARED"}
          onClick={() => onNavigate("loans")}
        />
      </div>

      {/* Program Recommendation Carousel */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
            Recommended for {student.program} {student.year}
          </h4>
          <button
            type="button"
            onClick={() => onNavigate("catalog")}
            style={{
              background: "none",
              border: "none",
              fontSize: 11.5,
              fontWeight: 600,
              color: TOKENS.primary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            See All <ChevronRight size={14} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 6,
            scrollSnapType: "x mandatory",
          }}
        >
          {recommendedBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => onSelectBook(book)}
              style={{
                minWidth: 145,
                maxWidth: 155,
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 10,
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                cursor: "pointer",
                scrollSnapAlign: "start",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  style={{
                    width: "100%",
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: TOKENS.primary,
                    background: TOKENS.primaryGlass,
                    padding: "2px 6px",
                    borderRadius: 6,
                  }}
                >
                  {book.institute || "ICS"} • {book.yearLevel || "3rd Year"}
                </span>
                <h5
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    margin: "4px 0 2px",
                    color: "#0F172A",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {book.title}
                </h5>
                <p style={{ margin: 0, fontSize: 9.5, color: "#64748B" }}>{book.author}</p>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 10,
                }}
              >
                <span style={{ color: book.availableCopies > 0 ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                  {book.availableCopies > 0 ? `${book.availableCopies} left` : "Reserved"}
                </span>
                <span
                  style={{
                    background: TOKENS.primary,
                    color: "#FFFFFF",
                    borderRadius: 6,
                    padding: "3px 6px",
                    fontWeight: 600,
                  }}
                >
                  View
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Front Dashboard Academic Book Catalog Showcase */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
              Explore Book Catalog
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>
              {showcaseBooks.length} curated academic textbooks available
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("catalog")}
            style={{
              background: TOKENS.primaryGlass,
              color: TOKENS.primary,
              border: `1px solid ${TOKENS.primary}`,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Full OPAC
          </button>
        </div>

        {/* Dashboard Quick Search Bar */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search
            size={16}
            color="#94A3B8"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            value={showcaseSearch}
            onChange={(e) => setShowcaseSearch(e.target.value)}
            placeholder="Search titles, authors, call numbers..."
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              borderRadius: 14,
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {showcaseSearch && (
            <button
              onClick={() => setShowcaseSearch("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Institute Filter Pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 8 }}>
          {[
            { id: "ALL", label: "All Institutes (48)" },
            { id: "ICS", label: "ICS · Tech & Eng (16)" },
            { id: "ITE", label: "ITE · Education (16)" },
            { id: "IBE", label: "IBE · Business (16)" },
          ].map((tab) => {
            const active = showcaseFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setShowcaseFilter(tab.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: active ? `1px solid ${TOKENS.primary}` : "1px solid #E2E8F0",
                  background: active ? TOKENS.primary : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#64748B",
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  boxShadow: active ? "0 2px 6px rgba(16,106,46,0.2)" : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 2-Column Responsive Book Cards Showcase Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {showcaseBooks.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelectBook(b)}
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 10,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <img
                    src={b.coverUrl}
                    alt={b.title}
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      background: "#F1F5F9",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: 6,
                      background: "rgba(15, 23, 42, 0.85)",
                      backdropFilter: "blur(4px)",
                      color: "#FFFFFF",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 6,
                    }}
                  >
                    {b.institute} • {b.yearLevel || "1st Year"}
                  </span>
                </div>

                <div style={{ fontSize: 9.5, fontWeight: 700, color: TOKENS.primary, marginBottom: 2 }}>
                  {b.callNo || `Stack ${b.institute || "ICS"}`}
                </div>

                <h5
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0F172A",
                    margin: "0 0 3px",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {b.title}
                </h5>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {b.author}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #F1F5F9",
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: b.availableCopies > 0 ? "#16A34A" : "#DC2626",
                  }}
                >
                  {b.availableCopies > 0 ? `${b.availableCopies} available` : "Checked Out"}
                </span>
                <span
                  style={{
                    background: TOKENS.primary,
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  Details
                </span>
              </div>
            </div>
          ))}
        </div>

        {showcaseBooks.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#64748B", fontSize: 12 }}>
            No books found matching &quot;{showcaseSearch}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight, warning, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        padding: "12px 10px",
        border: "1px solid #E2E8F0",
        textAlign: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: warning ? "#D97706" : color || (highlight ? TOKENS.primary : "#0F172A"),
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// COMPONENT: SCREEN 3 - OPAC CATALOG SEARCH & FILTER
// ============================================================================
function CatalogScreen({
  books,
  searchQuery,
  setSearchQuery,
  selectedInstitute,
  setSelectedInstitute,
  selectedProgram,
  setSelectedProgram,
  filterAvailableOnly,
  setFilterAvailableOnly,
  onSelectBook,
  onOpenScanner
}) {
  return (
    <div style={{ padding: "16px 18px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0 }}>
          OPAC Book Catalog
        </h2>
        <button
          type="button"
          onClick={onOpenScanner}
          style={{
            background: TOKENS.primaryGlass,
            color: TOKENS.primary,
            border: `1px solid ${TOKENS.primary}`,
            borderRadius: 10,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Camera size={14} /> Scan Barcode
        </button>
      </div>

      {/* Omni-Search Bar */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Title, Author, Call #, ISBN..."
          style={{
            width: "100%",
            padding: "12px 38px 12px 38px",
            borderRadius: 14,
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        />
        <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 14 }} />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              background: "none",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Chips: Institutes */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 6,
          marginBottom: 10,
        }}
      >
        {INSTITUTES.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => setSelectedInstitute(inst.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              background: selectedInstitute === inst.id ? TOKENS.primary : "#FFFFFF",
              color: selectedInstitute === inst.id ? "#FFFFFF" : "#64748B",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer",
            }}
          >
            {inst.short}
          </button>
        ))}
      </div>

      {/* Program Selector & Availability Toggle */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            fontSize: 11,
            color: "#334155",
            outline: "none",
          }}
        >
          {PROGRAMS_FILTER.map((prog) => (
            <option key={prog.code} value={prog.code}>
              {prog.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFilterAvailableOnly(!filterAvailableOnly)}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${filterAvailableOnly ? TOKENS.primary : "#CBD5E1"}`,
            background: filterAvailableOnly ? TOKENS.primaryGlass : "#FFFFFF",
            color: filterAvailableOnly ? TOKENS.primary : "#64748B",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {filterAvailableOnly ? "✓ Available Only" : "All Stacks"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10, fontWeight: 500 }}>
        Showing <strong>{books.length}</strong> cataloged titles
      </div>

      {/* Book List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => onSelectBook(book)}
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 12,
              border: "1px solid #E2E8F0",
              display: "flex",
              gap: 12,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <img
              src={book.coverUrl}
              alt={book.title}
              style={{
                width: 60,
                height: 85,
                objectFit: "cover",
                borderRadius: 8,
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: "#0F172A", lineHeight: 1.3 }}>
                    {book.title}
                  </h4>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: book.availableCopies > 0 ? "#DCFCE7" : "#FEE2E2",
                      color: book.availableCopies > 0 ? "#15803D" : "#B91C1C",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {book.availableCopies > 0 ? `${book.availableCopies}/${book.totalCopies} Available` : "Reserved"}
                  </span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "#64748B" }}>{book.author}</p>
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10 }}>
                <span style={{ background: "#F1F5F9", color: "#475569", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                  DDC {book.ddc}
                </span>
                <span style={{ background: "#F1F5F9", color: "#475569", padding: "2px 6px", borderRadius: 4 }}>
                  {book.shelfLocation}
                </span>
                <span style={{ marginLeft: "auto", color: TOKENS.primary, fontWeight: 700 }}>
                  Reserve &rarr;
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: SCREEN 4 - BOOK DETAIL & 1-TAP RESERVATION MODAL
// ============================================================================
function BookDetailModal({ book, onClose, onReserve, onOpenReader }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: "85%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 40, height: 4, background: "#CBD5E1", borderRadius: 999 }} />
        </div>

        <div style={{ padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TOKENS.primary }}>
            BIBLIOGRAPHIC RECORD
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#F1F5F9",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "10px 20px 20px", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <img
              src={book.coverUrl}
              alt={book.title}
              style={{
                width: 90,
                height: 125,
                objectFit: "cover",
                borderRadius: 12,
                boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
                flexShrink: 0,
              }}
            />
            <div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: TOKENS.primaryGlass,
                  color: TOKENS.primary,
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {book.category} • {book.program}
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "6px 0 2px", color: "#0F172A", lineHeight: 1.3 }}>
                {book.title}
              </h3>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748B" }}>{book.author}</p>
              <div style={{ fontSize: 11, color: "#475569" }}>
                <div><strong>ISBN:</strong> {book.isbn}</div>
                <div><strong>Publisher:</strong> {book.publisher} ({book.year})</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 14,
              padding: "12px 14px",
              border: "1px solid #E2E8F0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{ fontSize: 10, color: "#64748B", display: "block" }}>SHELF AISLE</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{book.shelfLocation}</span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: "#64748B", display: "block" }}>DEWEY DECIMAL</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: TOKENS.primary }}>{book.ddc}</span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <h5 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 4px", color: "#0F172A" }}>
              Catalog Synopsis
            </h5>
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {book.synopsis}
            </p>
          </div>

          <div
            style={{
              background: "#FEF3C7",
              border: "1px solid #FCD34D",
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "#92400E",
              marginBottom: 16,
            }}
          >
            <Clock size={16} color="#D97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Reservation Rule:</strong> Holds expire in <strong>48 hours</strong>. Present your Digital Pass at the counter.
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (onOpenReader) onOpenReader(book);
              }}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                border: "1px solid #106A2E",
                background: "rgba(16, 106, 46, 0.08)",
                color: "#106A2E",
                fontSize: 12.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(16,106,46,0.1)",
              }}
            >
              <BookOpen size={16} />
              <span>Read Sample Chapter & PDF Excerpt</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onReserve}
            disabled={book.availableCopies <= 0}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: book.availableCopies > 0
                ? `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`
                : "#94A3B8",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: book.availableCopies > 0 ? "pointer" : "not-allowed",
              boxShadow: "0 6px 18px rgba(16,106,46,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 44,
            }}
          >
            {book.availableCopies > 0 ? (
              <>
                <BookmarkPlus size={18} />
                <span>Reserve for Pickup</span>
              </>
            ) : (
              <span>All Copies Currently Borrowed</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
function LoansAndPolicyScreen({ loans, reservations, student, subTab, setSubTab, onRenewLoan, onReportLost, onCancelReservation, onSelectBook, onExploreCatalog }) {
  const [localTab, setLocalTab] = useState("active");
  const tab = subTab || localTab;
  const changeTab = setSubTab || setLocalTab;

  return (
    <div style={{ padding: "16px 18px 24px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 12px" }}>
        My Borrowing Account
      </h2>

      <div
        style={{
          display: "flex",
          background: "#E2E8F0",
          borderRadius: 12,
          padding: 3,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => changeTab("active")}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 10,
            border: "none",
            fontSize: 11,
            fontWeight: 600,
            background: tab === "active" ? "#FFFFFF" : "transparent",
            color: tab === "active" ? TOKENS.primary : "#64748B",
            cursor: "pointer",
          }}
        >
          Active Loans ({loans.length})
        </button>
        <button
          type="button"
          onClick={() => changeTab("reservations")}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 10,
            border: "none",
            fontSize: 11,
            fontWeight: 600,
            background: tab === "reservations" ? "#FFFFFF" : "transparent",
            color: tab === "reservations" ? TOKENS.primary : "#64748B",
            cursor: "pointer",
          }}
        >
          Queue ({reservations.length})
        </button>
        <button
          type="button"
          onClick={() => changeTab("policy")}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 10,
            border: "none",
            fontSize: 11,
            fontWeight: 600,
            background: tab === "policy" ? "#FFFFFF" : "transparent",
            color: tab === "policy" ? TOKENS.primary : "#64748B",
            cursor: "pointer",
          }}
        >
          Policy
        </button>
      </div>

      {tab === "active" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loans.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: "36px 20px",
                textAlign: "center",
                border: "1px dashed #CBD5E1",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background: TOKENS.primaryGlass,
                  color: TOKENS.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <BookOpen size={28} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px", color: "#0F172A" }}>
                No Active Loans
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748B" }}>
                You have 0 books borrowed. Your account is 100% clear and in good standing!
              </p>
              <button
                type="button"
                onClick={onExploreCatalog}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: TOKENS.primary,
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Search size={14} /> Browse OPAC Catalog
              </button>
            </div>
          ) : (
            loans.map((loan) => (
              <div
                key={loan.loanId}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: 14,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  <img
                    src={loan.bookCover}
                    alt={loan.bookTitle}
                    style={{ width: 50, height: 70, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: "#0F172A" }}>
                      {loan.bookTitle}
                    </h4>
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: "#64748B" }}>{loan.bookAuthor}</p>
                    
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 10, color: "#475569" }}>
                      <span>Borrowed: <strong>{loan.issueDate}</strong></span>
                      <span>Due: <strong>{loan.dueDate}</strong></span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid #F1F5F9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {loan.status === "overdue" ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#DC2626",
                        background: "#FEE2E2",
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      Overdue: 📱 SMS Warning Sent ({loan.daysOverdue || 1}d overdue)
                    </span>
                  ) : loan.status === "replacement_pending" ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#92400E",
                        background: "#FEF3C7",
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      Replacement Pending
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#D97706",
                        background: "#FEF3C7",
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      Due in {loan.daysRemaining} days
                    </span>
                  )}

                  <div style={{ display: "flex", gap: 6 }}>
                    {loan.status !== "overdue" && loan.status !== "replacement_pending" && loan.renewalsLeft > 0 && (
                      <button
                        type="button"
                        onClick={() => onRenewLoan(loan.loanId)}
                        style={{
                          background: TOKENS.primaryGlass,
                          color: TOKENS.primary,
                          border: `1px solid ${TOKENS.primary}`,
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <RotateCcw size={11} /> Renew
                      </button>
                    )}
                    {loan.status !== "replacement_pending" && (
                      <button
                        type="button"
                        onClick={() => onReportLost(loan)}
                        style={{
                          background: "#FEF2F2",
                          color: "#DC2626",
                          border: "1px solid #FCA5A5",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 10.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Report Lost
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "reservations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reservations.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: "36px 20px",
                textAlign: "center",
                border: "1px dashed #CBD5E1",
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  background: TOKENS.primaryGlass,
                  color: TOKENS.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Clock size={24} />
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: "#0F172A" }}>
                No Pending Reservations
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: 11.5, color: "#64748B" }}>
                Your reservation queue is empty. You can reserve academic textbooks directly from the OPAC catalog.
              </p>
              <button
                type="button"
                onClick={onExploreCatalog}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: TOKENS.primary,
                  color: "#FFFFFF",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Explore Books to Reserve
              </button>
            </div>
          ) : (
            reservations.map((res) => {
              const resStatus = (res.status || "pending").toLowerCase();
              const isPending = resStatus === "pending" || resStatus === "ready for pickup";
              const isFulfilled = resStatus === "fulfilled";
              const resId = res.reservationId || res.id || "RES-001";
              const pickupSchedule = res.pickupSchedule || (res.pickupDate ? `Pickup Deadline: ${res.pickupDate} (8:00 AM - 5:00 PM)` : "Pickup: Within 48 Hours");

              return (
                <div
                  key={resId}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 16,
                    padding: 14,
                    border: isPending ? `1.5px solid ${TOKENS.accentGold}` : "1px solid #E2E8F0",
                    boxShadow: isPending ? "0 4px 14px rgba(244,211,94,0.15)" : "0 2px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: isPending ? "#92400E" : isFulfilled ? "#15803D" : "#64748B",
                        background: isPending ? "#FEF3C7" : isFulfilled ? "#DCFCE7" : "#F1F5F9",
                        padding: "3px 8px",
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isPending ? "#D97706" : isFulfilled ? "#16A34A" : "#94A3B8" }} />
                      {isPending ? "SCHEDULED COUNTER PICKUP" : isFulfilled ? "CLAIMED & BORROWED" : (res.status || "STATUS").toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>
                      Code: <strong style={{ color: "#0F172A" }}>{resId}</strong>
                    </span>
                  </div>

                  <h4 style={{ fontSize: 13.5, fontWeight: 800, margin: "0 0 2px", color: "#0F172A", lineHeight: 1.3 }}>
                    {res.bookTitle}
                  </h4>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748B" }}>
                    {res.bookAuthor || "CDM Academic Collection"}
                  </p>

                  {/* Scheduled Pickup Schedule Box */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      borderRadius: 10,
                      padding: "8px 10px",
                      fontSize: 11,
                      color: "#334155",
                      border: "1px solid #E2E8F0",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontWeight: 700, color: TOKENS.primary }}>
                      <Calendar size={13} />
                      <span>{pickupSchedule}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748B", fontSize: 10.5 }}>
                      <Building2 size={13} />
                      <span>{res.counter || "Desk #1 (Circulation Desk, 2nd Flr)"}</span>
                    </div>
                  </div>

                  {isPending && onCancelReservation && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => onCancelReservation(resId)}
                        style={{
                          background: "#FEF2F2",
                          color: "#DC2626",
                          border: "1px solid #FCA5A5",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel Hold
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "policy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 16,
              padding: "14px 16px",
              color: "#991B1B",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              <ShieldAlert size={18} color="#DC2626" />
              <span>CDM Lost & Damaged Book Policy</span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 11.5, lineHeight: 1.5 }}>
              Under official Colegio de Montalban library regulations, students reporting a book as lost or damaged <strong>must surrender an identical physical replacement copy</strong> (matching ISBN & Edition) plus the official administrative processing receipt.
            </p>
            <div style={{ fontSize: 11, background: "rgba(255,255,255,0.7)", padding: 8, borderRadius: 8 }}>
              • Overdue Policy: <strong>Automated SMS Warning Notice (No Daily Cash Fine)</strong>.<br />
              • Missing Books: <strong>Mandatory Identical Physical Replacement Copy</strong>.<br />
              • Maximum loan period: <strong>7 days</strong> for general collection.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT: NOTIFICATIONS MODAL
// ============================================================================
function NotificationsModal({ notifications, onClose, onMarkAllRead, onClearNotif, onSelectNotif }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: "80%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 40, height: 4, background: "#CBD5E1", borderRadius: 999 }} />
        </div>

        <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={18} color={TOKENS.primary} />
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#0F172A" }}>
              Notifications
            </h3>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={onMarkAllRead}
              style={{
                background: "none",
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                color: TOKENS.primary,
                cursor: "pointer",
              }}
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#F1F5F9",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ padding: "8px 20px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94A3B8", fontSize: 13 }}>
              No notifications at this time.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => onSelectNotif(n)}
                style={{
                  background: n.unread ? "#F0FDF4" : "#F8FAFC",
                  border: `1px solid ${n.unread ? "#BBF7D0" : "#E2E8F0"}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: n.type === "overdue" ? "#DC2626" : n.type === "ready" ? TOKENS.primary : "#475569",
                      textTransform: "uppercase",
                    }}
                  >
                    {n.type === "overdue" ? "⚠️ Overdue Alert" : n.type === "ready" ? "📦 Hold Ready" : "📢 Announcement"}
                  </span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{n.time}</span>
                </div>
                <h5 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: "#0F172A" }}>
                  {n.title}
                </h5>
                <p style={{ margin: 0, fontSize: 11.5, color: "#475569", lineHeight: 1.4 }}>
                  {n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: OPTICAL BARCODE SCANNER SIMULATOR
// ============================================================================
function BarcodeScannerModal({ onClose, onScan }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000000",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 20px",
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>OPTICAL BARCODE SCANNER</span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer" }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ textAlign: "center", position: "relative", padding: "40px 0" }}>
        <div
          style={{
            width: 240,
            height: 240,
            margin: "0 auto",
            border: `2px solid ${TOKENS.emeraldLuminous}`,
            borderRadius: 24,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 30px rgba(0, 242, 157, 0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "90%",
              height: 2,
              background: "#EF4444",
              boxShadow: "0 0 10px #EF4444",
            }}
          />
          <ScanLine size={48} color={TOKENS.emeraldLuminous} />
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: "#94A3B8" }}>
          Align book accession barcode or student pass QR inside frame
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#94A3B8", textAlign: "center" }}>SIMULATE HARDWARE SCAN:</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => onScan("Operating Systems")}
            style={{
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: "#1E293B",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Scan Book: OS Linux
          </button>
          <button
            type="button"
            onClick={() => onScan("978-0-262-03384-8")}
            style={{
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: "#1E293B",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Scan ISBN: Algorithms
          </button>
        </div>
        <button
          type="button"
          onClick={() => onScan("2024-1142")}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 10,
            border: "1px solid #106A2E",
            background: "rgba(16, 106, 46, 0.2)",
            color: "#86EFAC",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Scan Student Accession QR (Pass #2024-1142)
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: SCREEN 6 - FULL-SCREEN DIGITAL STUDENT PASS MODAL
// ============================================================================
function FullScreenPassModal({ student, onClose }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#FFFFFF",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 20px calc(24px + env(safe-area-inset-bottom, 12px))",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={24} color={TOKENS.primary} />
          <span style={{ fontSize: 14, fontWeight: 800, color: TOKENS.primary }}>
            COLEGIO DE MONTALBAN
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "#F1F5F9",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: TOKENS.primary,
            background: TOKENS.primaryGlass,
            padding: "4px 12px",
            borderRadius: 999,
          }}
        >
          OFFICIAL ACCESSION PASS
        </span>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "14px 0 4px" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: `2px solid ${TOKENS.accentGold}`,
              background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.accentGoldDark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 16,
              boxShadow: "0 4px 12px rgba(16,106,46,0.2)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {student.name.charAt(0)}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: 0 }}>
            {student.name}
          </h2>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B", fontWeight: 600 }}>
          {student.institute} • {student.program} ({student.year})
        </p>

        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #0F172A",
            borderRadius: 24,
            padding: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          }}
        >
          <DigitalQRCode value={`CDM-ACCESSION:${student.id}:${student.name}:${student.program || 'BSIT'}:${student.clearanceStatus || 'CLEARED'}`} size={190} />
        </div>

        <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
          {student.id}
        </div>
      </div>

      <div
        style={{
          background: "#F8FAFC",
          borderRadius: 14,
          padding: 12,
          textAlign: "center",
          fontSize: 11,
          color: "#64748B",
        }}
      >
        💡 <em>Screen brightness boosted for optical turnstile barcode recognition.</em>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: SCREEN 7 - STAFF / LIBRARIAN MONITOR (READ-ONLY SLATE DARK)
// ============================================================================
function StaffMonitorView({ activeTab, onExitStaff, books, loans, reservations, onFulfillReservation, onClearStudentHold }) {
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  const handleLookup = (e) => {
    e.preventDefault();
    if (lookupId.trim() === "2023-0001" || lookupId.trim().toLowerCase().includes("sample")) {
      setLookupResult({
        name: "Juan Dela Cruz",
        id: "2023-0001",
        institute: "ICS - BSIT (3rd Year)",
        status: "HOLD - OVERDUE",
        loansCount: 2,
        standing: "Overdue Notice Dispatched (No Cash Fine)",
        overdueTitles: ["Introduction to Algorithms (4th Edition)"]
      });
    } else {
      setLookupResult({
        name: lookupId ? `Student (${lookupId})` : "Juan Dela Cruz",
        id: lookupId || "2026-0001",
        institute: "ICS - BSIT (3rd Year)",
        status: "CLEARED",
        loansCount: 0,
        standing: "Pristine Standing · Cleared",
        overdueTitles: []
      });
    }
  };

  return (
    <div style={{ padding: "16px 18px 24px", color: "#F8FAFC" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: TOKENS.emeraldLuminous,
              background: "rgba(0, 242, 157, 0.15)",
              padding: "2px 8px",
              borderRadius: 6,
              letterSpacing: 0.5,
            }}
          >
            ● LIVE TELEMETRY HUD
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "4px 0 0", color: "#FFFFFF" }}>
            Librarian Staff Monitor
          </h2>
        </div>
        <button
          type="button"
          onClick={onExitStaff}
          style={{
            background: "#334155",
            border: "none",
            borderRadius: 10,
            padding: "6px 12px",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <LogOut size={13} /> Exit
        </button>
      </div>

      {activeTab === "telemetry" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <BentoCard
              title="Cataloged Volumes"
              value="105,420"
              subtitle="76 Active Curated Titles"
              color={TOKENS.emeraldLuminous}
            />
            <BentoCard
              title="Active Loans"
              value={loans.length > 0 ? `${loans.length}` : "0"}
              subtitle={loans.length > 0 ? "Under Circulation" : "All Stacks Available"}
              color="#38BDF8"
            />
            <BentoCard
              title="Overdue Alerts"
              value={loans.filter((l) => l.status === "overdue").length > 0 ? "1" : "0"}
              subtitle="Action Required"
              color="#F87171"
              alert={loans.filter((l) => l.status === "overdue").length > 0}
            />
            <BentoCard
              title="Pickup Queue"
              value={`${reservations.length}`}
              subtitle="Pending Circulation"
              color={TOKENS.accentGold}
            />
          </div>

          <div style={{ background: "#1E293B", borderRadius: 16, padding: 14, border: `1px solid ${TOKENS.borderDark}` }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>
              DESK TELEMETRY & CLEARANCE
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
              <div style={{ padding: "8px 10px", background: "rgba(0, 242, 157, 0.1)", borderRadius: 8, color: "#6EE7B7" }}>
                ✓ <strong>System Health:</strong> Express API, SQLite, and WebSockets sync online (Port 5002).
              </div>
              {reservations.length > 0 && (
                <div style={{ padding: "8px 10px", background: "rgba(244,211,94,0.15)", borderRadius: 8, color: "#FDE68A" }}>
                  📦 <strong>Hold Request:</strong> {reservations.length} pending pickup at Circulation Desks.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "lookup" && (
        <div>
          <form onSubmit={handleLookup} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Enter Student ID (e.g. 2026-0001)..."
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#1E293B",
                color: "#FFFFFF",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0 16px",
                borderRadius: 12,
                border: "none",
                background: TOKENS.emeraldLuminous,
                color: "#0F172A",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Verify
            </button>
          </form>

          {lookupResult && (
            <div style={{ background: "#1E293B", borderRadius: 16, padding: 14, border: `1px solid ${TOKENS.borderDark}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{lookupResult.name}</h4>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: lookupResult.status === "CLEARED" ? "#065F46" : "#7F1D1D",
                    color: lookupResult.status === "CLEARED" ? "#6EE7B7" : "#FCA5A5",
                  }}
                >
                  {lookupResult.status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 12 }}>
                <div>ID: {lookupResult.id} • {lookupResult.institute}</div>
                <div style={{ marginTop: 4 }}>Notice Status: <strong style={{ color: lookupResult.status === "CLEARED" ? "#6EE7B7" : "#F87171" }}>{lookupResult.standing}</strong></div>
              </div>

              {lookupResult.status !== "CLEARED" && (
                <button
                  type="button"
                  onClick={() => onClearStudentHold(lookupResult.id)}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 10,
                    border: "none",
                    background: "#065F46",
                    color: "#6EE7B7",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Release Holding Block & Verify Clearance
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "queue" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reservations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94A3B8", fontSize: 12 }}>
              No reservations currently in the pickup queue.
            </div>
          ) : (
            reservations.map((res) => (
              <div
                key={res.reservationId}
                style={{ background: "#1E293B", borderRadius: 14, padding: 12, border: `1px solid ${TOKENS.borderDark}` }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: TOKENS.emeraldLuminous, fontWeight: 700 }}>
                    HOLD #{res.reservationId}
                  </span>
                  <span style={{ fontSize: 10, color: "#FCD34D" }}>{res.expiresAt}</span>
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: "4px 0", color: "#FFFFFF" }}>
                  {res.bookTitle}
                </h4>
                <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94A3B8" }}>
                  Borrower: Juan Dela Cruz • {res.counter}
                </p>
                <button
                  type="button"
                  onClick={() => onFulfillReservation(res.reservationId)}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background: TOKENS.emeraldLuminous,
                    color: "#0F172A",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Fulfill Hold & Issue Physical Copy
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BentoCard({ title, value, subtitle, color, alert }) {
  return (
    <div
      style={{
        background: "#1E293B",
        borderRadius: 18,
        padding: "14px 12px",
        border: `1px solid ${alert ? "rgba(239, 68, 68, 0.4)" : TOKENS.borderDark}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{title}</span>
      <span style={{ fontSize: 20, fontWeight: 900, color: color || "#FFFFFF", margin: "6px 0 2px" }}>
        {value}
      </span>
      <span style={{ fontSize: 9.5, color: "#64748B" }}>{subtitle}</span>
    </div>
  );
}

// ============================================================================
// COMPONENT: STAFF 4-DIGIT PIN AUTHENTICATION MODAL
// ============================================================================
function StaffPinModal({ pinInput, pinError, onDigitPress, onDelete, onClose }) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 28px",
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            background: "rgba(0, 242, 157, 0.15)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Lock size={24} color={TOKENS.emeraldLuminous} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Staff Access Terminal</h3>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "#94A3B8" }}>
          Enter 4-digit librarian clearance passcode (Default: <strong>1234</strong>)
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 12 }}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: pinInput.length > idx ? TOKENS.emeraldLuminous : "#334155",
                boxShadow: pinInput.length > idx ? "0 0 10px rgba(0,242,157,0.5)" : "none",
                transition: "all 0.15s",
              }}
            />
          ))}
        </div>

        {pinError && <div style={{ fontSize: 11, color: "#F87171" }}>{pinError}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 280, margin: "0 auto" }}>
        {digits.map((d, i) => {
          if (d === "") return <div key={i} />;
          if (d === "del") {
            return (
              <button
                key={i}
                type="button"
                onClick={onDelete}
                style={{
                  height: 54,
                  borderRadius: 16,
                  border: "none",
                  background: "#1E293B",
                  color: "#94A3B8",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDigitPress(d)}
              style={{
                height: 54,
                borderRadius: 16,
                border: "none",
                background: "#1E293B",
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: DIGITAL STUDENT PASS TAB (PASS ONLY)
// ============================================================================
function StudentPassScreen({
  student,
  onExpand,
}) {
  return (
    <div style={{ padding: "16px 18px 24px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 16px" }}>
        Digital Library Pass
      </h2>

      {/* Official Identity Pass Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 22,
          padding: "20px 16px",
          border: "1px solid #E2E8F0",
          textAlign: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 22,
            border: `2px solid ${TOKENS.accentGold}`,
            background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
            color: "#FFFFFF",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 8,
            boxShadow: "0 6px 16px rgba(16,106,46,0.25)",
          }}
        >
          {student.name.charAt(0)}
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px", color: "#0F172A" }}>
          {student.name}
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748B" }}>{student.email}</p>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: TOKENS.primary,
            background: TOKENS.primaryGlass,
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          {student.institute} • {student.program} ({student.year})
        </span>

        {/* QR Code Pass Container */}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <div
            onClick={onExpand}
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px dashed #CBD5E1",
              cursor: "pointer",
              display: "inline-block",
              background: "#F8FAFC",
            }}
          >
            <DigitalQRCode value={`CDM-ACCESSION:${student.id}:${student.name}:${student.program || 'BSIT'}:${student.clearanceStatus || 'CLEARED'}`} size={130} />
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, color: TOKENS.primary, marginTop: 8, fontWeight: 700 }}>
              <Maximize2 size={13} /> Tap to expand pass
            </span>
          </div>
        </div>

        <div style={{ marginTop: 14, fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#475569" }}>
          ACCESSION ID: {student.id}
        </div>
      </div>

      {/* Safety / Turnstile Instruction Note */}
      <div
        style={{
          background: "#F8FAFC",
          borderRadius: 16,
          padding: "14px 16px",
          border: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Info size={18} color={TOKENS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontSize: 11.5, color: "#475569", lineHeight: 1.4 }}>
          Present this official optical accession pass when entering library turnstiles or at the circulation counter for borrowing verification.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: DEDICATED ACCOUNT & PROFILE SCREEN
// ============================================================================
function AccountScreen({
  student,
  isInstalled,
  isIOS,
  onInstallApp,
  onBack,
  onInitiateSignOut
}) {
  return (
    <div style={{ padding: "16px 18px 30px" }}>
      {/* Top Navigation Bar with Back Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "8px 14px",
            color: "#0F172A",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
          Account & Profile
        </h2>
        <div style={{ width: 68 }} />
      </div>

      {/* Identity Profile Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 22,
          padding: "20px 18px",
          border: "1px solid #E2E8F0",
          textAlign: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            border: `3px solid ${TOKENS.accentGold}`,
            background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
            color: "#FFFFFF",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 800,
            marginBottom: 10,
            boxShadow: "0 8px 18px rgba(16,106,46,0.25)",
          }}
        >
          {student.name.charAt(0)}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px", color: "#0F172A" }}>
          {student.name}
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#64748B" }}>
          {student.email}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: TOKENS.primary,
              background: TOKENS.primaryGlass,
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {student.institute} • {student.program} ({student.year})
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: student.clearanceStatus === "CLEARED" ? "#15803D" : "#B91C1C",
              background: student.clearanceStatus === "CLEARED" ? "#DCFCE7" : "#FEE2E2",
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {student.clearanceStatus === "CLEARED" ? "✓ Cleared to Borrow" : "⚠ Overdue Hold"}
          </span>
        </div>
      </div>

      {/* Account Institutional Details */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 18,
          border: "1px solid #E2E8F0",
          padding: "14px 16px",
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <h4 style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#94A3B8", margin: "0 0 12px" }}>
          Institutional Credentials
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
            <span style={{ color: "#64748B" }}>Student ID Number</span>
            <span style={{ fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{student.id}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
            <span style={{ color: "#64748B" }}>Institute</span>
            <span style={{ fontWeight: 600, color: "#0F172A" }}>{student.institute}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
            <span style={{ color: "#64748B" }}>Degree Program</span>
            <span style={{ fontWeight: 600, color: "#0F172A" }}>{student.program}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748B" }}>Borrowing Privileges</span>
            <span style={{ fontWeight: 700, color: "#16A34A" }}>Active (Max 3 Books)</span>
          </div>
        </div>
      </div>

      {/* PWA & Mobile Install Card */}
      <div
        style={{
          background: isInstalled ? "#ECFDF5" : "#FFFFFF",
          borderRadius: 18,
          padding: "14px 16px",
          border: `1px solid ${isInstalled ? "#A7F3D0" : "#E2E8F0"}`,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: isInstalled ? "#D1FAE5" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isInstalled ? TOKENS.primary : "#475569",
              flexShrink: 0,
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: "#0F172A" }}>
              {isInstalled ? "App Installed on Device" : "Install Mobile Companion"}
            </h4>
            <p style={{ margin: 0, fontSize: 11, color: isInstalled ? "#047857" : "#64748B" }}>
              {isInstalled ? "PWA Standalone Mode Verified" : "Access pass and OPAC offline"}
            </p>
          </div>
        </div>

        {!isInstalled && (
          <button
            type="button"
            onClick={onInstallApp}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
              color: "#FFFFFF",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(4,120,87,0.2)",
              flexShrink: 0,
            }}
          >
            {isIOS ? "How to Add" : "Install"}
          </button>
        )}
      </div>

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={onInitiateSignOut}
        style={{
          width: "100%",
          padding: "13px 0",
          borderRadius: 14,
          border: "1px solid #FCA5A5",
          background: "#FEF2F2",
          color: "#B91C1C",
          fontSize: 13.5,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 2px 6px rgba(239, 68, 68, 0.08)",
        }}
      >
        <LogOut size={17} /> Sign Out
      </button>
    </div>
  );
}

// ============================================================================
// COMPONENT: SIGN OUT CONFIRMATION MODAL
// ============================================================================
function SignOutConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 24,
          padding: "24px 20px",
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          border: "1px solid #E2E8F0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "#FEE2E2",
            color: "#DC2626",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <LogOut size={26} />
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>
          Sign Out of CDM OneLib?
        </h3>
        <p style={{ fontSize: 12.5, color: "#64748B", margin: "0 0 20px", lineHeight: 1.4 }}>
          Are you sure you want to sign out? You will need to sign in again with your Student ID to access your digital pass and library records.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              color: "#334155",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
            }}
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: PWA INSTALLATION MODAL
// ============================================================================
function InstallPwaModal({ isIOS, hasDirectInstall, onDirectInstall, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 24,
          padding: "24px 20px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          border: "1px solid #E2E8F0",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: "0 8px 16px rgba(4,120,87,0.25)",
            marginBottom: 12,
          }}
        >
          <Smartphone size={32} />
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "#0F172A" }}>
          Install CDM Library App
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#64748B", lineHeight: 1.4 }}>
          Access your digital student pass, search OPAC catalog, and track loans offline directly from your home screen.
        </p>

        {isIOS ? (
          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 16,
              padding: 14,
              border: "1px solid #E2E8F0",
              textAlign: "left",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              🍎 How to install on iOS / iPhone (Safari):
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11.5, color: "#334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>1</span>
                <span>Tap the <strong>Share</strong> button (⎙ or ⬆️) in Safari toolbar.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>3</span>
                <span>Tap <strong>"Add"</strong> in the top right corner.</span>
              </div>
            </div>
          </div>
        ) : hasDirectInstall ? (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={onDirectInstall}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(4,120,87,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Download size={18} />
              <span>Install to Home Screen Now</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 16,
              padding: 14,
              border: "1px solid #E2E8F0",
              textAlign: "left",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              🤖 On Android / Chrome:
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: "#475569" }}>
              Tap the browser menu (⋮) in the top-right corner and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 12,
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#64748B",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: NAVIGATION BUTTON
// ============================================================================
function NavButton({ icon, label, badge, active, dark, onClick }) {
  const activeColor = dark ? TOKENS.emeraldLuminous : TOKENS.primary;
  const inactiveColor = dark ? "#64748B" : "#94A3B8";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        position: "relative",
        padding: "4px 8px",
        minWidth: 54,
        minHeight: 44,
      }}
    >
      <div style={{ color: active ? activeColor : inactiveColor, position: "relative" }}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -8,
              background: "#EF4444",
              color: "#FFFFFF",
              fontSize: 9,
              fontWeight: 800,
              width: 16,
              height: 16,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: active ? 700 : 500,
          color: active ? activeColor : inactiveColor,
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// COMPONENT: IN-APP DIGITAL BOOK CHAPTER & PDF READER MODAL
// ============================================================================
function BookReaderModal({ book, onClose, onReserve }) {
  const [activeMode, setActiveMode] = useState("interactive"); // 'interactive' | 'pdf'
  const [currentPage, setCurrentPage] = useState(1);
  const [fontSize, setFontSize] = useState(14); // 12, 14, 16, 18
  const [theme, setTheme] = useState("paper"); // 'paper' | 'sepia' | 'dark'
  const totalPages = 4;

  const themes = {
    paper: { bg: "#FFFFFF", text: "#0F172A", border: "#E2E8F0", card: "#F8FAFC", accent: TOKENS.primary },
    sepia: { bg: "#FBF0D9", text: "#433422", border: "#EBD8B8", card: "#F4E3C1", accent: "#8C5E28" },
    dark: { bg: "#0F172A", text: "#E2E8F0", border: "#334155", card: "#1E293B", accent: TOKENS.emeraldLuminous }
  };

  const currentTheme = themes[theme] || themes.paper;

  // Chapter Content based on book department & metadata
  const getChapterContent = (page) => {
    switch (page) {
      case 1:
        return {
          title: "Chapter 1: Foundations & Scope",
          subtitle: `Curriculum Alignment: ${book.category} • ${book.program} (${book.yearLevel || "Undergraduate"})`,
          sections: [
            {
              heading: "1.1 Overview & Academic Objectives",
              text: `This textbook serves as an authoritative reference volume for the Colegio de Montalban ${book.program} program. The curriculum scope encompasses core foundational principles, applied methodologies, and practical laboratory exercises aligned with CHED Memorandum Orders for higher education.`
            },
            {
              heading: "1.2 Table of Contents & Structure",
              text: "• Chapter 1: Foundations & Theoretical Constructs\n• Chapter 2: Core Architectures & Applied Models\n• Chapter 3: Implementation, Algorithms & Case Studies\n• Chapter 4: System Integration & Performance Benchmarking\n• Chapter 5: Advanced Topics & Capstone Project Applications"
            }
          ]
        };
      case 2:
        return {
          title: "Section 1.3: Core Theoretical Principles",
          subtitle: `Subject Focus: ${book.title}`,
          sections: [
            {
              heading: "Key Concepts & Terminology",
              text: `In this volume, ${book.author} establishes standard academic definitions necessary for rigorous problem analysis. Students are encouraged to correlate textbook readings with practical laboratory sessions in the CDM computer and engineering facilities.`
            },
            {
              heading: "Methodological Framework",
              text: "Structured analysis requires establishing baseline invariants, defining boundary constraints, and validating operational output against established mathematical and algorithmic proofs."
            }
          ]
        };
      case 3:
        return {
          title: "Section 1.4: Practical Case Study & Applications",
          subtitle: `Dewey Decimal Reference: ${book.ddc} • Shelf Aisle: ${book.shelfLocation}`,
          sections: [
            {
              heading: "Laboratory Exercise: Applied Modeling",
              text: "1. Review the problem statement and identify requisite parameters.\n2. Design modular components adhering to cohesion and encapsulation rules.\n3. Execute unit verification tests and log performance metrics.\n4. Document architectural decisions in accordance with CDM capstone standards."
            },
            {
              heading: "Expected Learning Outcomes",
              text: "Upon completion of this module, the student must be able to synthesize complex domain requirements, formulate robust solutions, and defend implementation choices systematically."
            }
          ]
        };
      case 4:
        return {
          title: "Chapter Summary & Self-Assessment",
          subtitle: "End-of-Chapter Review Questions",
          sections: [
            {
              heading: "Key Takeaways",
              text: `• Mastered foundational vocabulary and theoretical constructs of ${book.title}.\n• Understood real-world trade-offs in algorithmic complexity, system architecture, and operational security.\n• Prepared for Chapter 2 advanced implementations.`
            },
            {
              heading: "Review Questions for Recitation",
              text: "Q1. How does the primary framework outlined in Section 1.1 address scalability?\nQ2. Contrast the traditional approach with modern distributed implementations.\nQ3. Propose an optimization technique for reducing computational overhead."
            }
          ]
        };
      default:
        return { title: "Sample Excerpt", subtitle: "", sections: [] };
    }
  };

  const content = getChapterContent(currentPage);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: currentTheme.bg,
          color: currentTheme.text,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          height: "94%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -10px 30px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation & Controls */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: `1px solid ${currentTheme.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: currentTheme.card,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `1px solid ${currentTheme.border}`,
                background: currentTheme.bg,
                color: currentTheme.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
            <div>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  margin: 0,
                  maxWidth: 180,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {book.title}
              </h4>
              <span style={{ fontSize: 10, opacity: 0.75 }}>
                {activeMode === "interactive" ? `Page ${currentPage} of ${totalPages}` : "PDF Document View"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* View Mode Switcher */}
            <div
              style={{
                display: "flex",
                background: currentTheme.bg,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: 8,
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveMode("interactive")}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "none",
                  background: activeMode === "interactive" ? currentTheme.accent : "transparent",
                  color: activeMode === "interactive" ? "#FFFFFF" : currentTheme.text,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Interactive
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("pdf")}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "none",
                  background: activeMode === "pdf" ? currentTheme.accent : "transparent",
                  color: activeMode === "pdf" ? "#FFFFFF" : currentTheme.text,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                PDF View
              </button>
            </div>

            {/* Theme / Font controls for Interactive */}
            {activeMode === "interactive" && (
              <>
                <button
                  type="button"
                  onClick={() => setFontSize((f) => (f < 18 ? f + 2 : 12))}
                  title="Cycle Font Size"
                  style={{
                    height: 28,
                    padding: "0 8px",
                    borderRadius: 6,
                    border: `1px solid ${currentTheme.border}`,
                    background: currentTheme.bg,
                    color: currentTheme.text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Type size={12} />
                  <span>{fontSize}px</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (theme === "paper") setTheme("sepia");
                    else if (theme === "sepia") setTheme("dark");
                    else setTheme("paper");
                  }}
                  title="Toggle Reader Theme"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `1px solid ${currentTheme.border}`,
                    background: theme === "paper" ? "#FFF" : theme === "sepia" ? "#FBF0D9" : "#0F172A",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {theme === "dark" ? <Sun size={13} color="#FCD34D" /> : <Moon size={13} color="#475569" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reader Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: activeMode === "interactive" ? "20px 22px" : 0 }}>
          {activeMode === "interactive" ? (
            <div style={{ maxWidth: 540, margin: "0 auto" }}>
              {/* Header Badge */}
              <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: currentTheme.card,
                    border: `1px solid ${currentTheme.border}`,
                    padding: "3px 10px",
                    borderRadius: 999,
                    color: currentTheme.accent,
                  }}
                >
                  📖 CDM DIGITAL SYLLABUS EXCERPT
                </span>
                <span style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>
                  ISBN: {book.isbn}
                </span>
              </div>

              <h2 style={{ fontSize: fontSize + 6, fontWeight: 800, margin: "0 0 4px", lineHeight: 1.3 }}>
                {content.title}
              </h2>
              <p style={{ fontSize: fontSize - 2, opacity: 0.75, margin: "0 0 18px", fontStyle: "italic" }}>
                {content.subtitle}
              </p>

              <div
                style={{
                  height: 1,
                  background: currentTheme.border,
                  marginBottom: 18,
                }}
              />

              {content.sections.map((sec, idx) => (
                <div key={idx} style={{ marginBottom: 20 }}>
                  <h3
                    style={{
                      fontSize: fontSize + 2,
                      fontWeight: 700,
                      margin: "0 0 8px",
                      color: currentTheme.accent,
                    }}
                  >
                    {sec.heading}
                  </h3>
                  <div
                    style={{
                      fontSize: fontSize,
                      lineHeight: 1.7,
                      whiteSpace: "pre-line",
                      opacity: 0.9,
                    }}
                  >
                    {sec.text}
                  </div>
                </div>
              ))}

              <div
                style={{
                  background: currentTheme.card,
                  borderRadius: 14,
                  padding: "12px 16px",
                  border: `1px dashed ${currentTheme.border}`,
                  marginTop: 24,
                  marginBottom: 16,
                  fontSize: 11.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <BookOpen size={20} color={currentTheme.accent} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Official Collection Notice:</strong> Complete unabridged copy is physically available at the CDM Main Library. Reserve below to place a 48-hour counter hold.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <iframe
                src={book.pdfUrl || "/previews/sample_preview.pdf"}
                title={`${book.title} PDF Chapter Preview`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#F1F5F9",
                }}
              />
            </div>
          )}
        </div>

        {/* Bottom Pagination & Reservation Bar */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: `1px solid ${currentTheme.border}`,
            background: currentTheme.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          {activeMode === "interactive" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: `1px solid ${currentTheme.border}`,
                  background: currentTheme.bg,
                  color: currentTheme.text,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: `1px solid ${currentTheme.border}`,
                  background: currentTheme.bg,
                  color: currentTheme.text,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 11.5, opacity: 0.7, fontWeight: 600 }}>
              📄 Standard PDF Syllabus Excerpt
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onReserve) onReserve();
            }}
            disabled={book.availableCopies <= 0}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: book.availableCopies > 0
                ? `linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryDark} 100%)`
                : "#94A3B8",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: book.availableCopies > 0 ? "pointer" : "not-allowed",
              boxShadow: "0 4px 12px rgba(4,120,87,0.25)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BookMarked size={15} />
            <span>{book.availableCopies > 0 ? "Reserve Physical Copy" : "All Copies Borrowed"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

