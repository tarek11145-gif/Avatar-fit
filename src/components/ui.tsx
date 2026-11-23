"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useStore } from "@/lib/store";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Card({ children, className, as: As = "div", delay = 0 }: { children: ReactNode; className?: string; as?: "div" | "section"; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }} className={cx("card p-5", className)}>
      {As === "section" ? <section>{children}</section> : children}
    </motion.div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "subtle" | "danger"; href?: string; loading?: boolean; size?: "md" | "lg" | "sm" };
export function Button({ variant = "primary", href, loading, size = "md", className, children, ...rest }: BtnProps) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none",
    size === "lg" ? "h-14 px-7 text-[16px]" : size === "sm" ? "h-9 px-3.5 text-sm" : "h-11 px-5 text-[15px]",
    variant === "primary" && "bg-acc text-acc-ink hover:brightness-110 glow",
    variant === "ghost" && "border border-line-strong text-ink hover:bg-white/5",
    variant === "subtle" && "bg-surface-3 text-ink hover:bg-white/10",
    variant === "danger" && "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} disabled={loading || rest.disabled} {...rest}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>;
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
        {sub && <p className="mt-1 text-[15px] text-mute">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 10, children, color = "var(--color-acc)" }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / .07)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 6px rgb(57 255 136 / .5))" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <div className="text-[13px] text-mute">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}{unit && <span className="ml-1 text-sm font-medium text-mute">{unit}</span>}</div>
      {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
    </div>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-white/[.07]", className)}>
      <motion.div className="h-full rounded-full bg-gradient-to-r from-acc to-acc-2" initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
    </div>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active}
      className={cx("h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition", active ? "border-acc bg-acc/15 text-acc" : "border-line text-mute hover:text-ink hover:border-line-strong")}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-medium text-mute">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}
export const inputCls = "h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-ink placeholder:text-faint focus:border-acc focus:outline-none";

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-acc/10 text-acc">{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="max-w-sm text-sm text-mute">{text}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return <div className="grid min-h-[50vh] place-items-center text-mute"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-acc" />{label}</div></div>;
}

export function Toaster() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cx("pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur",
            t.tone === "err" ? "border-danger/40 bg-danger/15 text-danger" : t.tone === "xp" ? "border-acc/40 bg-acc/15 text-acc" : "border-line-strong bg-surface-2/95 text-ink")}>
          {t.text}
        </motion.div>
      ))}
    </div>
  );
}
