import React, { useState } from "react";
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
  Moon,
  Sun,
  ShieldCheck,
  User,
  Mail,
  Phone,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  IdCard,
} from "lucide-react";

const COLORS = {
  primary: "#106A2E",
  secondary: "#0D7856",
  accent: "#F4D35E",
  bgLight: "#F8FAF9",
  bgDark: "#0F172A",
};

const BOOKS = [
  { id: 1, title: "Data Structures & Algorithms", author: "R. Santiago", category: "Tech", available: 3, total: 5, cover: "1e3a2f" },
  { id: 2, title: "Rizal: Life and Works", author: "L. Fernandez", category: "History", available: 0, total: 4, cover: "0d7856" },
  { id: 3, title: "Discrete Mathematics", author: "J. Cruz", category: "Math", available: 2, total: 2, cover: "106a2e" },
  { id: 4, title: "Noli Me Tangere", author: "J. Rizal", category: "Literature", available: 5, total: 6, cover: "1a4d33" },
];

const LOANS = [
  { id: 1, title: "Data Structures & Algorithms", due: "Due in 2 days", status: "ok" },
  { id: 2, title: "Discrete Mathematics", due: "Overdue by 1 day", status: "late" },
];

const RESERVATIONS = [
  { id: 1, title: "Rizal: Life and Works", step: 1 },
];

const CATEGORIES = ["All", "Literature", "History", "Tech", "Math"];

function StatusBadge({ status }) {
  const late = status === "late";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 9px",
        borderRadius: 999,
        background: late ? "#FCE8E8" : "#E6F3EA",
        color: late ? "#B23B3B" : COLORS.primary,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {late ? <AlertCircle size={12} /> : <Clock size={12} />}
      {status === "late" ? "Overdue by 1 day" : "Due in 2 days"}
    </span>
  );
}

function AvailabilityBadge({ available, total }) {
  const out = available === 0;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 999,
        background: out ? "#FCE8E8" : "#FDF3D9",
        color: out ? "#B23B3B" : "#8A6A0C",
      }}
    >
      {available} / {total} Available
    </span>
  );
}

