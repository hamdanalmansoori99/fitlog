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
  name?: string;
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

// Maps user-facing training preferences to the template activityTypes they favour
const PREFERENCE_TO_ACTIVITY: Record<string, string[]> = {
  cycling:            ["cycling"],
  running:            ["running"],
  "strength training": ["gym"],
  swimming:           ["swimming"],
  walking:            ["walking"],
  cardio:             ["running", "cycling", "swimming", "walking", "cardio"],
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

  // ── Barbell compound aliases (unqualified names used in some templates) ───
  "Romanian Deadlift": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Romanian Deadlift", requiresEquipment: "dumbbells" },
        { name: "Kettlebell Deadlift", requiresEquipment: "kettlebells" },
        { name: "Single-Leg Hip Hinge (bodyweight)" },
      ],
    },
  ],
  "Deadlift": [
    {
      needs: "barbell",
      alternatives: [
        { name: "Dumbbell Romanian Deadlift", requiresEquipment: "dumbbells" },
        { name: "Kettlebell Deadlift", requiresEquipment: "kettlebells" },
        { name: "Single-Leg Hip Hinge (bodyweight)" },
      ],
    },
  ],
  "Shoulder Press": [
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
  "Lateral Raise": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Band Lateral Raise", requiresEquipment: "resistance_bands" },
        { name: "Arm Circles (bodyweight warmup)" },
      ],
    },
  ],
  "Dumbbell Squat": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Bodyweight Squat" },
        { name: "Resistance Band Squat", requiresEquipment: "resistance_bands" },
      ],
    },
  ],
  "Dumbbell Curl": [
    {
      needs: "dumbbells",
      alternatives: [
        { name: "Resistance Band Curl", requiresEquipment: "resistance_bands" },
        { name: "Chin-Up", requiresEquipment: "pullup_bar" },
        { name: "Towel Curl (improvised resistance)" },
      ],
    },
  ],
  "Dumbbell Incline Press": [
    {
      needs: "bench",
      alternatives: [
        { name: "Dumbbell Floor Press", requiresEquipment: "dumbbells" },
        { name: "Pike Push-Up" },
        { name: "Decline Push-Up" },
      ],
    },
  ],

  // ── Cable / dumbbell combo exercise (alias for substitution lookup) ───────
  "Cable Fly / Dumbbell Fly": [
    {
      needs: "cable_machine",
      alternatives: [
        { name: "Dumbbell Fly (floor)", requiresEquipment: "dumbbells" },
        { name: "Band Chest Fly", requiresEquipment: "resistance_bands" },
        { name: "Push-Up" },
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
    return rules.some((r) => (missing as string[]).includes(r.needs));
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
    // Check if missing equipment is minor (e.g. jump_rope vs whole barbell setup)
    const canManage = missing.every((m) => ["jump_rope"].includes(m));
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
      note: `coach.substitution.replaces`,
    };
  });
}

// ─── Goal matching helpers (case-insensitive) ─────────────────────────────────
// Profile stores goals in Title Case ("Lose Weight"), templates use Sentence
// case ("Lose weight"). Always normalise to lowercase before comparing.

function goalsOverlap(userGoals: string[], templateGoals: readonly string[]): boolean {
  const lower = userGoals.map((g) => g.toLowerCase());
  return (templateGoals as string[]).some((tg) => lower.includes(tg.toLowerCase()));
}

