import { WORKOUT_TEMPLATES, WorkoutTemplate, Exercise } from "./workoutTemplates";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UserCoachProfile {
  availableEquipment: string[];
  workoutLocation: string;
  trainingPreferences: string[];
  experienceLevel: string;
  preferredWorkoutDuration: string;
  weeklyWorkoutDays: number;
  fitnessGoals: string[];
}

export interface RecentWorkout {
  activityType: string;
  date: string;
  durationMinutes?: number;
}

export type EquipmentMatchLevel = "full" | "partial" | "none";

export interface CoachRecommendation {
  template: WorkoutTemplate;
  score: number;
  whyGoodForYou: string;
  equipmentMatch: EquipmentMatchLevel;
  missingEquipment: string[];
  substitutionsAvailable: boolean;
}

export interface FilteredExercise extends Exercise {
  substituteFor?: string;
  isSubstitution?: boolean;
  missingEquipment?: string;
}

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const DURATION_MAP: Record<string, number> = {
  "15 minutes": 15,
  "30 minutes": 30,
  "45 minutes": 45,
  "60+ minutes": 60,
};

const DIFFICULTY_MAP: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

// ─── Comprehensive substitutions database ─────────────────────────────────────
// Format: exerciseName → { needs: equipment_id, alternatives: [{ name, requiresEquipment? }] }
// If no requiresEquipment specified, the alternative is bodyweight-friendly.

export const EXERCISE_SUBSTITUTIONS: Record<
  string,
  { needs: string; alternatives: { name: string; requiresEquipment?: string }[] }[]
