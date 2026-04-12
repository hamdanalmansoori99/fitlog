export interface SetRecord {
  reps?: number;
  weightKg?: number;
  rpe?: number;
  completed?: boolean;
}

export interface ExerciseSession {
  date: string;
  sets: SetRecord[];
}

export interface ExerciseHistory {
  name: string;
  sessions: ExerciseSession[];
}

export interface StrengthTarget {
  type: "strength";
  suggestedWeightKg?: number;
  suggestedReps?: number;
  suggestedSets?: number;
  rationale: string;
  trend: "progress" | "maintain" | "deload" | "first";
  previousDisplay?: string;
  prevWeightKg?: number;
  prevReps?: number;
  prevSets?: number;
}

export interface CardioSession {
  date: string;
  distanceKm?: number;
  durationMinutes?: number;
  paceMinPerKm?: number;
}

export interface CardioTarget {
  type: "cardio";
  suggestedDistanceKm?: number;
  suggestedDurationMinutes?: number;
  suggestedPaceMinPerKm?: number;
  rationale: string;
  trend: "progress" | "maintain" | "deload" | "first";
  previousDisplay?: string;
}

export type ProgressionTarget = StrengthTarget | CardioTarget;

export interface ConsistencyAssessment {
  level: "high" | "medium" | "low";
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  weeklyGoal: number;
  recommendation: string;
  shouldDeload: boolean;
}

function avgRpe(sets: SetRecord[]): number | null {
  const withRpe = sets.filter((s) => s.rpe != null);
  if (withRpe.length === 0) return null;
  return withRpe.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / withRpe.length;
}

function completionRate(sets: SetRecord[]): number {
  if (sets.length === 0) return 0;
  const done = sets.filter((s) => s.completed !== false).length;
  return done / sets.length;
}

function maxWeightKg(sets: SetRecord[]): number {
  return sets.reduce((max, s) => Math.max(max, s.weightKg ?? 0), 0);
}

function totalVolume(sets: SetRecord[]): number {
  return sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
}

function nearestIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

export function calculateStrengthTarget(history: ExerciseSession[]): StrengthTarget {
  if (history.length === 0) {
    return {
      type: "strength",
      trend: "first",
      rationale: "progression.strength.firstSession",
    };
  }

  const last = history[0];
  const prev = history[1];

  const lastSets = last.sets;
  const maxW = maxWeightKg(lastSets);
  const avgR = lastSets.filter((s) => s.reps).reduce((sum, s) => sum + (s.reps ?? 0), 0) / (lastSets.filter((s) => s.reps).length || 1);
  const completion = completionRate(lastSets);
  const rpe = avgRpe(lastSets);

  const prevMaxW = prev ? maxWeightKg(prev.sets) : null;
  const prevVolume = prev ? totalVolume(prev.sets) : null;
  const lastVolume = totalVolume(lastSets);

  const currentSets = lastSets.filter((s) => s.reps).length;

  const lastDateDaysAgo = Math.round(
    (Date.now() - new Date(last.date).getTime()) / 86400000
  );

  const missed = lastDateDaysAgo > 14;

  const previousDisplay =
    maxW > 0
      ? `${currentSets}×${Math.round(avgR)} @ ${maxW}kg`
      : currentSets > 0
      ? `${currentSets}×${Math.round(avgR)} (bodyweight)`
      : null;

  const prevFields = maxW > 0 || currentSets > 0
    ? { prevWeightKg: maxW > 0 ? maxW : undefined, prevReps: Math.round(avgR), prevSets: currentSets }
    : {};

  if (missed) {
    const targetW = maxW > 0 ? nearestIncrement(maxW * 0.9, 2.5) : undefined;
    return {
      type: "strength",
      suggestedWeightKg: targetW,
      suggestedReps: Math.round(avgR),
      suggestedSets: Math.max(2, currentSets - 1),
      trend: "deload",
      previousDisplay: previousDisplay ?? undefined,
      ...prevFields,
      rationale: "progression.strength.longBreakDeload",
    };
  }

  const shouldDeload = completion < 0.6 || (rpe !== null && rpe >= 9.5);
  const shouldProgress = completion >= 0.8 && (rpe === null || rpe <= 7);

  if (shouldDeload) {
    const targetW = maxW > 0 ? nearestIncrement(maxW * 0.9, 2.5) : undefined;
    return {
      type: "strength",
      suggestedWeightKg: targetW,
      suggestedReps: Math.max(6, Math.round(avgR) - 1),
      suggestedSets: currentSets,
      trend: "deload",
      previousDisplay: previousDisplay ?? undefined,
      ...prevFields,
      rationale:
        rpe !== null && rpe >= 9.5
          ? "progression.strength.highRpeDeload"
          : "progression.strength.incompleteSetsDeload",
    };
  }

  if (shouldProgress) {
    if (maxW > 0) {
      const increment = maxW < 30 ? 1.25 : maxW < 60 ? 2.5 : 5;
      const targetW = nearestIncrement(maxW + increment, 1.25);
      return {
        type: "strength",
        suggestedWeightKg: targetW,
        suggestedReps: Math.round(avgR),
        suggestedSets: currentSets,
        trend: "progress",
        previousDisplay: previousDisplay ?? undefined,
        ...prevFields,
        rationale: "progression.strength.progressWeighted",
      };
    } else {
      return {
        type: "strength",
        suggestedReps: Math.round(avgR) + 2,
        suggestedSets: currentSets,
        trend: "progress",
        previousDisplay: previousDisplay ?? undefined,
        ...prevFields,
        rationale: "progression.strength.progressBodyweight",
      };
    }
  }

  return {
    type: "strength",
    suggestedWeightKg: maxW > 0 ? maxW : undefined,
    suggestedReps: Math.round(avgR),
    suggestedSets: currentSets,
    trend: "maintain",
    previousDisplay: previousDisplay ?? undefined,
    ...prevFields,
    rationale: "progression.strength.maintain",
  };
}

