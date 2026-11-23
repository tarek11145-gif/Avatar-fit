import type { Anim } from "@/lib/types";
import type { Rig } from "./build";

/* Animations procédurales : on pose les articulations à chaque image.
   Conventions : avant = +z. Hanche/épaule rotation.x négative = vers l'avant ; genou positif = flexion. */

export const ANIM_LABEL: Record<Anim, string> = {
  idle: "Repos", squat: "Squat", lunge: "Fente", jack: "Jumping jack", run: "Course", curl: "Curl",
  press: "Développé", row: "Rowing", pushup: "Pompe", plank: "Planche", crunch: "Crunch", bridge: "Pont",
  stretch: "Étirement", deadlift: "Soulevé de terre", raise: "Élévations",
};

const wave = (t: number, period: number) => (1 - Math.cos((t / period) * Math.PI * 2)) / 2;

function reset(R: Rig) {
  const { rest } = R;
  R.root.position.set(0, 0, 0); R.root.rotation.set(0, 0, 0);
  R.pelvis.position.set(0, rest.yHip, 0); R.pelvis.rotation.set(0, 0, 0);
  R.torso.rotation.set(0, 0, 0); R.torso.scale.set(1, 1, 1);
  [0, 1].forEach((i) => {
    const sx = i ? 1 : -1;
    R.sh[i].rotation.set(0, 0, sx * rest.alpha); R.el[i].rotation.set(0, 0, 0);
    R.hip[i].rotation.set(0, 0, 0); R.kn[i].rotation.set(0, 0, 0);
  });
}

/** Hauteur verticale d'une jambe : cuisse inclinée de a (avant), genou plié de k. */
const legH = (R: Rig, a: number, k: number) => R.rest.Lt * Math.cos(a) + R.rest.Ls * Math.cos(a - k);
const legZ = (R: Rig, a: number, k: number) => R.rest.Lt * Math.sin(a) + R.rest.Ls * Math.sin(a - k);

function lying(R: Rig, faceUp: boolean) {
  // Corps à l'horizontale, bassin posé au sol
  const { yHip, bh } = R.rest;
  R.root.rotation.x = faceUp ? -Math.PI / 2 : Math.PI / 2;
  R.root.position.set(0, bh, faceUp ? yHip * 0.55 : -yHip * 0.55);
}