function BookCoverThumb({ hex, dark }) {
  return (
    <div
      style={{
        width: 46,
        height: 62,
        borderRadius: 8,
        background: `#${hex}`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BookMarked size={18} color="#F4D35E" strokeWidth={1.5} />
    </div>
  );
}

function HomeTab({ dark, setSelectedBook }) {
  const cardBg = dark ? "#16213A" : "#FFFFFF";
  const subtleText = dark ? "#94A3B8" : "#5B6B63";
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("All");

  return (
    <div style={{ padding: "0 16px 90px" }}>
      {/* Welcome banner */}
      <div
        style={{
          marginTop: 16,
          borderRadius: 20,
          padding: "18px 18px",
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.85, fontFamily: "Inter, sans-serif" }}>
            Welcome back
          </p>
          <p style={{ margin: "2px 0 4px", fontSize: 19, fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
            Jay Deguzman
          </p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.85, fontFamily: "Inter, sans-serif" }}>
            BSIT · 4th Year
          </p>
        </div>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: COLORS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: COLORS.primary,
            fontFamily: "'Poppins', sans-serif",
            fontSize: 15,
          }}
        >
          JD
        </div>
      </div>

      {/* Active loans */}
      <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15, color: dark ? "#F1F5F9" : "#12271C" }}>
          Active loans
        </p>
        <span style={{ fontSize: 12, color: COLORS.secondary, display: "flex", alignItems: "center", fontFamily: "Inter, sans-serif" }}>
          See all <ChevronRight size={13} />
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {LOANS.map((loan) => (
          <div
            key={loan.id}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: dark ? "none" : "0 1px 3px rgba(16,106,46,0.06)",
              border: dark ? "1px solid #223047" : "1px solid #EDF3EF",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: dark ? "#F1F5F9" : "#12271C", fontFamily: "Inter, sans-serif" }}>
                {loan.title}
              </p>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={loan.status} />
              </div>
            </div>
            <ChevronRight size={16} color={subtleText} />
          </div>
        ))}
      </div>

      {/* Search */}
      <p style={{ margin: "22px 0 10px", fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15, color: dark ? "#F1F5F9" : "#12271C" }}>
        Find a book
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: cardBg,
          border: dark ? "1px solid #223047" : "1px solid #E3ECE6",
          borderRadius: 14,
          padding: "10px 12px",
        }}
      >
        <Search size={16} color={subtleText} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author, ISBN"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13.5,
            width: "100%",
            color: dark ? "#F1F5F9" : "#12271C",
            fontFamily: "Inter, sans-serif",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background: chip === c ? COLORS.primary : dark ? "#16213A" : "#EDF3EF",
              color: chip === c ? "#fff" : dark ? "#94A3B8" : "#4D5F55",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Catalog preview grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {BOOKS.filter((b) => chip === "All" || b.category === chip).map((b) => (
          <div
            key={b.id}
            onClick={() => setSelectedBook(b)}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: 12,
              display: "flex",
              gap: 12,
              alignItems: "center",
              border: dark ? "1px solid #223047" : "1px solid #EDF3EF",
              cursor: "pointer",
            }}
          >
            <BookCoverThumb hex={b.cover} dark={dark} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: dark ? "#F1F5F9" : "#12271C", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {b.title}
              </p>
              <p style={{ margin: "2px 0 6px", fontSize: 12, color: subtleText, fontFamily: "Inter, sans-serif" }}>{b.author}</p>
              <AvailabilityBadge available={b.available} total={b.total} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookDetailSheet({ book, onClose, onReserve, dark }) {
  const [pickupDate, setPickupDate] = useState("");
  const [sent, setSent] = useState(false);
  const cardBg = dark ? "#16213A" : "#FFFFFF";

  if (!book) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        borderRadius: 40,
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: cardBg,
          borderRadius: "24px 24px 0 0",
          padding: "10px 20px 26px",
          maxHeight: "78%",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: dark ? "#334155" : "#DCE5DF", margin: "6px auto 14px" }} />
        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle2 size={40} color={COLORS.primary} style={{ margin: "0 auto 10px" }} />
            <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15, color: dark ? "#F1F5F9" : "#12271C", margin: "0 0 4px" }}>
              Reservation sent
            </p>
            <p style={{ fontSize: 12.5, color: dark ? "#94A3B8" : "#5B6B63", margin: 0, fontFamily: "Inter, sans-serif" }}>
              Librarians have been notified on the desktop panel.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: 18, background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14 }}>
              <BookCoverThumb hex={book.cover} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, fontFamily: "'Poppins', sans-serif", color: dark ? "#F1F5F9" : "#12271C" }}>
                  {book.title}
                </p>
                <p style={{ margin: "3px 0 6px", fontSize: 12.5, color: dark ? "#94A3B8" : "#5B6B63", fontFamily: "Inter, sans-serif" }}>
                  {book.author} · ISBN 978-971-{100 + book.id}-0
                </p>
                <AvailabilityBadge available={book.available} total={book.total} />
              </div>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: dark ? "#CBD5E1" : "#41544A", marginTop: 14, fontFamily: "Inter, sans-serif" }}>
              A core reference used across BSIT coursework, covering foundational concepts with practical examples suited for undergraduate study.
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, margin: "16px 0 6px", color: dark ? "#F1F5F9" : "#12271C", fontFamily: "Inter, sans-serif" }}>
              Target pickup date
            </p>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              style={{
                width: "100%",
                border: dark ? "1px solid #334155" : "1px solid #E3ECE6",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                background: dark ? "#0F172A" : "#F8FAF9",
                color: dark ? "#F1F5F9" : "#12271C",
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
            <button
              disabled={book.available === 0}
              onClick={() => {
                if (!pickupDate) return;
                setSent(true);
                onReserve && onReserve(book);
              }}
              style={{
                width: "100%",
                marginTop: 16,
                background: book.available === 0 ? (dark ? "#334155" : "#DCE5DF") : COLORS.primary,
                color: book.available === 0 ? (dark ? "#64748B" : "#8FA398") : "#fff",
                border: "none",
                borderRadius: 14,
                padding: "13px 0",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                cursor: book.available === 0 ? "not-allowed" : "pointer",
              }}
            >
              {book.available === 0 ? "Out of stock" : "Reserve book"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RentalsTab({ dark }) {
  const [seg, setSeg] = useState("loans");
  const cardBg = dark ? "#16213A" : "#FFFFFF";
  const subtleText = dark ? "#94A3B8" : "#5B6B63";
  const steps = ["Pending", "Approved", "Checked out"];

  return (
    <div style={{ padding: "16px 16px 90px" }}>
      <p style={{ margin: "0 0 14px", fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 17, color: dark ? "#F1F5F9" : "#12271C" }}>
        My library
      </p>
      <div style={{ display: "flex", background: dark ? "#16213A" : "#EDF3EF", borderRadius: 12, padding: 3 }}>
        {[
          { k: "loans", l: "Active loans" },
          { k: "pending", l: "Pending" },
          { k: "history", l: "History" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setSeg(t.k)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: "none",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              background: seg === t.k ? COLORS.primary : "transparent",
              color: seg === t.k ? "#fff" : subtleText,
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {seg === "loans" &&
          LOANS.map((loan) => (
            <div key={loan.id} style={{ background: cardBg, borderRadius: 16, padding: 14, border: dark ? "1px solid #223047" : "1px solid #EDF3EF" }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: dark ? "#F1F5F9" : "#12271C", fontFamily: "Inter, sans-serif" }}>{loan.title}</p>
              <div style={{ marginTop: 8 }}>
                <StatusBadge status={loan.status} />
              </div>
            </div>
          ))}

        {seg === "pending" &&
          RESERVATIONS.map((r) => (
            <div key={r.id} style={{ background: cardBg, borderRadius: 16, padding: 14, border: dark ? "1px solid #223047" : "1px solid #EDF3EF" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 500, color: dark ? "#F1F5F9" : "#12271C", fontFamily: "Inter, sans-serif" }}>{r.title}</p>
              <div style={{ display: "flex", alignItems: "center" }}>
                {steps.map((s, i) => (
                  <React.Fragment key={s}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: i <= r.step ? COLORS.primary : dark ? "#334155" : "#DCE5DF",
                        }}
                      />
                      <span style={{ fontSize: 9.5, color: i <= r.step ? COLORS.primary : subtleText, fontFamily: "Inter, sans-serif", textAlign: "center" }}>
                        {s}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: i < r.step ? COLORS.primary : dark ? "#334155" : "#DCE5DF", marginBottom: 14 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}

        {seg === "history" && (
          <p style={{ fontSize: 12.5, color: subtleText, textAlign: "center", marginTop: 30, fontFamily: "Inter, sans-serif" }}>
            No past transactions yet.
          </p>
        )}
      </div>
    </div>
  );
}

function QrTab({ dark }) {
  const subtleText = dark ? "#94A3B8" : "#5B6B63";
  return (
    <div style={{ padding: "16px 16px 90px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p style={{ alignSelf: "flex-start", margin: "0 0 18px", fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 17, color: dark ? "#F1F5F9" : "#12271C" }}>
        Digital library pass
      </p>
      <div
        style={{
          background: `linear-gradient(160deg, ${COLORS.primary}, ${COLORS.secondary})`,
          borderRadius: 22,
          padding: 22,
          width: "100%",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>Jay Deguzman</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, opacity: 0.85, fontFamily: "Inter, sans-serif" }}>BSIT · 4th Year · #2022-01345</p>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.primary, fontWeight: 700, fontSize: 12 }}>
            JD
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, marginTop: 18, padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Student library QR code">
            <rect width="150" height="150" fill="#fff" />
            {Array.from({ length: 12 }).map((_, r) =>
              Array.from({ length: 12 }).map((_, c) => {
                const on = (r * 7 + c * 13 + (r % 3) * c) % 5 === 0 || (r + c) % 9 === 0;
                return on ? <rect key={`${r}-${c}`} x={c * 12} y={r * 12} width="12" height="12" fill={COLORS.primary} /> : null;
              })
            )}
            <rect x="0" y="0" width="30" height="30" fill="none" stroke={COLORS.primary} strokeWidth="5" />
            <rect x="120" y="0" width="30" height="30" fill="none" stroke={COLORS.primary} strokeWidth="5" />
            <rect x="0" y="120" width="30" height="30" fill="none" stroke={COLORS.primary} strokeWidth="5" />
          </svg>
        </div>
        <p style={{ textAlign: "center", fontSize: 11.5, opacity: 0.85, marginTop: 14, marginBottom: 0, fontFamily: "Inter, sans-serif" }}>
          Present at the librarian desk for instant check-in
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22, padding: "10px 14px", borderRadius: 12, background: dark ? "#16213A" : "#EDF3EF", width: "100%", boxSizing: "border-box" }}>
        <ShieldCheck size={16} color={COLORS.secondary} />
        <span style={{ fontSize: 11.5, color: subtleText, fontFamily: "Inter, sans-serif" }}>
          Refreshes every 60 seconds for security
        </span>
      </div>
    </div>
  );
}

function StaffModeSheet({ open, onClose, dark }) {
  if (!open) return null;
  const cardBg = dark ? "#16213A" : "#FFFFFF";
  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", borderRadius: 40, zIndex: 30 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: cardBg, borderRadius: "24px 24px 0 0", padding: "10px 20px 26px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: dark ? "#334155" : "#DCE5DF", margin: "6px auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <ShieldCheck size={20} color={COLORS.primary} />
          <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 15, color: dark ? "#F1F5F9" : "#12271C" }}>
            Staff mode
          </p>
        </div>
        <p style={{ fontSize: 12.5, color: dark ? "#94A3B8" : "#5B6B63", margin: "4px 0 16px", fontFamily: "Inter, sans-serif" }}>
          For librarians only. Scan student passes, approve reservations, and log book condition from this device.
        </p>
        {["Scan student QR", "Approve pending reservations", "Inspect book condition"].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: 12,
              border: dark ? "1px solid #223047" : "1px solid #EDF3EF",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: dark ? "#F1F5F9" : "#12271C", fontFamily: "Inter, sans-serif" }}>{item}</span>
            <ChevronRight size={15} color={dark ? "#64748B" : "#8FA398"} />
          </div>
        ))}
        <p style={{ fontSize: 10.5, color: dark ? "#64748B" : "#8FA398", textAlign: "center", marginTop: 10, fontFamily: "Inter, sans-serif" }}>
          Requires librarian credentials · coming to this build
        </p>
      </div>
    </div>
  );
}

function AuthField({ icon: Icon, label, type = "text", value, onChange, placeholder, dark, error, toggleablePassword, showPassword, onToggleShow }) {
  const fieldBg = dark ? "#16213A" : "#FFFFFF";
  const borderColor = error ? "#D9534F" : dark ? "#223047" : "#E3ECE6";
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: dark ? "#CBD5E1" : "#41544A", fontFamily: "Inter, sans-serif" }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: fieldBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: "10px 12px",
        }}
      >
        <Icon size={15} color={dark ? "#64748B" : "#8FA398"} />
        <input
          type={toggleablePassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13.5,
            width: "100%",
            color: dark ? "#F1F5F9" : "#12271C",
            fontFamily: "Inter, sans-serif",
          }}
        />
        {toggleablePassword && (
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
          >
            {showPassword ? <EyeOff size={15} color={dark ? "#64748B" : "#8FA398"} /> : <Eye size={15} color={dark ? "#64748B" : "#8FA398"} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#D9534F", fontFamily: "Inter, sans-serif" }}>{error}</p>
      )}
    </div>
  );
}