export function calculateCardioTarget(
  sessions: CardioSession[],
  activityType: string
): CardioTarget {
  if (sessions.length === 0) {
    return {
      type: "cardio",
      trend: "first",
      rationale: "progression.cardio.firstSession",
    };
  }

  const last = sessions[0];
  const lastDaysAgo = Math.round(
    (Date.now() - new Date(last.date).getTime()) / 86400000
  );
  const missed = lastDaysAgo > 10;

  const actLabel: Record<string, string> = {
    running: "run",
    cycling: "ride",
    walking: "walk",
    swimming: "swim",
  };
  const label = actLabel[activityType] ?? activityType;

  const previousDisplay = last.distanceKm
    ? `${last.distanceKm.toFixed(1)} km${last.paceMinPerKm ? ` · ${formatPace(last.paceMinPerKm)}/km` : ""}`
    : last.durationMinutes
    ? `${last.durationMinutes} min`
    : null;

  if (missed) {
    return {
      type: "cardio",
      suggestedDistanceKm: last.distanceKm ? +(last.distanceKm * 0.8).toFixed(1) : undefined,
      suggestedDurationMinutes: last.durationMinutes ? Math.round(last.durationMinutes * 0.8) : undefined,
      suggestedPaceMinPerKm: last.paceMinPerKm ? last.paceMinPerKm + 0.5 : undefined,
      trend: "deload",
      previousDisplay: previousDisplay ?? undefined,
      rationale: "progression.cardio.longBreakDeload",
    };
  }

  if (sessions.length < 2) {
    const targetDist = last.distanceKm ? +(last.distanceKm + 0.5).toFixed(1) : undefined;
    const targetDur = last.durationMinutes ? last.durationMinutes + 5 : undefined;
    return {
      type: "cardio",
      suggestedDistanceKm: targetDist,
      suggestedDurationMinutes: targetDur,
      suggestedPaceMinPerKm: last.paceMinPerKm,
      trend: "progress",
      previousDisplay: previousDisplay ?? undefined,
      rationale: "progression.cardio.greatFirst",
    };
  }

  const recent = sessions.slice(0, 3);
  const avgPace =
    recent.filter((s) => s.paceMinPerKm).length > 0
      ? recent.filter((s) => s.paceMinPerKm).reduce((sum, s) => sum + (s.paceMinPerKm ?? 0), 0) /
        recent.filter((s) => s.paceMinPerKm).length
      : null;

  const paceImproving =
    sessions.length >= 3 &&
    sessions[0].paceMinPerKm != null &&
    sessions[2].paceMinPerKm != null &&
    sessions[0].paceMinPerKm < sessions[2].paceMinPerKm;

  const distanceSteady =
    sessions.length >= 3 &&
    sessions.slice(0, 3).every(
      (s) => s.distanceKm != null && Math.abs((s.distanceKm ?? 0) - (last.distanceKm ?? 0)) < 0.5
    );

  if (paceImproving && last.paceMinPerKm) {
    const fasterPace = Math.max(3, last.paceMinPerKm - 0.1);
    return {
      type: "cardio",
      suggestedDistanceKm: last.distanceKm,
      suggestedPaceMinPerKm: +fasterPace.toFixed(2),
      trend: "progress",
      previousDisplay: previousDisplay ?? undefined,
      rationale: "progression.cardio.paceImproving",
    };
  }

  if (distanceSteady && last.distanceKm) {
    const targetDist = +(last.distanceKm + 0.5).toFixed(1);
    return {
      type: "cardio",
      suggestedDistanceKm: targetDist,
      suggestedPaceMinPerKm: last.paceMinPerKm ?? undefined,
      trend: "progress",
      previousDisplay: previousDisplay ?? undefined,
      rationale: "progression.cardio.distanceSteady",
    };
  }

  return {
    type: "cardio",
    suggestedDistanceKm: last.distanceKm,
    suggestedDurationMinutes: last.durationMinutes,
    suggestedPaceMinPerKm: last.paceMinPerKm ?? undefined,
    trend: "maintain",
    previousDisplay: previousDisplay ?? undefined,
    rationale: "progression.cardio.maintain",
  };
}