function findMatchedUserGoal(
  userGoals: string[],
  templateGoals: readonly string[]
): string | undefined {
  const lowerTemplate = (templateGoals as string[]).map((tg) => tg.toLowerCase());
  return userGoals.find((g) => lowerTemplate.includes(g.toLowerCase()));
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
          reasons.push("coach.reasons.noEquipmentPerfect");
        } else {
          reasons.push("coach.reasons.noEquipmentRequired");
        }
      } else {
        score += 50;
        reasons.push("coach.reasons.equipmentMatchPerfect");
      }
    } else {
      // partial — user can do it with substitutions
      score += 20;
      const missingNames = missing.map((m) => m.replace(/_/g, " ")).join(", ");
      reasons.push("coach.reasons.doableWithSubstitutions");
    }

    // ── 2. Goal alignment ─────────────────────────────────────────────────
    const goalMatch = goalsOverlap(goals, template.goals);
    if (goalMatch) {
      score += 25;
      const matchedGoal = findMatchedUserGoal(goals, template.goals);
      reasons.push("coach.reasons.alignedWithGoal");
    }

    // ── 3. Training preferences ───────────────────────────────────────────
    // Build the set of activityTypes the user's preferences map to
    const preferredActivities = new Set<string>();
    for (const p of prefs) {
      const mapped = PREFERENCE_TO_ACTIVITY[p.toLowerCase()];
      if (mapped) mapped.forEach((a) => preferredActivities.add(a));
    }

    // Direct preference → activityType match (strong signal)
    const activityMatch = preferredActivities.has(template.activityType);
    // Fallback: tag-level match (original loose matching)
    const tagMatch = prefs.some((p) =>
      template.tags.some((t) => p.toLowerCase().includes(t) || t.includes(p.toLowerCase().split(" ")[0]))
    );

    if (activityMatch) {
      score += 50;
      reasons.push("coach.reasons.matchesTrainingStyle");
    } else if (tagMatch) {
      score += 25;
      reasons.push("coach.reasons.relatedToPreferences");
    }

    // Deprioritize gym-only templates when user didn't select Strength training
    if (
      prefs.length > 0 &&
      !prefs.some((p) => p.toLowerCase() === "strength training") &&
      template.activityType === "gym"
    ) {
      score -= 20;
    }

    // ── 4. Difficulty match ───────────────────────────────────────────────
    const templateLevel = DIFFICULTY_MAP[template.difficulty] || 1;
    const levelDiff = Math.abs(templateLevel - userLevel);
    if (levelDiff === 0) {
      score += 15;
      reasons.push("coach.reasons.rightDifficulty");
    } else if (levelDiff === 1) {
      score += 5;
    } else {
      score -= 10;
    }

    // ── 5. Duration preference ────────────────────────────────────────────
    const durationDiff = Math.abs(template.durationMinutes - durationPref);
    if (durationDiff <= 10) score += 10;
    else if (durationDiff <= 20) score += 5;

    // ── 6. Recency avoidance (muscle-group-aware) ────────────────────────
    // Collect all muscle groups the user has worked in the last 7 days
    const recentMuscleGroups = new Set<string>();
    recentWorkouts
      .filter((w) => {
        const days = (Date.now() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 7;
      })
      .forEach((w) => {
        inferMuscleGroupsFromWorkout(w.name || w.activityType, w.activityType).forEach((g) =>
          recentMuscleGroups.add(g)
        );
      });
    const templateMuscleGroups = getMuscleGroups(template);
    // Penalise templates whose specific groups were heavily worked lately
    // ("full", "cardio", "recovery" are always safe to repeat)
    const muscleOverlap = templateMuscleGroups.filter(
      (g) => recentMuscleGroups.has(g) && !["full", "cardio", "recovery"].includes(g)
    );
    if (muscleOverlap.length >= 2) score -= 20;
    else if (muscleOverlap.length === 1) score -= 8;
    // Still discourage the same activity type day after day (e.g. running every single day)
    const repeatCount = recentTypes.filter((t) => t === template.activityType).length;
    if (repeatCount >= 4) score -= 15;
    else if (repeatCount >= 2) score -= 5;

    // ── 7. Recovery boost ─────────────────────────────────────────────────
    if (daysSinceLast > 4 && template.difficulty === "Beginner") {
      score += 10;
      reasons.push("coach.reasons.goodRestart");
    }

    // ── 8. Location match ─────────────────────────────────────────────────
    if (profile.workoutLocation === "Home" && template.requiredEquipment.length === 0) score += 8;
    else if (profile.workoutLocation === "Gym" && (equipment.includes("barbell") || equipment.includes("cable_machine"))) score += 8;
    else if (profile.workoutLocation === "Outdoors" && ["running", "walking", "cycling", "cardio"].includes(template.activityType)) score += 8;

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
  if (goalsOverlap(goals, template.goals)) {
    return "coach.reasons.supportsGoal";
  }
  if (template.requiredEquipment.length === 0) {
    return "coach.reasons.noEquipmentAnywhere";
  }
  return "coach.reasons.solidWorkout";
}

// ─── Muscle group helpers ─────────────────────────────────────────────────────

const MUSCLE_GROUP_TAGS: Record<string, string> = {
  "upper-body": "upper", "chest": "upper", "back": "upper",
  "shoulders": "upper", "arms": "upper", "pull-up": "upper",
  "push": "upper", "pull": "upper",
  "lower-body": "lower", "legs": "lower", "glutes": "lower",
  "leg-press": "lower", "squat": "lower",
  "core": "core",
  "full-body": "full", "fullbody": "full",
  "cardio": "cardio", "hiit": "cardio", "running": "cardio",
  "cycling": "cardio", "swimming": "cardio", "endurance": "cardio",
  "conditioning": "cardio", "intervals": "cardio",
  "recovery": "recovery",
  "stretching": "recovery", "mobility": "recovery",
};

