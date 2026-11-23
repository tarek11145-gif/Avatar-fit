"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search, SearchX } from "lucide-react";
import { Card, Chip, Empty, PageHeader, inputCls } from "@/components/ui";
import { CATEGORIES, DIFF, EXERCISES, MUSCLES, fmtWork } from "@/lib/exercises";
import type { Category } from "@/lib/types";

export default function ExercisesPage() {
  const [cat, setCat] = useState<Category | "all">("all");
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState<0 | 1 | 2 | 3>(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return EXERCISES.filter((e) => (cat === "all" || e.category === cat) && (!lvl || e.difficulty === lvl) &&
      (!s || norm(e.name).includes(s) || e.muscles.some((m) => norm(MUSCLES[m].name).includes(s))));
  }, [cat, q, lvl]);

  return (
    <div>
      <PageHeader title="Exercices" sub={`${EXERCISES.length} exercices avec consignes et démonstration 3D.`} />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
        <input className={`${inputCls} pl-11`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un exercice ou un muscle (ex. fessiers)" aria-label="Chercher" />
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto noscroll">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>Tout</Chip>
        {CATEGORIES.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</Chip>)}
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto noscroll">
        {([0, 1, 2, 3] as const).map((d) => <Chip key={d} active={lvl === d} onClick={() => setLvl(d)}>{d ? DIFF[d] : "Tous niveaux"}</Chip>)}
      </div>
      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => (
            <Link key={e.id} href={`/exercises/${e.id}`}>
              <Card delay={Math.min(i, 12) * 0.02} className="h-full transition hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-acc">{CATEGORIES.find((c) => c.id === e.category)?.label}</div>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-snug">{e.name}</h3>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-mute" />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-mute">{e.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-surface-3 px-2.5 py-1">{DIFF[e.difficulty]}</span>
                  <span className="rounded-full bg-surface-3 px-2.5 py-1">{fmtWork(e)}</span>
                  {e.muscles.slice(0, 2).map((m) => <span key={m} className="rounded-full bg-surface-3 px-2.5 py-1 text-mute">{MUSCLES[m].name}</span>)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : <Empty icon={<SearchX className="h-5 w-5" />} title="Aucun exercice" text="Essaie un autre mot ou retire un filtre." />}
    </div>
  );
}
