"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Apple, BarChart3, Bot, CalendarDays, Dumbbell, Home, Library, Settings, TrendingUp, User, PersonStanding } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Spinner, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import { levelOf } from "@/lib/gamification";
import { useNotifications } from "@/lib/notify";

const NAV = [
  { href: "/dashboard", label: "Accueil", icon: Home, mobile: true },
  { href: "/programs", label: "Programmes", icon: Dumbbell, mobile: true },
  { href: "/avatar", label: "Avatar", icon: PersonStanding, mobile: true },
  { href: "/coach", label: "Coach IA", icon: Bot, mobile: true },
  { href: "/stats", label: "Stats", icon: BarChart3, mobile: true },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/progress", label: "Progrès", icon: TrendingUp },
  { href: "/exercises", label: "Exercices", icon: Library },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user, data, mode } = useStore();
  const router = useRouter();
  const path = usePathname();
  useNotifications();
  useEffect(() => {
    if (status !== "ready") return;
    if (!user) router.replace("/auth");
    else if (!data.profile?.onboarded) router.replace("/onboarding");
  }, [status, user, data.profile, router]);

  if (status !== "ready" || !user || !data.profile?.onboarded) return <Spinner />;
  const xp = data.sessions.reduce((a, s) => a + s.xp, 0), lv = levelOf(xp);
  const active = (h: string) => path === h || path.startsWith(h + "/");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur lg:flex">
        <div className="px-2"><Logo href="/dashboard" /></div>
        <nav className="mt-8 grid gap-1">
          {NAV.map(({ href, label, icon: I }) => (
            <Link key={href} href={href} className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition", active(href) ? "bg-acc/10 text-acc" : "text-mute hover:bg-white/5 hover:text-ink")}>
              <I className="h-[18px] w-[18px]" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-surface-2 p-4">
          <div className="flex items-center justify-between text-sm"><span className="font-semibold">Niveau {lv.level}</span><span className="text-mute tabular-nums">{lv.into}/{lv.need} XP</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-acc" style={{ width: `${lv.pct * 100}%` }} /></div>
          {mode === "local" && <p className="mt-3 text-xs text-faint">Mode local : données sur cet appareil.</p>}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <Logo href="/dashboard" />
          <div className="flex items-center">
            <Link href="/nutrition" aria-label="Nutrition" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:text-ink"><Apple className="h-5 w-5" /></Link>
            <Link href="/progress" aria-label="Progrès" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:text-ink"><TrendingUp className="h-5 w-5" /></Link>
            <Link href="/calendar" aria-label="Calendrier" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:text-ink"><CalendarDays className="h-5 w-5" /></Link>
            <Link href="/exercises" aria-label="Exercices" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:text-ink"><Library className="h-5 w-5" /></Link>
            <Link href="/profile" aria-label="Profil" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:text-ink"><User className="h-5 w-5" /></Link>
            <Link href="/settings" aria-label="Paramètres" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:text-ink"><Settings className="h-5 w-5" /></Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-9">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bg/90 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.filter((n) => n.mobile).map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active(href) ? "text-acc" : "text-mute")}>
            <I className="h-[22px] w-[22px]" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