export function applyPose(R: Rig, anim: Anim, t: number) {
  reset(R);
  const { rest } = R;
  const sides = [0, 1] as const;
  switch (anim) {
    case "idle": {
      const b = Math.sin(t * 1.6) * 0.008;
      R.torso.scale.set(1 + b, 1, 1 + b * 1.4);
      sides.forEach((i) => { const sx = i ? 1 : -1; R.sh[i].rotation.z = sx * (rest.alpha + Math.sin(t * 0.8 + i) * 0.02); R.el[i].rotation.x = -0.12; });
      break;
    }
    case "squat": case "deadlift": {
      const s = wave(t, 2.6);
      const a = anim === "squat" ? 1.35 * s : 0.25 * s, k = anim === "squat" ? 2.0 * s : 0.35 * s;
      sides.forEach((i) => { R.hip[i].rotation.x = -a; R.kn[i].rotation.x = k; });
      R.pelvis.position.y = rest.ankle + legH(R, a, k);
      R.pelvis.position.z = -legZ(R, a, k);
      const lean = anim === "squat" ? 0.45 * s : 1.15 * s;
      R.torso.rotation.x = lean;
      sides.forEach((i) => { R.sh[i].rotation.x = anim === "squat" ? -1.3 * s - 0.1 : -lean; R.el[i].rotation.x = anim === "squat" ? -0.9 * s : 0; });
      break;
    }
    case "lunge": {
      const s = wave(t, 2.8), f = Math.floor(t / 2.8) % 2, b = 1 - f;
      R.hip[f].rotation.x = -1.25 * s; R.kn[f].rotation.x = 1.25 * s;
      R.hip[b].rotation.x = 0.35 * s; R.kn[b].rotation.x = 1.55 * s;
      R.pelvis.position.y = rest.ankle + legH(R, 1.25 * s, 1.25 * s);
      R.pelvis.position.z = -legZ(R, 1.25 * s, 1.25 * s) * 0.5;
      sides.forEach((i) => { R.sh[i].rotation.z = (i ? 1 : -1) * (rest.alpha + 0.15); });
      break;
    }
    case "jack": {
      const s = wave(t, 1.0);
      sides.forEach((i) => { const sx = i ? 1 : -1; R.sh[i].rotation.z = sx * (rest.alpha + 2.6 * s); R.hip[i].rotation.z = sx * 0.32 * s; });
      R.pelvis.position.y = rest.yHip - (rest.Lt + rest.Ls) * (1 - Math.cos(0.32 * s)) + Math.abs(Math.sin((t / 1.0) * Math.PI * 2)) * 0.05;
      break;
    }
    case "run": {
      const ph = t * Math.PI * 2 * 1.4;
      sides.forEach((i) => {
        const sg = i ? 1 : -1, sw = Math.sin(ph + (i ? Math.PI : 0));
        R.hip[i].rotation.x = -0.6 * sw; R.kn[i].rotation.x = 0.3 + 0.9 * Math.max(0, -Math.cos(ph + (i ? Math.PI : 0)));
        R.sh[i].rotation.x = 0.7 * sw; R.el[i].rotation.x = -1.4; R.sh[i].rotation.z = sg * (rest.alpha * 0.6);
      });
      R.pelvis.position.y = rest.yHip - 0.02 + Math.abs(Math.sin(ph)) * 0.035;
      R.torso.rotation.x = 0.12;
      break;
    }
    case "curl": {
      const s = wave(t, 2.2);
      sides.forEach((i) => { R.el[i].rotation.x = -2.2 * s - 0.1; R.sh[i].rotation.x = -0.08 * s; R.sh[i].rotation.z = (i ? 1 : -1) * (rest.alpha * 0.6); });
      break;
    }
    case "press": {
      const s = wave(t, 2.4);
      sides.forEach((i) => { R.sh[i].rotation.x = -(1.25 + 1.8 * s); R.el[i].rotation.x = -(1.9 * (1 - s)); R.sh[i].rotation.z = (i ? 1 : -1) * 0.25; });
      break;
    }
    case "raise": {
      const s = wave(t, 2.4);
      sides.forEach((i) => { R.sh[i].rotation.z = (i ? 1 : -1) * (rest.alpha + 1.35 * s); R.el[i].rotation.x = -0.15; });
      break;
    }
    case "row": {
      const s = wave(t, 2.2);
      sides.forEach((i) => { R.hip[i].rotation.x = -0.25; R.kn[i].rotation.x = 0.35; });
      R.pelvis.position.y = rest.ankle + legH(R, 0.25, 0.35); R.pelvis.position.z = -legZ(R, 0.25, 0.35);
      R.torso.rotation.x = 0.85;
      sides.forEach((i) => { R.sh[i].rotation.x = -0.85 + 0.9 * s; R.el[i].rotation.x = -1.7 * s; R.sh[i].rotation.z = (i ? 1 : -1) * 0.12; });
      break;
    }
    case "pushup": case "plank": {
      const s = anim === "pushup" ? wave(t, 2.2) : 0.15 + Math.sin(t * 1.5) * 0.01;
      const arm = rest.Lu + rest.Lf;
      const h = anim === "pushup" ? arm * (1 - 0.55 * s) : rest.Lu * 0.95;
      const th = Math.acos(Math.min(0.99, h / rest.Ds));
      R.root.rotation.x = th;
      sides.forEach((i) => {
        if (anim === "plank") { R.sh[i].rotation.x = -th; R.el[i].rotation.x = -Math.PI / 2; }
        else {
          const beta = h < arm ? Math.acos(Math.min(1, Math.max(-1, (h - rest.Lf) / rest.Lu))) : 0;
          R.sh[i].rotation.x = -th + beta; R.el[i].rotation.x = -beta;
        }
        R.sh[i].rotation.z = (i ? 1 : -1) * 0.18;
      });
      break;
    }
    case "crunch": {
      const s = wave(t, 2.2);
      lying(R, true);
      sides.forEach((i) => { R.hip[i].rotation.x = -1.0; R.kn[i].rotation.x = 1.9; R.sh[i].rotation.x = -2.7; R.el[i].rotation.x = -2.0; R.sh[i].rotation.z = (i ? 1 : -1) * 0.5; });
      R.torso.rotation.x = 0.55 * s;
      break;
    }
    case "bridge": {
      const s = wave(t, 2.6);
      lying(R, true);
      const lift = 0.16 * rest.H * s;
      R.pelvis.position.z += lift;
      R.torso.rotation.x = -Math.asin(Math.min(0.9, lift / (rest.Ds - rest.yHip)));
      sides.forEach((i) => { R.hip[i].rotation.x = -1.15 + 0.7 * s; R.kn[i].rotation.x = 2.0 - 0.3 * s; R.sh[i].rotation.z = (i ? 1 : -1) * 0.35; });
      break;
    }
    case "stretch": {
      const s = Math.sin(t * 0.9);
      R.torso.rotation.z = 0.32 * s;
      sides.forEach((i) => { const sx = i ? 1 : -1; const up = (s > 0) === (i === 0); R.sh[i].rotation.z = sx * (up ? 2.85 : rest.alpha); R.el[i].rotation.x = up ? -0.2 : 0; });
      break;
    }
  }
}
