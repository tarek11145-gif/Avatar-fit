// Copie les fichiers de l'IA de détection du corps (MediaPipe Pose) dans /public/mp
import { cpSync, mkdirSync, existsSync } from "node:fs";
const src = "node_modules/@mediapipe/pose";
if (existsSync(src)) {
  mkdirSync("public/mp", { recursive: true });
  for (const f of ["pose.js","pose_landmark_full.tflite","pose_solution_packed_assets.data","pose_solution_packed_assets_loader.js","pose_solution_simd_wasm_bin.js","pose_solution_simd_wasm_bin.wasm","pose_solution_wasm_bin.js","pose_solution_wasm_bin.wasm","pose_web.binarypb"])
    cpSync(`${src}/${f}`, `public/mp/${f}`);
}
