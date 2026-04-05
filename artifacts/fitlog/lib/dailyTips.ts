export type TipCategory = "training" | "nutrition" | "recovery";

export interface DailyTip {
  category: TipCategory;
  text: string;
}

const TIPS: DailyTip[] = [
  // Training
  { category: "training", text: "Progressive overload is the #1 driver of muscle growth. Add 2.5kg or 1 rep every session you feel strong." },
  { category: "training", text: "The last 2 reps of a working set are where most of the growth signal comes from. Don't cut early." },
  { category: "training", text: "Compound lifts first, isolation work last. Your CNS is freshest at the start of a session." },
  { category: "training", text: "A workout done at 80% effort beats a skipped 'perfect' workout every time." },
  { category: "training", text: "Rest 2–3 min between heavy compound sets. Cutting rest short kills performance more than it saves time." },
  { category: "training", text: "If a muscle isn't sore the next day, that doesn't mean it didn't grow. Soreness ≠ growth." },
  { category: "training", text: "Mind-muscle connection is real. Slow down the eccentric (lowering) phase to feel the target muscle." },
  { category: "training", text: "Volume beats intensity for hypertrophy. 4 sets at moderate weight > 1 set to failure." },
  { category: "training", text: "Train each muscle group at least twice per week for optimal growth." },
  { category: "training", text: "A deload week every 6–8 weeks prevents CNS fatigue and comes back stronger." },
  // Nutrition
  { category: "nutrition", text: "Protein timing matters less than total daily protein. Hit your target first, then worry about timing." },
  { category: "nutrition", text: "1.6–2.2g of protein per kg of bodyweight is the evidence-based range for muscle building." },
  { category: "nutrition", text: "Eating in a 300–500 calorie surplus is the sweet spot for building muscle without excess fat gain." },
  { category: "nutrition", text: "Don't train fasted if you're doing heavy compound work. A small carb snack 30–60 min before helps." },
  { category: "nutrition", text: "Creatine monohydrate is the most researched and proven supplement. 3–5g daily." },
  { category: "nutrition", text: "Post-workout nutrition matters most when you train fasted. Otherwise the anabolic window is ~several hours wide." },
  { category: "nutrition", text: "Whole foods > supplements every time. Food comes with micronutrients no pill can replicate." },
  { category: "nutrition", text: "Staying hydrated improves strength output by up to 10%. Drink water before you feel thirsty." },
  { category: "nutrition", text: "Carbs are not the enemy. They're the primary fuel for high-intensity training. Time them around workouts." },
  { category: "nutrition", text: "Eating enough calories to support training is as important as the training itself." },
  // Recovery
  { category: "recovery", text: "Sleep is the most powerful anabolic agent available. 7–9 hours is the target. No exceptions." },
  { category: "recovery", text: "HRV dropping? Your body is asking for a rest day. Pushing through only digs the hole deeper." },
  { category: "recovery", text: "Cold exposure after training may blunt muscle growth by reducing inflammation. Save it for off days." },
  { category: "recovery", text: "Active recovery (walking, light cardio) improves blood flow to sore muscles and speeds up repair." },
  { category: "recovery", text: "Stress from life counts as training stress. A hard week at work means you may need to pull back in the gym." },
  { category: "recovery", text: "Alcohol impairs protein synthesis for up to 36 hours post-consumption. Timing matters." },
  { category: "recovery", text: "Foam rolling before a session can improve range of motion. After a session it helps with soreness." },
  { category: "recovery", text: "Your muscles grow during rest, not during training. Training is just the signal. Recovery is the actual work." },
  { category: "recovery", text: "Poor sleep increases cortisol and decreases testosterone. Two days of bad sleep = measurable performance drop." },
  { category: "recovery", text: "Breathing exercises (4-7-8, box breathing) activate the parasympathetic nervous system and improve recovery." },
];

const CATEGORY_COLORS: Record<TipCategory, string> = {
  training: "#00e676",
  nutrition: "#ffab40",
  recovery: "#4fc3f7",
};

const CATEGORY_ICONS: Record<TipCategory, string> = {
  training: "zap",
  nutrition: "coffee",
  recovery: "moon",
};

export function getTodaysTip(): DailyTip {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return TIPS[dayIndex % TIPS.length];
}

export { CATEGORY_COLORS, CATEGORY_ICONS };