function getMuscleGroups(template: WorkoutTemplate): string[] {
  const groups = new Set<string>();
  for (const tag of template.tags) {
    const g = MUSCLE_GROUP_TAGS[tag];
    if (g) groups.add(g);
  }
  const n = template.name.toLowerCase();
  if (/upper|chest|back|shoulder|arm|push|pull/.test(n)) groups.add("upper");
  if (/lower|leg|squat|glute|quad|hamstring/.test(n)) groups.add("lower");
  if (/core|abs/.test(n)) groups.add("core");
  if (/full.?body/.test(n)) groups.add("full");
  if (/cardio|run|cycle|swim/.test(n)) groups.add("cardio");
  if (/stretch|recover|mobil/.test(n)) groups.add("recovery");
  return Array.from(groups);
}

function inferMuscleGroupsFromWorkout(name: string, activityType: string): string[] {
  const groups = new Set<string>();
  const n = (name || "").toLowerCase();
  const t = (activityType || "").toLowerCase();

  if (/upper|chest|back|shoulder|arm|push|pull/.test(n)) groups.add("upper");
  if (/lower|leg|squat|glute|quad|hamstring/.test(n)) groups.add("lower");
  if (/core|abs/.test(n)) groups.add("core");
  if (/full.?body/.test(n)) groups.add("full");
  if (["running", "cycling", "swimming", "walking", "cardio"].includes(t)) groups.add("cardio");

  const matchedTemplate = WORKOUT_TEMPLATES.find(
    (tmpl) => tmpl.name.toLowerCase() === n || tmpl.id === n
  );
  if (matchedTemplate) {
    getMuscleGroups(matchedTemplate).forEach((g) => groups.add(g));
  }
  return Array.from(groups);
}

// ─── Today's enriched recommendation ─────────────────────────────────────────

export interface TodayRecommendation {
  recommendation: CoachRecommendation;
  reasonPills: string[];
  contextSummary: string;
  isRestDayRecommended: boolean;
  progressionLevel: "returning" | "normal" | "progressing";
  daysSinceLast: number;
  recoveryWarning?: boolean;
  shouldDeload?: boolean;
}

// ─── Coach Insights ───────────────────────────────────────────────────────────

export interface CoachInsight {
  type: "streak" | "volume" | "variety" | "neglected" | "milestone" | "goal" | "rut";
  headline: string;
  detail: string;
  icon: string;
  positive: boolean;
}