> = {
  // ── Barbell exercises ──────────────────────────────────────────────────────
  "Barbell Back Squat": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Goblet Squat", requiresEquipment: "dumbbells" },
        { name: "Dumbbell Squat", requiresEquipment: "dumbbells" },
        { name: "Bodyweight Squat" },
        { name: "Resistance Band Squat", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Barbell Squat": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Goblet Squat", requiresEquipment: "dumbbells" },
        { name: "Bodyweight Squat" },
        { name: "Resistance Band Squat", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Barbell Deadlift": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Romanian Deadlift", requiresEquipment: "dumbbells" },
        { name: "Kettlebell Deadlift", requiresEquipment: "kettlebells" },
        { name: "Single-Leg Hip Hinge (bodyweight)" },
      ],
    },
  ],
  "Barbell Bench Press": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Bench Press", requiresEquipment: "dumbbells" },
        { name: "Dumbbell Floor Press", requiresEquipment: "dumbbells" },
        { name: "Push-Up" },
        { name: "Band Chest Press", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Barbell Row": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Bent-Over Row", requiresEquipment: "dumbbells" },
        { name: "Resistance Band Row", requiresEquipment: "resistance_bands" },
        { name: "Inverted Row (using a table)" },
      ],
    },
  ],
  "Overhead Press": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Shoulder Press", requiresEquipment: "dumbbells" },
        { name: "Pike Push-Up" },
        { name: "Band Shoulder Press", requiresEquipment: "resistance_bands" },
        { name: "Kettlebell Press", requiresEquipment: "kettlebells" },
      ],
    },
  ],

  // ── Bench exercises ────────────────────────────────────────────────────────
  "Bench Press": [
    {
      needs: "bench",
      alternatives: [
        { name: "Dumbbell Floor Press", requiresEquipment: "dumbbells" },
        { name: "Push-Up" },
        { name: "Band Chest Press", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Incline Dumbbell Press": [
    {
      needs: "bench",
      alternatives: [
        { name: "Dumbbell Floor Press", requiresEquipment: "dumbbells" },
        { name: "Pike Push-Up" },
        { name: "Decline Push-Up" },
      ],
    },
  ],
  "Dumbbell Bench Press": [
    {
      needs: "bench",
      alternatives: [
        { name: "Dumbbell Floor Press", requiresEquipment: "dumbbells" },
        { name: "Push-Up" },
      ],
    },
  ],
  "Incline Dumbbell Fly": [
    {
      needs: "bench",
      alternatives: [
        { name: "Dumbbell Fly (floor)", requiresEquipment: "dumbbells" },
        { name: "Band Chest Fly", requiresEquipment: "resistance_bands" },
      ],
    },
  ],

  // ── Cable machine exercises ────────────────────────────────────────────────
  "Lat Pulldown": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Pull-Up", requiresEquipment: "pullup_bar" },
        { name: "Band Lat Pulldown", requiresEquipment: "resistance_bands" },
        { name: "Dumbbell Row", requiresEquipment: "dumbbells" },
      ],
    },
  ],
  "Cable Row": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Dumbbell Bent-Over Row", requiresEquipment: "dumbbells" },
        { name: "Resistance Band Row", requiresEquipment: "resistance_bands" },
        { name: "Barbell Row", requiresEquipment: "barbell" },
      ],
    },
  ],
  "Cable Fly": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Dumbbell Fly (floor)", requiresEquipment: "dumbbells" },
        { name: "Band Chest Fly", requiresEquipment: "resistance_bands" },
        { name: "Push-Up" },
      ],
    },
  ],
  "Cable Curl": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Dumbbell Bicep Curl", requiresEquipment: "dumbbells" },
        { name: "Band Bicep Curl", requiresEquipment: "resistance_bands" },
        { name: "Chin-Up", requiresEquipment: "pullup_bar" },
      ],
    },
  ],
  "Tricep Pushdown": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Dumbbell Tricep Kickback", requiresEquipment: "dumbbells" },
        { name: "Band Tricep Pushdown", requiresEquipment: "resistance_bands" },
        { name: "Diamond Push-Up" },
        { name: "Skull Crusher (dumbbells)", requiresEquipment: "dumbbells" },
      ],
    },
  ],
  "Cable / Dumbbell Fly": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Dumbbell Fly (floor)", requiresEquipment: "dumbbells" },
        { name: "Band Chest Fly", requiresEquipment: "resistance_bands" },
      ],
    },
  ],

  // ── Leg press ─────────────────────────────────────────────────────────────
  "Leg Press": [
    {
      needs: "leg_press",
      alternatives: [
        { name: "Bulgarian Split Squat", requiresEquipment: "dumbbells" },
        { name: "Goblet Squat", requiresEquipment: "dumbbells" },
        { name: "Bodyweight Split Squat" },
        { name: "Step-Ups" },
      ],
    },
  ],

  // ── Leg curl ──────────────────────────────────────────────────────────────
  "Leg Curl": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Nordic Curl" },
        { name: "Single-Leg Romanian Deadlift", requiresEquipment: "dumbbells" },
        { name: "Resistance Band Leg Curl", requiresEquipment: "resistance_bands" },
        { name: "Glute Bridge" },
      ],
    },
  ],

  // ── Smith machine ─────────────────────────────────────────────────────────
  "Smith Machine Squat": [
    {
      needs: "smith_machine",
      alternatives: [
        { name: "Barbell Squat", requiresEquipment: "barbell" },
        { name: "Goblet Squat", requiresEquipment: "dumbbells" },
        { name: "Bodyweight Squat" },
      ],
    },
  ],

  // ── Kettlebell ────────────────────────────────────────────────────────────
  "Kettlebell Swing": [
    {
      needs: "kettlebells",
      alternatives: [
        { name: "Dumbbell Swing", requiresEquipment: "dumbbells" },
        { name: "Resistance Band Hip Hinge", requiresEquipment: "resistance_bands" },
        { name: "Bodyweight Good Morning" },
      ],
    },
  ],
  "Kettlebell Clean & Press": [
    {
      needs: "kettlebells",
      alternatives: [
        { name: "Dumbbell Clean & Press", requiresEquipment: "dumbbells" },
        { name: "Dumbbell Squat to Press", requiresEquipment: "dumbbells" },
      ],
    },
  ],
  "Kettlebell Row": [
    {
      needs: "kettlebells",
      alternatives: [
        { name: "Dumbbell Row", requiresEquipment: "dumbbells" },
        { name: "Resistance Band Row", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Kettlebell Deadlift": [
    {
      needs: "kettlebells",
      alternatives: [
        { name: "Dumbbell Romanian Deadlift", requiresEquipment: "dumbbells" },
        { name: "Single-Leg Hip Hinge (bodyweight)" },
      ],
    },
  ],
  "Goblet Squat": [
    {
      needs: "kettlebells",
      alternatives: [
        { name: "Dumbbell Goblet Squat", requiresEquipment: "dumbbells" },
        { name: "Bodyweight Squat" },
      ],
    },
  ],

  // ── Dumbbell exercises ────────────────────────────────────────────────────
  "Dumbbell Goblet Squat": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Squat" },
        { name: "Resistance Band Squat", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Romanian Deadlift": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Single-Leg Hip Hinge (bodyweight)" },
        { name: "Resistance Band Deadlift", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Walking Lunge": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Walking Lunge" },
        { name: "Resistance Band Lunge", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Bulgarian Split Squat": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Bulgarian Split Squat" },
      ],
    },
  ],
  "Dumbbell Hip Thrust": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Glute Bridge" },
        { name: "Resistance Band Hip Thrust", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Calf Raise (holding dumbbells)": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Calf Raise" },
      ],
    },
  ],
  "Dumbbell Shoulder Press": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Pike Push-Up" },
        { name: "Band Shoulder Press", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Lateral Raise": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Band Lateral Raise", requiresEquipment: "resistance_bands" },
        { name: "Arm Circle (bodyweight warmup)" },
      ],
    },
  ],
  "Hammer Curl": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Band Hammer Curl", requiresEquipment: "resistance_bands" },
        { name: "Chin-Up", requiresEquipment: "pullup_bar" },
      ],
    },
  ],
  "Dumbbell Tricep Kickback": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Diamond Push-Up" },
        { name: "Band Tricep Pushdown", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Squat to Press": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Squat to Press (air)" },
        { name: "Resistance Band Squat to Press", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Row": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Resistance Band Row", requiresEquipment: "resistance_bands" },
        { name: "Inverted Row (using a table)" },
        { name: "Pull-Up", requiresEquipment: "pullup_bar" },
      ],
    },
  ],
  "Dumbbell Clean": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Squat Jump" },
        { name: "Bodyweight Clean Simulation" },
      ],
    },
  ],
  "Dumbbell Bent-Over Row": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Resistance Band Row", requiresEquipment: "resistance_bands" },
        { name: "Inverted Row (using a table)" },
      ],
    },
  ],
  "Dumbbell Floor Press": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Push-Up" },
        { name: "Band Chest Press", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Overhead Tricep Extension": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Diamond Push-Up" },
        { name: "Band Overhead Tricep Extension", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Bicep Curl": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Resistance Band Curl", requiresEquipment: "resistance_bands" },
        { name: "Chin-Up", requiresEquipment: "pullup_bar" },
        { name: "Towel Curl (improvised resistance)" },
      ],
    },
  ],
  "Dumbbell Circuit (squat, press, row)": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Circuit (squat, push-up, row)" },
        { name: "Band Circuit", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
};

