"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Dumbbell, Gauge, Timer } from "lucide-react";
import Avatar3D from "@/components/avatar/AvatarLazy";
import { Button, Card, Empty } from "@/components/ui";
import { CATEGORIES, DIFF, EXERCISES, MUSCLES, byId, fmtWork } from "@/lib/exercises";
import { EQUIP } from "@/lib/programs";
import { useBody } from "@/lib/useBody";

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const e = byId(id);
  const body = useBody(0);
  if (!e) return <Empty icon={<Dumbbell className="h-5 w-5" />} title="Exercice introuvable" text="Il a peut-être été renommé." action={<Button href="/exercises">Retour aux exercices</Button>} />;
  const similar = EXERCISES.filter((x) => x.id !== e.id && x.muscles.some((m) => e.muscles.includes(m))).slice(0, 4);
  return (
    <div>
      <Link href="/exercises" className="mb-4 inline-flex items-center gap-2 text-sm text-mute hover:text-ink"><ArrowLeft className="h-4 w-4" /> Exercices</Link>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="stage overflow-hidden rounded-[24px] border border-line">
          <Avatar3D className="h-[48vh] min-h-[360px] lg:h-[560px]" shape={body.shape} look={body.look} ratios={body.ratios} anim={e.anim} />
        </div>
        <div className="grid content-start gap-5">
          <div>
            <div className="text-sm font-semibold text-acc">{CATEGORIES.find((c) => c.id === e.category)?.label}</div>
            <h1 className="mt-1 font-display text-[32px] font-semibold leading-tight">{e.name}</h1>
            <p className="mt-2 text-[15px] text-mute">{e.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Info icon={<Gauge className="h-4 w-4" />} label="Niveau" value={DIFF[e.difficulty]} />
            <Info icon={<Timer className="h-4 w-4" />} label="Par série" value={fmtWork(e)} />
            <Info icon={<Dumbbell className="h-4 w-4" />} label="Matériel" value={EQUIP[e.equipment]} />
          </div>
          <Card>
            <h2 className="font-display text-lg font-semibold">Muscles sollicités</h2>
            <div className="mt-3 flex flex-wrap gap-2">{e.muscles.map((m, i) => <span key={m} className={`rounded-full px-3 py-1.5 text-sm ${i === 0 ? "bg-acc/15 text-acc" : "bg-surface-3 text-mute"}`}>{MUSCLES[m].name}{i === 0 && " · principal"}</span>)}</div>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold">Consignes techniques</h2>
            <ol className="mt-3 grid gap-3">
              {e.steps.map((s, i) => <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-acc/15 text-sm font-semibold text-acc">{i + 1}</span><span className="pt-0.5 text-mute">{s}</span></li>)}
            </ol>
            {!e.lowImpact && <p className="mt-4 rounded-xl bg-warn/10 p-3 text-sm text-warn">Exercice avec sauts : choisis une variante sans impact si tu as mal aux genoux ou au dos.</p>}
          </Card>
          {similar.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold">Pour les mêmes muscles</h2>
              <div className="grid gap-2 sm:grid-cols-2">{similar.map((x) => <Link key={x.id} href={`/exercises/${x.id}`} className="rounded-xl bg-surface-2 px-4 py-3 text-sm hover:bg-surface-3">{x.name}</Link>)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-surface-2 p-3"><div className="flex items-center gap-1.5 text-xs text-mute">{icon}{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>;
}