function LoginScreen({ dark, onLogin, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const headerText = dark ? "#F1F5F9" : "#12271C";
  const subtleText = dark ? "#94A3B8" : "#5B6B63";

  const submit = () => {
    const e = {};
    if (!email.trim()) e.email = "Enter your CDM email";
    if (!password) e.password = "Enter your password";
    setErrors(e);
    if (Object.keys(e).length === 0) onLogin();
  };

  return (
    <div style={{ padding: "36px 22px 40px", height: "100%", overflowY: "auto", boxSizing: "border-box" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <BookMarked size={24} color={COLORS.accent} />
      </div>
      <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 21, color: headerText }}>Welcome back</p>
      <p style={{ margin: "4px 0 26px", fontSize: 12.5, color: subtleText, fontFamily: "Inter, sans-serif" }}>
        Log in with your CDM student account
      </p>

      <AuthField icon={Mail} label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan.delacruz@cdm.edu.ph" dark={dark} error={errors.email} />
      <AuthField
        icon={Lock}
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        dark={dark}
        error={errors.password}
        toggleablePassword
        showPassword={showPw}
        onToggleShow={() => setShowPw(!showPw)}
      />

      <p style={{ textAlign: "right", fontSize: 11.5, color: COLORS.secondary, margin: "-4px 0 20px", fontFamily: "Inter, sans-serif" }}>
        Forgot password?
      </p>

      <button
        onClick={submit}
        style={{
          width: "100%",
          background: COLORS.primary,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: "13px 0",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
          cursor: "pointer",
        }}
      >
        Log in
      </button>

      <p style={{ textAlign: "center", fontSize: 12.5, color: subtleText, marginTop: 22, fontFamily: "Inter, sans-serif" }}>
        New to CDM Library?{" "}
        <span onClick={onGoRegister} style={{ color: COLORS.primary, fontWeight: 500, cursor: "pointer" }}>
          Create an account
        </span>
      </p>
    </div>
  );
}

function RegisterScreen({ dark, onRegister, onGoLogin }) {
  const [form, setForm] = useState({
    studentId: "",
    fullName: "",
    email: "",
    phone: "",
    course: "",
    yearLevel: "",
    password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const headerText = dark ? "#F1F5F9" : "#12271C";
  const subtleText = dark ? "#94A3B8" : "#5B6B63";
  const fieldBg = dark ? "#16213A" : "#FFFFFF";

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = () => {
    const e = {};
    if (!form.studentId.trim()) e.studentId = "Enter your student ID";
    if (!form.fullName.trim()) e.fullName = "Enter your full name";
    if (!form.email.trim()) e.email = "Enter your CDM email";
    else if (!form.email.trim().toLowerCase().endsWith("@cdm.edu.ph")) e.email = "Use your @cdm.edu.ph email";
    if (!form.phone.trim()) e.phone = "Enter your phone number";
    if (!form.course) e.course = "Select your course";
    if (!form.yearLevel) e.yearLevel = "Select your year level";
    if (!form.password || form.password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    if (Object.keys(e).length === 0) onRegister();
  };

  const selectStyle = {
    width: "100%",
    border: "1px solid " + (dark ? "#223047" : "#E3ECE6"),
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13.5,
    background: fieldBg,
    color: form ? (dark ? "#F1F5F9" : "#12271C") : subtleText,
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "28px 22px 40px", height: "100%", overflowY: "auto", boxSizing: "border-box" }}>
      <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 21, color: headerText }}>Create account</p>
      <p style={{ margin: "4px 0 22px", fontSize: 12.5, color: subtleText, fontFamily: "Inter, sans-serif" }}>
        Register with your official CDM student details
      </p>

      <AuthField icon={IdCard} label="Student ID" value={form.studentId} onChange={set("studentId")} placeholder="2022-01345" dark={dark} error={errors.studentId} />
      <AuthField icon={User} label="Full name" value={form.fullName} onChange={set("fullName")} placeholder="Juan Dela Cruz" dark={dark} error={errors.fullName} />
      <AuthField icon={Mail} label="CDM email" value={form.email} onChange={set("email")} placeholder="juan.delacruz@cdm.edu.ph" dark={dark} error={errors.email} />
      <AuthField icon={Phone} label="Phone number" value={form.phone} onChange={set("phone")} placeholder="09xx xxx xxxx" dark={dark} error={errors.phone} />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: dark ? "#CBD5E1" : "#41544A", fontFamily: "Inter, sans-serif" }}>
            Course
          </label>
          <select value={form.course} onChange={set("course")} style={{ ...selectStyle, borderColor: errors.course ? "#D9534F" : selectStyle.border }}>
            <option value="">Select</option>
            <option value="BSIT">BSIT</option>
            <option value="BSCE">BSCE</option>
            <option value="BSEd">BSEd</option>
          </select>
          {errors.course && <p style={{ margin: "5px 0 0", fontSize: 11, color: "#D9534F", fontFamily: "Inter, sans-serif" }}>{errors.course}</p>}
        </div>
        <div style={{ flex: 1, marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: dark ? "#CBD5E1" : "#41544A", fontFamily: "Inter, sans-serif" }}>
            Year level
          </label>
          <select value={form.yearLevel} onChange={set("yearLevel")} style={selectStyle}>
            <option value="">Select</option>
            <option value="1">1st year</option>
            <option value="2">2nd year</option>
            <option value="3">3rd year</option>
            <option value="4">4th year</option>
          </select>
          {errors.yearLevel && <p style={{ margin: "5px 0 0", fontSize: 11, color: "#D9534F", fontFamily: "Inter, sans-serif" }}>{errors.yearLevel}</p>}
        </div>
      </div>

      <AuthField
        icon={Lock}
        label="Password"
        value={form.password}
        onChange={set("password")}
        placeholder="At least 8 characters"
        dark={dark}
        error={errors.password}
        toggleablePassword
        showPassword={showPw}
        onToggleShow={() => setShowPw(!showPw)}
      />

      <button
        onClick={submit}
        style={{
          width: "100%",
          background: COLORS.primary,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: "13px 0",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
          cursor: "pointer",
          marginTop: 4,
        }}
      >
        Create account
      </button>

      <p style={{ textAlign: "center", fontSize: 12.5, color: subtleText, marginTop: 18, fontFamily: "Inter, sans-serif" }}>
        Already have an account?{" "}
        <span onClick={onGoLogin} style={{ color: COLORS.primary, fontWeight: 500, cursor: "pointer" }}>
          Log in
        </span>
      </p>
    </div>
  );
}

