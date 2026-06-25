import { useState, useMemo, useEffect } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import libraryBrandImg from "@/imports/672249359_1247900927325779_3798022234977448862_n.jpg";
import {
  BookOpen, LayoutDashboard, Calendar, RotateCcw, FileText, LogOut,
  Search, QrCode, Bell, User, AlertTriangle, CheckCircle, Clock,
  TrendingUp, Users, BookMarked, Eye, EyeOff, Shield, Star, Printer, X, Plus,
  ArrowRight, Info, Hash, Check, ChevronRight, Quote, GraduationCap,
  ChevronLeft, AlertCircle, Menu, BookX, Library, Filter, Loader2,
  Edit, Trash,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = "login" | "register" | "dashboard" | "catalog" | "students" | "borrow" | "reservations" | "returns" | "terms";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  cover: string;
  abstract: string;
  available: number;
  total: number;
  borrowCount: number;
  publishYear: number;
}

interface Transaction {
  id: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  studentId: string;
  librarianName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: "active" | "returned" | "overdue" | "lost";
}

interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  studentId: string;
  reservationDate: string;
  pickupDate: string;
  status: "pending" | "fulfilled" | "cancelled";
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  yearLevel: string;
  status: "active" | "suspended";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAILY_QUOTES = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "Reading is essential for those who seek to rise above the ordinary.", author: "Jim Rohn" },
  { text: "Not all readers are leaders, but all leaders are readers.", author: "Harry S. Truman" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
];

const TODAY_QUOTE = DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length];

const CATEGORIES = ["All", "Literature", "History", "Science", "Mathematics", "Technology", "Philosophy", "Social Studies"];

// ─── Database Sync / State Fallbacks ──────────────────────────────────────────
// Mock data is now stored and fetched dynamically from the SQLite database.

// ─── Utilities ────────────────────────────────────────────────────────────────
function getDueDaysLeft(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getDueDate(borrowDate: string, days = 7) {
  const d = new Date(borrowDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── QR Code Component ────────────────────────────────────────────────────────
function QRCodeVisual({ data }: { data: string }) {
  const size = 21;
  const seed = data.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const cells = useMemo(() => {
    const grid: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        const inTL = r < 7 && c < 7;
        const inTR = r < 7 && c >= size - 7;
        const inBL = r >= size - 7 && c < 7;
        if (inTL || inTR || inBL) {
          const lr = inTL ? r : inTR ? r : r - (size - 7);
          const lc = inTL ? c : inTR ? c - (size - 7) : c;
          row.push((lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4));
        } else {
          const h = ((seed * (r + 3) * (c + 7) + r * 97 + c * 53) >>> 0) % 100;
          row.push(h < 52);
        }
      }
      grid.push(row);
    }
    return grid;
  }, [seed]);
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 inline-block">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 8px)` }}>
        {cells.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{ width: 8, height: 8, backgroundColor: cell ? "#1F1F1F" : "#FFFFFF" }} />
        )))}
      </div>
    </div>
  );
}