// ─── Core equipment filtering functions ───────────────────────────────────────

/**
 * Returns the best available alternative for an exercise given user equipment.
 * Picks alternatives in order of preference: exact equipment match first, then bodyweight.
 */
export function getBestSubstitution(
  exerciseName: string,
  userEquipment: string[]
): string | null {
  const rules = EXERCISE_SUBSTITUTIONS[exerciseName];
  if (!rules) return null;

  for (const rule of rules) {
    if (userEquipment.includes(rule.needs)) {
      // User has the required equipment — no substitution needed
      return null;
    }
    // Find the best alternative the user can actually do
    const doable = rule.alternatives.find(
      (alt) => !alt.requiresEquipment || userEquipment.includes(alt.requiresEquipment)
    );
    if (doable) return doable.name;
    // Fall back to first alternative even if equipment unclear
    if (rule.alternatives.length > 0) return rule.alternatives[0].name;
  }
  return null;
}

/**
 * Returns ALL possible substitutes for an exercise (used in the detail view).
 */
export function getEquipmentSubstitutions(
  exerciseName: string,
  userEquipment: string[]
): string[] {
  const rules = EXERCISE_SUBSTITUTIONS[exerciseName];
  if (!rules) return [];

  return rules
    .filter((r) => !userEquipment.includes(r.needs))
    .flatMap((r) =>
      r.alternatives
        .filter((alt) => !alt.requiresEquipment || userEquipment.includes(alt.requiresEquipment))
        .map((alt) => alt.name)
    );
}