export default function CdmLibraryMobile() {
  const [tab, setTab] = useState("home");
  const [dark, setDark] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [authView, setAuthView] = useState("login"); // "login" | "register" | null (logged in)

  const bg = dark ? COLORS.bgDark : COLORS.bgLight;
  const headerText = dark ? "#F1F5F9" : "#12271C";

  const tabs = [
    { k: "home", icon: Home, label: "Home" },
    { k: "catalog", icon: BookMarked, label: "My Library" },
    { k: "pass", icon: QrCode, label: "Pass" },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0", fontFamily: "Inter, sans-serif" }}>
      <div
        style={{
          width: 340,
          height: 700,
          background: "#000",
          borderRadius: 44,
          padding: 10,
          boxShadow: "0 20px 50px rgba(16,106,46,0.18)",
        }}
      >
        <div style={{ width: "100%", height: "100%", background: bg, borderRadius: 34, overflow: "hidden", position: "relative" }}>
          {/* status bar */}
          <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontSize: 11, color: headerText, fontWeight: 500 }}>
            <span>9:41</span>
            <div style={{ width: 90, height: 22, background: "#000", borderRadius: 12, position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setDark(!dark)}
                aria-label="Toggle dark mode"
                style={{ background: "none", border: "none", cursor: "pointer", color: headerText, display: "flex" }}
              >
                {dark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <Bell size={13} color={headerText} />
            </div>
          </div>

          {/* content */}
          <div style={{ height: "calc(100% - 30px)", overflowY: "auto", position: "relative" }}>
            {authView === "login" && (
              <LoginScreen dark={dark} onLogin={() => setAuthView(null)} onGoRegister={() => setAuthView("register")} />
            )}
            {authView === "register" && (
              <RegisterScreen dark={dark} onRegister={() => setAuthView(null)} onGoLogin={() => setAuthView("login")} />
            )}
            {authView === null && (
              <>
                {tab === "home" && <HomeTab dark={dark} setSelectedBook={setSelectedBook} />}
                {tab === "catalog" && <RentalsTab dark={dark} />}
                {tab === "pass" && <QrTab dark={dark} />}

                <BookDetailSheet book={selectedBook} onClose={() => setSelectedBook(null)} dark={dark} />
                <StaffModeSheet open={staffOpen} onClose={() => setStaffOpen(false)} dark={dark} />
              </>
            )}
          </div>

          {/* FAB */}
          {authView === null && (
            <button
              onClick={() => setStaffOpen(true)}
              aria-label="Staff mode"
              style={{
                position: "absolute",
                right: 18,
                bottom: 92,
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: COLORS.accent,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(244,211,94,0.5)",
                cursor: "pointer",
                zIndex: 15,
              }}
            >
              <ShieldCheck size={19} color={COLORS.primary} />
            </button>
          )}

          {/* bottom nav */}
          {authView === null && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 72,
                background: dark ? "#16213A" : "#FFFFFF",
                borderTop: dark ? "1px solid #223047" : "1px solid #EDF3EF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                borderRadius: "0 0 34px 34px",
              }}
            >
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.k;
                return (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    style={{
                      background: "none",
                      border: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      cursor: "pointer",
                      color: active ? COLORS.primary : dark ? "#64748B" : "#9CB0A5",
                    }}
                  >
                    <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                    <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "Inter, sans-serif" }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
