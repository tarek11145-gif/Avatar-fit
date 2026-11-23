"use client";
import { cx } from "./ui";

export const SKINS = ["#f1c9a5", "#e0ac84", "#c98e6b", "#a86f4c", "#7d4f33", "#4f3222"];
export const COLORS = ["#16191c", "#f4f6f5", "#39ff88", "#00e0ff", "#7c5cff", "#ff5d5d"];

export function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-mute">{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => onChange(c)}
            className={cx("h-10 w-10 rounded-full border-2 transition", value === c ? "border-acc scale-110" : "border-white/10")} style={{ background: c }} />
        ))}
        <label className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border-2 border-dashed border-white/20 text-xs text-mute" aria-label={`${label} : couleur libre`}>
          +<input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0" />
        </label>
      </div>
    </div>
  );
}
