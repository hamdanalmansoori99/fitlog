// Maps a streak day count to a translation key + icon shown to the user.
// Uses milestone-based messages — in-between days get a generic motivating message.
// All user-facing strings are translation keys resolved via i18next t().

export interface StreakNarrative {
  /** Translation key under the "streak" namespace, e.g. "streak.day1" */
  messageKey: string;
  icon: string;
}

const MILESTONES: { day: number; messageKey: string; icon: string }[] = [
  { day: 1,   messageKey: "streak.day1",   icon: "zap" },
  { day: 2,   messageKey: "streak.day2",   icon: "target" },
  { day: 3,   messageKey: "streak.day3",   icon: "trending-up" },
  { day: 5,   messageKey: "streak.day5",   icon: "zap" },
  { day: 7,   messageKey: "streak.day7",   icon: "shield" },
  { day: 10,  messageKey: "streak.day10",  icon: "activity" },
  { day: 14,  messageKey: "streak.day14",  icon: "crosshair" },
  { day: 21,  messageKey: "streak.day21",  icon: "cpu" },
  { day: 30,  messageKey: "streak.day30",  icon: "award" },
  { day: 45,  messageKey: "streak.day45",  icon: "tool" },
  { day: 60,  messageKey: "streak.day60",  icon: "star" },
  { day: 90,  messageKey: "streak.day90",  icon: "trending-up" },
  { day: 100, messageKey: "streak.day100", icon: "heart" },
  { day: 180, messageKey: "streak.day180", icon: "moon" },
  { day: 365, messageKey: "streak.day365", icon: "sun" },
];

export function getStreakNarrative(days: number): StreakNarrative {
  if (days <= 0) {
    return { messageKey: "streak.startToday", icon: "feather" };
  }
  // Find the highest milestone that's <= current days
  let best = MILESTONES[0];
  for (const m of MILESTONES) {
    if (days >= m.day) best = m;
    else break;
  }
  return { messageKey: best.messageKey, icon: best.icon };
}

/** Returns a translation key for the streak label. Consumers must call t(key, { count }) */
export function getStreakLabelKey(days: number): string {
  if (days === 0) return "streak.noActiveStreak";
  return "streak.dayOfJourney";
}