export function getConsistencyAssessment(
  workouts: Array<{ date: Date | string }>,
  weeklyGoal: number
): ConsistencyAssessment {
  const now = Date.now();
  const weekMs = 7 * 86400000;

  const thisWeek = workouts.filter(
    (w) => now - new Date(w.date).getTime() < weekMs
  ).length;
  const lastWeek = workouts.filter((w) => {
    const age = now - new Date(w.date).getTime();
    return age >= weekMs && age < 2 * weekMs;
  }).length;

  const ratio = weeklyGoal > 0 ? thisWeek / weeklyGoal : 0;

  if (ratio >= 1) {
    return {
      level: "high",
      workoutsThisWeek: thisWeek,
      workoutsLastWeek: lastWeek,
      weeklyGoal,
      recommendation:
        thisWeek > weeklyGoal
          ? "progression.consistency.exceededGoal"
          : "progression.consistency.hitGoal",
      shouldDeload: thisWeek >= weeklyGoal + 2,
    };
  }

  if (ratio >= 0.5) {
    return {
      level: "medium",
      workoutsThisWeek: thisWeek,
      workoutsLastWeek: lastWeek,
      weeklyGoal,
      recommendation: "progression.consistency.mediumProgress",
      shouldDeload: false,
    };
  }

  return {
    level: "low",
    workoutsThisWeek: thisWeek,
    workoutsLastWeek: lastWeek,
    weeklyGoal,
    recommendation:
      lastWeek >= weeklyGoal
        ? "progression.consistency.lighterWeek"
        : "progression.consistency.startSmall",
    shouldDeload: false,
  };
}

export function formatPace(paceMinPerKm: number): string {
  const min = Math.floor(paceMinPerKm);
  const sec = Math.round((paceMinPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function getTrendIcon(trend: ProgressionTarget["trend"]): string {
  switch (trend) {
    case "progress": return "↑";
    case "maintain": return "→";
    case "deload": return "↓";
    case "first": return "✦";
  }
}

export function getTrendColor(trend: ProgressionTarget["trend"], theme: any): string {
  switch (trend) {
    case "progress": return theme.primary ?? "#00e676";
    case "maintain": return theme.secondary ?? "#448aff";
    case "deload": return theme.warning ?? "#ffab40";
    case "first": return theme.textMuted ?? "#888";
  }
}