// ─── Badge Component ──────────────────────────────────────────────────────────
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" | "accent" }) {
  const styles = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-orange-50 text-orange-700 border border-orange-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    accent: "bg-yellow-50 text-yellow-800 border border-yellow-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = "green", sub }: { label: string; value: string | number; icon: React.ElementType; color?: "green" | "yellow" | "red" | "blue"; sub?: string }) {
  const colors = {
    green: "border-l-[#106A2E] bg-white",
    yellow: "border-l-[#F4D35E] bg-white",
    red: "border-l-red-500 bg-white",
    blue: "border-l-blue-500 bg-white",
  };
  const iconColors = {
    green: "bg-[#106A2E]/10 text-[#106A2E]",
    yellow: "bg-[#F4D35E]/20 text-[#7a6500]",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className={`rounded-lg border-l-4 p-4 shadow-sm ${colors[color]} flex items-center gap-4`}>
      <div className={`p-3 rounded-lg ${iconColors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground font-display">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────
function BookCard({ book, onPreview, onBorrow, onEdit, onDelete }: {
  book: Book;
  onPreview: (b: Book) => void;
  onBorrow: (b: Book) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow group overflow-hidden">
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={book.cover}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2">
          {book.available > 0
            ? <Badge variant="success"><Check className="w-2.5 h-2.5" /> {book.available} Available</Badge>
            : <Badge variant="danger"><X className="w-2.5 h-2.5" /> Unavailable</Badge>}
        </div>
        <div className="absolute top-2 left-2">
          <Badge variant="default">{book.category}</Badge>
        </div>
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(book); }}
            className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-md shadow-sm transition-colors border border-gray-200 cursor-pointer"
            title="Edit Book"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(book); }}
            className="p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-md shadow-sm transition-colors border border-gray-200 cursor-pointer"
            title="Delete Book"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug mb-1">{book.title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{book.author} · {book.publishYear}</p>
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-3 h-3 fill-[#F4D35E] text-[#F4D35E]" />
          <span className="text-xs text-muted-foreground">{book.borrowCount} borrows</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPreview(book)}
            className="flex-1 text-xs py-1.5 px-2 rounded-md border border-[#106A2E] text-[#106A2E] hover:bg-[#106A2E]/5 transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
          <button
            onClick={() => onBorrow(book)}
            disabled={book.available === 0}
            className="flex-1 text-xs py-1.5 px-2 rounded-md bg-[#106A2E] text-white hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <BookMarked className="w-3 h-3" /> Borrow
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QR Receipt Modal ─────────────────────────────────────────────────────────
function QRReceiptModal({ txn, book, onClose }: { txn: Omit<Transaction, "id"> & { id: string }; book: Book; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-[#106A2E] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[#F4D35E] text-xs font-medium uppercase tracking-widest">Library Receipt</p>
            <h2 className="text-white font-bold text-lg">Colegio de Montalban</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <QRCodeVisual data={txn.id} />
          </div>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Receipt No.</span>
              <span className="font-mono font-semibold text-foreground">{txn.id}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Book Title</span>
              <span className="font-semibold text-foreground text-right max-w-[200px]">{book.title}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Author</span>
              <span className="font-medium">{book.author}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Borrower</span>
              <span className="font-medium">{txn.studentName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Student ID</span>
              <span className="font-mono font-medium">{txn.studentId}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Assisted by</span>
              <span className="font-medium">{txn.librarianName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-muted-foreground">Borrow Date</span>
              <span className="font-medium">{formatDate(txn.borrowDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-bold text-[#106A2E]">{formatDate(txn.dueDate)}</span>
            </div>
          </div>
          <div className="bg-[#F4D35E]/20 border border-[#F4D35E] rounded-lg p-3 text-xs text-center text-[#7a6500] mb-4">
            <Shield className="w-4 h-4 inline mr-1" />
            Please return the book on or before the due date. Late returns incur ₱5/day penalty.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-[#106A2E] text-[#106A2E] rounded-lg text-sm font-medium hover:bg-[#106A2E]/5 transition-colors"
            >
              Close
            </button>
            <button className="flex-1 py-2.5 px-4 bg-[#106A2E] text-white rounded-lg text-sm font-medium hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Book Preview Modal ───────────────────────────────────────────────────────
function BookPreviewModal({ book, onClose, onBorrow, onEdit, onDelete }: {
  book: Book;
  onClose: () => void;
  onBorrow: (b: Book) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="relative h-40 bg-[#106A2E] overflow-hidden">
          <ImageWithFallback
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 flex items-end p-6">
            <div>
              <Badge variant="default">{book.category}</Badge>
              <h2 className="text-white text-2xl font-bold font-display mt-2 leading-tight">{book.title}</h2>
              <p className="text-white/80 text-sm">{book.author} · {book.publishYear}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 transition-colors rounded-full p-2 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">ISBN</p>
              <p className="font-mono text-xs font-semibold mt-0.5">{book.isbn}</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground">Availability</p>
              <p className="font-bold text-sm mt-0.5" style={{ color: book.available > 0 ? "#106A2E" : "#c0392b" }}>
                {book.available}/{book.total} copies
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Borrows</p>
              <p className="font-bold text-sm mt-0.5 text-foreground">{book.borrowCount}×</p>
            </div>
          </div>
          <h3 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#106A2E]" /> Abstract
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{book.abstract}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="py-2.5 px-4 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Close
            </button>
            <button
              onClick={() => { onEdit(book); onClose(); }}
              className="py-2.5 px-4 border border-[#106A2E] text-[#106A2E] rounded-lg text-sm hover:bg-[#106A2E]/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => { onDelete(book); onClose(); }}
              className="py-2.5 px-4 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash className="w-4 h-4" /> Delete
            </button>
            <button
              onClick={() => { onBorrow(book); onClose(); }}
              disabled={book.available === 0}
              className="flex-grow py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-medium hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookMarked className="w-4 h-4" />
              {book.available > 0 ? "Borrow" : "Unavailable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }: { onLogin: (u: string) => void; onGoRegister: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);

    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
    .then(r => {
      if (!r.ok) {
        return r.json().then(data => { throw new Error(data.error || "Authentication failed"); });
      }
      return r.json();
    })
    .then(data => {
      setLoading(false);
      localStorage.setItem("librarianName", data.name);
      onLogin(data.name);
    })
    .catch(err => {
      setLoading(false);
      setError(err.message);
    });
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-family-sans)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(160deg, #106A2E 0%, #0D7856 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute border border-white/30 rounded-full"
              style={{ width: (i + 1) * 120, height: (i + 1) * 120, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
        <div className="relative z-10 text-center px-12">
          <div className="mb-6 flex justify-center">
            <div className="bg-[#F4D35E] rounded-2xl p-4 shadow-lg">
              <Library className="w-12 h-12 text-[#1F1F1F]" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-family-display)" }}>
            CDM Library
          </h1>
          <p className="text-white/80 text-base leading-relaxed mb-8">Integrated Library Management System</p>
          <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20 text-left">
            <Quote className="w-5 h-5 text-[#F4D35E] mb-3" />
            <p className="text-white/90 text-sm italic leading-relaxed mb-2">"{TODAY_QUOTE.text}"</p>
            <p className="text-[#F4D35E] text-xs font-medium">— {TODAY_QUOTE.author}</p>
          </div>
        </div>
        <p className="absolute bottom-6 text-white/40 text-xs">© 2024 Colegio de Montalban · BSIT 3A Capstone Group 10</p>
      </div>
      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F1F1F1]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#106A2E] rounded-2xl p-3"><Library className="w-8 h-8 text-[#F4D35E]" /></div>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-family-display)" }}>Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your librarian account</p>
          </div>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded" /> Remember me
              </label>
              <button type="button" className="text-[#106A2E] hover:underline font-medium">Forgot password?</button>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">
            New librarian?{" "}
            <button onClick={onGoRegister} className="text-[#106A2E] font-medium hover:underline cursor-pointer">Create an account</button>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Demo credentials: <span className="font-mono bg-gray-100 px-1 rounded">admin</span> / <span className="font-mono bg-gray-100 px-1 rounded">admin123</span>
          </p>
          <p className="text-center text-xs text-[#106A2E]/40 mt-8">CDM Integrated Library System · v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
function RegisterPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", employeeId: "", role: "Librarian", username: "", password: "", confirmPassword: "" });
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    .then(r => {
      if (!r.ok) {
        return r.json().then(data => { throw new Error(data.error || "Registration failed"); });
      }
      return r.json();
    })
    .then(() => {
      setDone(true);
    })
    .catch(err => {
      alert(err.message);
    });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#106A2E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#106A2E]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-family-display)" }}>Account Created!</h2>
          <p className="text-muted-foreground text-sm mb-6">Your librarian account has been created successfully. You can now return to the login screen and sign in immediately.</p>
          <button onClick={onBack} className="w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-sm max-w-lg w-full overflow-hidden">
        <div className="bg-[#106A2E] p-6 text-left">
          <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Back to Login
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-[#F4D35E] rounded-xl p-2.5"><Library className="w-7 h-7 text-[#1F1F1F]" /></div>
            <div>
              <h1 className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-family-display)" }}>Create Librarian Account</h1>
              <p className="text-white/70 text-xs">Colegio de Montalban · Library System</p>
            </div>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-5">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-[#F4D35E] text-[#1F1F1F]" : "bg-white/20 text-white/50"}`}>{s}</div>
                {s < 2 && <div className={`w-16 h-0.5 ${step >= 2 ? "bg-[#F4D35E]" : "bg-white/20"}`} />}
              </div>
            ))}
            <span className="text-white/60 text-xs ml-2">{step === 1 ? "Personal Info" : "Account Setup"}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">First Name *</label>
                  <input value={form.firstName} onChange={e => update("firstName", e.target.value)} required
                    className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Last Name *</label>
                  <input value={form.lastName} onChange={e => update("lastName", e.target.value)} required
                    className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Email Address *</label>
                <input type="email" value={form.email} onChange={e => update("email", e.target.value)} required
                  className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Employee ID *</label>
                  <input value={form.employeeId} onChange={e => update("employeeId", e.target.value)} required
                    placeholder="EMP-XXXX"
                    className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Role</label>
                  <select value={form.role} onChange={e => update("role", e.target.value)}
                    className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]">
                    <option>Librarian</option>
                    <option>Head Librarian</option>
                    <option>Library Aide</option>
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)}
                className="w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow">
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Username *</label>
                <input value={form.username} onChange={e => update("username", e.target.value)} required
                  className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Password *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} required
                    className="w-full pl-3 pr-10 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} required
                    className="w-full pl-3 pr-10 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-[#F4D35E]/10 border border-[#F4D35E] rounded-lg p-3 text-xs text-[#7a6500]">
                <Shield className="w-3.5 h-3.5 inline mr-1" />
                Password must be at least 8 characters, include uppercase, lowercase, and numbers.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer">
                  Create Account
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ books, transactions, reservations, librarianName, onNavigate }: {
  books: Book[]; transactions: Transaction[]; reservations: Reservation[]; librarianName: string; onNavigate: (p: Page) => void;
}) {
  const sortedBooks = [...books].sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 5);
  const overdueTxns = transactions.filter(t => t.status === "overdue");
  const activeTxns = transactions.filter(t => t.status === "active");

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ height: 220 }}>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&h=440&fit=crop&auto=format"
          alt="Library of Colegio de Montalban"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(16,106,46,0.92) 0%, rgba(13,120,86,0.65) 60%, rgba(0,0,0,0.1) 100%)" }} />
        <div className="absolute inset-0 flex flex-col justify-between p-8">
          <div>
            <p className="text-[#F4D35E] text-xs font-medium uppercase tracking-widest mb-1">Colegio de Montalban</p>
            <h1 className="text-white text-3xl font-bold leading-tight" style={{ fontFamily: "var(--font-family-display)" }}>
              Welcome back,<br />{librarianName}
            </h1>
            <p className="text-white/70 text-sm mt-1">{new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => onNavigate("borrow")} className="bg-[#F4D35E] text-[#1F1F1F] text-xs font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center gap-2 shadow">
              <BookMarked className="w-3.5 h-3.5" /> New Borrow
            </button>
            <button onClick={() => onNavigate("reservations")} className="bg-white/20 backdrop-blur text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 border border-white/30">
              <Calendar className="w-3.5 h-3.5" /> New Reservation
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Books" value={books.reduce((a, b) => a + b.total, 0)} icon={BookOpen} color="green" sub="In collection" />
        <StatCard label="Currently Borrowed" value={activeTxns.length} icon={BookMarked} color="yellow" sub="Active transactions" />
        <StatCard label="Overdue Returns" value={overdueTxns.length} icon={AlertTriangle} color="red" sub="Needs attention" />
        <StatCard label="Reservations" value={reservations.filter(r => r.status === "pending").length} icon={Calendar} color="blue" sub="Pending pickup" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Most Borrowed Books */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#106A2E]" /> Most Borrowed Books
            </h2>
            <button onClick={() => onNavigate("catalog")} className="text-xs text-[#106A2E] hover:underline font-medium flex items-center gap-1">
              View Catalog <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {sortedBooks.map((book, i) => (
              <div key={book.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: i === 0 ? "#F4D35E" : i === 1 ? "#e8e8e8" : i === 2 ? "#f0d5c0" : "#f0f0f0", color: i < 3 ? "#1F1F1F" : "#888" }}>
                  {i + 1}
                </div>
                <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                  <ImageWithFallback src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.author}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-[#106A2E]">{book.borrowCount}</p>
                  <p className="text-xs text-muted-foreground">borrows</p>
                </div>
                <div className="w-24 hidden sm:block">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(book.borrowCount / 247) * 100}%`, backgroundColor: "#106A2E" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Daily Quote */}
          <div className="bg-[#106A2E] rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <Quote className="w-5 h-5 text-[#F4D35E] mb-3" />
            <p className="text-white text-sm italic leading-relaxed mb-3">"{TODAY_QUOTE.text}"</p>
            <p className="text-[#F4D35E] text-xs font-semibold">— {TODAY_QUOTE.author}</p>
            <p className="text-white/40 text-xs mt-3">Daily Reading Inspiration</p>
          </div>

          {/* Overdue Alert */}
          {overdueTxns.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-border p-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Overdue Returns
              </h3>
              <div className="space-y-2">
                {overdueTxns.map(t => (
                  <div key={t.id} className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs font-medium text-red-800">{t.studentName}</p>
                    <p className="text-xs text-red-600">{t.bookTitle}</p>
                    <p className="text-xs text-red-500 mt-0.5">Due: {formatDate(t.dueDate)}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => onNavigate("returns")} className="mt-3 w-full text-xs text-[#106A2E] hover:underline font-medium flex items-center justify-center gap-1">
                Process Returns <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white rounded-xl shadow-sm border border-border p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Borrow a Book", page: "borrow" as Page, icon: BookMarked, color: "#106A2E" },
                { label: "Make Reservation", page: "reservations" as Page, icon: Calendar, color: "#0D7856" },
                { label: "Process Return", page: "returns" as Page, icon: RotateCcw, color: "#c0392b" },
                { label: "View Catalog", page: "catalog" as Page, icon: BookOpen, color: "#1F1F1F" },
              ].map(({ label, page, icon: Icon, color }) => (
                <button key={page} onClick={() => onNavigate(page)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Catalog Page ─────────────────────────────────────────────────────────────
function CatalogPage({ books, onBorrow, onPreview, onAdd, onEdit, onDelete }: {
  books: Book[];
  onBorrow: (b: Book) => void;
  onPreview: (b: Book) => void;
  onAdd: () => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = books.filter(b => {
    const matchCat = category === "All" || b.category === category;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-foreground">Book Collection</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage and search books in the library catalog.</p>
        </div>
        <button
          onClick={onAdd}
          className="bg-[#106A2E] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0D7856] transition-colors flex items-center gap-2 shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or author..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${category === c ? "bg-[#106A2E] text-white" : "bg-white border border-border text-foreground hover:bg-gray-50"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} book{filtered.length !== 1 ? "s" : ""} found</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(book => (
          <BookCard
            key={book.id}
            book={book}
            onPreview={onPreview}
            onBorrow={onBorrow}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Borrow Page ──────────────────────────────────────────────────────────────
function BorrowPage({ books, students, librarianName, preselectedBook, onDone, onRefresh }: {
  books: Book[]; students: Student[]; librarianName: string; preselectedBook?: Book; onDone: () => void; onRefresh: () => void;
}) {
  const [step, setStep] = useState(preselectedBook ? 2 : 1);
  const [selectedBook, setSelectedBook] = useState<Book | undefined>(preselectedBook);
  const [search, setSearch] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  // Student Search Dropdown States
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>();
  const [studentSearch, setStudentSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Quick Register States
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickId, setQuickId] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickCourse, setQuickCourse] = useState("BSIT");
  const [quickYearLevel, setQuickYearLevel] = useState("1st Year");

  function handleQuickRegister() {
    if (!quickId || !quickName || !quickEmail) {
      alert("Please fill in Student ID, Name, and Email.");
      return;
    }
    fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: quickId,
        name: quickName,
        email: quickEmail,
        course: quickCourse,
        yearLevel: quickYearLevel,
        status: "active"
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        const newStudent: Student = {
          id: quickId,
          name: quickName,
          email: quickEmail,
          phone: "",
          course: quickCourse,
          yearLevel: quickYearLevel,
          status: "active"
        };
        onRefresh();
        setSelectedStudent(newStudent);
        setStudentSearch(`${newStudent.name} (${newStudent.id})`);
        setStudentName(newStudent.name);
        setStudentId(newStudent.id);
        setShowQuickRegister(false);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to register student.");
    });
  }

  const filteredBooks = books.filter(b => b.available > 0 && (!search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())));
  const today = new Date().toISOString().split("T")[0];
  const dueDate = getDueDate(today, 7);

  function handleConfirm() {
    if (!selectedBook || !studentName || !studentId || !termsAccepted) return;
    fetch("/api/transactions/borrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: selectedBook.id,
        studentName,
        studentId,
        librarianName,
        borrowDate: today,
        dueDate
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        setCompletedTxn(res.transaction);
        onRefresh();
        setStep(4);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to process borrow transaction.");
    });
  }

  if (step === 4 && completedTxn && selectedBook) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden text-left">
          <div className="bg-[#106A2E] p-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-[#F4D35E]" />
            </div>
            <h2 className="text-white text-xl font-bold mb-1">Book Borrowed Successfully!</h2>
            <p className="text-white/70 text-sm">Transaction completed by {librarianName}</p>
          </div>
          <div className="p-6 flex justify-center flex-col items-center">
            <QRCodeVisual data={completedTxn.id} />
            <p className="text-xs text-muted-foreground mt-3 mb-5">Scan QR code to view receipt details</p>
            <div className="w-full space-y-2 text-sm mb-6">
              {[ 
                ["Receipt No.", completedTxn.id],
                ["Book", selectedBook.title],
                ["Borrower", studentName],
                ["Student ID", studentId],
                ["Due Date", formatDate(dueDate)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-dashed border-gray-100">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right max-w-xs">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 w-full">
              <button className="flex-1 py-2.5 border border-[#106A2E] text-[#106A2E] rounded-lg text-sm font-medium hover:bg-[#106A2E]/5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={onDone} className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 text-left">
      {/* Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-5">
        <div className="flex items-center gap-0">
          {["Select Book", "Student Info", "Preview & Terms"].map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${step > i + 1 ? "bg-[#106A2E] text-white" : step === i + 1 ? "bg-[#F4D35E] text-[#1F1F1F]" : "bg-gray-100 text-gray-400"}`}>
                  {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === i + 1 ? "text-[#106A2E]" : "text-muted-foreground"}`}>{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${step > i + 1 ? "bg-[#106A2E]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Book */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#106A2E]" />Select a Book to Borrow</h2>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search available books..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredBooks.map(book => (
              <label key={book.id} className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${selectedBook?.id === book.id ? "border-[#106A2E] bg-[#106A2E]/5" : "border-border hover:bg-gray-50"}`}>
                <input type="radio" name="book" checked={selectedBook?.id === book.id} onChange={() => setSelectedBook(book)} className="accent-[#106A2E]" />
                <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                  <ImageWithFallback src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.author} · {book.category}</p>
                  <p className="text-xs text-[#106A2E] mt-0.5 font-medium">{book.available} {book.available === 1 ? "copy" : "copies"} available</p>
                </div>
              </label>
            ))}
            {filteredBooks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No available books found.</p>
              </div>
            )}
          </div>
          <button disabled={!selectedBook} onClick={() => setStep(2)}
            className="mt-4 w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Student Info */}
      {step === 2 && selectedBook && (
        <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h2 className="font-bold text-foreground mb-1 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#106A2E]" />Student Information</h2>
          <p className="text-xs text-muted-foreground mb-4">Borrowing: <span className="font-medium text-foreground">{selectedBook.title}</span></p>
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Search & Select Student *</label>
              <div className="relative">
                <input
                  value={studentSearch}
                  onChange={e => {
                    setStudentSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type student name or ID..."
                  className="w-full pl-3 pr-9 py-2.5 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                />
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-border rounded-lg shadow-lg z-20 divide-y divide-border">
                    {students
                      .filter(s =>
                        s.status === "active" &&
                        (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.id.includes(studentSearch))
                      )
                      .map(s => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentSearch(`${s.name} (${s.id})`);
                            setStudentName(s.name);
                            setStudentId(s.id);
                            setShowDropdown(false);
                          }}
                          className="p-2.5 hover:bg-emerald-50/40 cursor-pointer text-xs transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-foreground text-left">{s.name}</p>
                            <p className="text-muted-foreground text-[10px] text-left">{s.course} · {s.yearLevel}</p>
                          </div>
                          <span className="font-mono text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded text-[10px]">{s.id}</span>
                        </div>
                      ))}
                    {students.filter(s => s.status === "active" && (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.includes(studentSearch))).length === 0 && (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No active students found.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {selectedStudent && (
              <div className="p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-lg space-y-1.5 text-xs text-left">
                <p className="font-bold text-[#106A2E] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Student linked successfully</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground mt-2">
                  <div>Name: <span className="font-semibold text-foreground">{selectedStudent.name}</span></div>
                  <div>Student ID: <span className="font-mono font-semibold text-foreground">{selectedStudent.id}</span></div>
                  <div>Email: <span className="font-semibold text-foreground">{selectedStudent.email}</span></div>
                  <div>Course/Year: <span className="font-semibold text-foreground">{selectedStudent.course} — {selectedStudent.yearLevel}</span></div>
                </div>
              </div>
            )}

            <div className="bg-[#F1F1F1] rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Borrow Date</span><span className="font-medium">{formatDate(today)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-bold text-[#106A2E]">{formatDate(dueDate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Borrowing Period</span><span className="font-medium">7 days</span></div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button disabled={!studentName || !studentId} onClick={() => setStep(3)}
              className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Terms */}
      {step === 3 && selectedBook && (
        <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-[#106A2E]" />Book Preview & Terms</h2>
          <div className="flex gap-4 mb-4 p-3 bg-[#F1F1F1] rounded-xl">
            <div className="w-16 h-22 rounded overflow-hidden flex-shrink-0 bg-gray-200" style={{ height: 88 }}>
              <ImageWithFallback src={selectedBook.cover} alt={selectedBook.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-foreground">{selectedBook.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{selectedBook.author} · ISBN: {selectedBook.isbn}</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{selectedBook.abstract}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Borrowing Terms Summary</p>
            <p>• Borrowing period: <strong>7 days</strong> from today</p>
            <p>• Late return penalty: <strong>₱5.00 per day</strong></p>
            <p>• Lost/missing book: <strong>Replacement cost + ₱50 processing fee</strong></p>
            <p>• The book must be returned in the same condition as borrowed.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer group mb-5">
            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 accent-[#106A2E] w-4 h-4 flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I have read and agree to the{" "}
              <span className="text-[#106A2E] font-medium underline">Terms and Conditions</span>{" "}
              of the CDM Library. I understand the borrowing policies and the applicable penalties for late returns and lost books.
            </span>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button disabled={!termsAccepted} onClick={handleConfirm}
              className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
              <Check className="w-4 h-4" /> Confirm Borrow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reservations Page ────────────────────────────────────────────────────────
function ReservationsPage({ books, reservations, students, onRefresh }: { books: Book[]; reservations: Reservation[]; students: Student[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | undefined>();
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [done, setDone] = useState(false);
  const tomorrow = getTomorrowDate();
  const availableBooks = books;

  // Student Search Dropdown States
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>();
  const [studentSearch, setStudentSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Quick Register States
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickId, setQuickId] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickCourse, setQuickCourse] = useState("BSIT");
  const [quickYearLevel, setQuickYearLevel] = useState("1st Year");

  function handleQuickRegister() {
    if (!quickId || !quickName || !quickEmail) {
      alert("Please fill in Student ID, Name, and Email.");
      return;
    }
    fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: quickId,
        name: quickName,
        email: quickEmail,
        course: quickCourse,
        yearLevel: quickYearLevel,
        status: "active"
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        const newStudent: Student = {
          id: quickId,
          name: quickName,
          email: quickEmail,
          phone: "",
          course: quickCourse,
          yearLevel: quickYearLevel,
          status: "active"
        };
        onRefresh();
        setSelectedStudent(newStudent);
        setStudentSearch(`${newStudent.name} (${newStudent.id})`);
        setStudentName(newStudent.name);
        setStudentId(newStudent.id);
        setShowQuickRegister(false);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to register student.");
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBook || !studentName || !studentId) return;
    const today = new Date().toISOString().split("T")[0];
    fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: selectedBook.id,
        studentName,
        studentId,
        reservationDate: today,
        pickupDate: tomorrow
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        setDone(true);
        onRefresh();
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to submit reservation.");
    });
  }

  return (
    <div className="space-y-5">
      {!showForm ? (
        <>
          <div className="flex items-center justify-between text-left">
            <div>
              <h2 className="font-bold text-lg text-foreground">Book Reservations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Reservations can only be made 1 day in advance and are held for 1 day.</p>
            </div>
            <button onClick={() => { setShowForm(true); setDone(false); setSelectedStudent(undefined); setStudentSearch(""); setStudentName(""); setStudentId(""); }} className="bg-[#106A2E] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0D7856] transition-colors flex items-center gap-2 cursor-pointer shadow">
              <Plus className="w-4 h-4" /> New Reservation
            </button>
          </div>

          <div className="bg-[#F4D35E]/10 border border-[#F4D35E] rounded-xl p-4 flex items-start gap-3 text-left">
            <Info className="w-4 h-4 text-[#7a6500] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[#7a6500] space-y-1">
              <p className="font-semibold">Reservation Policy</p>
              <p>• Reservations must be made exactly <strong>1 day before</strong> the intended pickup date.</p>
              <p>• The reserved book is held for <strong>1 day only</strong>. Failure to pick up within this period will cancel the reservation.</p>
              <p>• A student may only have <strong>1 active reservation</strong> at a time.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden text-left">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Reservation Records</h3>
              <Badge variant="accent">{reservations.length} Total</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Reservation ID</th>
                    <th className="text-left p-3 font-medium">Book Title</th>
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-left p-3 font-medium">Reserved On</th>
                    <th className="text-left p-3 font-medium">Pickup Date</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                      <td className="p-3 font-medium text-foreground">{r.bookTitle}</td>
                      <td className="p-3">
                        <p className="font-medium">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">{r.studentId}</p>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(r.reservationDate)}</td>
                      <td className="p-3 text-xs font-medium">{formatDate(r.pickupDate)}</td>
                      <td className="p-3">
                        <Badge variant={r.status === "pending" ? "warning" : r.status === "fulfilled" ? "success" : "danger"}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="max-w-lg mx-auto text-left">
          {done ? (
            <div className="bg-white rounded-xl shadow-sm border border-border p-8 text-center">
              <div className="w-14 h-14 bg-[#106A2E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#106A2E]" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Reservation Confirmed!</h2>
              <p className="text-muted-foreground text-sm mb-2">
                <strong>{selectedBook?.title}</strong> has been reserved for <strong>{studentName}</strong>.
              </p>
              <p className="text-sm font-semibold text-[#106A2E] mb-6">Pickup Date: {formatDate(tomorrow)}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-6">
                The student must pick up the book by end of {formatDate(tomorrow)}. The reservation will be cancelled if not claimed.
              </div>
              <button onClick={() => { setShowForm(false); setSelectedBook(undefined); setStudentName(""); setStudentId(""); setSelectedStudent(undefined); setStudentSearch(""); }}
                className="w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer">
                Back to Reservations
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-[#106A2E] p-5 flex items-center justify-between">
                <h2 className="text-white font-bold flex items-center gap-2"><Calendar className="w-4 h-4" />New Book Reservation</h2>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="bg-[#F4D35E]/10 border border-[#F4D35E] rounded-lg p-3 text-xs text-[#7a6500]">
                  <Info className="w-3.5 h-3.5 inline mr-1" />
                  This reservation is for tomorrow: <strong>{formatDate(tomorrow)}</strong>. Students must pick up on this date.
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Select Book *</label>
                  <select value={selectedBook?.id || ""} onChange={e => setSelectedBook(books.find(b => b.id === e.target.value))} required
                    className="w-full px-3 py-2.5 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]">
                    <option value="">Choose a book...</option>
                    {availableBooks.map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
                  </select>
                </div>
                
                <div className="relative">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Search & Select Student *</label>
                  <div className="relative">
                    <input
                      value={studentSearch}
                      onChange={e => {
                        setStudentSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Type student name or ID..."
                      className="w-full pl-3 pr-9 py-2.5 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                    />
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>

                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-border rounded-lg shadow-lg z-20 divide-y divide-border">
                        {students
                          .filter(s =>
                            s.status === "active" &&
                            (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              s.id.includes(studentSearch))
                          )
                          .map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setSelectedStudent(s);
                                setStudentSearch(`${s.name} (${s.id})`);
                                setStudentName(s.name);
                                setStudentId(s.id);
                                setShowDropdown(false);
                              }}
                              className="p-2.5 hover:bg-emerald-50/40 cursor-pointer text-xs transition-colors flex justify-between items-center"
                            >
                              <div>
                                <p className="font-semibold text-foreground text-left">{s.name}</p>
                                <p className="text-muted-foreground text-[10px] text-left">{s.course} · {s.yearLevel}</p>
                              </div>
                              <span className="font-mono text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded text-[10px]">{s.id}</span>
                            </div>
                          ))}
                        {students.filter(s => s.status === "active" && (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.includes(studentSearch))).length === 0 && (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No active students found.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {showQuickRegister ? (
                  <div className="p-4 bg-gray-50 border border-dashed border-border rounded-xl space-y-3 mt-3 text-left">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold text-[#106A2E] flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Quick Register Student</span>
                      <button type="button" onClick={() => { setShowQuickRegister(false); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-foreground mb-1">Student ID *</label>
                        <input
                          value={quickId}
                          onChange={e => {
                            setQuickId(e.target.value);
                            setQuickEmail(e.target.value ? `${e.target.value.replace(/\s+/g, "")}@cdm.edu.ph` : "");
                          }}
                          placeholder="e.g. 2024-1111"
                          className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-foreground mb-1">Full Name *</label>
                        <input
                          value={quickName}
                          onChange={e => setQuickName(e.target.value)}
                          placeholder="e.g. Juan dela Cruz"
                          className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-foreground mb-1">Email Address *</label>
                        <input
                          value={quickEmail}
                          onChange={e => setQuickEmail(e.target.value)}
                          placeholder="e.g. 2024-1111@cdm.edu.ph"
                          className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-foreground mb-1">Course</label>
                          <select value={quickCourse} onChange={e => setQuickCourse(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]">
                            <option value="BSIT">BSIT</option>
                            <option value="BSBA">BSBA</option>
                            <option value="BSEd">BSEd</option>
                            <option value="BSCE">BSCE</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-foreground mb-1">Year</label>
                          <select value={quickYearLevel} onChange={e => setQuickYearLevel(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]">
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickRegister}
                      className="w-full py-1.5 bg-[#106A2E] text-white text-xs font-semibold rounded-lg hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Register & Link Student
                    </button>
                  </div>
                ) : (
                  <div className="text-right mt-1.5 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickRegister(true);
                        if (studentSearch.includes("-") || /^\d+$/.test(studentSearch)) {
                          setQuickId(studentSearch);
                          setQuickEmail(`${studentSearch.replace(/\s+/g, "")}@cdm.edu.ph`);
                          setQuickName("");
                        } else {
                          setQuickName(studentSearch);
                          setQuickId("");
                          setQuickEmail("");
                        }
                      }}
                      className="text-xs text-[#106A2E] hover:underline font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Quick Register a new student
                    </button>
                  </div>
                )}

                {selectedStudent && (
                  <div className="p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-lg space-y-1.5 text-xs text-left">
                    <p className="font-bold text-[#106A2E] flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Student linked successfully</p>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground mt-2">
                      <div>Name: <span className="font-semibold text-foreground">{selectedStudent.name}</span></div>
                      <div>Student ID: <span className="font-mono font-semibold text-foreground">{selectedStudent.id}</span></div>
                      <div>Email: <span className="font-semibold text-foreground">{selectedStudent.email}</span></div>
                      <div>Course/Year: <span className="font-semibold text-foreground">{selectedStudent.course} — {selectedStudent.yearLevel}</span></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); setSelectedStudent(undefined); setStudentSearch(""); setStudentName(""); setStudentId(""); }} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={!studentName || !studentId || !selectedBook} className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    Confirm Reservation
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Returns Page ─────────────────────────────────────────────────────────────
function ReturnsPage({ transactions, onRefresh }: { transactions: Transaction[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [bookCondition, setBookCondition] = useState<"good" | "damaged" | "lost">("good");
  const [processed, setProcessed] = useState(false);

  const activeTxns = transactions.filter(t => t.status !== "returned");
  const results = activeTxns.filter(t =>
    !searchQuery || t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.studentId.includes(searchQuery) || t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const daysOverdue = selectedTxn ? Math.max(0, -getDueDaysLeft(selectedTxn.dueDate)) : 0;
  const latePenalty = daysOverdue * 5;
  const lostPenalty = bookCondition === "lost" ? 500 + 50 : 0;
  const damagePenalty = bookCondition === "damaged" ? 100 : 0;
  const totalPenalty = latePenalty + lostPenalty + damagePenalty;

  function handleProcess() {
    if (!selectedTxn) return;
    fetch("/api/transactions/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: selectedTxn.id,
        bookCondition,
        penalty: totalPenalty
      })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        setProcessed(true);
        onRefresh();
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to process return.");
    });
  }

  if (processed && selectedTxn) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-border p-8 text-center">
          <div className="w-14 h-14 bg-[#106A2E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#106A2E]" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Return Processed</h2>
          <p className="text-muted-foreground text-sm mb-4"><strong>{selectedTxn.bookTitle}</strong> returned by <strong>{selectedTxn.studentName}</strong></p>
          {totalPenalty > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="font-bold text-red-800 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Penalties Applied</p>
              {latePenalty > 0 && <p className="text-sm text-red-700">{daysOverdue} day(s) overdue → ₱{latePenalty}.00</p>}
              {damagePenalty > 0 && <p className="text-sm text-red-700">Book damage → ₱{damagePenalty}.00</p>}
              {lostPenalty > 0 && <p className="text-sm text-red-700">Lost book → ₱{lostPenalty}.00</p>}
              <div className="border-t border-red-200 mt-2 pt-2">
                <p className="font-bold text-red-800">Total: ₱{totalPenalty}.00</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4 inline mr-1" />No penalties. Book returned on time in good condition.
            </div>
          )}
          <button onClick={() => { setProcessed(false); setSelectedTxn(null); setSearchQuery(""); setBookCondition("good"); }}
            className="w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors">
            Process Another Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg text-foreground">Process Book Returns</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Search for a transaction to process a return.</p>
      </div>

      {!selectedTxn ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by student name, ID, or transaction ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border text-xs text-muted-foreground font-medium bg-gray-50">
              Active Transactions ({results.length})
            </div>
            <div className="divide-y divide-border">
              {results.map(txn => {
                const daysLeft = getDueDaysLeft(txn.dueDate);
                return (
                  <div key={txn.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{txn.id}</span>
                        <Badge variant={txn.status === "overdue" ? "danger" : "success"}>
                          {txn.status === "overdue" ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-foreground">{txn.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">{txn.studentName} · {txn.studentId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Due: {formatDate(txn.dueDate)}</p>
                    </div>
                    <button onClick={() => setSelectedTxn(txn)}
                      className="flex-shrink-0 px-4 py-2 bg-[#106A2E] text-white text-xs font-medium rounded-lg hover:bg-[#0D7856] transition-colors flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Return
                    </button>
                  </div>
                );
              })}
              {results.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No transactions found.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-[#106A2E] p-5 flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2"><RotateCcw className="w-4 h-4" />Process Return</h2>
            <button onClick={() => setSelectedTxn(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="p-4 bg-[#F1F1F1] rounded-xl space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Transaction</span><span className="font-mono text-xs font-semibold">{selectedTxn.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Book</span><span className="font-medium text-right max-w-xs">{selectedTxn.bookTitle}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selectedTxn.studentName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-medium text-red-600">{formatDate(selectedTxn.dueDate)}</span></div>
              {daysOverdue > 0 && (
                <div className="flex justify-between pt-1 border-t border-dashed border-border">
                  <span className="text-red-600 font-medium">Days Overdue</span>
                  <span className="font-bold text-red-600">{daysOverdue} day(s)</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Book Condition *</label>
              <div className="space-y-2">
                {[
                  { value: "good", label: "Good Condition", desc: "Book is intact, no damage", color: "emerald" },
                  { value: "damaged", label: "Damaged", desc: "Torn pages, water damage, etc. → ₱100 penalty", color: "orange" },
                  { value: "lost", label: "Lost / Missing", desc: "Book cannot be returned → Replacement cost + ₱50", color: "red" },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${bookCondition === opt.value ? `border-${opt.color}-400 bg-${opt.color}-50` : "border-border hover:bg-gray-50"}`}>
                    <input type="radio" name="condition" value={opt.value} checked={bookCondition === opt.value as typeof bookCondition}
                      onChange={e => setBookCondition(e.target.value as typeof bookCondition)} className="mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {totalPenalty > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-red-800 mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Penalty Summary</p>
                {latePenalty > 0 && <div className="flex justify-between text-red-700 text-xs"><span>Late return ({daysOverdue}d × ₱5)</span><span>₱{latePenalty}.00</span></div>}
                {damagePenalty > 0 && <div className="flex justify-between text-red-700 text-xs"><span>Damage fee</span><span>₱{damagePenalty}.00</span></div>}
                {lostPenalty > 0 && <div className="flex justify-between text-red-700 text-xs"><span>Lost book (replacement + processing)</span><span>₱{lostPenalty}.00</span></div>}
                <div className="border-t border-red-200 mt-1.5 pt-1.5 flex justify-between font-bold text-red-800">
                  <span>Total Penalty</span><span>₱{totalPenalty}.00</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setSelectedTxn(null)} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleProcess} className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Terms & Conditions Page ──────────────────────────────────────────────────
function TermsPage() {
  const sections = [
    {
      title: "1. Membership & Eligibility",
      content: [
        "Library services are exclusively available to currently enrolled students, teaching staff, and accredited personnel of Colegio de Montalban (CDM).",
        "A valid CDM Student ID or Employee ID is required to access library borrowing services.",
        "Membership privileges may be suspended or revoked for violations of these terms and conditions.",
      ],
    },
    {
      title: "2. Book Borrowing Policy",
      content: [
        "Students are allowed to borrow a maximum of three (3) books simultaneously.",
        "The standard borrowing period is seven (7) calendar days from the date of borrowing.",
        "Books must be returned to the library circulation desk and must be received by an authorized librarian.",
        "Borrowers are responsible for the proper care of borrowed materials from the time of borrowing until its return.",
        "Books that are in high demand may have a shorter borrowing period as determined by the Head Librarian.",
        "Renewed loans must be presented physically at the circulation desk. Renewal is permitted only once per material.",
      ],
    },
    {
      title: "3. Book Reservation Policy",
      content: [
        "Reservations must be made exactly one (1) day before the intended pickup date — no earlier, no later.",
        "Each student is entitled to a maximum of one (1) active reservation at any given time.",
        "Reserved books are held for one (1) day only. Failure to claim within this period will result in automatic cancellation of the reservation.",
        "The librarian processes reservation requests during library operating hours only.",
        "Reservation does not guarantee availability if a book is currently on loan and has not been returned.",
      ],
    },
    {
      title: "4. Late Return Penalties",
      content: [
        "A fine of ₱5.00 (five pesos) per calendar day will be imposed for every day a book is overdue, including weekends and holidays.",
        "Fines must be settled before any further borrowing privileges can be restored.",
        "The library reserves the right to suspend borrowing privileges of students with accumulated outstanding fines exceeding ₱100.00.",
        "Fines are non-waivable except upon formal appeal reviewed by the Head Librarian and approved by the School Administrator.",
      ],
    },
    {
      title: "5. Lost, Damaged, or Missing Books",
      content: [
        "MINOR PENALTY — For books returned in damaged condition (torn pages, water damage, broken spine, defaced covers, or similar damage): the borrower shall pay a damage fee of ₱100.00 plus the assessed repair cost.",
        "MAJOR PENALTY — For lost or missing books: the borrower shall pay the full current replacement cost of the book plus a ₱50.00 non-refundable processing fee.",
        "The replacement cost is determined based on the current market value or publisher's price, not the original acquisition cost.",
        "If a reported lost book is later found and returned, only the processing fee of ₱50.00 shall be retained. The replacement cost shall be refunded.",
        "The Head Librarian must be notified immediately upon the discovery that a book has been lost or irreparably damaged.",
      ],
    },
    {
      title: "6. QR Receipt",
      content: [
        "A QR receipt is generated for every borrowing transaction and contains the borrower's name, student ID, book title, author, borrowing date, due date, and the name of the assisting librarian.",
        "The QR receipt serves as the official proof of borrowing and should be kept until the book is returned.",
        "Loss of the QR receipt does not exempt the borrower from their obligations. The librarian will verify the transaction from system records.",
        "Scanning the QR code will display the complete transaction details at any CDM library terminal.",
      ],
    },
    {
      title: "7. General Library Conduct",
      content: [
        "Silence must be observed at all times within the library. Loud conversations, mobile phone calls, and disruptive behavior are strictly prohibited.",
        "Food and beverages are not allowed inside the library premises.",
        "All bags must be deposited at the bag counter before entering the library. The library is not responsible for any lost or damaged items.",
        "The use of library computers is limited to academic research purposes only.",
        "Any attempt to steal, conceal, mutilate, or deface library materials is a serious offense that may result in disciplinary action as stipulated in the CDM Student Handbook.",
      ],
    },
    {
      title: "8. Amendments & Enforcement",
      content: [
        "These terms and conditions are subject to revision by the CDM Library Administration without prior notice.",
        "The Head Librarian and School Administration reserve the right to enforce these policies and to address situations not explicitly covered herein.",
        "By borrowing any library material, the borrower acknowledges that they have read, understood, and agreed to these terms and conditions.",
        "For concerns, appeals, or inquiries, please approach the Head Librarian during official library operating hours.",
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-[#106A2E] rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <Shield className="w-8 h-8 text-[#F4D35E] mb-3" />
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-family-display)" }}>
          Terms and Conditions
        </h1>
        <p className="text-white/80 text-sm">CDM Integrated Library Management System</p>
        <p className="text-white/50 text-xs mt-3">Last updated: June 2024 · Colegio de Montalban, Rodriguez, Rizal</p>
      </div>

      <div className="bg-[#F4D35E]/10 border border-[#F4D35E] rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#7a6500] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#7a6500] leading-relaxed">
          These Terms and Conditions govern the use of library services at Colegio de Montalban. All students and personnel are required to comply. Any violation may result in suspension of library privileges and/or disciplinary proceedings.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((sec, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-[#106A2E] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <h2 className="font-bold text-sm text-foreground">{sec.title}</h2>
            </div>
            <div className="p-4 space-y-2">
              {sec.content.map((item, j) => (
                <div key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#106A2E] mt-2 flex-shrink-0" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1F1F1F] rounded-xl p-5 text-center">
        <p className="text-white/70 text-xs mb-1">CDM Integrated Library Management System</p>
        <p className="text-white/40 text-xs">© 2024 Colegio de Montalban, Rodriguez, Rizal · BSIT 3A Capstone Group 10</p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { id: "catalog" as Page, label: "Book Catalog", icon: BookOpen },
  { id: "students" as Page, label: "Student Directory", icon: Users },
  { id: "borrow" as Page, label: "Borrow Book", icon: BookMarked },
  { id: "reservations" as Page, label: "Reservations", icon: Calendar },
  { id: "returns" as Page, label: "Return Books", icon: RotateCcw },
  { id: "terms" as Page, label: "Terms & Conditions", icon: FileText },
];

function Sidebar({ currentPage, onNavigate, librarianName, onLogout, collapsed, onToggle }: {
  currentPage: Page; onNavigate: (p: Page) => void; librarianName: string; onLogout: () => void; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <div className={`flex flex-col h-screen bg-[#106A2E] transition-all duration-300 ${collapsed ? "w-16" : "w-60"} flex-shrink-0 shadow-xl`}>
      {/* Header */}
      <div className="p-4 border-b border-white/15 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="bg-[#F4D35E] rounded-xl p-1.5 flex-shrink-0">
              <Library className="w-5 h-5 text-[#1F1F1F]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">CDM Library</p>
              <p className="text-white/50 text-xs mt-0.5">Management System</p>
            </div>
          </div>
        )}
        {collapsed && <div className="bg-[#F4D35E] rounded-xl p-1.5 mx-auto"><Library className="w-5 h-5 text-[#1F1F1F]" /></div>}
        <button onClick={onToggle} className="text-white/60 hover:text-white transition-colors ml-auto p-1 rounded">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button key={id} onClick={() => onNavigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group
                  ${isActive ? "bg-[#F4D35E] text-[#1F1F1F]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#1F1F1F]" : ""}`} />
                {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
                {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1F1F1F]/30" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/15">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/10 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#F4D35E] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#1F1F1F]" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{librarianName}</p>
              <p className="text-white/50 text-xs">Librarian</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full bg-[#F4D35E] flex items-center justify-center">
              <User className="w-4 h-4 text-[#1F1F1F]" />
            </div>
          </div>
        )}
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  type: "info" | "warning" | "success" | "danger";
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionPage?: Page;
}

function MainLayout({ children, currentPage, librarianName, books, transactions, reservations, onNavigate, onLogout }: {
  children: React.ReactNode; currentPage: Page; librarianName: string;
  books: Book[]; transactions: Transaction[]; reservations: Reservation[];
  onNavigate: (p: Page) => void; onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const list: NotificationItem[] = [];
    
    // 1. Overdue notifications
    transactions.forEach(t => {
      if (t.status === "overdue") {
        list.push({
          id: `notif-overdue-${t.id}`,
          type: "danger",
          title: "Overdue Book Alert",
          message: `"${t.studentName}" has not returned "${t.bookTitle}" (Due: ${formatDate(t.dueDate)}).`,
          time: "1 day ago",
          read: false,
          actionPage: "returns"
        });
      }
    });

    // 2. Pending Pickups
    reservations.forEach(r => {
      if (r.status === "pending") {
        list.push({
          id: `notif-pickup-${r.id}`,
          type: "warning",
          title: "Pending Pickup Today",
          message: `"${r.studentName}" is scheduled to pick up "${r.bookTitle}" today.`,
          time: "2 hours ago",
          read: false,
          actionPage: "reservations"
        });
      }
    });

    // 3. Low stock notifications
    books.forEach(b => {
      if (b.available === 0) {
        list.push({
          id: `notif-stock-${b.id}`,
          type: "info",
          title: "Book Out of Stock",
          message: `"${b.title}" is currently out of stock (0 of ${b.total} copies available).`,
          time: "3 hours ago",
          read: false,
          actionPage: "catalog"
        });
      }
    });

    // 4. System info
    list.push({
      id: "notif-system-welcome",
      type: "success",
      title: "System Online",
      message: `Welcome back to Colegio de Montalban Library System. Logged in as ${librarianName}.`,
      time: "Just now",
      read: false,
      actionPage: "dashboard"
    });

    setNotifications(list);
  }, [books, transactions, reservations, librarianName]);

  const titles: Record<Page, string> = {
    login: "Login", register: "Register", dashboard: "Dashboard", catalog: "Book Catalog",
    students: "Student Directory", borrow: "Borrow Book", reservations: "Reservations", returns: "Return Books", terms: "Terms & Conditions",
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  function handleNotificationClick(notif: NotificationItem) {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setShowNotifications(false);
    if (notif.actionPage) {
      onNavigate(notif.actionPage);
    }
  }

  function handleMarkAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function handleClearAll() {
    setNotifications([]);
  }

  function handleRemoveNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "var(--font-family-sans)" }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} librarianName={librarianName} onLogout={onLogout} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div>
            <h1 className="font-bold text-foreground text-base">{titles[currentPage]}</h1>
            <p className="text-xs text-muted-foreground">Colegio de Montalban · Library System</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg transition-colors focus:outline-none cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-[#106A2E]" />
                        <span className="font-semibold text-sm text-foreground">Notifications</span>
                      </div>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead} 
                            className="text-xs text-[#106A2E] hover:underline font-medium focus:outline-none cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button 
                            onClick={handleClearAll} 
                            className="text-xs text-red-600 hover:underline font-medium focus:outline-none cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-35" />
                          <p className="text-xs">No notifications yet.</p>
                        </div>
                      ) : (
                        notifications.map(notif => {
                          const iconColors = {
                            info: "bg-blue-50 text-blue-600 border-blue-100",
                            warning: "bg-amber-50 text-amber-700 border-amber-100",
                            danger: "bg-red-50 text-red-600 border-red-100",
                            success: "bg-emerald-50 text-emerald-700 border-emerald-100"
                          };
                          const TypeIcon = notif.type === "danger" ? AlertTriangle 
                            : notif.type === "warning" ? Calendar 
                            : notif.type === "success" ? CheckCircle 
                            : Info;

                          return (
                            <div 
                              key={notif.id} 
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 flex gap-3 text-left transition-colors cursor-pointer hover:bg-gray-50 relative ${!notif.read ? "bg-emerald-50/25" : ""}`}
                            >
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${iconColors[notif.type]}`}>
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                  {notif.title}
                                  {!notif.read && (
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-words">{notif.message}</p>
                                <p className="text-[10px] text-muted-foreground/75 mt-1">{notif.time}</p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveNotification(notif.id); }}
                                className="absolute top-2.5 right-2.5 text-muted-foreground/50 hover:text-foreground p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-[#106A2E] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground">{librarianName}</p>
                <p className="text-xs text-muted-foreground">Librarian</p>
              </div>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#F1F1F1] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Book Form Modal (Add / Edit) ─────────────────────────────────────────────
interface BookFormModalProps {
  book?: Book | null;
  onClose: () => void;
  onRefresh: () => void;
}

function BookFormModal({ book, onClose, onRefresh }: BookFormModalProps) {
  const [id, setId] = useState(book?.id || "");
  const [title, setTitle] = useState(book?.title || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [isbn, setIsbn] = useState(book?.isbn || "");
  const [category, setCategory] = useState(book?.category || "Literature");
  const [cover, setCover] = useState(book?.cover || "");
  const [abstract, setAbstract] = useState(book?.abstract || "");
  const [total, setTotal] = useState(book?.total !== undefined ? String(book.total) : "1");
  const [publishYear, setPublishYear] = useState(book?.publishYear !== undefined ? String(book.publishYear) : "2024");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!book;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!id || !title || !author || !isbn || !category || !total) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const url = isEdit ? `/api/books/${book.id}` : "/api/books";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          author,
          isbn,
          category,
          cover,
          abstract,
          total: parseInt(total, 10),
          publishYear: publishYear ? parseInt(publishYear, 10) : null
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving the book.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#106A2E] p-5 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> {isEdit ? "Edit Book Details" : "Add New Book"}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-750 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Book ID *</label>
              <input
                value={id}
                onChange={e => setId(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. B009"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] disabled:opacity-60"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">ISBN *</label>
              <input
                value={isbn}
                onChange={e => setIsbn(e.target.value)}
                placeholder="e.g. 978-3-16-148410-0"
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Book Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. The Pragmatic Programmer"
              required
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Author *</label>
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="e.g. Andy Hunt"
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                {CATEGORIES.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Total Copies *</label>
              <input
                type="number"
                min="1"
                value={total}
                onChange={e => setTotal(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Publish Year</label>
              <input
                type="number"
                value={publishYear}
                onChange={e => setPublishYear(e.target.value)}
                placeholder="e.g. 1999"
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Cover Image URL</label>
            <input
              value={cover}
              onChange={e => setCover(e.target.value)}
              placeholder="e.g. https://images.unsplash.com/..."
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Abstract / Description</label>
            <textarea
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
              placeholder="Enter book summary..."
              rows={3}
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2 cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Book Modal ────────────────────────────────────────────────────────
interface DeleteBookModalProps {
  book: Book;
  onClose: () => void;
  onRefresh: () => void;
}

function DeleteBookModal({ book, onClose, onRefresh }: DeleteBookModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting the book.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-left">
        <div className="bg-red-600 p-5 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" /> Delete Book
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong>{book.title}</strong> (ID: {book.id})? This action cannot be undone.
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer">
              {error ? "Close" : "Cancel"}
            </button>
            {!error && (
              <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Students Page ────────────────────────────────────────────────────────────
function StudentsPage({
  students,
  onAdd,
  onEdit,
  onDelete,
}: {
  students: Student[];
  onAdd: () => void;
  onEdit: (s: Student) => void;
  onDelete: (s: Student) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = students.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search)
  );

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-foreground">Student Directory</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage registered students, their status, and academic info.
          </p>
        </div>
        <button
          onClick={onAdd}
          className="bg-[#106A2E] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0D7856] transition-colors flex items-center gap-2 shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register Student
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students by name or Student ID..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} student{filtered.length !== 1 ? "s" : ""} found
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">Student ID</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Course & Year</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3 font-mono text-xs font-semibold text-foreground">
                    {s.id}
                  </td>
                  <td className="p-3 font-semibold text-foreground">{s.name}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {s.course} · {s.yearLevel}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{s.email}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {s.phone || "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant={s.status === "active" ? "success" : "danger"}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(s)}
                        className="p-1.5 hover:bg-gray-100 text-gray-700 rounded transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
                        title="Edit Student"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(s)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                        title="Delete Student"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Student Form Modal (Register / Edit) ───────────────────────────────────
interface StudentFormModalProps {
  student?: Student | null;
  onClose: () => void;
  onRefresh: () => void;
}

function StudentFormModal({ student, onClose, onRefresh }: StudentFormModalProps) {
  const [id, setId] = useState(student?.id || "");
  const [name, setName] = useState(student?.name || "");
  const [email, setEmail] = useState(student?.email || "");
  const [phone, setPhone] = useState(student?.phone || "");
  const [course, setCourse] = useState(student?.course || "BSIT");
  const [yearLevel, setYearLevel] = useState(student?.yearLevel || "1st Year");
  const [status, setStatus] = useState<"active" | "suspended">(student?.status || "active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!student;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!id || !name || !email) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const url = isEdit ? `/api/students/${student.id}` : "/api/students";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          email,
          phone,
          course,
          yearLevel,
          status,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving the student record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#106A2E] p-5 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> {isEdit ? "Edit Student Details" : "Register Student"}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-750 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Student ID *</label>
              <input
                value={id}
                onChange={e => setId(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. 2024-0001"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. juan@cdm.edu.ph"
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Phone Number</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 09123456789"
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Course</label>
              <select
                value={course}
                onChange={e => setCourse(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                <option value="BSIT">BSIT</option>
                <option value="BSBA">BSBA</option>
                <option value="BSEd">BSEd</option>
                <option value="BSCE">BSCE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Year Level</label>
              <select
                value={yearLevel}
                onChange={e => setYearLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Account Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as "active" | "suspended")}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Register Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Student Modal ───────────────────────────────────────────────────
interface DeleteStudentModalProps {
  student: Student;
  onClose: () => void;
  onRefresh: () => void;
}

function DeleteStudentModal({ student, onClose, onRefresh }: DeleteStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting the student record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-left">
        <div className="bg-red-600 p-5 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" /> Delete Student Record
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete student <strong>{student.name}</strong> (ID: {student.id})? This action cannot be undone and will remove all enrollment info from library records.
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer">
              {error ? "Close" : "Cancel"}
            </button>
            {!error && (
              <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authPage, setAuthPage] = useState<"login" | "register">("login");
  const [librarianName, setLibrarianName] = useState<string | null>(() => {
    return localStorage.getItem("librarianName");
  });
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [borrowBook, setBorrowBook] = useState<Book | undefined>(undefined);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [deleteBook, setDeleteBook] = useState<Book | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Student Directory States
  const [students, setStudents] = useState<Student[]>([]);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Database States
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAllData() {
    try {
      const [resBooks, resTxns, resReservations, resStudents] = await Promise.all([
        fetch("/api/books").then(r => r.json()),
        fetch("/api/transactions").then(r => r.json()),
        fetch("/api/reservations").then(r => r.json()),
        fetch("/api/students").then(r => r.json())
      ]);
      setBooks(resBooks);
      setTransactions(resTxns);
      setReservations(resReservations);
      setStudents(resStudents);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (librarianName) {
      fetchAllData();
    }
  }, [librarianName]);

  function handleLogin(name: string) {
    setLibrarianName(name);
    setCurrentPage("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("librarianName");
    setLibrarianName(null);
    setAuthPage("login");
  }

  function handleBorrow(book: Book) {
    setBorrowBook(book);
    setCurrentPage("borrow");
  }

  function handlePreview(book: Book) {
    setPreviewBook(book);
  }

  if (!librarianName) {
    if (authPage === "register") return <RegisterPage onBack={() => setAuthPage("login")} />;
    return <LoginPage onLogin={handleLogin} onGoRegister={() => setAuthPage("register")} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-[#106A2E] animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading library system...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-family-sans)" }}>
      {previewBook && (
        <BookPreviewModal
          book={previewBook}
          onClose={() => setPreviewBook(null)}
          onBorrow={(b) => { handleBorrow(b); setPreviewBook(null); }}
          onEdit={setEditBook}
          onDelete={setDeleteBook}
        />
      )}
      {showAddModal && (
        <BookFormModal
          onClose={() => setShowAddModal(false)}
          onRefresh={fetchAllData}
        />
      )}
      {editBook && (
        <BookFormModal
          book={editBook}
          onClose={() => setEditBook(null)}
          onRefresh={fetchAllData}
        />
      )}
      {deleteBook && (
        <DeleteBookModal
          book={deleteBook}
          onClose={() => setDeleteBook(null)}
          onRefresh={fetchAllData}
        />
      )}
      {showAddStudentModal && (
        <StudentFormModal
          onClose={() => setShowAddStudentModal(false)}
          onRefresh={fetchAllData}
        />
      )}
      {editStudent && (
        <StudentFormModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onRefresh={fetchAllData}
        />
      )}
      {deleteStudent && (
        <DeleteStudentModal
          student={deleteStudent}
          onClose={() => setDeleteStudent(null)}
          onRefresh={fetchAllData}
        />
      )}
      <MainLayout 
        currentPage={currentPage} 
        librarianName={librarianName} 
        books={books}
        transactions={transactions}
        reservations={reservations}
        onNavigate={setCurrentPage} 
        onLogout={handleLogout}
      >
        {currentPage === "dashboard" && (
          <DashboardPage 
            books={books}
            transactions={transactions}
            reservations={reservations}
            librarianName={librarianName} 
            onNavigate={setCurrentPage} 
          />
        )}
        {currentPage === "catalog" && (
          <CatalogPage
            books={books}
            onBorrow={handleBorrow}
            onPreview={handlePreview}
            onAdd={() => setShowAddModal(true)}
            onEdit={setEditBook}
            onDelete={setDeleteBook}
          />
        )}
        {currentPage === "students" && (
          <StudentsPage
            students={students}
            onAdd={() => setShowAddStudentModal(true)}
            onEdit={setEditStudent}
            onDelete={setDeleteStudent}
          />
        )}
        {currentPage === "borrow" && (
          <BorrowPage
            books={books}
            students={students}
            librarianName={librarianName}
            preselectedBook={borrowBook}
            onDone={() => { setBorrowBook(undefined); setCurrentPage("dashboard"); }}
            onRefresh={fetchAllData}
          />
        )}
        {currentPage === "reservations" && (
          <ReservationsPage 
            books={books}
            reservations={reservations}
            students={students}
            onRefresh={fetchAllData}
          />
        )}
        {currentPage === "returns" && (
          <ReturnsPage 
            transactions={transactions}
            onRefresh={fetchAllData}
          />
        )}
        {currentPage === "terms" && <TermsPage />}
      </MainLayout>
    </div>
  );
}
