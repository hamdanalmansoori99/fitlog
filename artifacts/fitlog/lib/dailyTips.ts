export type TipCategory = "training" | "nutrition" | "recovery" | "ramadan";

export interface DailyTip {
  category: TipCategory;
  /** i18n key — consumer should call t(tip.key) to get the translated string */
  key: string;
}

const TIPS: DailyTip[] = [
  // Training
  { category: "training", key: "dailyTips.tip1" },
  { category: "training", key: "dailyTips.tip2" },
  { category: "training", key: "dailyTips.tip3" },
  { category: "training", key: "dailyTips.tip4" },
  { category: "training", key: "dailyTips.tip5" },
  { category: "training", key: "dailyTips.tip6" },
  { category: "training", key: "dailyTips.tip7" },
  { category: "training", key: "dailyTips.tip8" },
  { category: "training", key: "dailyTips.tip9" },
  { category: "training", key: "dailyTips.tip10" },
  // Nutrition
  { category: "nutrition", key: "dailyTips.tip11" },
  { category: "nutrition", key: "dailyTips.tip12" },
  { category: "nutrition", key: "dailyTips.tip13" },
  { category: "nutrition", key: "dailyTips.tip14" },
  { category: "nutrition", key: "dailyTips.tip15" },
  { category: "nutrition", key: "dailyTips.tip16" },
  { category: "nutrition", key: "dailyTips.tip17" },
  { category: "nutrition", key: "dailyTips.tip18" },
  { category: "nutrition", key: "dailyTips.tip19" },
  { category: "nutrition", key: "dailyTips.tip20" },
  // Recovery
  { category: "recovery", key: "dailyTips.tip21" },
  { category: "recovery", key: "dailyTips.tip22" },
  { category: "recovery", key: "dailyTips.tip23" },
  { category: "recovery", key: "dailyTips.tip24" },
  { category: "recovery", key: "dailyTips.tip25" },
  { category: "recovery", key: "dailyTips.tip26" },
  { category: "recovery", key: "dailyTips.tip27" },
  { category: "recovery", key: "dailyTips.tip28" },
  { category: "recovery", key: "dailyTips.tip29" },
  { category: "recovery", key: "dailyTips.tip30" },
  // Ramadan
  { category: "ramadan", key: "dailyTips.ramadan1" },
  { category: "ramadan", key: "dailyTips.ramadan2" },
  { category: "ramadan", key: "dailyTips.ramadan3" },
  { category: "ramadan", key: "dailyTips.ramadan4" },
  { category: "ramadan", key: "dailyTips.ramadan5" },
  { category: "ramadan", key: "dailyTips.ramadan6" },
  { category: "ramadan", key: "dailyTips.ramadan7" },
  { category: "ramadan", key: "dailyTips.ramadan8" },
  { category: "ramadan", key: "dailyTips.ramadan9" },
  { category: "ramadan", key: "dailyTips.ramadan10" },
];

const CATEGORY_COLORS: Record<TipCategory, string> = {
  training: "#00e676",
  nutrition: "#ffab40",
  recovery: "#4fc3f7",
  ramadan: "#ab47bc",
};

const CATEGORY_ICONS: Record<TipCategory, string> = {
  training: "zap",
  nutrition: "coffee",
  recovery: "moon",
  ramadan: "star",
};

// Approximate Ramadan dates for prioritizing Ramadan tips
const RAMADAN_RANGES = [
  { start: "2025-02-28", end: "2025-03-30" },
  { start: "2026-02-17", end: "2026-03-19" },
  { start: "2027-02-07", end: "2027-03-08" },
  { start: "2028-01-27", end: "2028-02-25" },
  { start: "2029-01-15", end: "2029-02-13" },
];

function isRamadanNow(): boolean {
  const iso = new Date().toISOString().slice(0, 10);
  return RAMADAN_RANGES.some((r) => iso >= r.start && iso <= r.end);
}

export function getTodaysTip(): DailyTip {
  const dayIndex = Math.floor(Date.now() / 86_400_000);

  // During Ramadan, cycle through Ramadan tips
  if (isRamadanNow()) {
    const ramadanTips = TIPS.filter((t) => t.category === "ramadan");
    if (ramadanTips.length > 0) {
      return ramadanTips[dayIndex % ramadanTips.length];
    }
  }

  // Otherwise use the full pool (excluding Ramadan tips outside Ramadan)
  const regularTips = TIPS.filter((t) => t.category !== "ramadan");
  return regularTips[dayIndex % regularTips.length];
}

export { CATEGORY_COLORS, CATEGORY_ICONS };
