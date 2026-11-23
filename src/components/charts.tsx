"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tip = {
  contentStyle: { background: "#16191c", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#f4f6f5", fontSize: 13 },
  labelStyle: { color: "#8d969c" },
  cursor: { fill: "rgba(255,255,255,.04)" },
};
const axis = { stroke: "#5b6369", fontSize: 12, tickLine: false, axisLine: false } as const;

export function BarsChart({ data, x, y, unit, height = 220 }: { data: Record<string, string | number>[]; x: string; y: string; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#39ff88" /><stop offset="1" stopColor="#39ff88" stopOpacity={0.35} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
        <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip {...tip} formatter={(v) => [`${v}${unit ? " " + unit : ""}`, ""]} separator="" />
        <Bar dataKey={y} fill="url(#bg)" radius={[6, 6, 2, 2]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({ data, x, y, unit, height = 220 }: { data: Record<string, string | number>[]; x: string; y: string; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
        <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={44} />
        <Tooltip {...tip} formatter={(v) => [`${v}${unit ? " " + unit : ""}`, ""]} separator="" />
        <Line type="monotone" dataKey={y} stroke="#39ff88" strokeWidth={2.5} dot={{ r: 3, fill: "#39ff88" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SkillsRadar({ data, height = 280 }: { data: { skill: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="rgba(255,255,255,.08)" />
        <PolarAngleAxis dataKey="skill" tick={{ fill: "#8d969c", fontSize: 12 }} />
        <Tooltip {...tip} formatter={(v) => [`${v}/100`, ""]} separator="" />
        <Radar dataKey="value" stroke="#39ff88" fill="#39ff88" fillOpacity={0.22} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