/**
 * Determines equipment match level for a template:
 * - "full"    → user has all required equipment
 * - "partial" → user has some; remaining exercises have available substitutions
 * - "none"    → user can't do this workout even with substitutions
 */
export function getEquipmentMatchLevel(
  template: WorkoutTemplate,
  userEquipment: string[]
): { level: EquipmentMatchLevel; missing: string[]; substitutable: boolean } {
  const required = template.requiredEquipment;

  if (required.length === 0) {
    return { level: "full", missing: [], substitutable: false };
  }

  const missing = required.filter((eq) => !userEquipment.includes(eq));

  if (missing.length === 0) {
    return { level: "full", missing: [], substitutable: false };
  }

  // Check if every exercise that needs missing equipment has a substitution
  const exercisesNeedingMissing = template.exercises.filter((ex) => {
    const rules = EXERCISE_SUBSTITUTIONS[ex.name];
    if (!rules) return false;
    return rules.some((r) => missing.includes(r.needs));
  });

  const allSubstitutable = exercisesNeedingMissing.every((ex) => {
    const subs = getEquipmentSubstitutions(ex.name, userEquipment);
    return subs.length > 0;
  });

  // Also check template-level: if all exercises are bodyweight anyway
  const exercisesWithRules = template.exercises.filter(
    (ex) => EXERCISE_SUBSTITUTIONS[ex.name]
  );

  if (exercisesWithRules.length === 0 && missing.length > 0) {
    // Template has equipment requirements but exercises aren't in our substitution DB
    // Check if missing equipment is minor (e.g. yoga_mat vs whole barbell setup)
    const canManage = missing.every((m) => ["yoga_mat", "jump_rope"].includes(m));
    return canManage
      ? { level: "partial", missing, substitutable: true }
      : { level: "none", missing, substitutable: false };
  }

  if (allSubstitutable) {
    return { level: "partial", missing, substitutable: true };
  }

  // Some exercises can't be substituted
  return { level: "none", missing, substitutable: false };
}

/**
 * Returns the exercise list with substitutions pre-applied for missing equipment.
 * Exercises the user can't do get swapped for the best available substitute.
 */
export function getFilteredExercises(
  template: WorkoutTemplate,
  userEquipment: string[]
): FilteredExercise[] {
  return template.exercises.map((ex): FilteredExercise => {
    const rules = EXERCISE_SUBSTITUTIONS[ex.name];
    if (!rules) return ex;

    // Find rules where user is missing the required equipment
    const missingRules = rules.filter((r) => !userEquipment.includes(r.needs));
    if (missingRules.length === 0) return ex;

    // Find the best substitute the user can do
    const bestAlt = missingRules
      .flatMap((r) =>
        r.alternatives
          .filter((alt) => !alt.requiresEquipment || userEquipment.includes(alt.requiresEquipment))
          .map((alt) => ({ alt, needs: r.needs }))
      )[0];

    if (!bestAlt) {
      // No available substitute — keep original but flag it
      return { ...ex, missingEquipment: missingRules[0].needs };
    }

    // Return the substitute exercise
    return {
      ...ex,
      name: bestAlt.alt.name,
      substituteFor: ex.name,
      isSubstitution: true,
      note: `Replaces: ${ex.name}`,
    };
  });
}

// ─── Recommendation engine ────────────────────────────────────────────────────

