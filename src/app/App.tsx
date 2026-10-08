import { useState, useMemo, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import libraryBrandImg from "@/imports/672249359_1247900927325779_3798022234977448862_n.jpg";
import {
  BookOpen, LayoutDashboard, Calendar, RotateCcw, FileText, LogOut,
  Search, QrCode, Bell, User, AlertTriangle, CheckCircle, Clock,
  TrendingUp, Users, BookMarked, Eye, EyeOff, Shield, Star, Printer, X, Plus,
  ArrowRight, ArrowLeft, Info, Hash, Check, ChevronRight, Quote, GraduationCap,
  ChevronLeft, AlertCircle, Menu, BookX, Library, Filter, Loader2,
  Edit, Trash, Trash2, Tag, SlidersHorizontal, Layers, Copy, CheckCircle2, Smartphone,
  KeyRound, Lock, ShieldCheck, Mail, Phone, BadgeCheck, LayoutGrid, List,
  MoreVertical, ArrowUpDown, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  MotionAppSkeleton,
  MotionSkeletonCatalogGrid,
  MotionSkeletonTable,
  MotionSkeletonStats,
  MotionMorphWrapper,
  MotionSkeleton
} from "@/app/components/MotionSkeletonLoader";

// ─── Global Fetch Interceptor for JWT ─────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
  const token = localStorage.getItem("authToken");
  if (token) {
    options = options || {};
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      options.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (options.headers as any)["Authorization"] = `Bearer ${token}`;
    }
  }
  const response = await originalFetch(url, options);
  if ((response.status === 401 || response.status === 403) && typeof url === "string" && !url.includes("/api/auth/login")) {
    localStorage.removeItem("librarianName");
    localStorage.removeItem("authToken");
    window.location.reload();
  }
  return response;
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = "login" | "register" | "dashboard" | "catalog" | "students" | "borrow" | "reservations" | "returns" | "terms" | "reports" | "librarians";

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
  callNo?: string;
  institute?: string;
  yearLevel?: string;
  semester?: string;
  marcTags?: string[];
  pdfUrl?: string;
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
  status: "active" | "returned" | "overdue" | "lost" | "closed" | "pending_fines";
  bookCondition?: string;
  penalty?: number;
  replacementStatus?: "not_applicable" | "pending" | "submitted" | "verified";
  replacementVerifiedBy?: number;
  replacementVerifiedAt?: string;
}

interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  studentId: string;
  reservationDate: string;
  pickupDate: string;
  status: "pending" | "ready" | "cancelled" | "fulfilled";
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  yearLevel: string;
  status: "active" | "inactive" | "graduated" | "hold";
  avatarUrl?: string;
}

interface Librarian {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employeeId: string;
  role: string;
  username: string;
  status: "active" | "pending" | "rejected";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAILY_QUOTES = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "Libraries store the energy that fuels the imagination. They open up windows to the world.", author: "Sidney Sheldon" },
  { text: "The only thing that you absolutely have to know, is the location of the library.", author: "Albert Einstein" },
  { text: "When in doubt, go to the library.", author: "J.K. Rowling" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "Knowledge is power. Information is liberating. Education is the premise of progress.", author: "Kofi Annan" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" }
];

const TODAY_QUOTE = DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length];

