import React from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Base Motion Skeleton Shimmer Block ───────────────────────────────────────
export function MotionSkeleton({
  className = "",
  rounded = "rounded-lg",
  style = {}
}: {
  className?: string;
  rounded?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: [0.65, 0.95, 0.65] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className={`relative overflow-hidden bg-gray-200/90 dark:bg-gray-800/90 ${rounded} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/15 to-transparent animate-motion-shimmer pointer-events-none" />
    </motion.div>
  );
}

// ─── Morphing Wrapper with Motion Transition ──────────────────────────────────
export function MotionMorphWrapper({
  isLoading,
  skeleton,
  children,
  className = ""
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(4px)", scale: 0.99 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={className}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Skeleton: Dashboard Metric Stat Cards ───────────────────────────────────
export function MotionSkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-5 border border-border/70 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <MotionSkeleton className="w-24 h-4 rounded-md" />
            <MotionSkeleton className="w-10 h-10 rounded-xl" />
          </div>
          <MotionSkeleton className="w-16 h-7 rounded-lg mb-2" />
          <div className="flex items-center gap-2">
            <MotionSkeleton className="w-12 h-3.5 rounded-full" />
            <MotionSkeleton className="w-28 h-3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton: Book Catalog Single Card ───────────────────────────────────────
export function MotionSkeletonBookCard() {
  return (
    <div className="bg-white rounded-2xl border border-border/80 p-4 shadow-sm flex flex-col justify-between overflow-hidden relative">
      {/* Cover Skeleton */}
      <div className="relative mb-3.5">
        <MotionSkeleton className="w-full aspect-[3/4] rounded-xl" />
        <div className="absolute top-2.5 right-2.5">
          <MotionSkeleton className="w-16 h-5 rounded-full" />
        </div>
      </div>

      {/* Book Info Skeletons */}
      <div className="space-y-2">
        <MotionSkeleton className="w-20 h-4 rounded-md" />
        <MotionSkeleton className="w-full h-5 rounded-md" />
        <MotionSkeleton className="w-3/4 h-3.5 rounded-md" />
      </div>

      {/* Card Footer Skeletons */}
      <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
        <MotionSkeleton className="w-20 h-4 rounded-md" />
        <MotionSkeleton className="w-24 h-8 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Skeleton: Catalog Grid (8 cards) ─────────────────────────────────────────
export function MotionSkeletonCatalogGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Search & Filter Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-border/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <MotionSkeleton className="w-72 h-10 rounded-xl" />
        <div className="flex items-center gap-2">
          <MotionSkeleton className="w-32 h-10 rounded-xl" />
          <MotionSkeleton className="w-28 h-10 rounded-xl" />
          <MotionSkeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <MotionSkeletonBookCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton: Table Rows (Student Directory / Circulation / Reservations) ────
export function MotionSkeletonTable({
  rows = 6,
  columns = 5,
  title = "Loading records..."
}: {
  rows?: number;
  columns?: number;
  title?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden">
      {/* Table Header Bar Skeleton */}
      <div className="p-5 border-b border-border/80 bg-gray-50/75 flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <MotionSkeleton className="w-48 h-5 rounded-md" />
          <MotionSkeleton className="w-64 h-3.5 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <MotionSkeleton className="w-56 h-9 rounded-xl" />
          <MotionSkeleton className="w-24 h-9 rounded-xl" />
        </div>
      </div>

      {/* Table Head & Shimmer Rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-gray-50/40 text-[11px] uppercase text-muted-foreground font-semibold">
              {Array.from({ length: columns }).map((_, c) => (
                <th key={c} className="px-5 py-3.5">
                  <MotionSkeleton className="w-20 h-3 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="hover:bg-gray-50/30">
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-5 py-4">
                    {c === 0 ? (
                      <div className="flex items-center gap-3">
                        <MotionSkeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                        <div className="space-y-1.5">
                          <MotionSkeleton className="w-32 h-4 rounded-md" />
                          <MotionSkeleton className="w-20 h-3 rounded-md" />
                        </div>
                      </div>
                    ) : c === columns - 1 ? (
                      <div className="flex justify-end gap-1.5">
                        <MotionSkeleton className="w-16 h-7 rounded-lg" />
                        <MotionSkeleton className="w-16 h-7 rounded-lg" />
                      </div>
                    ) : (
                      <MotionSkeleton className="w-24 h-4 rounded-md" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Skeleton: Full Application Loading State ─────────────────────────────────
export function MotionAppSkeleton() {
  return (
    <div className="min-h-screen bg-[#F1F1F1] flex flex-col md:flex-row font-sans selection:bg-[#106A2E]/20">
      {/* Sidebar Skeleton */}
      <aside className="w-64 bg-[#106A2E] p-5 flex flex-col justify-between hidden md:flex min-h-screen relative overflow-hidden">
        <div className="space-y-6">
          {/* Logo Brand Skeleton */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/15">
            <MotionSkeleton className="w-10 h-10 rounded-xl bg-white/20" />
            <div className="space-y-1.5">
              <MotionSkeleton className="w-24 h-4 rounded bg-white/30" />
              <MotionSkeleton className="w-16 h-2.5 rounded bg-white/20" />
            </div>
          </div>

          {/* Nav Items Skeletons */}
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <MotionSkeleton className="w-5 h-5 rounded bg-white/25" />
                <MotionSkeleton className="w-28 h-3.5 rounded bg-white/20" />
              </div>
            ))}
          </div>
        </div>

        {/* User Card Skeleton */}
        <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-3">
          <MotionSkeleton className="w-9 h-9 rounded-xl bg-[#F4D35E]/40" />
          <div className="space-y-1">
            <MotionSkeleton className="w-20 h-3.5 rounded bg-white/30" />
            <MotionSkeleton className="w-14 h-2.5 rounded bg-white/20" />
          </div>
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        {/* Top Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-border/80 shadow-sm">
          <div className="space-y-1.5">
            <MotionSkeleton className="w-48 h-6 rounded-md" />
            <MotionSkeleton className="w-64 h-3.5 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <MotionSkeleton className="w-40 h-9 rounded-xl" />
            <MotionSkeleton className="w-9 h-9 rounded-full" />
          </div>
        </div>

        {/* Hero Banner Skeleton */}
        <div className="rounded-2xl p-6 bg-gradient-to-r from-[#106A2E] to-[#0D7856] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md relative overflow-hidden">
          <div className="space-y-3 w-full md:w-2/3">
            <MotionSkeleton className="w-28 h-5 rounded-full bg-white/20" />
            <MotionSkeleton className="w-3/4 h-7 rounded-lg bg-white/30" />
            <MotionSkeleton className="w-1/2 h-4 rounded bg-white/20" />
          </div>
          <MotionSkeleton className="w-32 h-10 rounded-xl bg-[#F4D35E]/40" />
        </div>

        {/* Metric Cards Skeleton */}
        <MotionSkeletonStats count={4} />

        {/* Table/Catalog Content Skeleton */}
        <MotionSkeletonTable rows={5} columns={5} />
      </main>
    </div>
  );
}