export function getCoachInsights(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[],
  streakData?: { currentWorkoutStreak?: number; totalWorkouts?: number }
): CoachInsight[] {
  const now = Date.now();
  const insights: CoachInsight[] = [];
  const msPerDay = 1000 * 60 * 60 * 24;

  const last7 = recentWorkouts.filter((w) => (now - new Date(w.date).getTime()) / msPerDay <= 7);
  const last14 = recentWorkouts.filter((w) => (now - new Date(w.date).getTime()) / msPerDay <= 14);
  const prevWeek = last14.filter((w) => (now - new Date(w.date).getTime()) / msPerDay > 7);
  const currentStreak = streakData?.currentWorkoutStreak ?? 0;
  const totalWorkouts = streakData?.totalWorkouts ?? recentWorkouts.length;
  const targetDays = profile.weeklyWorkoutDays || 3;
  const daysLeftInWeek = 7 - new Date().getDay();
  const thisWeekCount = last7.length;

  if (recentWorkouts.length === 0 && currentStreak === 0) return insights;

  // ── 1. Streak ─────────────────────────────────────────────────────────────
  if (currentStreak >= 3) {
    insights.push({
      type: "streak",
      headline: "coach.insights.streakHeadline",
      detail:
        currentStreak >= 7
          ? "coach.insights.streakDetail7"
          : currentStreak >= 5
          ? "coach.insights.streakDetail5"
          : "coach.insights.streakDetail3",
      icon: "zap",
      positive: true,
    });
  }

  // ── 2. Milestone ──────────────────────────────────────────────────────────
  if (insights.length < 2 && [10, 25, 50, 100, 150, 200].includes(totalWorkouts)) {
    insights.push({
      type: "milestone",
      headline: "coach.insights.milestoneHeadline",
      detail:
        totalWorkouts === 10
          ? "coach.insights.milestoneDetail10"
          : totalWorkouts === 25
          ? "coach.insights.milestoneDetail25"
          : totalWorkouts === 50
          ? "coach.insights.milestoneDetail50"
          : "coach.insights.milestoneDetail100",
      icon: "award",
      positive: true,
    });
  }

  // ── 3. Weekly goal progress ───────────────────────────────────────────────
  if (insights.length < 2) {
    const workoutsNeeded = Math.max(0, targetDays - thisWeekCount);
    if (thisWeekCount >= targetDays) {
      insights.push({
        type: "goal",
        headline: "coach.insights.weeklyGoalHitHeadline",
        detail: "coach.insights.weeklyGoalHitDetail",
        icon: "check-circle",
        positive: true,
      });
    } else if (workoutsNeeded === 1 && daysLeftInWeek >= 2) {
      insights.push({
        type: "goal",
        headline: "coach.insights.oneSessionAwayHeadline",
        detail: "coach.insights.oneSessionAwayDetail",
        icon: "target",
        positive: true,
      });
    }
  }

  // ── 4. Volume trend ───────────────────────────────────────────────────────
  if (insights.length < 2 && thisWeekCount > 0 && prevWeek.length > 0) {
    if (thisWeekCount > prevWeek.length) {
      insights.push({
        type: "volume",
        headline: "coach.insights.moreActiveHeadline",
        detail: "coach.insights.moreActiveDetail",
        icon: "trending-up",
        positive: true,
      });
    } else if (thisWeekCount === 0 && prevWeek.length >= 3) {
      insights.push({
        type: "volume",
        headline: "coach.insights.noSessionsHeadline",
        detail: "coach.insights.noSessionsDetail",
        icon: "trending-down",
        positive: false,
      });
    }
  }

  // ── 5. Workout variety ────────────────────────────────────────────────────
  if (insights.length < 2) {
    const typesThisWeek = new Set(last7.map((w) => w.activityType));
    if (last7.length >= 3 && typesThisWeek.size >= 3) {
      insights.push({
        type: "variety",
        headline: "coach.insights.greatVarietyHeadline",
        detail: "coach.insights.greatVarietyDetail",
        icon: "shuffle",
        positive: true,
      });
    } else if (last7.length >= 4 && typesThisWeek.size === 1) {
      insights.push({
        type: "rut",
        headline: "coach.insights.rutHeadline",
        detail: "coach.insights.rutDetail",
        icon: "refresh-cw",
        positive: false,
      });
    }
  }

  // ── 6. Neglected muscle groups ────────────────────────────────────────────
  if (insights.length < 2) {
    const gymWorkouts = last7.filter((w) => w.activityType === "gym");
    if (gymWorkouts.length >= 3) {
      const allGroups = gymWorkouts.flatMap((w) =>
        inferMuscleGroupsFromWorkout(w.name || w.activityType, w.activityType)
      );
      const groupCounts: Record<string, number> = {};
      for (const g of allGroups) groupCounts[g] = (groupCounts[g] || 0) + 1;
      const neglectedKey: Record<string, string> = {
        upper: "coach.insights.neglectedUpper",
        lower: "coach.insights.neglectedLower",
        core: "coach.insights.neglectedCore",
      };
      const neglected = ["upper", "lower", "core"].find((g) => !groupCounts[g]);
      if (neglected) {
        insights.push({
          type: "neglected",
          headline: neglectedKey[neglected],
          detail: "coach.insights.neglectedDetail",
          icon: "alert-circle",
          positive: false,
        });
      }
    }
  }

  return insights.slice(0, 2);
}

function buildTodayCoachingReason(
  rec: CoachRecommendation,
  yesterdayWorkout: RecentWorkout | undefined,
  yesterdayGroups: string[],
  progressionLevel: TodayRecommendation["progressionLevel"],
  daysSinceLast: number,
  last7Count: number,
  goals: string[]
): string {
  const parts: string[] = [];
  const tGroups = getMuscleGroups(rec.template);
  const t = rec.template;

  // 1. Muscle group avoidance — most specific, most useful coaching info
  if (yesterdayWorkout && yesterdayGroups.length > 0) {
    const overlap = tGroups.filter(
      (g) => yesterdayGroups.includes(g) && g !== "full" && g !== "cardio"
    );
    if (overlap.length === 0 && tGroups.length > 0 && !tGroups.includes("recovery")) {
      parts.push("coach.todayReason.freshMuscleGroups");
    } else if (tGroups.includes("recovery") || tGroups.includes("cardio")) {
      parts.push("coach.todayReason.lightOnMuscles");
    }
  }

  // 2. Progression / returning reasoning
  if (progressionLevel === "progressing" && last7Count >= 4) {
    const lvl = DIFFICULTY_MAP[t.difficulty] || 1;
    if (lvl > 1 && parts.length < 2) {
      parts.push("coach.todayReason.readyToPush");
    }
  } else if (progressionLevel === "returning" && parts.length < 2) {
    if ((DIFFICULTY_MAP[t.difficulty] || 1) === 1) {
      parts.push("coach.todayReason.beginnerFriendly");
    }
  }

  // 3. Recovery timing
  if (daysSinceLast >= 5 && parts.length < 2) {
    parts.push("coach.todayReason.fullyRecovered");
  } else if (daysSinceLast >= 2 && parts.length < 2) {
    parts.push("coach.todayReason.peakReadiness");
  }

  // 4. Goal alignment
  if (parts.length < 2) {
    const matchedGoal = findMatchedUserGoal(goals, t.goals);
    if (matchedGoal) {
      parts.push("coach.todayReason.supportsGoal");
    }
  }

  // 5. Equipment context
  if (parts.length < 2) {
    if (rec.equipmentMatch === "full" && t.requiredEquipment.length > 0) {
      parts.push("coach.todayReason.usesAllEquipment");
    } else if (rec.equipmentMatch === "partial") {
      parts.push("coach.todayReason.adaptedWithSubstitutions");
    }
  }

  if (parts.length === 0) return rec.whyGoodForYou;
  return parts.slice(0, 2).join(". ") + ".";
}

