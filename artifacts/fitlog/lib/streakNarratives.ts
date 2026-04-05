// Maps a streak day count to narrative text shown to the user.
// Uses milestone-based messages — in-between days get a generic motivating message.

export interface StreakNarrative {
  message: string;
  icon: string;
}

const MILESTONES: { day: number; message: string; icon: string }[] = [
  { day: 1,   message: "The spark is lit.",                                        icon: "zap" },
  { day: 2,   message: "Back again. This is how legends start.",                   icon: "target" },
  { day: 3,   message: "Three in a row. Your body is starting to remember.",       icon: "trending-up" },
  { day: 5,   message: "Five days strong. The habit is forming.",                  icon: "zap" },
  { day: 7,   message: "One full week. The Forge has claimed you.",                icon: "shield" },
  { day: 10,  message: "Double digits. You're not stopping.",                      icon: "activity" },
  { day: 14,  message: "Two weeks forged. Others are still deciding to start.",    icon: "crosshair" },
  { day: 21,  message: "21 days. Science says this is a habit now. You're different.", icon: "cpu" },
  { day: 30,  message: "A full month. Bronze Forger energy.",                      icon: "award" },
  { day: 45,  message: "45 days. The grind is second nature.",                     icon: "tool" },
  { day: 60,  message: "Two months. Most people quit by week 2. You're not most people.", icon: "star" },
  { day: 90,  message: "90 days. Elite territory.",                                icon: "trending-up" },
  { day: 100, message: "100 days. You've entered rare air. The Obsidian path calls.", icon: "heart" },
  { day: 180, message: "Half a year. The realm has noticed.",                      icon: "moon" },
  { day: 365, message: "One year. The Eternal Ascendant watches and nods.",        icon: "sun" },
];

export function getStreakNarrative(days: number): StreakNarrative {
  if (days <= 0) {
    return { message: "Start your streak today.", icon: "feather" };
  }
  // Find the highest milestone that's <= current days
  let best = MILESTONES[0];
  for (const m of MILESTONES) {
    if (days >= m.day) best = m;
    else break;
  }
  return { message: best.message, icon: best.icon };
}

export function getStreakLabel(days: number): string {
  if (days === 0) return "No active streak";
  if (days === 1) return "Day 1 of your journey";
  return `Day ${days} of your journey`;
}
