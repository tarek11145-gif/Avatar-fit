export type Level = "debutant" | "intermediaire" | "avance";
export type Goal = "perte" | "muscle" | "forme" | "endurance";
export type Equipment = "aucun" | "halteres" | "salle";
export type Category =
  | "musculation"
  | "cardio"
  | "mobilite"
  | "renforcement"
  | "maison"
  | "etirements"
  | "recuperation";
export type Anim =
  | "idle" | "squat" | "lunge" | "jack" | "run" | "curl" | "press" | "row"
  | "pushup" | "plank" | "crunch" | "bridge" | "stretch" | "deadlift" | "raise";

export type MuscleId =
  | "pecs" | "delts" | "biceps" | "triceps" | "forearm" | "abs" | "obliques"
  | "traps" | "lats" | "lower" | "glutes" | "quads" | "hams" | "calves";

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  muscles: MuscleId[];
  difficulty: 1 | 2 | 3;
  equipment: Equipment;
  /** répétitions par série, ou secondes si `seconds` est vrai */
  reps: number;
  seconds?: boolean;
  description: string;
  steps: string[];
  anim: Anim;
  lowImpact: boolean;
}

export interface Measures {
  chest: number;
  waist: number;
  hips: number;
  thigh: number;
  arm: number;
}

export type Sex = "homme" | "femme";

export interface Profile {
  name: string;
  sex?: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  level: Level;
  goal: Goal;
  equipment: Equipment;
  daysPerWeek: number;
  minutesPerSession: number;
  onboarded: boolean;
  createdAt: string;
}

export interface Section { t: number; f: number; a: number; b: number; z: number }
export interface LegSection { u: number; f: number; a: number; b: number; z: number; x: number }
export interface BodyShape {
  H: number;
  torso: Section[];
  legs: LegSection[];
  arm: { fS: number; fE: number; fW: number; xS: number; xE: number; xW: number; ru: number; rf: number };
  headR: number;
  headF: number;
  skin: string;
  fromPhotos: boolean;
}

export type TopStyle = "tshirt" | "debardeur" | "brassiere" | "aucun";
export type BottomStyle = "short" | "legging";
export interface AvatarLook {
  skin: string;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoeColor: string;
  hair: "court" | "rase" | "long" | "chignon";
  hairColor: string;
}

export interface AvatarData {
  look: AvatarLook;
  shape: BodyShape | null;
  measures: Measures | null;
  scannedAt: string | null;
}

export interface SetLog { reps: number; weight: number; done: boolean }
export interface ExerciseLog { exerciseId: string; sets: SetLog[] }
export interface Session {
  id: string;
  date: string; // ISO
  title: string;
  programDay?: string;
  durationMin: number;
  exercises: ExerciseLog[];
  xp: number;
  feeling?: 1 | 2 | 3 | 4 | 5;
}

export interface PlannedItem { id: string; date: string; title: string; dayKey: string }

export interface ChatMessage { id: string; role: "user" | "coach"; content: string; at: string }

export interface WeightEntry { id: string; date: string; kg: number }
export interface MeasureEntry { id: string; date: string; m: Measures; source: "scan" | "manuel" }
export interface FoodEntry { id: string; date: string; name: string; kcal: number; protein: number; meal: "petit-dej" | "dejeuner" | "diner" | "collation" }
export interface Extra { weights: WeightEntry[]; measures: MeasureEntry[]; food: FoodEntry[]; water: Record<string, number> }

export interface UserData {
  profile: Profile | null;
  avatar: AvatarData;
  sessions: Session[];
  planned: PlannedItem[];
  chat: ChatMessage[];
  extra: Extra;
  settings: { notifications: boolean; units: "metric"; reduceMotion: boolean; restSeconds: number };
}