// ─── Recovery Context ──────────────────────────────────────────────────────────

export interface RecoveryContext {
  sleepHours?: number;
  sleepQuality?: number;   // 1–5
  energyLevel?: number;    // 1–5
  stressLevel?: number;    // 1–5
  soreness?: Record<string, number>; // body_part → 0–3
}

export function getTodayRecommendation(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[],
  recovery?: RecoveryContext
): TodayRecommendation | null {
  const preferredDuration = DURATION_MAP[profile.preferredWorkoutDuration] || 45;
  const userLevel = DIFFICULTY_MAP[profile.experienceLevel || "Beginner"] || 1;
  const now = Date.now();

  const daysSinceLast = recentWorkouts[0]
    ? (now - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const last7 = recentWorkouts.filter(
    (w) => (now - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24) <= 7
  );

  // Determine training consistency
  let progressionLevel: TodayRecommendation["progressionLevel"] = "normal";
  if (last7.length >= 4) {
    const sorted = [...last7].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap =
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
        (1000 * 60 * 60 * 24);
      maxGap = Math.max(maxGap, gap);
    }
    if (maxGap <= 2) progressionLevel = "progressing";
  } else if (last7.length < 2) {
    progressionLevel = "returning";
  }

  // What muscle groups did the user work yesterday?
  const yesterdayWorkout = recentWorkouts.find((w) => {
    const daysAgo = (now - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo < 1.5;
  });
  const yesterdayGroups = yesterdayWorkout
    ? inferMuscleGroupsFromWorkout(
        yesterdayWorkout.name || yesterdayWorkout.activityType,
        yesterdayWorkout.activityType
      )
    : [];

  // Detect workout streak (consecutive days)
  let workoutStreak = 0;
  for (const w of recentWorkouts) {
    const daysAgo = (now - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo > workoutStreak + 1.5) break;
    workoutStreak++;
  }
  const isRestDayRecommended = workoutStreak >= 5;

  // Score all viable templates with today-specific weighting
  const baseRecs = getRecommendations(profile, recentWorkouts, 20);
  if (baseRecs.length === 0) return null;

  const scored = baseRecs.map((rec) => {
    let todayScore = rec.score;
    const templateGroups = getMuscleGroups(rec.template);

    // ── Muscle group avoidance (heavy penalty for same-day repeats) ────────
    if (yesterdayGroups.length > 0) {
      const overlapping = templateGroups.filter(
        (g) => yesterdayGroups.includes(g) && g !== "full" && g !== "cardio"
      );
      if (overlapping.length > 0) todayScore -= 35;
    }

    // ── Progression ────────────────────────────────────────────────────────
    const templateLevel = DIFFICULTY_MAP[rec.template.difficulty] || 1;
    if (progressionLevel === "progressing") {
      if (templateLevel > userLevel) todayScore += 20;
      else if (templateLevel === userLevel) todayScore += 8;
    }
    if (progressionLevel === "returning") {
      if (templateLevel === 1) todayScore += 20;
      else if (templateLevel > 1) todayScore -= 10;
    }

    // ── After rest: lighter workouts ───────────────────────────────────────
    if (daysSinceLast >= 5) {
      if (templateLevel === 1) todayScore += 20;
      else if (templateLevel === 3) todayScore -= 15;
    } else if (daysSinceLast >= 2) {
      if (templateLevel === 1) todayScore += 8;
    }

    // ── Duration match ─────────────────────────────────────────────────────
    const durationDiff = Math.abs(rec.template.durationMinutes - preferredDuration);
    if (durationDiff <= 5) todayScore += 8;
    else if (durationDiff <= 15) todayScore += 3;
    else if (durationDiff > 25) todayScore -= 5;

    // ── Full equipment match bonus ──────────────────────────────────────────
    if (rec.equipmentMatch === "full") todayScore += 10;

    // ── Recovery-aware scoring ─────────────────────────────────────────────
    if (recovery) {
      const soreness = recovery.soreness ?? {};
      const templateLevel = DIFFICULTY_MAP[rec.template.difficulty] || 1;

      // Poor sleep or low energy → strongly prefer lighter, shorter sessions
      if (recovery.sleepQuality !== undefined && recovery.sleepQuality <= 2) {
        if (templateLevel > 1) todayScore -= 25;
        if (rec.template.durationMinutes > 40) todayScore -= 10;
      } else if (recovery.sleepQuality !== undefined && recovery.sleepQuality <= 3) {
        if (templateLevel === 3) todayScore -= 10;
      }
      if (recovery.energyLevel !== undefined && recovery.energyLevel <= 2) {
        if (templateLevel > 1) todayScore -= 20;
        if (rec.template.durationMinutes > 40) todayScore -= 8;
      }

      // High stress → prefer lighter, shorter sessions
      if (recovery.stressLevel !== undefined && recovery.stressLevel >= 4) {
        if (templateLevel > 1) todayScore -= 15;
        if (rec.template.durationMinutes > 40) todayScore -= 8;
      } else if (recovery.stressLevel !== undefined && recovery.stressLevel <= 2) {
        // Low stress → slight bonus for harder sessions
        if (templateLevel >= 2) todayScore += 5;
      }

      // High energy / great sleep → reward harder sessions
      if (recovery.energyLevel !== undefined && recovery.energyLevel >= 4) {
        if (templateLevel === 3) todayScore += 12;
        else if (templateLevel === 2) todayScore += 5;
        else todayScore -= 5;
      }
      if (recovery.sleepQuality !== undefined && recovery.sleepQuality >= 4) {
        if (templateLevel >= 2) todayScore += 8;
      }

      // Leg soreness → penalise lower-body templates
      const legSore = Math.max(soreness["legs"] ?? 0, soreness["glutes"] ?? 0);
      if (legSore >= 2 && templateGroups.includes("lower")) todayScore -= 30;
      else if (legSore >= 1 && templateGroups.includes("lower")) todayScore -= 12;

      // Upper body soreness → penalise upper templates
      const upperSore = Math.max(
        soreness["chest"] ?? 0,
        soreness["back"] ?? 0,
        soreness["shoulders"] ?? 0,
        soreness["arms"] ?? 0
      );
      if (upperSore >= 2 && templateGroups.includes("upper")) todayScore -= 30;
      else if (upperSore >= 1 && templateGroups.includes("upper")) todayScore -= 12;

      // Cardio / mobility → bonus if overall soreness is high
      const allSore = Object.values(soreness);
      const highSoreCount = allSore.filter((v) => v >= 2).length;
      if (highSoreCount >= 3) {
        if (templateGroups.includes("cardio") || templateGroups.includes("recovery")) todayScore += 15;
      }
    }

    return { rec, todayScore, templateGroups };
  });

  scored.sort((a, b) => b.todayScore - a.todayScore);
  const best = scored[0];

  // Build reason pills (max 3)
  const pills: string[] = [];

  if (yesterdayGroups.length > 0) {
    const noOverlap = best.templateGroups.filter(
      (g) => yesterdayGroups.includes(g) && g !== "full"
    ).length === 0;
    if (noOverlap && best.templateGroups.length > 0) {
      pills.push("coach.pills.freshMuscleGroups");
    }
  }

  if (progressionLevel === "progressing") {
    pills.push("coach.pills.progressionUnlocked");
  } else if (progressionLevel === "returning") {
    pills.push("coach.pills.easingBackIn");
  }

  if (daysSinceLast >= 5) {
    pills.push("coach.pills.gentleRestart");
  } else if (daysSinceLast >= 2) {
    pills.push("coach.pills.recoveredAndReady");
  }

  if (best.rec.equipmentMatch === "full") {
    pills.push("coach.pills.perfectEquipmentMatch");
  } else {
    pills.push("coach.pills.substitutionsAvailable");
  }

  // Recovery-aware pills
  if (recovery) {
    const soreness = recovery.soreness ?? {};
    const legSore = Math.max(soreness["legs"] ?? 0, soreness["glutes"] ?? 0);
    const upperSore = Math.max(
      soreness["chest"] ?? 0, soreness["back"] ?? 0,
      soreness["shoulders"] ?? 0, soreness["arms"] ?? 0
    );
    if (legSore >= 2) pills.unshift("coach.pills.legsRecovering");
    if (upperSore >= 2) pills.unshift("coach.pills.upperBodyRecovering");
    if (recovery.energyLevel !== undefined && recovery.energyLevel >= 4) pills.unshift("coach.pills.highEnergy");
    if (recovery.sleepQuality !== undefined && recovery.sleepQuality >= 4) pills.unshift("coach.pills.wellRested");
    if (recovery.sleepQuality !== undefined && recovery.sleepQuality <= 2) pills.unshift("coach.pills.lightSession");
    if (recovery.energyLevel !== undefined && recovery.energyLevel <= 2) pills.unshift("coach.pills.lowEnergy");
  }

  // Build context summary
  let contextSummary: string;
  if (daysSinceLast > 5) {
    contextSummary = "coach.context.fullyRested";
  } else if (daysSinceLast >= 2) {
    const dDays = Math.round(daysSinceLast);
    contextSummary = "coach.context.restCompleted";
  } else if (progressionLevel === "progressing") {
    contextSummary = "coach.context.solidConsistency";
  } else if (yesterdayWorkout) {
    contextSummary = "coach.context.freshMusclesFocus";
  } else {
    contextSummary = "coach.context.pickedForYou";
  }

  const personalReason = buildTodayCoachingReason(
    best.rec,
    yesterdayWorkout,
    yesterdayGroups,
    progressionLevel,
    daysSinceLast,
    last7.length,
    profile.fitnessGoals || []
  );

  // ── Recovery warning: flag when the user should take it easy ──────────
  let recoveryWarning = false;
  if (recovery) {
    const poorSleep = recovery.sleepQuality !== undefined && recovery.sleepQuality <= 2;
    const highStress = recovery.stressLevel !== undefined && recovery.stressLevel >= 4;
    const soreness = recovery.soreness ?? {};
    const allSore = Object.values(soreness);
    const highSorenessCount = allSore.filter((v) => v >= 2).length;
    const lowEnergy = recovery.energyLevel !== undefined && recovery.energyLevel <= 2;

    // Trigger warning when at least two poor-recovery signals are present,
    // or a single severe one (very poor sleep or extreme stress)
    const poorSignals =
      (poorSleep ? 1 : 0) +
      (highStress ? 1 : 0) +
      (highSorenessCount >= 2 ? 1 : 0) +
      (lowEnergy ? 1 : 0);

    if (poorSignals >= 2 || (recovery.sleepQuality !== undefined && recovery.sleepQuality <= 1) || (recovery.stressLevel !== undefined && recovery.stressLevel >= 5)) {
      recoveryWarning = true;
    }
  }

  // Deload detection: if user has been training hard (10+ workouts in 14 days)
  // or recovery warning is active, suggest lower intensity
  const recentForDeload = recentWorkouts.filter(
    (w) => (now - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24) <= 14
  );
  const shouldDeload = recoveryWarning || recentForDeload.length >= 10;

  return {
    recommendation: { ...best.rec, whyGoodForYou: personalReason },
    reasonPills: shouldDeload ? ["coach.pill.deloadWeek", ...pills.slice(0, 2)] : pills.slice(0, 3),
    contextSummary: shouldDeload ? "coach.context.deloadSuggested" : contextSummary,
    isRestDayRecommended,
    progressionLevel,
    daysSinceLast,
    recoveryWarning,
    shouldDeload,
  };
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
      return { ...easy, whyGoodForYou: "coach.reasons.gentleWayBack" };
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

  // Fetch a large candidate pool so we have plenty to rotate through
  const recs = getRecommendations(profile, recentWorkouts, 20);

  // ── Detect recent consistency to adapt difficulty ────────────────────────
  const msPerDay = 1000 * 60 * 60 * 24;
  const now = Date.now();
  const last7Count = recentWorkouts.filter(
    (w) => (now - new Date(w.date).getTime()) / msPerDay <= 7
  ).length;
  // User returning after a break: < 2 workouts in last 2 weeks and has history
  const last14Count = recentWorkouts.filter(
    (w) => (now - new Date(w.date).getTime()) / msPerDay <= 14
  ).length;
  const isReturning = last14Count < 2 && recentWorkouts.length > 0;
  // User on a consistent run: hit or exceeded weekly target
  const isConsistent = last7Count >= Math.max(weeklyDays - 1, 2);

  const workoutDayIndices = distributeWorkoutDays(weeklyDays);
  const usedTemplates = new Set<string>();

  // Track the two most recent workout slot muscle groups for rotation
  let prevSlotGroups: string[] = [];
  let prevPrevSlotGroups: string[] = [];

  const REST_NOTES = [
    "coach.restNotes.note1",
    "coach.restNotes.note2",
    "coach.restNotes.note3",
    "coach.restNotes.note4",
  ];
  let restIdx = 0;

  return days.map((day, idx) => {
    if (!workoutDayIndices.includes(idx)) {
      // On rest days we don't reset the muscle-group tracking — a single rest day
      // doesn't fully clear soreness, so the rotation still matters across days.
      const note = REST_NOTES[restIdx % REST_NOTES.length];
      restIdx++;
      return { day, template: null, rest: true, note };
    }

    const available = recs.filter((r) => !usedTemplates.has(r.template.id));

    if (available.length === 0) {
      return { day, template: null, rest: true, note: "coach.restNotes.activeRest" };
    }

    // Score each candidate by muscle-group overlap with the previous two workout
    // slots, plus difficulty adaptation for returning/consistent users.
    const GROUP_LABELS: Record<string, string> = {
      upper: "upper body", lower: "legs & glutes",
      core: "core", cardio: "cardio", recovery: "mobility",
    };

    const candidateScores = available.map((rec) => {
      const tGroups = getMuscleGroups(rec.template);
      let adjustedScore = rec.score;

      // Heavy penalty for repeating the same muscle groups as the last slot
      const overlapPrev = tGroups.filter(
        (g) => prevSlotGroups.includes(g) && !["full", "cardio", "recovery"].includes(g)
      );
      if (overlapPrev.length >= 2) adjustedScore -= 50;
      else if (overlapPrev.length === 1) adjustedScore -= 25;

      // Lighter penalty for repeating groups from two slots ago
      const overlapPrevPrev = tGroups.filter(
        (g) => prevPrevSlotGroups.includes(g) && !["full", "cardio", "recovery"].includes(g)
      );
      if (overlapPrevPrev.length >= 2) adjustedScore -= 20;
      else if (overlapPrevPrev.length === 1) adjustedScore -= 8;

      // Difficulty adaptation
      const level = DIFFICULTY_MAP[rec.template.difficulty] || 1;
      if (isReturning) {
        // After a break, ease back in with lighter sessions
        if (level > 1) adjustedScore -= 25;
      } else if (isConsistent) {
        // Consistent user — reward harder challenges
        if (level === 3) adjustedScore += 15;
        else if (level === 1) adjustedScore -= 10;
      }

      return { rec, adjustedScore, tGroups };
    });

    candidateScores.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const chosen = candidateScores[0];

    usedTemplates.add(chosen.rec.template.id);
    prevPrevSlotGroups = prevSlotGroups;
    prevSlotGroups = chosen.tGroups;

    // Build a clear day-level coaching note
    const tGroups = chosen.tGroups;
    const groupLabel = tGroups.includes("full")
      ? "full body"
      : tGroups
          .filter((g) => ["upper", "lower", "core", "cardio", "recovery"].includes(g))
          .map((g) => GROUP_LABELS[g])
          .filter(Boolean)
          .join(" + ");

    let note = chosen.rec.whyGoodForYou;
    if (groupLabel) {
      const capitalised = groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1);
      note = `${capitalised} focus. ${chosen.rec.whyGoodForYou}`;
    }
    if (isReturning && DIFFICULTY_MAP[chosen.rec.template.difficulty] === 1) {
      note += " coach.weeklyPlan.easingBackIn";
    }

    return { day, template: chosen.rec.template, rest: false, note };
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
    walking: ["coach.benefits.walking1", "coach.benefits.walking2", "coach.benefits.walking3", "coach.benefits.walking4"],
    running: ["coach.benefits.running1", "coach.benefits.running2", "coach.benefits.running3", "coach.benefits.running4"],
    gym: ["coach.benefits.gym1", "coach.benefits.gym2", "coach.benefits.gym3", "coach.benefits.gym4"],
    cycling: ["coach.benefits.cycling1", "coach.benefits.cycling2", "coach.benefits.cycling3", "coach.benefits.cycling4"],
    swimming: ["coach.benefits.swimming1", "coach.benefits.swimming2", "coach.benefits.swimming3", "coach.benefits.swimming4"],
    cardio: ["coach.benefits.cardio1", "coach.benefits.cardio2", "coach.benefits.cardio3", "coach.benefits.cardio4"],
    other: ["coach.benefits.other1", "coach.benefits.other2", "coach.benefits.other3"],
  };
  return map[activityType] || map.other;
}
