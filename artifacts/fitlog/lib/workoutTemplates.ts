export type Equipment =
  | "none"
  | "dumbbells"
  | "barbell"
  | "bench"
  | "pullup_bar"
  | "resistance_bands"
  | "kettlebells"
  | "cable_machine"
  | "smith_machine"
  | "leg_press"
  | "treadmill"
  | "stationary_bike"
  | "rowing_machine"
  | "yoga_mat"
  | "jump_rope"
  | "tennis_racket"
  | "swimming_pool";

export type Goal =
  | "Lose weight"
  | "Build muscle"
  | "Get stronger"
  | "Stay active"
  | "Improve endurance"
  | "Improve flexibility";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest?: string;
  note?: string;
  alternatives?: string[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  difficulty: Difficulty;
  requiredEquipment: Equipment[];
  goals: Goal[];
  tags: string[];
  activityType: string;
  benefits: string[];
  exercises: Exercise[];
  whyGoodFor?: string;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // ── NO EQUIPMENT ─────────────────────────────────────────────────────────
  {
    id: "bw-fullbody-beginner",
    name: "Beginner Full Body Bodyweight",
    description: "A complete full-body workout using only your bodyweight — perfect to start building strength and fitness.",
    durationMinutes: 25,
    difficulty: "Beginner",
    requiredEquipment: [],
    goals: ["Stay active", "Lose weight"],
    tags: ["bodyweight", "full-body", "beginner", "no-equipment"],
    activityType: "gym",
    benefits: [
      "Builds foundational strength",
      "Improves coordination and balance",
      "No equipment required",
      "Scalable as you progress",
    ],
    exercises: [
      { name: "Jumping Jacks", duration: "60s", rest: "20s" },
      { name: "Push-Ups", sets: 3, reps: "8-10", rest: "45s", alternatives: ["Knee Push-Ups"] },
      { name: "Bodyweight Squat", sets: 3, reps: "12-15", rest: "45s" },
      { name: "Glute Bridge", sets: 3, reps: "12", rest: "30s" },
      { name: "Plank", sets: 3, duration: "20-30s", rest: "30s" },
      { name: "Mountain Climbers", sets: 3, reps: "10 each leg", rest: "40s" },
    ],
  },
  {
    id: "calisthenics-fundamentals",
    name: "Calisthenics Fundamentals",
    description: "Build real functional strength through bodyweight movement mastery.",
    durationMinutes: 35,
    difficulty: "Intermediate",
    requiredEquipment: [],
    goals: ["Build muscle", "Get stronger"],
    tags: ["calisthenics", "bodyweight", "strength"],
    activityType: "gym",
    benefits: [
      "Improves body control and coordination",
      "Builds functional strength",
      "Works without any equipment",
      "Scales to any fitness level",
    ],
    exercises: [
      { name: "Push-Up Variations", sets: 4, reps: "10-15", rest: "60s" },
      { name: "Pike Push-Up", sets: 3, reps: "8-10", rest: "60s" },
      { name: "Bodyweight Squat", sets: 4, reps: "15-20", rest: "45s" },
      { name: "Reverse Lunge", sets: 3, reps: "10 each leg", rest: "45s" },
      { name: "Plank to Downward Dog", sets: 3, reps: "10", rest: "40s" },
      { name: "Hollow Body Hold", sets: 3, duration: "20s", rest: "40s" },
      { name: "Superman Hold", sets: 3, reps: "10", rest: "30s" },
    ],
  },
  {
    id: "walking-fat-loss",
    name: "Walking Fat-Loss Plan",
    description: "A structured walking routine to maximise fat burning and daily activity.",
    durationMinutes: 45,
    difficulty: "Beginner",
    requiredEquipment: [],
    goals: ["Lose weight", "Stay active", "Improve endurance"],
    tags: ["walking", "fat-loss", "cardio", "low-impact"],
    activityType: "walking",
    benefits: [
      "Improves cardiovascular health",
      "Supports fat loss at a sustainable pace",
      "Zero impact on joints",
      "Great for active recovery",
    ],
    exercises: [
      { name: "Warm-up walk (easy pace)", duration: "5 min" },
      { name: "Brisk walk (fast pace)", duration: "30 min" },
      { name: "Incline walking if possible", duration: "5 min" },
      { name: "Cool-down easy walk", duration: "5 min" },
    ],
  },
  {
    id: "core-mobility",
    name: "Core + Mobility",
    description: "Strengthen your core and improve full-body flexibility in one session.",
    durationMinutes: 25,
    difficulty: "Beginner",
    requiredEquipment: ["yoga_mat"],
    goals: ["Stay active", "Improve flexibility"],
    tags: ["core", "mobility", "stretching", "beginner"],
    activityType: "yoga",
    benefits: [
      "Reduces risk of injury",
      "Improves posture and stability",
      "Loosens tight muscles",
      "Complements any other training",
    ],
    exercises: [
      { name: "Dead Bug", sets: 3, reps: "8 each side", rest: "30s" },
      { name: "Bird Dog", sets: 3, reps: "10 each side", rest: "30s" },
      { name: "Plank", sets: 3, duration: "30s", rest: "30s" },
      { name: "Hip Flexor Stretch", duration: "60s each side" },
      { name: "Thoracic Rotation", reps: "10 each side" },
      { name: "Cat-Cow", reps: "10 slow", rest: "0s" },
      { name: "Child's Pose", duration: "60s" },
    ],
  },
  {
    id: "jog-walk-intervals",
    name: "Jog/Walk Intervals",
    description: "Alternate between jogging and walking to build running fitness without burning out.",
    durationMinutes: 30,
    difficulty: "Beginner",
    requiredEquipment: [],
    goals: ["Lose weight", "Improve endurance", "Stay active"],
    tags: ["running", "intervals", "beginner", "cardio"],
    activityType: "running",
    benefits: [
      "Builds cardio capacity progressively",
      "Burns more calories than walking",
      "Easier than continuous running",
      "Improves running efficiency over time",
    ],
    exercises: [
      { name: "Warm-up walk", duration: "5 min" },
      { name: "Jog 1 min / Walk 2 min", reps: "×6 rounds" },
      { name: "Cool-down walk", duration: "5 min" },
    ],
  },
  {
    id: "yoga-recovery",
    name: "Yoga Recovery Session",
    description: "A calming yoga session to reduce muscle soreness and restore mobility.",
    durationMinutes: 30,
    difficulty: "Beginner",
    requiredEquipment: ["yoga_mat"],
    goals: ["Improve flexibility", "Stay active"],
    tags: ["yoga", "recovery", "flexibility", "mindfulness"],
    activityType: "yoga",
    benefits: [
      "Reduces muscle soreness",
      "Improves flexibility and range of motion",
      "Lowers stress",
      "Improves sleep quality",
    ],
    exercises: [
      { name: "Child's Pose", duration: "2 min" },
      { name: "Cat-Cow Flow", reps: "10 slow breaths" },
      { name: "Downward Dog", duration: "60s" },
      { name: "Low Lunge (each side)", duration: "60s" },
      { name: "Pigeon Pose (each side)", duration: "90s" },
      { name: "Seated Forward Fold", duration: "90s" },
      { name: "Supine Twist (each side)", duration: "60s" },
      { name: "Savasana", duration: "3 min" },
    ],
  },
  {
    id: "jump-rope-cardio",
    name: "Jump Rope Cardio Blast",
    description: "High-intensity jump rope intervals to torch calories fast.",
    durationMinutes: 20,
    difficulty: "Intermediate",
    requiredEquipment: ["jump_rope"],
    goals: ["Lose weight", "Improve endurance"],
    tags: ["cardio", "jump-rope", "hiit"],
    activityType: "other",
    benefits: [
      "Burns significant calories in a short time",
      "Improves coordination and agility",
      "Strengthens legs and core",
      "Elevates cardiovascular fitness",
    ],
    exercises: [
      { name: "Basic Jump", duration: "30s", rest: "30s", reps: "×5 rounds" },
      { name: "High Knees Jump", duration: "20s", rest: "40s", reps: "×4 rounds" },
      { name: "Alternating Foot Jump", duration: "30s", rest: "30s", reps: "×4 rounds" },
    ],
  },

  // ── DUMBBELLS ─────────────────────────────────────────────────────────────
  {
    id: "db-fullbody-beginner",
    name: "Dumbbell Full Body (Beginner)",
    description: "A simple but effective full-body dumbbell workout for those starting out.",
    durationMinutes: 35,
    difficulty: "Beginner",
    requiredEquipment: ["dumbbells"],
    goals: ["Build muscle", "Get stronger", "Stay active"],
    tags: ["dumbbells", "full-body", "beginner"],
    activityType: "gym",
    benefits: [
      "Builds total-body strength",
      "Teaches fundamental movement patterns",
      "Only requires dumbbells",
      "Great foundation for further progression",
    ],
    exercises: [
      { name: "Dumbbell Goblet Squat", sets: 3, reps: "12", rest: "60s" },
      { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "10", rest: "60s", alternatives: ["Bodyweight Hip Hinge"] },
      { name: "Dumbbell Floor Press", sets: 3, reps: "10", rest: "60s" },
      { name: "Dumbbell Bent-Over Row", sets: 3, reps: "10 each", rest: "60s" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10", rest: "60s" },
      { name: "Dumbbell Curl", sets: 3, reps: "12", rest: "45s" },
      { name: "Plank", sets: 3, duration: "30s", rest: "30s" },
    ],
  },
  {
    id: "db-upper-body",
    name: "Dumbbell Upper Body Strength",
    description: "Target chest, back, shoulders, and arms with a focused dumbbell session.",
    durationMinutes: 45,
    difficulty: "Intermediate",
    requiredEquipment: ["dumbbells"],
    goals: ["Build muscle", "Get stronger"],
    tags: ["dumbbells", "upper-body", "hypertrophy"],
    activityType: "gym",
    benefits: [
      "Builds upper-body strength and muscle",
      "Corrects imbalances with unilateral work",
      "Can be done at home or gym",
      "Progressive overload ready",
    ],
    exercises: [
      { name: "Dumbbell Bench Press", sets: 4, reps: "10-12", rest: "75s", alternatives: ["Dumbbell Floor Press"] },
      { name: "Dumbbell Incline Press", sets: 3, reps: "10", rest: "75s" },
      { name: "Dumbbell Bent-Over Row", sets: 4, reps: "10-12", rest: "75s" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10", rest: "60s" },
      { name: "Dumbbell Lateral Raise", sets: 3, reps: "12-15", rest: "45s" },
      { name: "Hammer Curl", sets: 3, reps: "12", rest: "45s" },
      { name: "Dumbbell Tricep Kickback", sets: 3, reps: "12", rest: "45s" },
    ],
  },
  {
    id: "db-lower-body",
    name: "Dumbbell Lower Body Strength",
    description: "Build strong legs and glutes with dumbbells.",
    durationMinutes: 40,
    difficulty: "Intermediate",
    requiredEquipment: ["dumbbells"],
    goals: ["Build muscle", "Get stronger", "Lose weight"],
    tags: ["dumbbells", "lower-body", "legs", "glutes"],
    activityType: "gym",
    benefits: [
      "Builds leg and glute strength",
      "Improves athletic performance",
      "Burns significant calories",
      "No barbell required",
    ],
    exercises: [
      { name: "Dumbbell Goblet Squat", sets: 4, reps: "12-15", rest: "75s" },
      { name: "Dumbbell Romanian Deadlift", sets: 4, reps: "10-12", rest: "75s" },
      { name: "Dumbbell Walking Lunge", sets: 3, reps: "10 each leg", rest: "60s" },
      { name: "Dumbbell Bulgarian Split Squat", sets: 3, reps: "8-10 each", rest: "75s" },
      { name: "Dumbbell Hip Thrust", sets: 3, reps: "12", rest: "60s" },
      { name: "Calf Raise (holding dumbbells)", sets: 3, reps: "15-20", rest: "45s" },
    ],
  },
  {
    id: "db-hypertrophy",
    name: "Dumbbell Hypertrophy Split",
    description: "A higher-volume dumbbell session focused on building muscle size.",
    durationMinutes: 55,
    difficulty: "Intermediate",
    requiredEquipment: ["dumbbells"],
    goals: ["Build muscle"],
    tags: ["dumbbells", "hypertrophy", "muscle-building"],
    activityType: "gym",
    benefits: [
      "Maximises muscle growth stimulation",
      "Higher volume for hypertrophy",
      "Works all major muscle groups",
      "Progressive and trackable",
    ],
    exercises: [
      { name: "Dumbbell Bench Press", sets: 4, reps: "10-12", rest: "90s" },
      { name: "Incline Dumbbell Fly", sets: 3, reps: "12-15", rest: "60s" },
      { name: "Dumbbell Row", sets: 4, reps: "10-12 each", rest: "90s" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", rest: "75s" },
      { name: "Dumbbell Squat", sets: 4, reps: "12-15", rest: "90s" },
      { name: "Romanian Deadlift", sets: 3, reps: "10-12", rest: "90s" },
      { name: "Bicep Curl", sets: 3, reps: "12-15", rest: "45s" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "12-15", rest: "45s" },
    ],
  },

  // ── BARBELL + BENCH ───────────────────────────────────────────────────────
  {
    id: "barbell-fullbody-strength",
    name: "Beginner Barbell Full Body",
    description: "The classic beginner strength programme — squat, press, deadlift, row.",
    durationMinutes: 50,
    difficulty: "Beginner",
    requiredEquipment: ["barbell", "bench"],
    goals: ["Get stronger", "Build muscle"],
    tags: ["barbell", "strength", "beginner", "full-body"],
    activityType: "gym",
    benefits: [
      "Fastest path to building real strength",
      "Compound movements recruit maximum muscle",
      "Simple and proven programme",
      "Improves bone density and metabolism",
    ],
    exercises: [
      { name: "Barbell Back Squat", sets: 3, reps: "5", rest: "3 min", alternatives: ["Goblet Squat"] },
      { name: "Barbell Bench Press", sets: 3, reps: "5", rest: "3 min", alternatives: ["Push-Ups"] },
      { name: "Barbell Deadlift", sets: 1, reps: "5", rest: "3 min", alternatives: ["Romanian Deadlift"] },
    ],
  },
  {
    id: "upper-lower-split",
    name: "Upper / Lower Split",
    description: "Train upper body and lower body on alternating days for balanced development.",
    durationMinutes: 60,
    difficulty: "Intermediate",
    requiredEquipment: ["barbell", "bench", "dumbbells"],
    goals: ["Build muscle", "Get stronger"],
    tags: ["barbell", "upper-lower", "split", "intermediate"],
    activityType: "gym",
    benefits: [
      "Efficient for building muscle across the whole body",
      "Allows adequate recovery per muscle group",
      "Flexible and easy to programme",
      "Great for 4-day training weeks",
    ],
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "8", rest: "3 min" },
      { name: "Romanian Deadlift", sets: 3, reps: "10", rest: "2 min" },
      { name: "Leg Press", sets: 3, reps: "12", rest: "90s", alternatives: ["Goblet Squat"] },
      { name: "Leg Curl", sets: 3, reps: "12", rest: "60s", alternatives: ["Nordic Curl"] },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    description: "Classic 3-way split for maximising muscle growth and recovery.",
    durationMinutes: 65,
    difficulty: "Intermediate",
    requiredEquipment: ["barbell", "bench", "dumbbells"],
    goals: ["Build muscle"],
    tags: ["barbell", "ppl", "split", "hypertrophy"],
    activityType: "gym",
    benefits: [
      "Optimal muscle recovery between sessions",
      "High weekly volume per muscle group",
      "Proven approach for muscle building",
      "Clear structure to follow",
    ],
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest: "3 min" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "90s" },
      { name: "Cable Fly / Dumbbell Fly", sets: 3, reps: "12-15", rest: "60s" },
      { name: "Overhead Press", sets: 4, reps: "8-10", rest: "2 min" },
      { name: "Lateral Raise", sets: 3, reps: "12-15", rest: "45s" },
      { name: "Tricep Pushdown", sets: 3, reps: "12-15", rest: "45s" },
    ],
  },
  {
    id: "strength-3day",
    name: "Strength-Focused 3-Day Plan",
    description: "Build raw strength on 3 days per week with progressive overload.",
    durationMinutes: 60,
    difficulty: "Intermediate",
    requiredEquipment: ["barbell", "bench"],
    goals: ["Get stronger"],
    tags: ["barbell", "strength", "3-day"],
    activityType: "gym",
    benefits: [
      "Builds maximum strength efficiently",
      "Adequate recovery with 3 training days",
      "Focuses on the most important compound lifts",
      "Simple to track and progress",
    ],
    exercises: [
      { name: "Barbell Squat", sets: 5, reps: "5", rest: "3-5 min" },
      { name: "Bench Press", sets: 5, reps: "5", rest: "3-5 min" },
      { name: "Barbell Row", sets: 5, reps: "5", rest: "3-5 min" },
      { name: "Overhead Press", sets: 3, reps: "5", rest: "3 min" },
      { name: "Deadlift", sets: 1, reps: "5", rest: "4 min" },
    ],
  },

  // ── GYM / MIXED ──────────────────────────────────────────────────────────
  {
    id: "gym-muscle-building",
    name: "Muscle-Building Gym Split",
    description: "A full gym programme designed to maximise hypertrophy across all muscle groups.",
    durationMinutes: 65,
    difficulty: "Intermediate",
    requiredEquipment: ["barbell", "bench", "dumbbells", "cable_machine"],
    goals: ["Build muscle"],
    tags: ["gym", "hypertrophy", "advanced"],
    activityType: "gym",
    benefits: [
      "Uses best equipment for muscle growth",
      "High volume for maximum stimulus",
      "Covers all major muscle groups",
      "Includes isolation and compound work",
    ],
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "8-10", rest: "3 min" },
      { name: "Leg Press", sets: 3, reps: "12-15", rest: "2 min" },
      { name: "Bench Press", sets: 4, reps: "8-10", rest: "3 min" },
      { name: "Cable Row", sets: 4, reps: "10-12", rest: "90s" },
      { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: "75s", alternatives: ["Pull-Up"] },
      { name: "Shoulder Press", sets: 3, reps: "10-12", rest: "90s" },
      { name: "Cable Curl", sets: 3, reps: "12-15", rest: "45s" },
      { name: "Tricep Pushdown", sets: 3, reps: "12-15", rest: "45s" },
    ],
  },
  {
    id: "fat-loss-hybrid",
    name: "Fat-Loss Hybrid Plan",
    description: "Combine resistance training and cardio circuits to maximise calorie burn.",
    durationMinutes: 50,
    difficulty: "Intermediate",
    requiredEquipment: ["dumbbells"],
    goals: ["Lose weight"],
    tags: ["fat-loss", "hiit", "circuit", "cardio"],
    activityType: "gym",
    benefits: [
      "Burns more calories than cardio alone",
      "Maintains and builds muscle while losing fat",
      "Keeps heart rate elevated for metabolic effect",
      "Time-efficient",
    ],
    exercises: [
      { name: "Dumbbell Squat to Press", sets: 4, reps: "12", rest: "45s" },
      { name: "Push-Up", sets: 4, reps: "12-15", rest: "30s" },
      { name: "Dumbbell Row", sets: 4, reps: "12 each", rest: "45s" },
      { name: "Reverse Lunge", sets: 3, reps: "10 each", rest: "45s" },
      { name: "Burpee", sets: 3, reps: "10", rest: "60s" },
      { name: "Mountain Climbers", sets: 3, duration: "30s", rest: "30s" },
    ],
  },
  {
    id: "endurance-strength",
    name: "Endurance + Strength Plan",
    description: "Build cardiovascular fitness alongside functional strength.",
    durationMinutes: 55,
    difficulty: "Intermediate",
    requiredEquipment: ["dumbbells"],
    goals: ["Improve endurance", "Build muscle"],
    tags: ["endurance", "strength", "hybrid"],
    activityType: "gym",
    benefits: [
      "Improves both strength and aerobic capacity",
      "Great for overall fitness",
      "Burns significant calories",
      "Supports athletic performance",
    ],
    exercises: [
      { name: "5-min light jog or jump rope warm-up", duration: "5 min" },
      { name: "Dumbbell Circuit (squat, press, row)", sets: 4, reps: "10 each", rest: "60s" },
      { name: "Push-Ups", sets: 3, reps: "15", rest: "45s" },
      { name: "Plank", sets: 3, duration: "30s", rest: "30s" },
      { name: "10-min steady state cardio", duration: "10 min" },
    ],
  },
  {
    id: "athletic-conditioning",
    name: "Athletic Conditioning Week",
    description: "Sport-inspired conditioning for agility, power, and endurance.",
    durationMinutes: 50,
    difficulty: "Advanced",
    requiredEquipment: ["dumbbells"],
    goals: ["Stay active", "Improve endurance"],
    tags: ["athletic", "conditioning", "power"],
    activityType: "gym",
    benefits: [
      "Develops explosive power and agility",
      "Improves reaction time and coordination",
      "Boosts cardiovascular fitness",
      "Great for sport-specific performance",
    ],
    exercises: [
      { name: "Box Jump / Squat Jump", sets: 4, reps: "6", rest: "90s" },
      { name: "Medicine Ball Slam / Burpee", sets: 3, reps: "8", rest: "60s" },
      { name: "Lateral Shuffle", duration: "30s", sets: 3, rest: "30s" },
      { name: "Dumbbell Clean", sets: 3, reps: "6", rest: "90s" },
      { name: "Sprint Intervals (20s on / 40s off)", reps: "×6 rounds" },
    ],
  },

  // ── PULLUP BAR EXTRAS ─────────────────────────────────────────────────────
  {
    id: "pullup-bar-upper",
    name: "Pull-Up Bar Upper Body",
    description: "Build a strong back and arms using just a pull-up bar.",
    durationMinutes: 30,
    difficulty: "Intermediate",
    requiredEquipment: ["pullup_bar"],
    goals: ["Build muscle", "Get stronger"],
    tags: ["pull-up", "bodyweight", "upper-body"],
    activityType: "gym",
    benefits: [
      "Builds a strong back and biceps",
      "Develops grip strength",
      "Requires only a pull-up bar",
      "Transfers to many athletic skills",
    ],
    exercises: [
      { name: "Pull-Up", sets: 4, reps: "5-8", rest: "2 min", alternatives: ["Negative Pull-Up", "Band-Assisted Pull-Up"] },
      { name: "Chin-Up", sets: 3, reps: "5-8", rest: "2 min" },
      { name: "Hanging Leg Raise", sets: 3, reps: "10", rest: "60s" },
      { name: "Dead Hang", sets: 3, duration: "20-30s", rest: "60s" },
      { name: "Push-Up", sets: 4, reps: "12-15", rest: "60s" },
    ],
  },

  // ── RESISTANCE BANDS ─────────────────────────────────────────────────────
  {
    id: "resistance-bands-fullbody",
    name: "Resistance Band Full Body",
    description: "Effective full-body strength training using resistance bands.",
    durationMinutes: 35,
    difficulty: "Beginner",
    requiredEquipment: ["resistance_bands"],
    goals: ["Build muscle", "Stay active"],
    tags: ["bands", "full-body", "home"],
    activityType: "gym",
    benefits: [
      "Low-cost home workout option",
      "Joint-friendly resistance",
      "Builds muscle with progressive tension",
      "Portable and versatile",
    ],
    exercises: [
      { name: "Band Squat", sets: 3, reps: "15", rest: "45s" },
      { name: "Band Pull-Apart", sets: 3, reps: "15", rest: "30s" },
      { name: "Band Row", sets: 3, reps: "12", rest: "45s" },
      { name: "Band Chest Press", sets: 3, reps: "12", rest: "45s" },
      { name: "Band Bicep Curl", sets: 3, reps: "12", rest: "40s" },
      { name: "Band Tricep Pushdown", sets: 3, reps: "12", rest: "40s" },
    ],
  },

  // ── SPORT SPECIFIC ────────────────────────────────────────────────────────
  {
    id: "tennis-fitness",
    name: "Tennis Fitness Session",
    description: "A dedicated tennis hitting session plus on-court drills.",
    durationMinutes: 60,
    difficulty: "Intermediate",
    requiredEquipment: ["tennis_racket"],
    goals: ["Stay active", "Improve endurance"],
    tags: ["tennis", "sport", "cardio", "agility"],
    activityType: "tennis",
    benefits: [
      "Improves agility and reaction speed",
      "Great aerobic workout",
      "Improves hand-eye coordination",
      "Competitive and social",
    ],
    exercises: [
      { name: "Warm-up rally / groundstrokes", duration: "10 min" },
      { name: "Cross-court forehands", duration: "10 min" },
      { name: "Cross-court backhands", duration: "10 min" },
      { name: "Net approach drills", duration: "10 min" },
      { name: "Points/games", duration: "20 min" },
    ],
  },
  {
    id: "swim-endurance",
    name: "Swimming Endurance Session",
    description: "A structured swim set for building aerobic capacity.",
    durationMinutes: 45,
    difficulty: "Intermediate",
    requiredEquipment: ["swimming_pool"],
    goals: ["Improve endurance", "Stay active"],
    tags: ["swimming", "endurance", "cardio"],
    activityType: "swimming",
    benefits: [
      "Full-body conditioning",
      "Zero impact on joints",
      "Builds lung capacity",
      "Great for recovery and endurance",
    ],
    exercises: [
      { name: "Warm-up easy swim", duration: "200m easy" },
      { name: "Freestyle x4 lengths", reps: "×8", rest: "20s between" },
      { name: "Kick drills", reps: "4 lengths" },
      { name: "Pull drills (buoy)", reps: "4 lengths" },
      { name: "Cool-down backstroke", duration: "200m easy" },
    ],
  },
  {
    id: "cycling-endurance",
    name: "Cycling Endurance Ride",
    description: "Build cycling fitness with a structured steady-state ride.",
    durationMinutes: 60,
    difficulty: "Intermediate",
    requiredEquipment: ["stationary_bike"],
    goals: ["Improve endurance", "Lose weight"],
    tags: ["cycling", "cardio", "endurance"],
    activityType: "cycling",
    benefits: [
      "Effective cardiovascular workout",
      "Lower impact than running",
      "Improves leg endurance",
      "Great calorie burner",
    ],
    exercises: [
      { name: "Warm-up easy spin", duration: "10 min" },
      { name: "Steady-state ride (moderate effort)", duration: "40 min" },
      { name: "Cool-down easy spin", duration: "10 min" },
    ],
  },

  // ── KETTLEBELL ────────────────────────────────────────────────────────────
  {
    id: "kettlebell-hiit",
    name: "Kettlebell HIIT",
    description: "High-intensity kettlebell circuits to build strength and burn fat.",
    durationMinutes: 35,
    difficulty: "Intermediate",
    requiredEquipment: ["kettlebells"],
    goals: ["Lose weight", "Build muscle"],
    tags: ["kettlebell", "hiit", "strength", "fat-loss"],
    activityType: "gym",
    benefits: [
      "Burns high calories in short sessions",
      "Builds functional full-body strength",
      "Improves power and conditioning",
      "Minimal equipment needed",
    ],
    exercises: [
      { name: "Kettlebell Swing", sets: 4, reps: "15-20", rest: "60s" },
      { name: "Goblet Squat", sets: 3, reps: "12", rest: "60s" },
      { name: "Kettlebell Clean & Press", sets: 3, reps: "6 each", rest: "75s" },
      { name: "Kettlebell Row", sets: 3, reps: "10 each", rest: "60s" },
      { name: "Kettlebell Deadlift", sets: 3, reps: "10", rest: "60s" },
    ],
  },
];

export function getTemplateById(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((t) => t.id === id);
}
