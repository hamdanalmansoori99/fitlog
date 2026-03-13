import { WORKOUT_TEMPLATES, WorkoutTemplate, Goal, Equipment } from "./workoutTemplates";

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

export interface CoachRecommendation {
  template: WorkoutTemplate;
  score: number;
  whyGoodForYou: string;
  isAlternative?: boolean;
}

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

const GOAL_ACTIVITY_AFFINITY: Record<string, string[]> = {
  "Lose weight": ["gym", "running", "cycling", "swimming", "walking", "other"],
  "Build muscle": ["gym"],
  "Get stronger": ["gym"],
  "Stay active": ["walking", "yoga", "cycling", "tennis", "swimming", "gym", "other"],
  "Improve endurance": ["running", "cycling", "swimming", "other"],
  "Improve flexibility": ["yoga", "other"],
};

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

  // Days since last workout
  const lastWorkout = recentWorkouts[0];
  const daysSinceLast = lastWorkout
    ? (Date.now() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const scored = WORKOUT_TEMPLATES.map((template) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Equipment match (most important)
    const requiredEquip = template.requiredEquipment;
    if (requiredEquip.length === 0) {
      // Bodyweight — always usable
      score += 30;
      if (equipment.length === 0 || equipment.includes("none")) {
        score += 30; // Extra boost if user has nothing
        reasons.push("Uses no equipment, matching your setup perfectly");
      }
    } else {
      const hasAll = requiredEquip.every((e) => equipment.includes(e));
      const hasSome = requiredEquip.some((e) => equipment.includes(e));
      if (hasAll) {
        score += 50;
        reasons.push("Matches your available equipment");
      } else if (hasSome) {
        score += 20;
      } else {
        // Missing equipment — penalise heavily
        score -= 50;
      }
    }

    // 2. Goal alignment
    const templateGoals = template.goals as string[];
    const goalMatch = goals.some((g) => templateGoals.includes(g));
    if (goalMatch) {
      score += 25;
      reasons.push("Aligned with your fitness goals");
    }

    // 3. Training preferences match
    const prefMatch = prefs.some((p) => template.tags.some((t) => p.toLowerCase().includes(t) || t.includes(p.toLowerCase())));
    if (prefMatch) {
      score += 15;
      reasons.push("Matches your preferred training style");
    }

    // 4. Difficulty match
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

    // 5. Duration match
    const durationDiff = Math.abs(template.durationMinutes - durationPref);
    if (durationDiff <= 10) {
      score += 10;
    } else if (durationDiff <= 20) {
      score += 5;
    }

    // 6. Avoid repeating same type too soon
    const repeatCount = recentTypes.filter((t) => t === template.activityType).length;
    if (repeatCount >= 2) {
      score -= 15;
    } else if (repeatCount === 1) {
      score -= 5;
    }

    // 7. Recovery boost if user hasn't trained in a while
    if (daysSinceLast > 4 && template.difficulty === "Beginner") {
      score += 10;
      reasons.push("Good restart after some time off");
    }

    // 8. Location preference
    if (profile.workoutLocation === "Home" && requiredEquip.length === 0) {
      score += 10;
    } else if (profile.workoutLocation === "Gym" && (equipment.includes("barbell") || equipment.includes("cable_machine"))) {
      score += 10;
    }

    const whyGoodForYou = reasons.length > 0
      ? reasons.slice(0, 2).join(". ") + "."
      : buildDefaultReason(template, goals, equipment);

    return { template, score, whyGoodForYou };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

function buildDefaultReason(template: WorkoutTemplate, goals: string[], equipment: string[]): string {
  if (template.goals.some((g) => goals.includes(g))) {
    return `Supports your goal: ${template.goals[0]}.`;
  }
  if (template.requiredEquipment.length === 0) {
    return "No equipment required — do this anywhere.";
  }
  return `A great ${template.difficulty.toLowerCase()} workout for overall fitness.`;
}

export function getTodaySuggestion(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[]
): CoachRecommendation | null {
  const recs = getRecommendations(profile, recentWorkouts, 10);
  if (recs.length === 0) return null;

  const daysSinceLast = recentWorkouts[0]
    ? (Date.now() - new Date(recentWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  // If user hasn't trained for a while, pick the easiest beginner option
  if (daysSinceLast > 5) {
    const easyOption = recs.find((r) => r.template.difficulty === "Beginner");
    if (easyOption) {
      return {
        ...easyOption,
        whyGoodForYou: "You've had some rest — this gentle session is a perfect way to get back into it.",
      };
    }
  }

  // Otherwise return top recommendation
  return recs[0];
}

export function generateWeeklyPlan(
  profile: UserCoachProfile,
  recentWorkouts: RecentWorkout[]
): { day: string; template: WorkoutTemplate | null; rest: boolean; note: string }[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const weeklyDays = Math.min(profile.weeklyWorkoutDays || 3, 7);
  const recs = getRecommendations(profile, recentWorkouts, 12);
  const goals = profile.fitnessGoals || [];

  // Distribute workout days evenly across the week
  const workoutDayIndices = distributeWorkoutDays(weeklyDays);
  const usedTemplates = new Set<string>();

  return days.map((day, idx) => {
    const isWorkoutDay = workoutDayIndices.includes(idx);

    if (!isWorkoutDay) {
      return {
        day,
        template: null,
        rest: true,
        note: idx % 2 === 0 ? "Rest day — active recovery or light walk recommended" : "Rest day",
      };
    }

    // Pick the next best template not already used
    const nextRec = recs.find((r) => !usedTemplates.has(r.template.id));
    if (!nextRec) {
      return { day, template: null, rest: true, note: "Active rest — go for a walk" };
    }

    usedTemplates.add(nextRec.template.id);
    return {
      day,
      template: nextRec.template,
      rest: false,
      note: nextRec.whyGoodForYou,
    };
  });
}

function distributeWorkoutDays(count: number): number[] {
  // Spread workout days evenly
  const templates: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 3, 4, 6],
    6: [0, 1, 2, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return templates[count] || [0, 2, 4];
}

export function getEquipmentSubstitutions(
  exerciseName: string,
  userEquipment: string[]
): string[] {
  const subs: Record<string, { needs: string; alternatives: string[] }[]> = {
    "Barbell Back Squat": [{ needs: "barbell", alternatives: ["Goblet Squat", "Bodyweight Squat", "Dumbbell Squat"] }],
    "Barbell Squat": [{ needs: "barbell", alternatives: ["Goblet Squat", "Bodyweight Squat"] }],
    "Barbell Deadlift": [{ needs: "barbell", alternatives: ["Romanian Deadlift (dumbbells)", "Dumbbell Deadlift"] }],
    "Bench Press": [{ needs: "bench", alternatives: ["Push-Ups", "Dumbbell Floor Press"] }],
    "Barbell Bench Press": [{ needs: "barbell", alternatives: ["Dumbbell Bench Press", "Push-Ups"] }],
    "Lat Pulldown": [{ needs: "cable_machine", alternatives: ["Pull-Up", "Band Pulldown", "Dumbbell Row"] }],
    "Leg Press": [{ needs: "leg_press", alternatives: ["Bulgarian Split Squat", "Goblet Squat", "Step-Ups"] }],
    "Cable Fly": [{ needs: "cable_machine", alternatives: ["Dumbbell Fly", "Push-Up"] }],
    "Cable Row": [{ needs: "cable_machine", alternatives: ["Dumbbell Row", "Band Row", "Barbell Row"] }],
  };

  const entry = subs[exerciseName];
  if (!entry) return [];

  return entry
    .filter((s) => !userEquipment.includes(s.needs))
    .flatMap((s) => s.alternatives);
}

export function getActivityBenefits(activityType: string): string[] {
  const benefitsMap: Record<string, string[]> = {
    walking: [
      "Improves cardiovascular health",
      "Supports sustainable fat loss",
      "Low impact — easy on joints",
      "Great for active recovery",
    ],
    running: [
      "Builds cardiovascular endurance",
      "Burns significant calories",
      "Strengthens the cardiovascular system",
      "Improves mental health and mood",
    ],
    gym: [
      "Builds strength and muscle",
      "Improves bone density",
      "Boosts metabolism",
      "Supports long-term body composition",
    ],
    cycling: [
      "Effective cardiovascular workout",
      "Lower joint impact than running",
      "Improves leg endurance and power",
      "Great calorie burner",
    ],
    swimming: [
      "Full-body conditioning",
      "Zero joint impact",
      "Builds lung capacity",
      "Excellent for recovery",
    ],
    tennis: [
      "Improves agility and reaction speed",
      "Great aerobic workout",
      "Develops hand-eye coordination",
      "Fun and social",
    ],
    yoga: [
      "Improves flexibility and range of motion",
      "Supports muscle recovery",
      "Reduces stress and improves sleep",
      "Improves mobility and balance",
    ],
    other: [
      "Keeps you active and moving",
      "Burns calories",
      "Variety is key to long-term consistency",
    ],
  };
  return benefitsMap[activityType] || benefitsMap.other;
}
