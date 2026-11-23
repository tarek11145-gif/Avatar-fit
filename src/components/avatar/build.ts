import * as THREE from "three";
import { lerp, rT } from "@/lib/body";
import type { AvatarLook, BodyShape, Measures, MuscleId } from "@/lib/types";

/* Avatar articulé : bassin → torse → bras (épaule, coude) ; bassin → jambes (hanche, genou).
   Chaque segment est un « loft » d'ellipses mesurées (scan photo ou mensurations). */

interface Sec { y: number; x: number; z: number; a: number; b: number }
export interface Rig {
  root: THREE.Group; pelvis: THREE.Group; torso: THREE.Group;
  sh: [THREE.Group, THREE.Group]; el: [THREE.Group, THREE.Group];
  hip: [THREE.Group, THREE.Group]; kn: [THREE.Group, THREE.Group];
  rest: { yHip: number; alpha: number; Lt: number; Ls: number; Lu: number; Lf: number; ankle: number; Ds: number; bh: number; H: number };
  muscles: THREE.Mesh[];
  dispose(): void;
}

/** Lisse la silhouette : courbe de Catmull-Rom entre les sections mesurées. */
function smooth(S: Sec[], sub = 3): Sec[] {
  if (S.length < 3) return S;
  const out: Sec[] = [];
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  for (let i = 0; i < S.length - 1; i++) {
    const p0 = S[Math.max(0, i - 1)], p1 = S[i], p2 = S[i + 1], p3 = S[Math.min(S.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      out.push({ y: cr(p0.y, p1.y, p2.y, p3.y, t), x: cr(p0.x, p1.x, p2.x, p3.x, t), z: cr(p0.z, p1.z, p2.z, p3.z, t), a: Math.max(0.005, cr(p0.a, p1.a, p2.a, p3.a, t)), b: Math.max(0.005, cr(p0.b, p1.b, p2.b, p3.b, t)) });
    }
  }
  out.push(S[S.length - 1]);
  return out;
}

function loft(S0: Sec[], seg = 48) {
  const S = smooth(S0);
  const pos: number[] = [], idx: number[] = [];
  S.forEach((s) => { for (let i = 0; i < seg; i++) { const t = (i / seg) * Math.PI * 2; pos.push(s.x + Math.cos(t) * s.a, s.y, s.z + Math.sin(t) * s.b); } });
  for (let j = 0; j < S.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * seg + i, b = j * seg + ((i + 1) % seg); idx.push(a, b, a + seg, b, b + seg, a + seg); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function at(S: Sec[], y: number) {
  const asc = S[0].y < S[S.length - 1].y;
  const A = asc ? S : [...S].reverse();
  let i = 0; while (i < A.length - 2 && A[i + 1].y < y) i++;
  const p = A[i], q = A[i + 1], t = Math.min(1, Math.max(0, (y - p.y) / (q.y - p.y || 1)));
  return { x: lerp(p.x, q.x, t), z: lerp(p.z, q.z, t), a: lerp(p.a, q.a, t), b: lerp(p.b, q.b, t) };
}
function surf(S: Sec[], y: number, th: number) {
  const s = at(S, y), nx = Math.cos(th) * s.b, nz = Math.sin(th) * s.a;
  return { p: new THREE.Vector3(s.x + Math.cos(th) * s.a, y, s.z + Math.sin(th) * s.b), ry: Math.atan2(nx, nz), a: s.a, b: s.b };
}
const range = (S: Sec[], from: number, to: number) => S.slice(from, to + 1);

let fiberTex: THREE.CanvasTexture | null = null;
function fiber() {
  if (fiberTex || typeof document === "undefined") return fiberTex;
  const c = document.createElement("canvas"); c.width = 64; c.height = 64; const x = c.getContext("2d")!;
  x.fillStyle = "#c3443a"; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 3) { x.fillStyle = i % 2 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.12)"; x.fillRect(i, 0, 1.5, 64); }
  fiberTex = new THREE.CanvasTexture(c); fiberTex.wrapS = fiberTex.wrapT = THREE.RepeatWrapping; fiberTex.repeat.set(2, 1);
  return fiberTex;
}

export interface BuildOpts { muscles: boolean; selected: MuscleId | null; mk: number; def: number; ghost?: boolean }

export function buildRig(shape: BodyShape, r: Measures, look: AvatarLook, o: BuildOpts): Rig {
  const H = shape.H, A = shape.arm;
  const disposables: { dispose(): void }[] = [];
  const mat = (color: string, rough = 0.75) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02, side: THREE.DoubleSide }); disposables.push(m); return m; };
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }); disposables.push(ghostMat);
  const skin = o.ghost ? ghostMat : mat(look.skin, 0.6);
  const naked = o.muscles || o.ghost;
  const topM = naked || look.top === "aucun" ? skin : mat(look.topColor, 0.85);
  const botM = o.ghost ? ghostMat : mat(look.bottomColor, 0.85);
  const shoeM = o.ghost ? ghostMat : mat(look.shoeColor, 0.5);
  const hairM = o.ghost ? ghostMat : mat(look.hairColor, 0.9);
  const musMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: fiber(), roughness: 0.55 }); disposables.push(musMat);
  const selMat = new THREE.MeshStandardMaterial({ color: 0x39ff88, emissive: 0x0a4d26, roughness: 0.4 }); disposables.push(selMat);
  const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material) => { disposables.push(g); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; parent.add(mesh); return mesh; };

  const yHip = shape.legs[6].f * H;
  const root = new THREE.Group(), pelvis = new THREE.Group(), torso = new THREE.Group();
  root.add(pelvis); pelvis.position.y = yHip; pelvis.add(torso);

  /* ---- Torse ---- */
  const tor: Sec[] = shape.torso.map((q) => { const k = rT(q.t, r); return { y: q.f * H - yHip, x: 0, z: q.z, a: q.a * k, b: q.b * k }; });
  const top = tor[tor.length - 1], nr = shape.headR * 0.5, hy = shape.headF * H - yHip, b0 = tor[0];
  const capBottom: Sec = { y: b0.y - 0.012 * H, x: 0, z: b0.z, a: b0.a * 0.55, b: b0.b * 0.55 };
  const neck: Sec[] = [{ y: top.y + 0.015 * H, x: 0, z: top.z * 0.5, a: nr * 1.25, b: nr * 1.15 }, { y: hy - shape.headR * 0.75, x: 0, z: 0, a: nr, b: nr }];
  const bottomStyle = naked ? skin : botM;
  const brassiere = !naked && look.top === "brassiere";
  add(torso, loft([capBottom, ...range(tor, 0, 3)]), bottomStyle);
  add(torso, loft(range(tor, 3, 7)), brassiere ? skin : topM);
  add(torso, loft(range(tor, 7, tor.length - 1)), topM);
  add(torso, loft([top, ...neck]), skin);
  const allTor = [capBottom, ...tor];

  /* ---- Tête + cheveux ---- */
  const head = new THREE.Group(); head.position.set(0, hy, 0.008); torso.add(head);
  const hg = new THREE.SphereGeometry(shape.headR, 40, 28); const hm = add(head, hg, skin); hm.scale.set(0.86, 1.12, 1);
  if (!o.ghost) {
    const R0 = shape.headR;
    const nose = add(head, new THREE.SphereGeometry(R0, 16, 12), skin); nose.scale.set(0.11, 0.2, 0.14); nose.position.set(0, -R0 * 0.08, R0 * 0.95);
    const eyeM = mat("#141414", 0.3);
    [-1, 1].forEach((sx) => {
      const ear = add(head, new THREE.SphereGeometry(R0, 16, 12), skin); ear.scale.set(0.07, 0.2, 0.13); ear.position.set(sx * R0 * 0.85, -R0 * 0.02, -R0 * 0.02);
      const eye = add(head, new THREE.SphereGeometry(R0 * 0.065, 12, 10), eyeM); eye.position.set(sx * R0 * 0.3, R0 * 0.12, R0 * 0.9);
      const brow = add(head, new THREE.SphereGeometry(R0, 12, 8), hairM); brow.scale.set(0.17, 0.035, 0.05); brow.position.set(sx * R0 * 0.3, R0 * 0.27, R0 * 0.9); brow.rotation.z = sx * -0.12;
    });
  }
  if (!o.ghost && look.hair !== "rase") {
    const cap = new THREE.SphereGeometry(shape.headR * 1.05, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const c = add(head, cap, hairM); c.scale.set(0.88, 1.14, 1.04); c.position.set(0, shape.headR * 0.05, -shape.headR * 0.04); c.rotation.x = -0.25;
    if (look.hair === "long") { const l = add(head, new THREE.SphereGeometry(shape.headR, 24, 16), hairM); l.scale.set(0.85, 1.5, 0.5); l.position.set(0, -shape.headR * 0.55, -shape.headR * 0.55); }
    if (look.hair === "chignon") { const b = add(head, new THREE.SphereGeometry(shape.headR * 0.38, 20, 14), hairM); b.position.set(0, shape.headR * 0.85, -shape.headR * 0.75); }
  } else if (!o.ghost) {
    const cap = new THREE.SphereGeometry(shape.headR * 1.01, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const c = add(head, cap, hairM); c.scale.set(0.87, 1.13, 1.01); c.rotation.x = -0.3;
  }

  /* ---- Jambes ---- */
  const lr = (u: number) => (u >= 0.6 ? r.thigh : 1 + (r.thigh - 1) * (u / 0.6) * 0.6);
  const fHip = shape.legs[6].f, fKnee = shape.legs[3].f, fAnk = shape.legs[0].f;
  const Lt = (fHip - fKnee) * H, Ls = (fKnee - fAnk) * H, ankle = fAnk * H;
  const legX = shape.legs[5].x;
  const hip: THREE.Group[] = [], kn: THREE.Group[] = [];
  const legsSec: Record<number, { thigh: Sec[]; shin: Sec[] }> = {};
  [-1, 1].forEach((sx, i) => {
    const h = new THREE.Group(); h.position.set(sx * legX, 0, 0); pelvis.add(h); hip.push(h);
    const S = shape.legs.map((q) => ({ y: (q.f - fHip) * H, x: 0, z: q.z, a: q.a * lr(q.u), b: q.b * lr(q.u) }));
    const thigh = [S[6], S[5], S[4], S[3]];
    const legging = !naked && look.bottom === "legging";
    add(h, loft([S[6], S[5], S[4]]), naked ? skin : botM);
    add(h, loft([S[4], S[3]]), legging ? botM : skin);
    const k = new THREE.Group(); k.position.set(0, -Lt, 0); h.add(k); kn.push(k);
    const shin = [S[3], S[2], S[1], S[0]].map((q) => ({ ...q, y: q.y + Lt }));
    add(k, loft(shin), legging ? botM : skin);
    const knee = add(k, new THREE.SphereGeometry(1, 16, 12), legging ? botM : skin); knee.scale.set(shin[0].a * 0.95, shin[0].a * 0.95, shin[0].b * 0.95);
    const foot = add(k, new THREE.SphereGeometry(1, 20, 12), shoeM);
    foot.scale.set(0.045 * H / 1.76, 0.035 * H / 1.76, 0.125 * H / 1.76); foot.position.set(0, -Ls - ankle * 0.55, 0.055 * H / 1.76);
    const sole = add(k, new THREE.CylinderGeometry(1, 1, 1, 24), o.ghost ? ghostMat : mat("#e9ecea", 0.8));
    sole.scale.set(0.043 * H / 1.76, 0.01 * H / 1.76, 0.115 * H / 1.76); sole.position.set(0, -Ls - ankle * 0.55 - 0.03 * H / 1.76, 0.055 * H / 1.76);
    legsSec[i] = { thigh, shin };
  });

  /* ---- Bras ---- */
  const ar = A.ru * r.arm, fr = A.rf * (1 + (r.arm - 1) * 0.5);
  const xs = Math.max(A.xS * 0.9, top.a * 0.8);
  const ys = A.fS * H - yHip;
  const Lu = Math.hypot((A.fS - A.fE) * H, A.xE - A.xS), Lf = Math.hypot((A.fE - A.fW) * H, A.xW - A.xE);
  const hipsA = Math.max(...tor.slice(0, 4).map((q) => q.a));
  const need = Math.atan2(hipsA + fr + 0.012 - xs, Lu + Lf);
  const land = Math.atan2(A.xW - A.xS, (A.fS - A.fW) * H);
  const alpha = Math.max(0.06, need, Math.min(land, 0.5));
  const sh: THREE.Group[] = [], el: THREE.Group[] = [];
  const armSec: Record<number, { up: Sec[]; fo: Sec[] }> = {};
  [-1, 1].forEach((sx, i) => {
    const s = new THREE.Group(); s.position.set(sx * xs, ys, 0); s.rotation.z = sx * alpha; torso.add(s); sh.push(s);
    const up: Sec[] = [{ y: 0.012 * H, x: 0, z: 0, a: ar * 1.08, b: ar * 1.02 }, { y: -Lu * 0.45, x: 0, z: 0, a: ar, b: ar * 0.95 }, { y: -Lu, x: 0, z: 0, a: ar * 0.8, b: ar * 0.78 }];
    const sleeve = !naked && look.top === "tshirt";
    const mid: Sec = { y: -Lu * 0.4, x: 0, z: 0, a: ar * 1.01, b: ar * 0.96 };
    add(s, loft([up[0], mid]), sleeve ? topM : skin);
    add(s, loft([mid, up[1], up[2]]), skin);
    const sj = add(s, new THREE.SphereGeometry(ar * 1.08, 24, 16), sleeve ? topM : skin); sj.position.y = 0.004 * H;
    // Épaule : relie le torse au bras (deltoïde / trapèze)
    const cap = add(torso, new THREE.SphereGeometry(1, 28, 18), sleeve || look.top === "debardeur" && !naked ? topM : skin);
    cap.scale.set(ar * 1.3, ar * 0.75, ar * 1.05); cap.position.set(sx * (xs - ar * 0.35), ys + 0.004 * H, top.z * 0.6); cap.rotation.z = sx * -0.35;
    const e = new THREE.Group(); e.position.set(0, -Lu, 0); s.add(e); el.push(e);
    const fo: Sec[] = [{ y: 0, x: 0, z: 0, a: ar * 0.8, b: ar * 0.78 }, { y: -Lf * 0.35, x: 0, z: 0, a: fr, b: fr * 0.9 }, { y: -Lf, x: 0, z: 0, a: fr * 0.62, b: fr * 0.5 }];
    add(e, loft(fo), skin);
    const ej = add(e, new THREE.SphereGeometry(ar * 0.8, 16, 12), skin); ej.scale.set(1, 1, 0.98);
    const hand = add(e, new THREE.SphereGeometry(1, 16, 12), skin);
    hand.scale.set(0.028 * H / 1.76, 0.058 * H / 1.76, 0.02 * H / 1.76); hand.position.set(0, -Lf - 0.045 * H / 1.76, 0);
    const thumb = add(e, new THREE.SphereGeometry(1, 12, 8), skin);
    thumb.scale.set(0.009 * H / 1.76, 0.026 * H / 1.76, 0.01 * H / 1.76); thumb.position.set(-sx * 0.014 * H / 1.76, -Lf - 0.03 * H / 1.76, 0.016 * H / 1.76); thumb.rotation.z = sx * 0.4;
    armSec[i] = { up, fo };
  });

  /* ---- Muscles ---- */
  const muscles: THREE.Mesh[] = [];
  if (o.muscles && !o.ghost) {
    const ball = new THREE.SphereGeometry(1, 28, 18); disposables.push(ball);
    const put = (parent: THREE.Object3D, id: MuscleId, S: Sec[], y: number, th: number, rx: (q: { a: number; b: number }) => number, ry: number, rt: (q: { a: number; b: number }) => number, k: number) => {
      const s = surf(S, y, th), m = new THREE.Mesh(ball, id === o.selected ? selMat : musMat);
      m.position.copy(s.p); m.rotation.y = s.ry; m.scale.set(rx(s) * k, ry * k, rt(s) * k);
      m.userData.muscle = id; m.castShadow = true; parent.add(m); muscles.push(m);
    };
    const T = shape.torso.map((q) => q.t);
    const yt = (t: number) => { let i = 0; while (i < T.length - 2 && T[i + 1] < t) i++; return lerp(tor[i].y, tor[i + 1].y, (t - T[i]) / (T[i + 1] - T[i])); };
    const mk = o.mk;
    [-1, 1].forEach((sx, i) => {
      const th = (v: number) => (sx > 0 ? v : Math.PI - v);
      put(torso, "pecs", allTor, yt(0.75), th(Math.PI / 2 - 0.42), (q) => q.a * 0.4, 0.045 * H, (q) => q.b * 0.22, mk);
      [0.28, 0.4, 0.52].forEach((t) => put(torso, "abs", allTor, yt(t), th(Math.PI / 2 - 0.17), (q) => q.a * 0.15, 0.022 * H, (q) => q.b * 0.12 * o.def, 1));
      put(torso, "obliques", allTor, yt(0.38), th(Math.PI / 2 - 1.05), (q) => q.a * 0.2, 0.06 * H, (q) => q.b * 0.14, 1);
      put(torso, "traps", allTor, yt(0.96), th(-Math.PI / 2 + 0.4), (q) => q.a * 0.34, 0.04 * H, (q) => q.b * 0.28, mk);
      put(torso, "lats", allTor, yt(0.66), th(-Math.PI / 2 + 0.75), (q) => q.a * 0.3, 0.075 * H, (q) => q.b * 0.2, mk);
      put(torso, "lower", allTor, yt(0.3), th(-Math.PI / 2 + 0.17), (q) => q.a * 0.16, 0.05 * H, (q) => q.b * 0.15, 1);
      put(torso, "glutes", allTor, yt(-0.07), th(-Math.PI / 2 + 0.45), (q) => q.a * 0.36, 0.05 * H, (q) => q.b * 0.36, mk);
      const L = legsSec[i];
      put(hip[i], "quads", L.thigh, -Lt * 0.4, Math.PI / 2 + sx * 0.12, (q) => q.a * 0.72, Lt * 0.32, (q) => q.b * 0.42, mk);
      put(hip[i], "hams", L.thigh, -Lt * 0.45, -Math.PI / 2, (q) => q.a * 0.7, Lt * 0.3, (q) => q.b * 0.4, mk);
      put(kn[i], "calves", L.shin, -Ls * 0.3, -Math.PI / 2, (q) => q.a * 0.8, Ls * 0.22, (q) => q.b * 0.5, mk);
      const Ar = armSec[i];
      put(sh[i], "delts", Ar.up, -0.004 * H, th(0.15) - (sx > 0 ? 0 : 0), (q) => q.a * 0.95, Lu * 0.22, (q) => q.b * 0.7, mk);
      put(sh[i], "biceps", Ar.up, -Lu * 0.5, Math.PI / 2, (q) => q.a * 0.7, Lu * 0.3, (q) => q.b * 0.5, mk);
      put(sh[i], "triceps", Ar.up, -Lu * 0.45, -Math.PI / 2, (q) => q.a * 0.72, Lu * 0.33, (q) => q.b * 0.55, mk);
      put(el[i], "forearm", Ar.fo, -Lf * 0.3, Math.PI / 2 + sx * 0.4, (q) => q.a * 0.75, Lf * 0.25, (q) => q.b * 0.5, 1);
    });
  }

  const bh = Math.max(...tor.slice(0, 4).map((q) => q.b));
  return {
    root, pelvis, torso, sh: [sh[0], sh[1]], el: [el[0], el[1]], hip: [hip[0], hip[1]], kn: [kn[0], kn[1]], muscles,
    rest: { yHip, alpha, Lt, Ls, Lu, Lf: Lf + 0.09 * H / 1.76, ankle, Ds: A.fS * H, bh, H },
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}