const INSTITUTES = [
  { code: "All", name: "All Institutes", badgeBg: "bg-gray-100", badgeText: "text-gray-700" },
  { code: "ICS", name: "ICS (Computer Studies & CpE)", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800", color: "#106A2E" },
  { code: "ITE", name: "ITE (Teacher Education & GenEd)", badgeBg: "bg-orange-100", badgeText: "text-orange-800", color: "#C2410C" },
  { code: "IBE", name: "IBE (Business & Entrep)", badgeBg: "bg-blue-100", badgeText: "text-blue-800", color: "#1E40AF" }
];

const YEAR_LEVELS = ["All Years", "1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["All Semesters", "1st Sem", "2nd Sem"];

const CATEGORIES = [
  "All",
  "Computer Studies & Engineering (ICS - BSIT / BSCPE)",
  "Teacher Education & GenEd (ITE - BEED / BTLED / BECED / BSED)",
  "Business & Entrepreneurship (IBE - BSBA / BS ENTREP)"
];

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

// ─── Real Dynamic QR Code Component ─────────────────────────────────────────
function QRCodeVisual({ data, size = 120 }: { data: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    if (data) {
      QRCode.toDataURL(data, {
        width: size * 2,
        margin: 1,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "M"
      })
        .then((url) => {
          if (isMounted) setDataUrl(url);
        })
        .catch((err) => console.error("QR Render Error:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [data, size]);

  if (!dataUrl) {
    return (
      <div className="p-3 bg-white rounded-xl border border-gray-200 inline-flex items-center justify-center shadow-xs" style={{ width: size, height: size }}>
        <QrCode className="w-12 h-12 text-gray-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-white rounded-xl border border-gray-200 inline-block shadow-xs">
      <img
        src={dataUrl}
        alt={`QR Code: ${data}`}
        style={{ width: size, height: size, display: "block", borderRadius: 8, imageRendering: "pixelated" }}
      />
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
    green: "border-l-[#106A2E] text-[#106A2E]",
    yellow: "border-l-amber-500 text-amber-600",
    red: "border-l-red-500 text-red-600",
    blue: "border-l-blue-500 text-blue-600",
  };

  return (
    <div className={`p-4 rounded-xl border border-border shadow-xs border-l-4 ${colors[color].split(" ")[0]} bg-white text-left`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-gray-50 ${colors[color].split(" ")[1]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Book Card (Linear / Shadcn Aesthetic) ──────────────────────────────────
function BookCard({ book, onPreview, onBorrow, onEdit, onDelete }: {
  book: Book;
  onPreview: (b: Book) => void;
  onBorrow: (b: Book) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isAvailable = book.available > 0;

  return (
    <div className="bg-white rounded-xl border border-zinc-200/90 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between overflow-hidden relative text-left">
      <div>
        {/* Cover Container (3:4 aspect ratio) */}
        <div className="relative aspect-[3/4] w-full bg-slate-900 overflow-hidden group">
          {book.cover && !imageError ? (
            <div className="relative w-full h-full">
              <img
                src={book.cover}
                alt={book.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
            </div>
          ) : (
            /* Clean Typographic Spine Fallback Cover */
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4 flex flex-col justify-between relative overflow-hidden select-none">
              <div className="absolute -right-4 -bottom-4 text-emerald-500/10 font-black text-6xl font-mono pointer-events-none uppercase">
                {book.institute || "CDM"}
              </div>
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-mono tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/30">
                  {book.institute || "CDM"}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {book.publishYear || "2024"}
                </span>
              </div>
              <div className="z-10 my-auto py-2">
                <p className="text-white font-serif font-bold text-sm leading-snug line-clamp-3 tracking-tight">
                  {book.title}
                </p>
                <p className="text-emerald-200/80 text-[11px] font-sans mt-1.5 line-clamp-1 font-medium">
                  {book.author}
                </p>
              </div>
              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between z-10 text-[10px] text-zinc-400 font-mono">
                <span>CDM LIBRARY</span>
                <span>{book.callNo || "REF-001"}</span>
              </div>
            </div>
          )}

          {/* Consolidated Single Status Indicator Badge */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {isAvailable ? (
              <span className="bg-emerald-900/90 backdrop-blur-md text-emerald-200 border border-emerald-400/30 text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Available ({book.available}/{book.total})
              </span>
            ) : (
              <span className="bg-zinc-900/90 backdrop-blur-md text-zinc-300 border border-zinc-700/50 text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                Out of Stock (0/{book.total})
              </span>
            )}
          </div>

          {/* Discreet 3-Dot Action Menu */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="w-7 h-7 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                title="More Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-zinc-200 shadow-lg z-30 overflow-hidden text-xs py-1 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(book); }}
                      className="w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-100 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-zinc-500" /> Edit Record
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(book); }}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5 text-red-500" /> Delete Record
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Hierarchy */}
        <div className="p-3.5 space-y-2">
          {/* Monospaced Call Number Badge */}
          {book.callNo && (
            <div className="font-mono text-[11px] text-zinc-700 bg-zinc-100/80 px-2 py-0.5 rounded-md border border-zinc-200/80 w-fit flex items-center gap-1 font-medium">
              <Tag className="w-3 h-3 text-zinc-500" />
              <span>{book.callNo}</span>
            </div>
          )}

          {/* Book Title */}
          <h3 className="font-semibold text-sm text-zinc-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
            {book.title}
          </h3>

          {/* Author & Year */}
          <p className="text-xs text-zinc-500 font-medium">
            {book.author} {book.publishYear ? `· ${book.publishYear}` : ""}
          </p>

          {/* Quiet Metadata Separators */}
          <div className="text-[11px] text-zinc-400 font-medium flex items-center flex-wrap gap-1 pt-1 border-t border-zinc-100">
            <span className="text-zinc-700 font-semibold">{book.institute || "ITE"}</span>
            <span>·</span>
            <span>{book.yearLevel || "1st Year"}</span>
            <span>·</span>
            <span>{book.borrowCount || 0} borrows</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3.5 pt-0 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPreview(book)}
          className="w-full py-2 px-2.5 border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-zinc-500" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          onClick={() => onBorrow(book)}
          disabled={!isAvailable}
          className="w-full py-2 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-emerald-700 disabled:cursor-not-allowed"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Borrow</span>
        </button>
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
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer">
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
            Please return the book on or before the due date. Overdue items will trigger an automated SMS return reminder (no daily cash fine).
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-[#106A2E] text-[#106A2E] rounded-lg text-sm font-medium hover:bg-[#106A2E]/5 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 py-2.5 px-4 bg-[#106A2E] text-white rounded-lg text-sm font-medium hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Book Preview Modal (With MARC 21 Viewer) ─────────────────────────────────
function BookPreviewModal({ book, onClose, onBorrow, onEdit, onDelete }: {
  book: Book;
  onClose: () => void;
  onBorrow: (b: Book) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "marc" | "pdf">("details");
  const [copiedMarc, setCopiedMarc] = useState(false);

  const instObj = INSTITUTES.find(i => i.code === book.institute);

  const marcLines = useMemo(() => {
    if (book.marcTags && book.marcTags.length > 0) {
      return book.marcTags;
    }
    return [
      `MARC 020 (ISBN): ${book.isbn}`,
      `MARC 082 (Call Number): ${book.callNo || "000 CDM"}`,
      `MARC 100 (Main Entry - Author): ${book.author}`,
      `MARC 245 (Title Statement): ${book.title}`,
      `MARC 260 (Publication): Colegio de Montalban Library, ${book.publishYear}`,
      `MARC 650 (Subject Term): ${book.category}`,
      `MARC 990 (Local Tag): #${book.institute || "ITE"} #${(book.yearLevel || "").replace(" ", "")} #${(book.semester || "").replace(" ", "")}`
    ];
  }, [book]);

  function handleCopyMarc() {
    const text = marcLines.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedMarc(true);
    setTimeout(() => setCopiedMarc(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        <div className="relative h-44 bg-[#106A2E] overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 flex items-end p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {book.institute && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${instObj?.badgeBg || "bg-white"} ${instObj?.badgeText || "text-emerald-900"}`}>
                    {book.institute}
                  </span>
                )}
                {book.yearLevel && (
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white text-xs font-medium backdrop-blur-xs">
                    {book.yearLevel} {book.semester ? `· ${book.semester}` : ""}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-xs">
                  {book.callNo || book.id}
                </span>
                {book.pdfUrl && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10px] flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF AVAILABLE
                  </span>
                )}
              </div>
              <h2 className="text-white text-xl md:text-2xl font-bold font-display leading-tight line-clamp-2">{book.title}</h2>
              <p className="text-white/80 text-xs md:text-sm mt-0.5">{book.author} · {book.publishYear}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 transition-colors rounded-full p-2 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-gray-50/80 px-6 pt-2">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === "details" ? "border-[#106A2E] text-[#106A2E]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Book Overview
          </button>
          <button
            onClick={() => setActiveTab("marc")}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === "marc" ? "border-[#106A2E] text-[#106A2E]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Tag className="w-3.5 h-3.5" /> MARC 21 Record Format
          </button>
          <button
            onClick={() => setActiveTab("pdf")}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === "pdf" ? "border-[#106A2E] text-[#106A2E]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="w-3.5 h-3.5" /> PDF Chapter Preview
            {book.pdfUrl && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-left space-y-4">
          {activeTab === "details" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-center md:text-left">
                  <p className="text-[11px] text-muted-foreground uppercase font-medium">Call Number</p>
                  <p className="font-mono text-xs font-bold text-[#106A2E] mt-0.5 truncate">{book.callNo || "N/A"}</p>
                </div>
                <div className="text-center md:text-left border-l border-border pl-3">
                  <p className="text-[11px] text-muted-foreground uppercase font-medium">ISBN</p>
                  <p className="font-mono text-xs font-semibold text-foreground mt-0.5 truncate">{book.isbn}</p>
                </div>
                <div className="text-center md:text-left border-l border-border pl-3">
                  <p className="text-[11px] text-muted-foreground uppercase font-medium">Availability</p>
                  <p className="font-bold text-xs mt-0.5" style={{ color: book.available > 0 ? "#106A2E" : "#c0392b" }}>
                    {book.available} / {book.total} Copies
                  </p>
                </div>
                <div className="text-center md:text-left border-l border-border pl-3">
                  <p className="text-[11px] text-muted-foreground uppercase font-medium">Curriculum</p>
                  <p className="font-semibold text-xs text-foreground mt-0.5 truncate">
                    {book.institute ? `${book.institute} ${book.yearLevel ? `(${book.yearLevel})` : ""}` : book.category}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5 text-[#106A2E]" /> Abstract & Subject Scope
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed bg-white p-3 rounded-lg border border-gray-100">
                  {book.abstract || "No abstract provided for this reference material."}
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#106A2E] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Library Policy Reminder</p>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Assigned for academic use. Late returns trigger automated SMS warning alerts (no daily cash fine). In case of lost books, students must submit a verified identical physical replacement copy (same title, author, edition) before clearing account hold.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === "marc" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#106A2E]" /> MARC 21 Bibliographic Record Tags
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Official machine-readable cataloging standards for CDM Library</p>
                </div>
                <button
                  onClick={handleCopyMarc}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedMarc ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedMarc ? "Copied!" : "Copy MARC"}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs space-y-2 border border-slate-800 overflow-x-auto shadow-inner">
                {marcLines.map((line, idx) => {
                  const parts = line.split(":");
                  const tagHeader = parts[0] || "";
                  const tagValue = parts.slice(1).join(":").trim();
                  return (
                    <div key={idx} className="flex gap-2 hover:bg-slate-800/60 px-1 py-0.5 rounded">
                      <span className="text-emerald-400 font-bold select-all flex-shrink-0">{tagHeader}:</span>
                      <span className="text-slate-200 select-all">{tagValue}</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-muted-foreground bg-gray-50 p-2.5 rounded border border-gray-200">
                <span className="font-semibold text-gray-700">MARC Legend:</span> 020 (ISBN) · 082 (Dewey/LC Classification) · 100 (Primary Author) · 245 (Title Statement) · 260 (Publication) · 650 (Topical Subject) · 990 (Local Institute/Curriculum Tag).
              </div>
            </div>
          )}

          {activeTab === "pdf" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#106A2E]" /> Digital Curriculum & Chapter Preview
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Read official syllabus chapters and excerpts</p>
                </div>
                {book.pdfUrl ? (
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-[#106A2E] border border-emerald-300 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Fullscreen / Download PDF
                  </a>
                ) : (
                  <a
                    href="/previews/sample_preview.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Sample Curriculum PDF
                  </a>
                )}
              </div>

              {book.pdfUrl ? (
                <div className="w-full h-[460px] bg-slate-100 rounded-xl overflow-hidden border border-border shadow-inner">
                  <iframe
                    src={book.pdfUrl}
                    className="w-full h-full"
                    title={`${book.title} PDF Preview`}
                  />
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#106A2E] flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">No Custom PDF Attached Yet</p>
                    <p className="text-[11px] text-gray-500 max-w-md mx-auto mt-1">
                      You can drop any PDF file in the <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">public/previews/</code> directory and specify <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">/previews/your_file.pdf</code> in Edit Book, or preview the default syllabus sample below.
                    </p>
                  </div>
                  <div className="pt-1 flex justify-center gap-2">
                    <a
                      href="/previews/sample_preview.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-[#106A2E] text-white text-xs font-semibold rounded-lg hover:bg-[#0D7856] transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> Open Standard CDM Preview Document
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-border flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="py-2 px-4 border border-border text-muted-foreground rounded-lg text-xs font-medium hover:bg-white transition-colors cursor-pointer">
            Close
          </button>
          <button
            onClick={() => { onEdit(book); onClose(); }}
            className="py-2 px-3.5 border border-[#106A2E] text-[#106A2E] rounded-lg text-xs font-medium hover:bg-[#106A2E]/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => { onDelete(book); onClose(); }}
            className="py-2 px-3.5 border border-red-500 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={() => { onBorrow(book); onClose(); }}
            disabled={book.available === 0}
            className="flex-grow py-2 bg-[#106A2E] text-white rounded-lg text-xs font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <BookMarked className="w-4 h-4" />
            {book.available > 0 ? "Borrow Book" : "Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Forgot Password Modal (Email OTP & Employee ID Verification) ───────────
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [resetMethod, setResetMethod] = useState<"otp" | "employee">("otp");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  
  // Legacy / Employee ID Fields
  const [identifier, setIdentifier] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  
  // Password Fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Step 1: Send OTP to Email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid institutional email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP verification code.");
      }
      setDemoOtp(data.otp || null);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An error occurred while sending OTP.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP Code
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setError("Please enter the 6-digit OTP verification code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP code.");
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Set New Password via OTP
  async function handleResetPasswordOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpInput.trim(), newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed.");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  // Legacy Employee ID Reset
  async function handleResetEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !employeeId.trim() || !newPassword) {
      setError("Please fill in your username/email, Employee ID, and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, employeeId, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed.");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred during password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden transition-all transform scale-100">
        
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Account Password Recovery</h3>
                <p className="text-xs text-slate-500 font-normal">Reset your library portal access</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Navigation */}
          {!success && (
            <div className="mt-5 p-1 bg-slate-100/80 rounded-xl flex items-center gap-1 border border-slate-200/40">
              <button
                type="button"
                onClick={() => { setResetMethod("otp"); setError(""); setStep(1); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  resetMethod === "otp"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <Mail className={`w-3.5 h-3.5 ${resetMethod === "otp" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Email OTP</span>
                <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  Recommended
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setResetMethod("employee"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  resetMethod === "employee"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <BadgeCheck className={`w-3.5 h-3.5 ${resetMethod === "employee" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Employee ID</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50/80 border border-red-200/80 rounded-xl flex items-start gap-2.5 text-red-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Password Reset Successful</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Your password has been updated successfully. You can now sign in with your new credentials.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : resetMethod === "otp" ? (
            <div>
              {/* Stepper Progress Header */}
              <div className="mb-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Step {step} of 3 • {step === 1 ? "Enter Email" : step === 2 ? "Verify OTP Code" : "New Password"}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {step === 1 ? "33%" : step === 2 ? "66%" : "100%"}
                  </span>
                </div>
                {/* 2px Emerald Progress Bar */}
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                    style={{ width: step === 1 ? "33.3%" : step === 2 ? "66.6%" : "100%" }}
                  />
                </div>
              </div>

              {/* Step 1: Enter Email */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Institutional Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. librarian@cdm.edu.ph or juan@cdm.edu.ph"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      We'll send a 6-digit OTP verification code to this address.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {demoOtp && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Demo OTP Code: </span>
                        <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-950 font-mono font-bold tracking-widest">{demoOtp}</code>
                        <span className="text-[11px] text-amber-700 block mt-0.5">Use this code for quick verification testing.</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Enter 6-Digit OTP Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-center"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Code sent to <span className="font-semibold text-slate-700">{email}</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setError(""); }}
                      className="py-2.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <form onSubmit={handleResetPasswordOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setStep(2); setError(""); }}
                      className="py-2.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <span>Update Password</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Employee ID Reset Form */
            <form onSubmit={handleResetEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your registered username or email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-2024-001"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-medium">Remembered your password?</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold transition-colors cursor-pointer hover:underline"
          >
            Return to Sign In
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }: { onLogin: (u: string, r: string) => void; onGoRegister: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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
      localStorage.setItem("librarianRole", data.role);
      localStorage.setItem("librarianUsername", data.username);
      localStorage.setItem("librarianEmployeeId", data.employeeId || "");
      localStorage.setItem("authToken", data.token);
      onLogin(data.name, data.role);
    })
    .catch(err => {
      setLoading(false);
      setError(err.message);
    });
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-[#F4D35E]/30 overflow-hidden"
      style={{ 
        fontFamily: "var(--font-family-sans)",
        background: "linear-gradient(145deg, #072F14 0%, #0D5625 35%, #106A2E 65%, #08401C 100%)"
      }}
    >
      {/* Ambient background decoration - geometric concentric rings */}
      <div className="absolute inset-0 pointer-events-none opacity-15 overflow-hidden flex items-center justify-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute border border-white/30 rounded-full pointer-events-none"
            style={{ 
              width: (i + 1) * 200, 
              height: (i + 1) * 200, 
              top: "50%", 
              left: "50%", 
              transform: "translate(-50%, -50%)" 
            }} 
          />
        ))}
      </div>

      {/* Subtle warm gold & emerald ambient glow spots */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F4D35E]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* Main Centered Floating Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl shadow-emerald-950/40 border border-white/90 p-8 sm:p-10 text-center relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Logo Icon - Library Open Book with Gold Accent */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#106A2E] to-[#0D7856] flex items-center justify-center shadow-lg shadow-[#106A2E]/30 border-2 border-[#F4D35E]/40">
            <BookOpen className="w-7 h-7 text-[#F4D35E]" />
          </div>
        </div>

        {/* Header Titles */}
        <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight" style={{ fontFamily: "var(--font-family-display)" }}>
          CDM OneLib
        </h1>
        <p className="text-xs text-muted-foreground mt-1 mb-7">
          Colegio de Montalban · Integrated Library Management System
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-[#B23B3B] text-xs text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-[#4B5563] mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#106A2E]/25 focus:border-[#106A2E] focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4B5563] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#106A2E]/25 focus:border-[#106A2E] focus:bg-white transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button 
              type="button" 
              onClick={() => setShowForgot(true)}
              className="text-xs font-semibold text-[#106A2E] hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#106A2E] hover:bg-[#0D5625] text-white rounded-xl text-sm font-semibold transition-colors duration-150 disabled:opacity-70 flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 mt-3 cursor-pointer select-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Library</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </form>

        {/* Divider NEW HERE */}
        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
            <span className="bg-white px-3">New Library Personnel</span>
          </div>
        </div>

        {/* Registration CTA */}
        <p className="text-xs text-gray-500">
          New librarian or library head?{" "}
          <button 
            type="button"
            onClick={onGoRegister} 
            className="text-[#106A2E] font-bold hover:underline cursor-pointer ml-0.5"
          >
            Create Account
          </button>
        </p>
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
      <div 
        className="min-h-screen flex items-center justify-center p-6 sm:p-8 relative overflow-hidden"
        style={{ 
          fontFamily: "var(--font-family-sans)",
          background: "linear-gradient(145deg, #072F14 0%, #0D5625 35%, #106A2E 65%, #08401C 100%)"
        }}
      >
        <div className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl shadow-emerald-950/40 border border-white/90 p-8 sm:p-10 max-w-md w-full text-center relative z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-[#106A2E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#106A2E]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-family-display)" }}>Account Created!</h2>
          <p className="text-muted-foreground text-sm mb-6">Your personnel account has been created successfully. You can now return to the login screen and sign in.</p>
          <button onClick={onBack} className="w-full py-2.5 bg-[#106A2E] text-white rounded-xl text-sm font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 sm:p-8 relative overflow-hidden"
      style={{ 
        fontFamily: "var(--font-family-sans)",
        background: "linear-gradient(145deg, #072F14 0%, #0D5625 35%, #106A2E 65%, #08401C 100%)"
      }}
    >
      <div className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl shadow-emerald-950/40 border border-white/90 max-w-lg w-full overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#106A2E] p-6 text-left">
          <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Back to Login
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-[#F4D35E] rounded-xl p-2.5"><Library className="w-7 h-7 text-[#1F1F1F]" /></div>
            <div>
              <h1 className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-family-display)" }}>Create Personnel Account</h1>
              <p className="text-white/70 text-xs">Colegio de Montalban · Staff & Head Librarian Portal</p>
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
                    <option value="Librarian">Librarian (Staff)</option>
                    <option value="Head Librarian">Head Librarian (Admin)</option>
                    <option value="Library Aide">Library Aide</option>
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

// ─── Dense Table View ────────────────────────────────────────────────────────
function CatalogTableView({
  books,
  onPreview,
  onBorrow,
  onEdit,
  onDelete
}: {
  books: Book[];
  onPreview: (b: Book) => void;
  onBorrow: (b: Book) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Book Details</th>
              <th className="py-3 px-4">Call Number</th>
              <th className="py-3 px-4">Institute & Details</th>
              <th className="py-3 px-4">Stock Status</th>
              <th className="py-3 px-4 text-center">Borrows</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {books.map(book => {
              const isAvailable = book.available > 0;
              const inst = (book.institute === "GENED" ? "ITE" : book.institute) || "ITE";

              return (
                <tr key={book.id} className="hover:bg-zinc-50/60 transition-colors group">
                  {/* Book Details */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-9 h-12 object-cover rounded shadow-xs border border-zinc-200/60 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-9 h-12 bg-gradient-to-br from-zinc-800 to-zinc-950 text-white rounded p-1 flex flex-col justify-between flex-shrink-0 shadow-xs">
                          <span className="text-[8px] font-bold tracking-tighter text-emerald-400">{inst}</span>
                          <span className="text-[7px] font-medium line-clamp-2 leading-none text-zinc-300">{book.title}</span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-zinc-900 line-clamp-1 group-hover:text-[#106A2E] transition-colors">
                          {book.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 font-normal">{book.author}</p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">ISBN: {book.isbn}</p>
                      </div>
                    </div>
                  </td>

                  {/* Call Number */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] bg-zinc-100 text-zinc-800 border border-zinc-200/70">
                      {book.callNo || "N/A"}
                    </span>
                  </td>

                  {/* Institute & Details */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-zinc-800">{inst}</span>
                      <span className="text-[11px] text-zinc-500">
                        {[book.yearLevel, book.semester].filter(Boolean).join(" · ") || "All Levels"}
                      </span>
                    </div>
                  </td>

                  {/* Stock Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Available ({book.available}/{book.total || book.available})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                        Out of Stock (0/{book.total || 1})
                      </span>
                    )}
                  </td>

                  {/* Borrows */}
                  <td className="py-3 px-4 text-center font-mono text-zinc-600 font-medium">
                    {book.borrowCount || 0}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPreview(book)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        title="Quick View"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        Preview
                      </button>

                      {isAvailable ? (
                        <button
                          onClick={() => onBorrow(book)}
                          className="px-3 py-1.5 rounded-lg bg-[#106A2E] hover:bg-[#0D7856] text-white text-[11px] font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Borrow
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-400 text-[11px] font-medium cursor-not-allowed border border-zinc-200/60"
                        >
                          Unavailable
                        </button>
                      )}

                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === book.id ? null : book.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === book.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-zinc-200 shadow-lg py-1 z-40 text-left animate-in fade-in zoom-in-95 duration-150">
                              <button
                                onClick={() => { setOpenMenuId(null); onEdit(book); }}
                                className="w-full px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-zinc-500" /> Edit Record
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); onDelete(book); }}
                                className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" /> Remove Book
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
  const [selectedInstitute, setSelectedInstitute] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [category, setCategory] = useState("All");
  const [availability, setAvailability] = useState<"all" | "available" | "borrowed">("all");
  const [sortBy, setSortBy] = useState<"default" | "title" | "borrowed" | "newest">("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut ⌘K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const instituteCounts = useMemo(() => {
    const counts: Record<string, number> = { All: books.length };
    books.forEach(b => {
      const inst = (b.institute === "GENED" ? "ITE" : b.institute) || "ITE";
      counts[inst] = (counts[inst] || 0) + 1;
    });
    return counts;
  }, [books]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedYear !== "All Years") count++;
    if (selectedSemester !== "All Semesters") count++;
    if (category !== "All") count++;
    if (availability !== "all") count++;
    return count;
  }, [selectedYear, selectedSemester, category, availability]);

  const filtered = useMemo(() => {
    return books
      .filter(b => {
        // Institute Match
        const bookInst = (b.institute === "GENED" ? "ITE" : b.institute) || "ITE";
        const matchInst = selectedInstitute === "All" || bookInst === selectedInstitute;
        
        // Year Match
        const matchYear = selectedYear === "All Years" || b.yearLevel === selectedYear;

        // Semester Match
        const matchSem = selectedSemester === "All Semesters" || b.semester === selectedSemester;

        // Category Match
        const matchCat = category === "All" || b.category === category;

        // Availability Match
        const matchAvail = 
          availability === "all" ? true :
          availability === "available" ? b.available > 0 :
          b.available === 0;

        // Keyword Search
        const q = search.toLowerCase().trim();
        const matchSearch = !q || 
          b.title.toLowerCase().includes(q) || 
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          (b.callNo && b.callNo.toLowerCase().includes(q)) ||
          (b.marcTags && b.marcTags.some(t => t.toLowerCase().includes(q)));

        return matchInst && matchYear && matchSem && matchCat && matchAvail && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "borrowed") return (b.borrowCount || 0) - (a.borrowCount || 0);
        if (sortBy === "newest") return (b.publishYear || 0) - (a.publishYear || 0);
        return 0;
      });
  }, [books, selectedInstitute, selectedYear, selectedSemester, category, availability, search, sortBy]);

  const hasActiveFilters = selectedInstitute !== "All" || activeFiltersCount > 0 || search !== "" || sortBy !== "default";

  function handleResetFilters() {
    setSelectedInstitute("All");
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setCategory("All");
    setAvailability("all");
    setSortBy("default");
    setSearch("");
  }

  return (
    <div className="space-y-4">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
        <div>
          <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2 tracking-tight">
            <BookOpen className="w-5 h-5 text-[#106A2E]" />
            CDM Library Book Collection
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Prescribed academic references with official MARC 21 catalog tagging across all institutes.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onAdd}
            className="bg-[#106A2E] text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-[#0D7856] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" /> Add Book Record
          </button>
        </div>
      </div>

      {/* Clean Unified Enterprise Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-xs space-y-3 text-left">
        {/* Row 1: Integrated Search Input & Institute Segmented Controls */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Full Width Search Input with shortcut badge */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, author, ISBN, call number, or MARC tags..."
              className="w-full pl-9 pr-14 py-2 bg-zinc-50/80 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#106A2E]/20 focus:border-[#106A2E] focus:bg-white transition-all text-zinc-900 placeholder:text-zinc-400"
            />
            {search ? (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs font-bold p-0.5 cursor-pointer"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-400 border border-zinc-200/80">
                ⌘K
              </span>
            )}
          </div>

          {/* Sleek Segmented Institute Filter Control */}
          <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl self-start lg:self-auto overflow-x-auto max-w-full border border-zinc-200/50">
            {INSTITUTES.map(inst => {
              const isSelected = selectedInstitute === inst.code;
              const count = instituteCounts[inst.code] || 0;
              const label = inst.code === "All" ? "All Institutes" : inst.code;
              return (
                <button
                  key={inst.code}
                  onClick={() => setSelectedInstitute(inst.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60 font-bold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? "bg-emerald-50 text-[#106A2E]" : "bg-zinc-200/70 text-zinc-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Unified Filter Toolbar & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Unified Filters Popover Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPopover(p => !p)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFiltersCount > 0 || showFilterPopover
                    ? "border-[#106A2E] bg-emerald-50/50 text-[#106A2E]"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-current" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#106A2E] text-white text-[10px] font-bold inline-flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${showFilterPopover ? "rotate-180" : ""}`} />
              </button>

              {/* Filter Popover Content */}
              {showFilterPopover && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowFilterPopover(false)} />
                  <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-xl border border-zinc-200 shadow-xl p-4 z-40 text-left animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-[#106A2E]" /> Detailed Filters
                      </span>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedYear("All Years");
                            setSelectedSemester("All Semesters");
                            setCategory("All");
                            setAvailability("all");
                          }}
                          className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>

                    {/* Year Level */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Year Level</label>
                      <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#106A2E]"
                      >
                        {YEAR_LEVELS.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    {/* Semester */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Semester</label>
                      <select
                        value={selectedSemester}
                        onChange={e => setSelectedSemester(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#106A2E]"
                      >
                        {SEMESTERS.map(sem => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>

                    {/* Discipline */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Discipline</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#106A2E] truncate"
                      >
                        <option value="All">All Disciplines</option>
                        <option value="Computer Studies & Engineering (ICS - BSIT / BSCPE)">ICS (IT & CpE)</option>
                        <option value="Teacher Education & GenEd (ITE - BEED / BTLED / BECED / BSED)">ITE (Education & GenEd)</option>
                        <option value="Business & Entrepreneurship (IBE - BSBA / BS ENTREP)">IBE (Business & Entrep)</option>
                      </select>
                    </div>

                    {/* Stock Status */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Stock Status</label>
                      <select
                        value={availability}
                        onChange={e => setAvailability(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#106A2E]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="available">Available on Shelf</option>
                        <option value="borrowed">Checked Out (0 Available)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Subtle Sort By Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 font-normal hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-medium focus:outline-none text-zinc-800 cursor-pointer pr-1"
              >
                <option value="default">Default Order</option>
                <option value="title">Title (A → Z)</option>
                <option value="borrowed">Most Borrowed</option>
                <option value="newest">Newest Year</option>
              </select>
            </div>
          </div>

          {/* Right side: View Mode Toggle */}
          <div className="flex items-center gap-1 bg-zinc-100/90 p-0.5 rounded-lg border border-zinc-200/60">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">Grid</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Dense Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">Table</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-400">Active:</span>
              {selectedInstitute !== "All" && (
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200">
                  Institute: {selectedInstitute}
                  <button onClick={() => setSelectedInstitute("All")} className="hover:text-zinc-950 font-bold ml-0.5">✕</button>
                </span>
              )}
              {selectedYear !== "All Years" && (
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200">
                  {selectedYear}
                  <button onClick={() => setSelectedYear("All Years")} className="hover:text-zinc-950 font-bold ml-0.5">✕</button>
                </span>
              )}
              {selectedSemester !== "All Semesters" && (
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200">
                  {selectedSemester}
                  <button onClick={() => setSelectedSemester("All Semesters")} className="hover:text-zinc-950 font-bold ml-0.5">✕</button>
                </span>
              )}
              {category !== "All" && (
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200">
                  Discipline Filter
                  <button onClick={() => setCategory("All")} className="hover:text-zinc-950 font-bold ml-0.5">✕</button>
                </span>
              )}
              {availability !== "all" && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-medium px-2 py-0.5 rounded-md border border-emerald-200">
                  {availability === "available" ? "In Stock" : "Checked Out"}
                  <button onClick={() => setAvailability("all")} className="hover:text-emerald-950 font-bold ml-0.5">✕</button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200">
                  "{search}"
                  <button onClick={() => setSearch("")} className="hover:text-zinc-950 font-bold ml-0.5">✕</button>
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">
              Showing <strong className="text-zinc-900 font-bold">{filtered.length}</strong> of {books.length} volumes
            </span>
          </div>
        )}
      </div>

      {/* Catalog Counter (when no filters) */}
      {!hasActiveFilters && (
        <div className="flex items-center justify-between text-left px-1">
          <p className="text-xs text-zinc-500 font-medium">
            Showing all <span className="font-bold text-zinc-900">{filtered.length}</span> cataloged volumes
          </p>
        </div>
      )}

      {/* Content Rendering (Grid or Dense Table) */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-zinc-300 p-12 text-center">
          <BookOpen className="w-10 h-10 text-zinc-400/60 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-zinc-900">No Books Found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            No matching books for the current filter criteria. Try selecting another institute or resetting filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-[#106A2E] text-white rounded-lg text-xs font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer shadow-xs"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        <CatalogTableView
          books={filtered}
          onPreview={onPreview}
          onBorrow={onBorrow}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
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
      )}
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
            <p>• Late return policy: <strong>Automated SMS Warning Notice (No Daily Cash Fine)</strong></p>
            <p>• Lost/missing book: <strong>Mandatory Identical Physical Replacement Copy</strong></p>
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
function ReservationsPage({ books, reservations, students, librarianName = "Staff Librarian", onRefresh }: { books: Book[]; reservations: Reservation[]; students: Student[]; librarianName?: string; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | undefined>();
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [done, setDone] = useState(false);
  const tomorrow = getTomorrowDate();
  const availableBooks = books;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "fulfilled" | "cancelled">("pending");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  // Release / Confirm Pickup Handler
  async function handleReleaseBook(res: Reservation) {
    if (!confirm(`Confirm releasing "${res.bookTitle}" to ${res.studentName} (${res.studentId})?`)) return;

    setActionLoadingId(res.id);
    setNotification(null);
    try {
      const response = await fetch(`/api/reservations/${res.id}/fulfill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ librarianName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to release book.");

      setNotification({
        type: "success",
        message: `✓ Book successfully released to ${res.studentName}. Active loan created (Due: ${formatDate(data.dueDate)}).`
      });
      onRefresh();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "An error occurred." });
    } finally {
      setActionLoadingId(null);
    }
  }

  // Cancel Reservation Handler
  async function handleCancelReservation(res: Reservation) {
    if (!confirm(`Cancel reservation for "${res.bookTitle}" and return 1 copy to shelf inventory?`)) return;

    setActionLoadingId(res.id);
    setNotification(null);
    try {
      const response = await fetch(`/api/reservations/${res.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled at circulation counter" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to cancel reservation.");

      setNotification({
        type: "success",
        message: `Reservation cancelled. Book copy restocked to shelf.`
      });
      onRefresh();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "An error occurred." });
    } finally {
      setActionLoadingId(null);
    }
  }

  // Filtered Records
  const pendingCount = reservations.filter(r => r.status === "pending").length;
  const fulfilledCount = reservations.filter(r => r.status === "fulfilled").length;

  const filteredReservations = reservations.filter(r => {
    const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || 
      r.studentName.toLowerCase().includes(q) ||
      r.studentId.toLowerCase().includes(q) ||
      r.bookTitle.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

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
          {/* Header & Minimalist Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#106A2E]" />
                Book Reservations &amp; Counter Pickups
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify student identity, release reserved books, and track claimed pickup deadlines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { 
                  setShowForm(true); 
                  setDone(false); 
                  setSelectedStudent(undefined); 
                  setStudentSearch(""); 
                  setStudentName(""); 
                  setStudentId(""); 
                  setNotification(null);
                }} 
                className="bg-[#106A2E] text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-[#0D7856] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Reservation
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {notification && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
              notification.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {notification.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">✕</button>
            </div>
          )}

          {/* Minimalist Controls Strip */}
          <div className="bg-white p-3.5 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-left">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search student name, ID, book title, or reservation ID..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#106A2E] focus:bg-white transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "pending" ? "bg-white text-[#106A2E] shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Pending Pickup</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === "pending" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700"
                }`}>
                  {pendingCount}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({reservations.length})
              </button>
              <button
                onClick={() => setStatusFilter("fulfilled")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "fulfilled" ? "bg-white text-emerald-700 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Claimed ({fulfilledCount})
              </button>
              <button
                onClick={() => setStatusFilter("cancelled")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === "cancelled" ? "bg-white text-gray-700 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cancelled
              </button>
            </div>
          </div>

          {/* Minimalist Reservations Table */}
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-border text-xs text-muted-foreground">
                    <th className="text-left p-3 font-semibold">Reservation ID</th>
                    <th className="text-left p-3 font-semibold">Book Title</th>
                    <th className="text-left p-3 font-semibold">Student Patron</th>
                    <th className="text-left p-3 font-semibold">Reserved Date</th>
                    <th className="text-left p-3 font-semibold">Pickup Deadline</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-right p-3 font-semibold">Counter Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                        No reservations found matching "{searchTerm || statusFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map(r => {
                      const isPending = r.status === "pending";
                      const isFulfilled = r.status === "fulfilled";
                      const isLoading = actionLoadingId === r.id;

                      return (
                        <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                          <td className="p-3">
                            <p className="font-semibold text-foreground text-xs">{r.bookTitle}</p>
                            <p className="text-[11px] text-muted-foreground">ID: {r.bookId}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-foreground text-xs">{r.studentName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{r.studentId}</p>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{formatDate(r.reservationDate)}</td>
                          <td className="p-3 text-xs font-medium">
                            <span className={isPending ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" : "text-muted-foreground"}>
                              {formatDate(r.pickupDate)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isPending
                                ? "bg-amber-100 text-amber-800"
                                : isFulfilled
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isPending ? "bg-amber-500 animate-pulse" : isFulfilled ? "bg-emerald-500" : "bg-gray-400"
                              }`} />
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleReleaseBook(r)}
                                  className="bg-[#106A2E] hover:bg-[#0D7856] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                                  title="Release book and create active loan"
                                >
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                  Release Book
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleCancelReservation(r)}
                                  className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer text-xs"
                                  title="Cancel and restock"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isFulfilled ? (
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                ✓ Claimed &amp; Borrowed
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Cancelled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
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

// ─── Verify Replacement Modal ────────────────────────────────────────────────
function VerifyReplacementModal({ 
  transaction, 
  onClose, 
  onSuccess 
}: { 
  transaction: Transaction; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [title, setTitle] = useState(transaction.bookTitle || "");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatchedFields, setMismatchedFields] = useState<string[]>([]);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMismatchedFields([]);

    fetch(`/api/transactions/${transaction.id}/verify-replacement`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        author,
        isbn,
        new_barcode: barcode || undefined
      })
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Failed to verify replacement copy.");
          if (data.mismatched_fields) {
            setMismatchedFields(data.mismatched_fields);
          }
        } else {
          alert("Replacement copy verified successfully! Physical inventory stock restored.");
          onSuccess();
          onClose();
        }
      })
      .catch(err => {
        console.error(err);
        setError("Network error while verifying replacement copy.");
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#106A2E] p-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#F4D35E]" /> Verify Replacement Copy
            </h3>
            <p className="text-xs text-white/80 mt-0.5">Txn: {transaction.id} · Student: {transaction.studentName}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleVerify} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Mandatory Same-Copy Verification</p>
            <p className="mt-0.5">Please scan or input the replacement book metadata. Title, Author, and ISBN must match the original catalog entry.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <p className="font-semibold">{error}</p>
              {mismatchedFields.length > 0 && (
                <p className="mt-1 font-mono text-[11px]">Mismatched field(s): {mismatchedFields.join(", ")}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Book Title *</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Noli Me Tangere"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${mismatchedFields.includes("title") ? "border-red-500 bg-red-50/50" : "border-border focus:border-[#106A2E]"}`}
            />
            {mismatchedFields.includes("title") && <p className="text-[11px] text-red-600 mt-1">Title does not match catalog record.</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Author *</label>
            <input 
              type="text" 
              required
              value={author} 
              onChange={e => setAuthor(e.target.value)}
              placeholder="e.g. José Rizal"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${mismatchedFields.includes("author") ? "border-red-500 bg-red-50/50" : "border-border focus:border-[#106A2E]"}`}
            />
            {mismatchedFields.includes("author") && <p className="text-[11px] text-red-600 mt-1">Author does not match catalog record.</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">ISBN (with or without dashes) *</label>
            <input 
              type="text" 
              required
              value={isbn} 
              onChange={e => setIsbn(e.target.value)}
              placeholder="e.g. 978-971-27-2016-5"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none font-mono ${mismatchedFields.includes("isbn") ? "border-red-500 bg-red-50/50" : "border-border focus:border-[#106A2E]"}`}
            />
            {mismatchedFields.includes("isbn") && <p className="text-[11px] text-red-600 mt-1">ISBN does not match catalog record.</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">New Barcode Tag (Optional)</label>
            <input 
              type="text" 
              value={barcode} 
              onChange={e => setBarcode(e.target.value)}
              placeholder="e.g. CDM-BAR-9902"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-[#106A2E] font-mono"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-xs font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-xs font-semibold hover:bg-[#0D7856] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Verify & Accept Copy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Returns Page ─────────────────────────────────────────────────────────────
function ReturnsPage({ transactions, onRefresh }: { transactions: Transaction[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [verifyingTxn, setVerifyingTxn] = useState<Transaction | null>(null);
  const [bookCondition, setBookCondition] = useState<"good" | "damaged" | "lost">("good");
  const [processed, setProcessed] = useState(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);

  const activeTxns = transactions.filter(t => t.status !== "closed" && (t.status !== "returned" || t.replacementStatus === "pending"));
  const results = activeTxns.filter(t =>
    !searchQuery || t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.studentId.includes(searchQuery) || t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const daysOverdue = selectedTxn ? Math.max(0, -getDueDaysLeft(selectedTxn.dueDate)) : 0;
  const latePenalty = 0; // Policy update: 0 daily cash fines. Late returns receive automated SMS warning notices.
  const lostPenalty = 0; // Lost books require physical same-copy replacement instead of cash fine
  const damagePenalty = 0; // Damaged books require physical copy replacement / binding restoration without cash fine
  const totalPenalty = 0;

  function handleSendSms(txn: Transaction, daysLate: number) {
    setIsSendingSms(true);
    setSmsStatus(null);
    fetch("/api/notifications/send-overdue-sms", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
      },
      body: JSON.stringify({
        studentId: txn.studentId,
        studentName: txn.studentName,
        bookTitle: txn.bookTitle,
        daysOverdue: daysLate
      })
    })
    .then(r => r.json())
    .then(res => {
      setIsSendingSms(false);
      if (res.success) {
        setSmsStatus(`SMS Warning successfully dispatched to student (${res.recipient})`);
      } else {
        setSmsStatus("SMS notice logged in audit trail.");
      }
    })
    .catch(() => {
      setIsSendingSms(false);
      setSmsStatus("SMS warning logged to security audit trail.");
    });
  }

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
          <h2 className="text-xl font-bold text-foreground mb-2">
            {bookCondition === "lost" ? "Lost Status Recorded" : "Return Processed"}
          </h2>
          <p className="text-muted-foreground text-sm mb-4"><strong>{selectedTxn.bookTitle}</strong> for <strong>{selectedTxn.studentName}</strong></p>
          
          {bookCondition === "lost" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left text-amber-800">
              <p className="font-bold flex items-center gap-1.5 mb-1"><AlertTriangle className="w-4 h-4 text-amber-600" /> Mandatory Physical Replacement Required</p>
              <p className="text-xs text-amber-700">The student must provide an identical replacement copy (Title, Author, ISBN) to the circulation desk for verification before clearing their account hold.</p>
            </div>
          ) : damagePenalty > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="font-bold text-red-800 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Damage Assessment Fee</p>
              <p className="text-sm text-red-700">Book condition assessed as damaged → ₱{damagePenalty}.00 fee</p>
            </div>
          ) : daysOverdue > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-800 text-sm text-left">
              <p className="font-semibold flex items-center gap-1.5 mb-1"><CheckCircle className="w-4 h-4 text-blue-600" /> Late Return Checked In</p>
              <p className="text-xs text-blue-700">Book was {daysOverdue} day(s) overdue. Under CDM policy, <strong>no daily monetary fine was charged</strong> (automated SMS warning notice was dispatched).</p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4 inline mr-1" />Book returned on time in good condition. No holds applied.
            </div>
          )}
          <button onClick={() => { setProcessed(false); setSelectedTxn(null); setSearchQuery(""); setBookCondition("good"); setSmsStatus(null); }}
            className="w-full py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors cursor-pointer">
            Process Another Return / Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg text-foreground">Circulation & Returns Desk</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Process book check-ins, record lost items, or verify mandatory physical replacement copies.</p>
      </div>

      {verifyingTxn && (
        <VerifyReplacementModal 
          transaction={verifyingTxn} 
          onClose={() => setVerifyingTxn(null)} 
          onSuccess={onRefresh} 
        />
      )}

      {!selectedTxn ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by student name, ID, or transaction ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border text-xs text-muted-foreground font-medium bg-gray-50 flex items-center justify-between">
              <span>Active Loans & Pending Replacements ({results.length})</span>
            </div>
            <div className="divide-y divide-border">
              {results.map(txn => {
                const daysLeft = getDueDaysLeft(txn.dueDate);
                const isPendingReplacement = txn.replacementStatus === "pending";

                return (
                  <div key={txn.id} className={`p-4 transition-colors flex items-center gap-4 ${isPendingReplacement ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-gray-50"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{txn.id}</span>
                        {isPendingReplacement ? (
                          <Badge variant="warning">
                            ⚠️ Mandatory Replacement Pending
                          </Badge>
                        ) : (
                          <Badge variant={txn.status === "overdue" ? "danger" : "success"}>
                            {txn.status === "overdue" ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm text-foreground">{txn.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">{txn.studentName} · {txn.studentId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Due: {formatDate(txn.dueDate)}</p>
                    </div>

                    {isPendingReplacement ? (
                      <button 
                        onClick={() => setVerifyingTxn(txn)}
                        className="flex-shrink-0 px-3.5 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#F4D35E]" /> Verify Replacement
                      </button>
                    ) : (
                      <button onClick={() => setSelectedTxn(txn)}
                        className="flex-shrink-0 px-4 py-2 bg-[#106A2E] text-white text-xs font-medium rounded-lg hover:bg-[#0D7856] transition-colors flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Return / Condition
                      </button>
                    )}
                  </div>
                );
              })}
              {results.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active transactions or pending replacements found.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-[#106A2E] p-5 flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2"><RotateCcw className="w-4 h-4" />Process Return & Condition</h2>
            <button onClick={() => setSelectedTxn(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="p-4 bg-[#F1F1F1] rounded-xl space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Transaction</span><span className="font-mono text-xs font-semibold">{selectedTxn.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Book</span><span className="font-medium text-right max-w-xs">{selectedTxn.bookTitle}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selectedTxn.studentName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-medium text-red-600">{formatDate(selectedTxn.dueDate)}</span></div>
            </div>

            {daysOverdue > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-amber-700" /> Overdue Status: {daysOverdue} Day(s) Overdue</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Policy: <strong>No daily cash fine</strong>. Automated SMS return warning is dispatched.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendSms(selectedTxn, daysOverdue)}
                    disabled={isSendingSms}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> {isSendingSms ? "Sending..." : "Dispatch SMS Warning"}
                  </button>
                </div>
                {smsStatus && (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                    ✓ {smsStatus}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Book Condition Assessment *</label>
              <div className="space-y-2">
                {[
                  { value: "good", label: "Good Condition", desc: "Book is intact with standard wear", color: "emerald" },
                  { value: "damaged", label: "Damaged Copy", desc: "Torn pages, water damage, etc. → ₱100 assessment fee", color: "orange" },
                  { value: "lost", label: "Lost / Missing Book", desc: "Mandatory physical same-copy replacement required", color: "red" },
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

            {bookCondition === "lost" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> Mandatory Physical Replacement Policy</p>
                <p className="mt-0.5">No daily monetary fine is charged. In accordance with CDM Library regulations, the student is strictly required to surrender an identical physical replacement copy (Matching Title, Author, ISBN, Edition) at the circulation desk before account clearance.</p>
              </div>
            )}

            {bookCondition === "damaged" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> Book Condition & Preservation Assessment</p>
                <p className="mt-0.5">Under CDM Library policy, no monetary cash penalty is assessed. Severe physical damages require surrender of a replacement copy before account clearance.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setSelectedTxn(null); setSmsStatus(null); }} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleProcess} className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Check className="w-4 h-4" /> {bookCondition === "lost" ? "Record Lost & Require Copy" : "Confirm Return"}
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
      title: "4. Late Returns & Automated SMS Warning Policy",
      content: [
        "Under CDM Library regulations, no daily cash fines (such as ₱5/day) are charged to students for overdue books.",
        "Instead, automated SMS return warning notices are dispatched to the student's registered mobile number reminding them to return the material immediately.",
        "Unreturned overdue books place a temporary hold on the student's account, preventing new reservations or borrowing until all overdue items are surrendered at the desk.",
        "Repeated non-compliance with return notices may be escalated to the Office of Student Affairs.",
      ],
    },
    {
      title: "5. Lost, Damaged, or Missing Books Policy",
      content: [
        "MANDATORY REQUIREMENT — For lost or missing books: the borrower must submit an identical physical replacement copy (same Title, Author, ISBN, Edition).",
        "The replacement book must be presented at the circulation counter for strict librarian verification against original catalog records before clearing the student's account hold.",
        "Monetary payments in place of physical books are not accepted in order to safeguard the completeness of the college library collection.",
        "For books returned in damaged condition (torn pages, water damage, defaced text): a damage assessment fee of ₱100.00 is charged for rebinding and preservation.",
        "The Head Librarian must be notified immediately upon discovery of a lost or damaged reference book.",
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
        <p className="text-white/40 text-xs">© 2026 Colegio de Montalban, Rodriguez, Rizal · BSIT 4C Capstone Group 9</p>
      </div>
    </div>
  );
}

// ─── User Profile & Account Settings Modal ────────────────────────────────────
function UserProfileModal({ 
  librarianName, 
  librarianRole, 
  onClose, 
  onLogout 
}: { 
  librarianName: string; 
  librarianRole: string; 
  onClose: () => void; 
  onLogout: () => void; 
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.error) setProfile(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");
      setPwdSuccess("Password updated successfully! Your account is now secured.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  }

  const initials = (librarianName || "Librarian")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const empId = profile?.employee_id || localStorage.getItem("librarianEmployeeId") || (librarianRole?.toLowerCase().includes("head") || librarianRole?.toLowerCase().includes("admin") ? "EMP-0001" : "EMP-0003");
  const email = profile?.email || `${(profile?.username || "staff").toLowerCase()}@cdm.edu.ph`;
  const phone = profile?.phone || "0912-345-6789";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-left border border-border animate-in fade-in duration-200">
        {/* Header with identity styling */}
        <div className="bg-gradient-to-r from-[#106A2E] to-[#0D7856] p-6 text-white relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F4D35E] text-[#1F1F1F] font-bold text-xl flex items-center justify-center shadow-md flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg text-white truncate">{librarianName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
                  {librarianRole || "Staff Librarian"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-white/80">
                <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-[11px] font-semibold text-[#F4D35E]">{empId}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Staff
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-gray-50/75 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "profile" 
                ? "border-[#106A2E] text-[#106A2E]" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "password" 
                ? "border-[#106A2E] text-[#106A2E]" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Change Password
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "profile" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-border">
                  <span className="text-muted-foreground block mb-0.5">Assigned Role</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#106A2E]" /> {librarianRole || "Staff Librarian"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-border">
                  <span className="text-muted-foreground block mb-0.5">Employee ID</span>
                  <span className="font-semibold font-mono text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#106A2E]" /> {empId}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-border">
                  <span className="text-muted-foreground block mb-0.5">Official Email</span>
                  <span className="font-medium text-foreground truncate block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#106A2E] flex-shrink-0" /> {email}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-border">
                  <span className="text-muted-foreground block mb-0.5">Contact Number</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#106A2E]" /> {phone}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#106A2E]/5 border border-[#106A2E]/20 text-xs text-[#106A2E] flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>To change your default assigned password or update security credentials, switch to the <strong>Change Password</strong> tab above.</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Update your account password from the default one. You will use this new password for subsequent desktop logins.
              </p>

              {pwdError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-[#B23B3B] text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /> {pwdSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-9 py-2 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-9 py-2 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 border border-border text-foreground rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 py-2 bg-[#106A2E] text-white rounded-lg text-xs font-semibold hover:bg-[#0D7856] transition-colors disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {pwdLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {pwdLoading ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ currentPage, onNavigate, librarianName, librarianRole, onLogout, collapsed, onToggle, onOpenProfile }: {
  currentPage: Page; onNavigate: (p: Page) => void; librarianName: string; librarianRole: string; onLogout: () => void; collapsed: boolean; onToggle: () => void; onOpenProfile?: () => void;
}) {
  const navItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { id: "catalog" as Page, label: "Book Catalog", icon: BookOpen },
    { id: "students" as Page, label: "Student Directory", icon: Users },
    { id: "borrow" as Page, label: "Borrow Book", icon: BookMarked },
    { id: "reservations" as Page, label: "Reservations", icon: Calendar },
    { id: "returns" as Page, label: "Return Books", icon: RotateCcw },
    { id: "reports" as Page, label: "Reports & Logs", icon: FileText },
    { id: "librarians" as Page, label: "Librarian Panel", icon: Shield },
    { id: "terms" as Page, label: "Terms & Conditions", icon: Info },
  ];

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
          {navItems.map(({ id, label, icon: Icon }) => {
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
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Sign Out</span>}
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

function MainLayout({ children, currentPage, librarianName, librarianRole, books, transactions, reservations, onNavigate, onLogout }: {
  children: React.ReactNode; currentPage: Page; librarianName: string; librarianRole: string;
  books: Book[]; transactions: Transaction[]; reservations: Reservation[];
  onNavigate: (p: Page) => void; onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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

    // 2. Mobile Borrow Reservations & Pending Pickups
    reservations.forEach(r => {
      if (r.status === "pending") {
        list.push({
          id: `notif-pickup-${r.id}`,
          type: "warning",
          title: "New Mobile Borrow Reservation",
          message: `"${r.studentName}" (${r.studentId}) submitted a mobile reservation for "${r.bookTitle}". Ready for desk pickup.`,
          time: "Just now",
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
    reports: "Reports & Logs", librarians: "Librarian Panel"
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
      {showProfile && (
        <UserProfileModal
          librarianName={librarianName}
          librarianRole={librarianRole}
          onClose={() => setShowProfile(false)}
          onLogout={onLogout}
        />
      )}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
        librarianName={librarianName} 
        librarianRole={librarianRole} 
        onLogout={onLogout} 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(c => !c)} 
        onOpenProfile={() => setShowProfile(true)}
      />
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
            <button 
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2.5 pl-3 border-l border-border hover:opacity-80 transition-opacity text-left cursor-pointer group"
              title="Click to view Profile & Change Password"
            >
              <div className="w-8 h-8 rounded-full bg-[#106A2E] flex items-center justify-center group-hover:ring-2 group-hover:ring-[#106A2E]/30 transition-all">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground group-hover:text-[#106A2E] transition-colors">{librarianName}</p>
                <p className="text-xs text-muted-foreground">{librarianRole || "Staff Librarian"}</p>
              </div>
            </button>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 p-6">
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
  const [callNo, setCallNo] = useState(book?.callNo || "");
  const [institute, setInstitute] = useState(book?.institute || "ICS");
  const [yearLevel, setYearLevel] = useState(book?.yearLevel || "1st Year");
  const [semester, setSemester] = useState(book?.semester || "1st Sem");
  const [category, setCategory] = useState(book?.category || "Technology (ICS / BSIT)");
  const [cover, setCover] = useState(book?.cover || "");
  const [abstract, setAbstract] = useState(book?.abstract || "");
  const [pdfUrl, setPdfUrl] = useState(book?.pdfUrl || "");
  const [total, setTotal] = useState(book?.total !== undefined ? String(book.total) : "5");
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

    const marcTags = [
      `MARC 020 (ISBN): ${isbn}`,
      `MARC 082 (Call Number): ${callNo || "000 CDM"}`,
      `MARC 100 (Main Entry - Author): ${author}`,
      `MARC 245 (Title Statement): ${title}`,
      `MARC 260 (Publication): Colegio de Montalban, ${publishYear}`,
      `MARC 650 (Subject Term): ${category}`,
      `MARC 990 (Local Tag): #${institute} #${yearLevel.replace(" ", "")} #${semester.replace(" ", "")}`
    ];

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          author,
          isbn,
          callNo,
          institute,
          yearLevel,
          semester,
          category,
          cover,
          abstract,
          pdfUrl,
          marcTags,
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
            <BookOpen className="w-4 h-4" /> {isEdit ? "Edit Book Details & MARC Tags" : "Add New Academic Reference"}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-750 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Book ID *</label>
              <input
                value={id}
                onChange={e => setId(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. ICS-1Y1S-001"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] disabled:opacity-60"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">ISBN (MARC 020) *</label>
              <input
                value={isbn}
                onChange={e => setIsbn(e.target.value)}
                placeholder="e.g. 978-971-12345-678-9"
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Call Number (MARC 082)</label>
              <input
                value={callNo}
                onChange={e => setCallNo(e.target.value)}
                placeholder="e.g. 004.01 P39c 2002"
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Institute (Prescribed)</label>
              <select
                value={institute}
                onChange={e => setInstitute(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                {INSTITUTES.filter(i => i.code !== "All").map(i => (
                  <option key={i.code} value={i.code}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Year Level</label>
              <select
                value={yearLevel}
                onChange={e => setYearLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                {YEAR_LEVELS.filter(y => y !== "All Years").map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Semester</label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                {SEMESTERS.filter(s => s !== "All Semesters").map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Book Title (MARC 245) *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Computer Fundamentals"
              required
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Author (MARC 100) *</label>
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="e.g. Copernicus, Pepito P."
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Subject Category (MARC 650) *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              >
                {CATEGORIES.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Total Physical Copies *</label>
              <input
                type="number"
                min="1"
                value={total}
                onChange={e => setTotal(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Copyright / Publish Year</label>
              <input
                type="number"
                value={publishYear}
                onChange={e => setPublishYear(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Cover Image URL</label>
            <input
              value={cover}
              onChange={e => setCover(e.target.value)}
              placeholder="e.g. https://images.unsplash.com/..."
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Sample PDF Preview / Excerpt URL</label>
            <input
              value={pdfUrl}
              onChange={e => setPdfUrl(e.target.value)}
              placeholder="e.g. /previews/sample_preview.pdf or https://..."
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E]"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Place PDF files in the <code className="bg-gray-200 px-1 py-0.2 rounded">public/previews/</code> directory to use local preview paths.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Abstract / Subject Scope</label>
            <textarea
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
              placeholder="Enter curriculum description or syllabus summary..."
              rows={3}
              className="w-full px-3 py-2 bg-[#F1F1F1] border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#106A2E]/30 focus:border-[#106A2E] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#106A2E] text-white rounded-lg text-xs font-semibold hover:bg-[#0D7856] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? "Save Catalog Changes" : "Register Book Record"}
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
                <th className="text-left p-3 font-medium">Student / Photo</th>
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
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#ECFDF5] border border-emerald-300 flex-shrink-0 flex items-center justify-center text-[#106A2E] font-bold text-sm shadow-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm leading-tight">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.id}</p>
                      </div>
                    </div>
                  </td>
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
  const [status, setStatus] = useState<"active" | "inactive" | "graduated" | "hold" | "suspended">((student?.status as any) || "active");
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

interface LibrarianUser {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  role: string;
  username: string;
  status: string;
}

function LibrariansPage() {
  const [librarians, setLibrarians] = useState<LibrarianUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fetchLibrarians() {
    setLoading(true);
    fetch("/api/librarians")
      .then(r => {
        if (!r.ok) throw new Error("Failed to load librarians list.");
        return r.json();
      })
      .then(data => {
        setLibrarians(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchLibrarians();
  }, []);

  function handleStatusUpdate(id: number, newStatus: string) {
    fetch(`/api/librarians/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        fetchLibrarians();
      }
    })
    .catch(() => alert("Failed to update status."));
  }

  function handleRoleUpdate(id: number, newRole: string) {
    fetch(`/api/librarians/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        fetchLibrarians();
      }
    })
    .catch(() => alert("Failed to update role."));
  }

  function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this librarian account? This cannot be undone.")) return;
    fetch(`/api/librarians/${id}`, {
      method: "DELETE"
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        fetchLibrarians();
      }
    })
    .catch(() => alert("Failed to delete account."));
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <MotionSkeletonTable rows={4} columns={6} title="Loading staff accounts..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-sm">Librarian Staff Accounts</h2>
            <p className="text-xs text-muted-foreground">Approve new registrations, manage roles, and suspend/activate accounts.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase bg-gray-50/50">
                <th className="px-5 py-3">Librarian Name</th>
                <th className="px-5 py-3">Employee ID</th>
                <th className="px-5 py-3">Email & Contact</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {librarians.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No accounts found.</td>
                </tr>
              ) : (
                librarians.map(lib => (
                  <tr key={lib.id} className="hover:bg-gray-50/55 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{lib.name}</p>
                      <p className="text-xs text-muted-foreground">@{lib.username}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{lib.employeeId}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-foreground font-medium">{lib.email}</p>
                      <p className="text-xs text-muted-foreground">{lib.phone || 'No phone'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${lib.role === 'Admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {lib.role === 'Admin' ? 'Administrator' : 'Librarian'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${lib.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {lib.status === 'active' ? 'Active' : 'Pending Approval'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      {lib.status === 'pending' ? (
                        <>
                          <button onClick={() => handleStatusUpdate(lib.id, 'active')}
                            className="px-2.5 py-1 bg-[#106A2E] text-white text-xs font-semibold rounded hover:bg-[#0b4f21] transition-colors cursor-pointer">
                            Approve
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleStatusUpdate(lib.id, lib.status === 'active' ? 'inactive' : 'active')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer
                              ${lib.status === 'active' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>
                            {lib.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </>
                      )}
                      
                      <button onClick={() => handleRoleUpdate(lib.id, lib.role === 'Admin' ? 'Librarian' : 'Admin')}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded hover:bg-blue-100 transition-colors cursor-pointer">
                        Make {lib.role === 'Admin' ? 'Staff' : 'Admin'}
                      </button>

                      <button onClick={() => handleDelete(lib.id)}
                        className="px-2 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded hover:bg-red-100 transition-colors cursor-pointer">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportsPage({ books, transactions }: { books: Book[]; transactions: Transaction[] }) {
  const [reportType, setReportType] = useState<"transactions" | "inventory">("transactions");
  const [txFilter, setTxFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");

  const categories = useMemo(() => {
    const list = new Set(books.map(b => b.category));
    return Array.from(list);
  }, [books]);

  function handleExport() {
    const filterVal = reportType === "transactions" ? txFilter : catFilter;
    const token = localStorage.getItem("authToken");
    
    // Construct the reporting URL
    const url = `/api/reports/export?type=${reportType}&filter=${filterVal}&token=${encodeURIComponent(token || "")}`;
    
    // Open in new window
    window.open(url, "_blank");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h2 className="text-base font-bold text-foreground mb-1">Library System Reports & Logs Generator</h2>
        <p className="text-xs text-muted-foreground mb-6">Create printable summaries or export logs as formatted PDF files.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Selection */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-muted-foreground uppercase">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setReportType("transactions")}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer
                  ${reportType === "transactions" ? "border-[#106A2E] bg-[#106A2E]/5" : "border-border hover:border-gray-300"}`}
              >
                <FileText className={`w-6 h-6 mb-2 ${reportType === "transactions" ? "text-[#106A2E]" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm text-foreground">Transactions Log</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Borrow histories, due dates, penalties.</p>
              </button>
              
              <button 
                onClick={() => setReportType("inventory")}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer
                  ${reportType === "inventory" ? "border-[#106A2E] bg-[#106A2E]/5" : "border-border hover:border-gray-300"}`}
              >
                <BookOpen className={`w-6 h-6 mb-2 ${reportType === "inventory" ? "text-[#106A2E]" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm text-foreground">Book Inventory</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Title catalogs, categories, borrow counts.</p>
              </button>
            </div>
          </div>

          {/* Card 2: Filter Configurations */}
          <div className="space-y-4 bg-gray-50/50 p-5 rounded-xl border border-border/80">
            <label className="block text-xs font-bold text-muted-foreground uppercase">Filter Parameters</label>
            
            {reportType === "transactions" ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Filter transactions listing by status:</p>
                <select 
                  value={txFilter} 
                  onChange={(e) => setTxFilter(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-white text-sm focus:ring-[#106A2E]"
                >
                  <option value="all">All Transactions</option>
                  <option value="active">Active Borrowings</option>
                  <option value="overdue">Overdue Alerts Only</option>
                  <option value="returned">Successfully Returned</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Filter inventory listing by category:</p>
                <select 
                  value={catFilter} 
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-white text-sm focus:ring-[#106A2E]"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-border flex justify-end">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#106A2E] text-white font-semibold text-sm rounded-lg hover:bg-[#0b4f21] transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Generate & Export PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authPage, setAuthPage] = useState<"login" | "register">("login");
  const [librarianName, setLibrarianName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("demo") === "admin") return "Admin Head Librarian";
    }
    // Always land on the landing/login screen when opening the app
    return null;
  });
  const [librarianRole, setLibrarianRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("demo") === "admin") return "admin";
    }
    return null;
  });
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("page") as Page;
      if (p && ["dashboard", "catalog", "students", "borrow", "reservations", "returns", "reports", "librarians", "terms"].includes(p)) {
        return p;
      }
    }
    return "dashboard";
  });
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
      if (Array.isArray(resBooks)) setBooks(resBooks);
      if (Array.isArray(resTxns)) setTransactions(resTxns);
      if (Array.isArray(resReservations)) setReservations(resReservations);
      if (Array.isArray(resStudents)) setStudents(resStudents);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!librarianName) return;

    fetchAllData();

    // Real-time synchronization: Auto-poll every 8 seconds to catch mobile student borrow/reservation requests
    const pollInterval = setInterval(() => {
      fetchAllData();
    }, 8000);

    const handleWindowFocus = () => {
      fetchAllData();
    };
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [librarianName]);

  function handleLogin(name: string, role: string) {
    setLibrarianName(name);
    setLibrarianRole(role);
    setCurrentPage("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("librarianName");
    localStorage.removeItem("librarianRole");
    localStorage.removeItem("authToken");
    setLibrarianName(null);
    setLibrarianRole(null);
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
    return <MotionAppSkeleton />;
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
        librarianRole={librarianRole || "Librarian"}
        books={books}
        transactions={transactions}
        reservations={reservations}
        onNavigate={setCurrentPage} 
        onLogout={handleLogout}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
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
                librarianName={librarianName || "Staff Librarian"}
                onRefresh={fetchAllData}
              />
            )}
            {currentPage === "returns" && (
              <ReturnsPage 
                transactions={transactions}
                onRefresh={fetchAllData}
              />
            )}
            {currentPage === "reports" && (
              <ReportsPage 
                books={books}
                transactions={transactions}
              />
            )}
            {currentPage === "librarians" && <LibrariansPage />}
            {currentPage === "terms" && <TermsPage />}
          </motion.div>
        </AnimatePresence>
      </MainLayout>
    </div>
  );
}