export function getRecommendations(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[],
  maxResults = 6
): CoachRecommendation[] {
  const equipment = profile.availableEquipment || [];
  const goals = profile.fitnessGoals || [];
  const prefs = profile.trainingPreferences || [];
  const experience = profile.experienceLevel || "Beginner";
  const durationPref = DURATION_MAP[profile.preferredWorkoutDuration] || 45;
  const userLevel = DIFFICULTY_MAP[experience] || 1;

  // Recent activity types in last 7 days
  const recentTypes = recentWorkouts
    .filter((w) => {
      const days = (Date.now() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    })
    .map((w) => w.activityType);

  const lastWorkout = recentWorkouts[0];
  const daysSinceLast = lastWorkout
    ? (Date.now() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const results: CoachRecommendation[] = [];

  for (const template of WORKOUT_TEMPLATES) {
    let score = 0;
    const reasons: string[] = [];

    // ── 1. Hard equipment filter ──────────────────────────────────────────
    const { level: matchLevel, missing, substitutable } = getEquipmentMatchLevel(template, equipment);

    if (matchLevel === "none") {
      // User cannot do this workout — skip entirely
      continue;
    }

    if (matchLevel === "full") {
      if (template.requiredEquipment.length === 0) {
        // Bodyweight
        score += 30;
        if (equipment.length === 0 || equipment.includes("none")) {
          score += 20;
          reasons.push("Uses no equipment — perfect for your setup");
        } else {
          reasons.push("No equipment required");
        }
      } else {
        score += 50;
        reasons.push("Matches your available equipment perfectly");
      }
    } else {
      // partial — user can do it with substitutions
      score += 20;
      const missingNames = missing.map((m) => m.replace(/_/g, " ")).join(", ");
      reasons.push(`Doable with substitutions for missing ${missingNames}`);
    }

    // ── 2. Goal alignment ─────────────────────────────────────────────────
    const goalMatch = goals.some((g) => (template.goals as string[]).includes(g));
    if (goalMatch) {
      score += 25;
      reasons.push(`Aligned with your goal: ${template.goals.find((g) => goals.includes(g as string))}`);
    }

    // ── 3. Training preferences ───────────────────────────────────────────
    const prefMatch = prefs.some((p) =>
      template.tags.some((t) => p.toLowerCase().includes(t) || t.includes(p.toLowerCase().split(" ")[0]))
    );
    if (prefMatch) {
      score += 15;
      reasons.push("Matches your preferred training style");
    }

    // ── 4. Difficulty match ───────────────────────────────────────────────
    const templateLevel = DIFFICULTY_MAP[template.difficulty] || 1;
    const levelDiff = Math.abs(templateLevel - userLevel);
    if (levelDiff === 0) {
      score += 15;
      reasons.push(`Right difficulty for your ${experience} level`);
    } else if (levelDiff === 1) {
      score += 5;
    } else {
      score -= 10;
    }

    // ── 5. Duration preference ────────────────────────────────────────────
    const durationDiff = Math.abs(template.durationMinutes - durationPref);
    if (durationDiff <= 10) score += 10;
    else if (durationDiff <= 20) score += 5;

    // ── 6. Recency avoidance ──────────────────────────────────────────────
    const repeatCount = recentTypes.filter((t) => t === template.activityType).length;
    if (repeatCount >= 2) score -= 15;
    else if (repeatCount === 1) score -= 5;

    // ── 7. Recovery boost ─────────────────────────────────────────────────
    if (daysSinceLast > 4 && template.difficulty === "Beginner") {
      score += 10;
      reasons.push("Good restart after some time off");
    }

    // ── 8. Location match ─────────────────────────────────────────────────
    if (profile.workoutLocation === "Home" && template.requiredEquipment.length === 0) score += 8;
    else if (profile.workoutLocation === "Gym" && (equipment.includes("barbell") || equipment.includes("cable_machine"))) score += 8;
    else if (profile.workoutLocation === "Outdoors" && ["running", "walking", "cycling"].includes(template.activityType)) score += 8;

    // ── Build explanation ─────────────────────────────────────────────────
    const whyGoodForYou =
      reasons.length > 0
        ? reasons.slice(0, 2).join(". ") + "."
        : buildDefaultReason(template, goals);

    results.push({
      template,
      score,
      whyGoodForYou,
      equipmentMatch: matchLevel,
      missingEquipment: missing,
      substitutionsAvailable: substitutable,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

function buildDefaultReason(template: WorkoutTemplate, goals: string[]): string {
  if (template.goals.some((g) => goals.includes(g as string))) {
    return `Supports your goal: ${template.goals[0]}.`;
  }
  if (template.requiredEquipment.length === 0) {
    return "No equipment required — do this anywhere.";
  }
  return `A solid ${template.difficulty.toLowerCase()} workout for overall fitness.`;
}

// ─── Today's suggestion ────────────────────────────────────────────────────────

export function getTodaySuggestion(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[]
): CoachRecommendation | null {
  const recs = getRecommendations(profile, recentWorkouts, 10);
  if (recs.length === 0) return null;

  const daysSinceLast = recentWorkouts[0]
    ? (Date.now() - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  // Prefer full equipment match for today's suggestion
  const fullMatch = recs.find((r) => r.equipmentMatch === "full");

  if (daysSinceLast > 5) {
    const easy = recs.find((r) => r.template.difficulty === "Beginner" && r.equipmentMatch === "full");
    if (easy) {
      return { ...easy, whyGoodForYou: "You've had some rest — this gentle session is a great way back in." };
    }
  }

  return fullMatch ?? recs[0];
}

// ─── Weekly plan generator ────────────────────────────────────────────────────

export function generateWeeklyPlan(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[]
): { day: string; template: WorkoutTemplate | null; rest: boolean; note: string }[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const weeklyDays = Math.min(profile.weeklyWorkoutDays || 3, 7);
  const recs = getRecommendations(profile, recentWorkouts, 12);

  const workoutDayIndices = distributeWorkoutDays(weeklyDays);
  const usedTemplates = new Set<string>();

  return days.map((day, idx) => {
    if (!workoutDayIndices.includes(idx)) {
      return {
        day, template: null, rest: true,
        note: idx % 2 === 0 ? "Rest day — active recovery or light walk recommended" : "Rest day",
      };
    }
    const nextRec = recs.find((r) => !usedTemplates.has(r.template.id));
    if (!nextRec) {
      return { day, template: null, rest: true, note: "Active rest — go for a walk" };
    }
    usedTemplates.add(nextRec.template.id);
    return { day, template: nextRec.template, rest: false, note: nextRec.whyGoodForYou };
  });
}

function distributeWorkoutDays(count: number): number[] {
  const patterns: Record<number, number[]> = {
    1: [1], 2: [0, 3], 3: [0, 2, 4],
    4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 6],
    6: [0, 1, 2, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6],
  };
  return patterns[count] || [0, 2, 4];
}

// ─── Activity benefits ────────────────────────────────────────────────────────

export function getActivityBenefits(activityType: string): string[] {
  const map: Record<string, string[]> = {
    walking: ["Improves cardiovascular health", "Supports sustainable fat loss", "Low impact — easy on joints", "Great for active recovery"],
    running: ["Builds cardiovascular endurance", "Burns significant calories", "Strengthens the heart and lungs", "Improves mental health and mood"],
    gym: ["Builds strength and muscle", "Improves bone density", "Boosts resting metabolism", "Supports long-term body composition"],
    cycling: ["Effective cardiovascular workout", "Lower joint impact than running", "Improves leg endurance and power", "Great calorie burner"],
    swimming: ["Full-body conditioning", "Zero joint impact", "Builds lung capacity", "Excellent for recovery"],
    tennis: ["Improves agility and reaction speed", "Great aerobic workout", "Develops hand-eye coordination", "Fun and social"],
    yoga: ["Improves flexibility and range of motion", "Supports muscle recovery", "Reduces stress and improves sleep", "Improves mobility and balance"],
    other: ["Keeps you active and moving", "Burns calories", "Variety is key to long-term consistency"],
  };
  return map[activityType] || map.other;
}
