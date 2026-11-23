"use client";
/* Scan corporel par IA, 100 % sur l'appareil (MediaPipe Pose + segmentation).
   Les photos ne quittent jamais le téléphone. */
import * as THREE from "three";
import { T, TK, U, defaultShape, lerp, measuresOf } from "./body";
import type { BodyShape } from "./types";

type LM = { x: number; y: number; v: number };
interface PoseResults { poseLandmarks?: { x: number; y: number; visibility?: number }[]; segmentationMask?: CanvasImageSource }
interface PoseLike { setOptions(o: object): void; onResults(cb: (r: PoseResults) => void): void; send(i: { image: HTMLCanvasElement }): Promise<void> }
declare global { interface Window { Pose?: new (o: { locateFile: (f: string) => string }) => PoseLike } }

let pose: PoseLike | null = null;
let queue: Promise<unknown> = Promise.resolve();
let ready: Promise<void> | null = null;

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    const e = document.createElement("script");
    e.src = src; e.onload = () => res(); e.onerror = () => rej(new Error("Impossible de charger l'IA"));
    document.head.appendChild(e);
  });
}

function detect(cnv: HTMLCanvasElement): Promise<PoseResults> {
  ready = ready ?? loadScript("/mp/pose.js");
  const job = queue.catch(() => {}).then(() => ready).then(() => new Promise<PoseResults>((res, rej) => {
    if (!pose) {
      if (!window.Pose) return rej(new Error("IA indisponible"));
      pose = new window.Pose({ locateFile: (f) => `/mp/${f}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: false, enableSegmentation: true, smoothSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    }
    pose.onResults((r) => res(r));
    pose.send({ image: cnv }).catch(rej);
  }));
  queue = job;
  return job;
}

export function loadImage(file: File): Promise<HTMLCanvasElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1024 / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(im.src); res(c);
    };
    im.onerror = () => rej(new Error("Image illisible"));
    im.src = URL.createObjectURL(file);
  });
}

export interface Analysis {
  L: LM[]; m: Uint8Array; w: number; h: number; top: number; bot: number; hp: number;
  runAt(y: number, x: number): { a: number; b: number; w: number; c: number } | null;
  skin?: string;
}

export async function analysePhoto(cnv: HTMLCanvasElement): Promise<Analysis> {
  const r = await detect(cnv);
  const w = cnv.width, h = cnv.height;
  if (!r.poseLandmarks || !r.segmentationMask) throw new Error("Personne non détectée");
  const L = r.poseLandmarks.map((p) => ({ x: p.x * w, y: p.y * h, v: p.visibility ?? 1 }));
  const mc = document.createElement("canvas"); mc.width = w; mc.height = h;
  const mx = mc.getContext("2d")!; mx.drawImage(r.segmentationMask, 0, 0, w, h);
  const d = mx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = (d[i * 4] * d[i * 4 + 3]) / 255 > 80 ? 1 : 0;
  const cnt = (y: number) => { let n = 0; for (let x = 0; x < w; x++) n += m[y * w + x]; return n; };
  let top = 0, bot = h - 1;
  while (top < h && cnt(top) < w * 0.004) top++;
  while (bot > 0 && cnt(bot) < w * 0.004) bot--;
  const runAt = (yy: number, xx: number) => {
    const y = Math.round(Math.min(h - 1, Math.max(0, yy))), x = Math.round(Math.min(w - 1, Math.max(0, xx))), row = y * w;
    let sx = x;
    if (!m[row + sx]) { let k = 1; while (k < w * 0.04 && !m[row + x + k] && !m[row + x - k]) k++; sx = m[row + x + k] ? x + k : m[row + x - k] ? x - k : -1; }
    if (sx < 0) return null;
    let a = sx, b = sx; while (a > 0 && m[row + a - 1]) a--; while (b < w - 1 && m[row + b + 1]) b++;
    return { a, b, w: b - a + 1, c: (a + b) / 2 };
  };
  const hp = bot - top;
  if (hp < h * 0.4) throw new Error("Corps trop petit ou coupé : prends-toi en pied");
  return { L, m, w, h, top, bot, hp, runAt };
}

const mid = (p: LM, q: LM) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, v: 1 });

export function skinOf(cnv: HTMLCanvasElement, L: LM[]) {
  const x = cnv.getContext("2d")!, r = Math.max(2, Math.round(Math.abs(L[7].x - L[8].x) * 0.12));
  let R = 0, G = 0, B = 0, n = 0;
  for (const p of [mid(L[0], L[7]), mid(L[0], L[8])]) {
    const d = x.getImageData(Math.round(p.x - r), Math.round(p.y + r), r * 2, r * 2).data;
    for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
  }
  if (!n) return "#c98e6b";
  const c = new THREE.Color(R / n / 255, G / n / 255, B / n / 255), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl); c.setHSL(hsl.h, Math.min(0.55, hsl.s), Math.min(0.75, Math.max(0.25, hsl.l)));
  return `#${c.getHexString()}`;
}

/** Construit la forme 3D à partir des photos de face (obligatoire) et de profil (optionnelle). */
export function shapeFromPhotos(F: Analysis, P: Analysis | null, heightCm: number, fallbackSkin: string): BodyShape {
  const H = heightCm / 100, s = H / F.hp, L = F.L;
  const cx = mid(L[23], L[24]).x, yH = mid(L[23], L[24]).y, yS = mid(L[11], L[12]).y, f = (y: number) => (F.bot - y) / F.hp;
  const shL = Math.min(L[11].x, L[12].x), shR = Math.max(L[11].x, L[12].x), pad = F.hp * 0.012;
  const PP = P ? (() => {
    const Q = P.L, dir = Q[0].x > mid(Q[7], Q[8]).x ? 1 : -1;
    return { Q, dir, s: H / P.hp, yH: mid(Q[23], Q[24]).y, yS: mid(Q[11], Q[12]).y, xH: mid(Q[23], Q[24]).x, xS: mid(Q[11], Q[12]).x };
  })() : null;
  const torso = T.map((t, i) => {
    const y = yH + t * (yS - yH), run = F.runAt(y, cx);
    let a = run ? (run.w / 2) * s : 0.15;
    if (run && t >= 0.55) { const lo = Math.max(run.a, shL - pad), hi = Math.min(run.b, shR + pad); a = ((hi - lo) / 2) * s; }
    let b = a * TK[i], z = 0;
    if (P && PP) {
      const py = PP.yH + t * (PP.yS - PP.yH), lx = lerp(PP.xH, PP.xS, t), pr = P.runAt(py, lx);
      if (pr && pr.w * PP.s < 0.6) { b = (pr.w / 2) * PP.s; z = (pr.c - lx) * PP.dir * PP.s; }
    }
    return { t, f: f(y), a: clamp(a, 0.04, 0.35), b: clamp(b, 0.04, 0.3), z };
  });
  const legLine = (side: number, y: number) => {
    const hip = L[side ? 24 : 23], kn = L[side ? 26 : 25], an = L[side ? 28 : 27];
    return y < kn.y ? lerp(hip.x, kn.x, (y - hip.y) / (kn.y - hip.y)) : lerp(kn.x, an.x, (y - kn.y) / (an.y - kn.y));
  };
  const yA = mid(L[27], L[28]).y;
  const legs = U.map((u) => {
    const y = lerp(yA, yH, u); const ws: number[] = [], xs: number[] = [];
    for (const sd of [0, 1]) {
      const lx = legLine(sd, y), rn = F.runAt(y, lx); if (!rn) continue;
      if (rn.a <= cx && rn.b >= cx) { ws.push(rn.w / 2); xs.push(Math.abs(lx - cx)); } else { ws.push(rn.w); xs.push(Math.abs(rn.c - cx)); }
    }
    const a = ws.length ? (avg(ws) / 2) * s : 0.05, x = xs.length ? avg(xs) * s : 0.09;
    let b = a * 0.95, z = 0;
    if (P && PP) {
      const Q = PP.Q, py = lerp(mid(Q[27], Q[28]).y, PP.yH, u), kn = mid(Q[25], Q[26]), an = mid(Q[27], Q[28]);
      const lx = py < kn.y ? lerp(PP.xH, kn.x, (py - PP.yH) / (kn.y - PP.yH)) : lerp(kn.x, an.x, (py - kn.y) / (an.y - kn.y));
      const pr = P.runAt(py, lx);
      if (pr && pr.w * PP.s < 0.35) { b = (pr.w / 2) * PP.s; z = (pr.c - lx) * PP.dir * PP.s * 0.5; }
    }
    return { u, f: f(y), a: clamp(a, 0.025, 0.12), b: clamp(b, 0.025, 0.12), z, x: clamp(x, 0.04, 0.16) };
  });
  const limb = (p: LM, q: LM) => {
    const c = mid(p, q), rn = F.runAt(c.y, c.x), ang = Math.atan2(Math.abs(q.x - p.x), Math.abs(q.y - p.y));
    if (!rn || (rn.a <= cx && rn.b >= cx)) return null;
    const d = rn.w * Math.cos(ang) * s; return d > 0.05 && d < 0.18 ? d / 2 : null;
  };
  const ru = [limb(L[11], L[13]), limb(L[12], L[14])].filter((v): v is number => v !== null);
  const rf = [limb(L[13], L[15]), limb(L[14], L[16])].filter((v): v is number => v !== null);
  const base = defaultShape(heightCm, measuresOf(defaultShape(heightCm, { chest: 100, waist: 85, hips: 100, thigh: 56, arm: 31 })));
  const aru = ru.length ? avg(ru) : base.arm.ru, arf = rf.length ? avg(rf) : aru * 0.85;
  const off = (i: number, j: number) => ((Math.abs(L[i].x - cx) + Math.abs(L[j].x - cx)) / 2) * s;
  const arm = {
    fS: f(yS), fE: f(mid(L[13], L[14]).y), fW: f(mid(L[15], L[16]).y),
    xS: off(11, 12) * 0.9, xE: Math.max(off(13, 14), off(11, 12) * 0.9 + 0.02), xW: Math.max(off(15, 16), off(11, 12) * 0.9 + 0.04), ru: aru, rf: arf,
  };
  const hr = F.runAt(L[0].y, L[0].x), headR = clamp((hr ? (hr.w / 2) * s : 0.075) / 0.86, 0.07, 0.11);
  return { H, torso, legs, arm, headR, headF: 1 - (headR * 1.12) / H, skin: F.skin ?? fallbackSkin, fromPhotos: true };
}

export function postureFromBack(B: Analysis, heightCm: number) {
  const s = heightCm / B.hp;
  return { shoulders: Math.abs(B.L[11].y - B.L[12].y) * s, hips: Math.abs(B.L[23].y - B.L[24].y) * s };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const avg = (a: number[]) => a.reduce((p, q) => p + q, 0) / a.length;

/** Vignette : photo + silhouette détectée + points du squelette. */
export function drawOverlay(target: HTMLCanvasElement, cnv: HTMLCanvasElement, A: Analysis | null) {
  target.width = cnv.width; target.height = cnv.height;
  const x = target.getContext("2d")!; x.drawImage(cnv, 0, 0);
  if (!A) return;
  const id = x.getImageData(0, 0, target.width, target.height), d = id.data;
  for (let i = 0; i < A.m.length; i++) if (A.m[i]) { d[i * 4] *= 0.55; d[i * 4 + 1] = d[i * 4 + 1] * 0.55 + 115; d[i * 4 + 2] = d[i * 4 + 2] * 0.55 + 60; }
  x.putImageData(id, 0, 0);
  x.fillStyle = "#fff";
  A.L.forEach((p, i) => { if (i > 10 && i < 29) { x.beginPath(); x.arc(p.x, p.y, Math.max(3, target.width / 110), 0, 7); x.fill(); } });
}
