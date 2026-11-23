"use client";
import Link from "next/link";
import { useId } from "react";

export function Logo({ href = "/" }: { href?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Avatar Fit, accueil">
      <svg width="30" height="30" viewBox="0 0 512 512" aria-hidden>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#39ff88" /><stop offset="1" stopColor="#00e0ff" /></linearGradient></defs>
        <rect width="512" height="512" rx="120" fill="#0f1113" />
        <circle cx="256" cy="140" r="48" fill={`url(#${id})`} />
        <path d="M176 214c0-12 10-22 22-22h116c12 0 22 10 22 22l-20 106h-26l-14 112h-38l-14-112h-26z" fill={`url(#${id})`} />
      </svg>
      <span className="font-display text-[17px] font-semibold tracking-tight">Avatar<span className="text-acc">Fit</span></span>
    </Link>
  );
}
