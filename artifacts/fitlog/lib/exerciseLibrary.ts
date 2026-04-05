import type { Equipment } from "./workoutTemplates";

export type ExerciseCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "abs"
  | "forearms"
  | "cardio"
  | "bodyweight";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: Equipment[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  instructions: string[];
  commonMistakes: string[];
  animationPlaceholder: string;
}

export const EXERCISE_CATEGORIES: { id: ExerciseCategory; label: string; icon: string }[] = [
  { id: "chest", label: "Chest", icon: "shield" },
  { id: "back", label: "Back", icon: "layers" },
  { id: "shoulders", label: "Shoulders", icon: "wind" },
  { id: "biceps", label: "Biceps", icon: "zap" },
  { id: "triceps", label: "Triceps", icon: "minus" },
  { id: "legs", label: "Legs", icon: "activity" },
  { id: "glutes", label: "Glutes", icon: "anchor" },
  { id: "abs", label: "Abs", icon: "circle" },
  { id: "forearms", label: "Forearms", icon: "tool" },
  { id: "cardio", label: "Cardio", icon: "heart" },
  { id: "bodyweight", label: "Bodyweight", icon: "user" },
];

export const EXERCISES: Exercise[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CHEST (25)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "barbell-bench-press", name: "Barbell Bench Press", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "bench-press",
    instructions: ["Lie flat on the bench with feet planted firmly on the floor", "Grip the bar slightly wider than shoulder width", "Unrack the bar and lower it to your mid-chest with control", "Press the bar back up to full lockout, squeezing your chest"],
    commonMistakes: ["Bouncing the bar off the chest", "Flaring elbows to 90 degrees", "Lifting hips off the bench", "Not retracting shoulder blades"],
  },
  {
    id: "incline-barbell-press", name: "Incline Barbell Press", category: "chest",
    primaryMuscle: "Upper Pectorals", secondaryMuscles: ["Front Deltoids", "Triceps"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "incline-bench-press",
    instructions: ["Set the bench to 30–45 degrees", "Grip the bar slightly wider than shoulder width", "Lower the bar to your upper chest just below the collarbone", "Press up to full extension"],
    commonMistakes: ["Setting the incline too steep (becomes a shoulder press)", "Not controlling the descent", "Losing upper back tightness"],
  },
  {
    id: "dumbbell-bench-press", name: "Dumbbell Bench Press", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "db-bench-press",
    instructions: ["Lie flat holding dumbbells at chest level with palms facing forward", "Press both dumbbells up until arms are fully extended", "Lower slowly to chest level with elbows at 45 degrees", "Squeeze chest at the top of each rep"],
    commonMistakes: ["Dumbbells drifting too far apart at the bottom", "Not keeping wrists straight", "Using momentum instead of control"],
  },
  {
    id: "incline-dumbbell-press", name: "Incline Dumbbell Press", category: "chest",
    primaryMuscle: "Upper Pectorals", secondaryMuscles: ["Front Deltoids", "Triceps"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "incline-db-press",
    instructions: ["Set the bench to 30–45 degrees", "Press dumbbells from shoulder level to full extension", "Lower with control, feeling a stretch in the upper chest", "Keep shoulder blades retracted throughout"],
    commonMistakes: ["Angle too steep", "Arching lower back excessively", "Not getting a full stretch at the bottom"],
  },
  {
    id: "dumbbell-fly", name: "Dumbbell Fly", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Front Deltoids"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "db-fly",
    instructions: ["Lie flat with dumbbells held above your chest, palms facing each other", "With a slight bend in elbows, lower the weights out to the sides in an arc", "Stop when you feel a good stretch in your chest", "Bring the weights back up in the same arc, squeezing your chest"],
    commonMistakes: ["Going too heavy and losing the arc motion", "Straightening elbows completely (stresses the joint)", "Going too deep past the stretch point"],
  },
  {
    id: "cable-crossover", name: "Cable Crossover", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Front Deltoids"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "cable-crossover",
    instructions: ["Set cables at shoulder height or above", "Step forward with one foot for balance", "Bring handles together in front of your chest with a hugging motion", "Slowly return to the start, feeling the stretch"],
    commonMistakes: ["Using too much weight and losing form", "Not controlling the eccentric", "Shrugging shoulders up"],
  },
  {
    id: "low-cable-fly", name: "Low Cable Fly", category: "chest",
    primaryMuscle: "Upper Pectorals", secondaryMuscles: ["Front Deltoids"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "low-cable-fly",
    instructions: ["Set cables at the lowest position", "Grip handles and step forward", "Bring handles upward and together in front of your upper chest", "Lower with control"],
    commonMistakes: ["Using momentum", "Not squeezing at the top", "Rounding shoulders forward"],
  },
  {
    id: "decline-bench-press", name: "Decline Bench Press", category: "chest",
    primaryMuscle: "Lower Pectorals", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "decline-bench",
    instructions: ["Secure your legs on the decline bench", "Unrack the bar and lower to your lower chest", "Press the bar up to full lockout", "Keep core braced throughout"],
    commonMistakes: ["Letting the bar drift toward the neck", "Not securing legs properly", "Using too much weight without a spotter"],
  },
  {
    id: "chest-dips", name: "Chest Dips", category: "chest",
    primaryMuscle: "Lower Pectorals", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["pullup_bar"], difficulty: "Intermediate", animationPlaceholder: "chest-dips",
    instructions: ["Grip parallel bars and support your body weight", "Lean forward slightly to emphasise the chest", "Lower yourself until elbows are at 90 degrees", "Press back up to full extension"],
    commonMistakes: ["Staying too upright (shifts focus to triceps)", "Going too deep and stressing shoulders", "Swinging or kipping"],
  },
  {
    id: "machine-chest-press", name: "Machine Chest Press", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "machine-chest-press",
    instructions: ["Adjust the seat so handles align with mid-chest", "Grip handles and press forward to full extension", "Slowly return to the start without letting the weight stack touch", "Keep your back flat against the pad"],
    commonMistakes: ["Seat too high or low", "Not getting a full range of motion", "Letting the weight crash at the bottom"],
  },
  {
    id: "push-up", name: "Push-Up", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Triceps", "Core", "Front Deltoids"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "push-up",
    instructions: ["Start in a plank position with hands slightly wider than shoulders", "Lower your chest to the floor while keeping body straight", "Push back up to full arm extension", "Keep core tight throughout the movement"],
    commonMistakes: ["Hips sagging toward the floor", "Elbows flaring out to 90 degrees", "Not going to full depth", "Head dropping or looking up"],
  },
  {
    id: "decline-push-up", name: "Decline Push-Up", category: "chest",
    primaryMuscle: "Upper Pectorals", secondaryMuscles: ["Triceps", "Core", "Front Deltoids"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "decline-push-up",
    instructions: ["Place feet on a bench or elevated surface", "Hands on the floor slightly wider than shoulders", "Lower chest toward the floor", "Press back up with emphasis on the upper chest"],
    commonMistakes: ["Hips too high creating a pike", "Not controlling the descent", "Surface too high for current strength"],
  },
  {
    id: "incline-push-up", name: "Incline Push-Up", category: "chest",
    primaryMuscle: "Lower Pectorals", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "incline-push-up",
    instructions: ["Place hands on a bench or elevated surface", "Body forms a straight line from head to heels", "Lower chest to the bench edge", "Press back up to full arm extension"],
    commonMistakes: ["Flaring elbows too wide", "Not maintaining a straight body", "Choosing a surface that's too low for your level"],
  },
  {
    id: "smith-machine-press", name: "Smith Machine Bench Press", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["smith_machine", "bench"], difficulty: "Beginner", animationPlaceholder: "smith-bench",
    instructions: ["Position the bench so the bar path aligns with mid-chest", "Unrack, lower the bar to your chest with control", "Press up to full lockout", "Rotate wrists to re-rack the bar"],
    commonMistakes: ["Bench not positioned correctly for natural bar path", "Over-relying on the guided track", "Going too heavy without progression"],
  },
  {
    id: "landmine-press", name: "Landmine Press", category: "chest",
    primaryMuscle: "Upper Pectorals", secondaryMuscles: ["Front Deltoids", "Triceps", "Core"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "landmine-press",
    instructions: ["Wedge one end of a barbell into a corner or landmine attachment", "Hold the other end at shoulder height with one hand", "Press the bar forward and upward", "Lower with control and repeat"],
    commonMistakes: ["Pressing too far to one side", "Not bracing the core", "Leaning too far forward"],
  },
  {
    id: "pec-deck", name: "Pec Deck Machine", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Front Deltoids"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "pec-deck",
    instructions: ["Adjust seat height so handles are at chest level", "Place forearms against pads", "Bring pads together in front of your chest", "Slowly return to start with control"],
    commonMistakes: ["Using too much weight", "Not getting a full stretch", "Rounding shoulders forward"],
  },
  {
    id: "svend-press", name: "Svend Press", category: "chest",
    primaryMuscle: "Inner Pectorals", secondaryMuscles: ["Front Deltoids"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "svend-press",
    instructions: ["Hold a weight plate between your palms at chest height", "Squeeze the plate hard with palms pressing inward", "Extend arms forward while maintaining the squeeze", "Return to chest and repeat"],
    commonMistakes: ["Not squeezing hard enough", "Letting shoulders shrug up", "Using too heavy a plate"],
  },
  {
    id: "floor-press", name: "Barbell Floor Press", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "floor-press",
    instructions: ["Lie on the floor under a barbell rack or use pins", "Grip the bar at bench press width", "Lower until triceps touch the floor, pause briefly", "Press up to full lockout"],
    commonMistakes: ["Bouncing triceps off the floor", "Grip too wide for floor work", "Not pausing at the bottom"],
  },
  {
    id: "close-grip-bench", name: "Close-Grip Bench Press", category: "chest",
    primaryMuscle: "Inner Pectorals", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "close-grip-bench",
    instructions: ["Lie on a flat bench with a shoulder-width or slightly narrower grip", "Lower bar to the lower chest with elbows tucked", "Press up to full lockout", "Maintain shoulder blade retraction"],
    commonMistakes: ["Grip too narrow (stresses wrists)", "Elbows flaring out", "Lifting hips off the bench"],
  },
  {
    id: "dumbbell-pullover", name: "Dumbbell Pullover", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Lats", "Triceps"],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "db-pullover",
    instructions: ["Lie across a bench with only your upper back supported", "Hold one dumbbell overhead with both hands", "Lower the dumbbell behind your head in an arc", "Pull it back over your chest, squeezing pecs"],
    commonMistakes: ["Bending elbows too much (turns into a skull crusher)", "Going too heavy", "Not controlling the stretch"],
  },
  {
    id: "hex-press", name: "Hex Press", category: "chest",
    primaryMuscle: "Inner Pectorals", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "hex-press",
    instructions: ["Lie flat holding two dumbbells pressed together above your chest", "Keep the dumbbells touching throughout the movement", "Lower to your chest while squeezing them together", "Press back up maintaining the squeeze"],
    commonMistakes: ["Letting dumbbells drift apart", "Not maintaining constant tension", "Going too heavy"],
  },
  {
    id: "incline-cable-fly", name: "Incline Cable Fly", category: "chest",
    primaryMuscle: "Upper Pectorals", secondaryMuscles: ["Front Deltoids"],
    equipment: ["cable_machine", "bench"], difficulty: "Intermediate", animationPlaceholder: "incline-cable-fly",
    instructions: ["Set an incline bench between two low cable pulleys", "Grip the handles and lie back", "Bring handles together above your upper chest in an arc", "Lower with control, feeling the stretch"],
    commonMistakes: ["Bench angle too steep", "Using too much weight", "Bending elbows excessively"],
  },
  {
    id: "wide-push-up", name: "Wide Push-Up", category: "chest",
    primaryMuscle: "Pectoralis Major", secondaryMuscles: ["Front Deltoids", "Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "wide-push-up",
    instructions: ["Place hands wider than shoulder width in push-up position", "Lower chest to the floor with elbows tracking outward", "Push back up to full extension", "Keep core braced throughout"],
    commonMistakes: ["Hands too far forward", "Hips sagging", "Not getting full range of motion"],
  },
  {
    id: "diamond-push-up", name: "Diamond Push-Up", category: "chest",
    primaryMuscle: "Inner Pectorals", secondaryMuscles: ["Triceps", "Front Deltoids"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "diamond-push-up",
    instructions: ["Place hands close together forming a diamond shape with thumbs and index fingers", "Lower chest toward your hands", "Press back up to full extension", "Keep elbows relatively close to body"],
    commonMistakes: ["Elbows flaring too wide", "Hips sagging or piking", "Not going deep enough"],
  },
  {
    id: "plate-squeeze-press", name: "Plate Squeeze Press", category: "chest",
    primaryMuscle: "Inner Pectorals", secondaryMuscles: ["Front Deltoids", "Triceps"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "plate-squeeze-press",
    instructions: ["Hold a weight plate between both palms at chest height", "Squeeze the plate as hard as possible", "Press the plate forward to arm extension while squeezing", "Return to chest and repeat"],
    commonMistakes: ["Not squeezing hard enough throughout", "Shrugging shoulders", "Moving too fast"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BACK (25)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "pull-up", name: "Pull-Up", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Biceps", "Rhomboids", "Rear Deltoids"],
    equipment: ["pullup_bar"], difficulty: "Intermediate", animationPlaceholder: "pull-up",
    instructions: ["Hang from a bar with an overhand grip slightly wider than shoulders", "Pull your chest toward the bar by driving elbows down and back", "Chin should clear the bar at the top", "Lower with full control to a dead hang"],
    commonMistakes: ["Kipping or swinging", "Not going to full extension at bottom", "Half reps — chin doesn't clear bar", "Shrugging shoulders at the top"],
  },
  {
    id: "chin-up", name: "Chin-Up", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Biceps", "Rhomboids"],
    equipment: ["pullup_bar"], difficulty: "Intermediate", animationPlaceholder: "chin-up",
    instructions: ["Grip the bar with palms facing you, shoulder-width apart", "Pull yourself up until chin clears the bar", "Squeeze your back and biceps at the top", "Lower with control to full arm extension"],
    commonMistakes: ["Using momentum instead of muscle", "Partial reps", "Crossing legs and swinging"],
  },
  {
    id: "barbell-row", name: "Barbell Bent-Over Row", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Rhomboids", "Traps", "Biceps", "Rear Deltoids"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "barbell-row",
    instructions: ["Hinge forward at hips to about 45 degrees with a flat back", "Grip the bar just outside your knees", "Pull the bar to your lower chest/upper abdomen", "Lower the bar with control, feeling the stretch"],
    commonMistakes: ["Rounding the lower back", "Using body momentum to swing the weight", "Not pulling to the body", "Torso rising up during the pull"],
  },
  {
    id: "single-arm-db-row", name: "Single-Arm Dumbbell Row", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Rhomboids", "Biceps", "Rear Deltoids"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "db-row",
    instructions: ["Place one hand and knee on a bench for support", "Hold a dumbbell in the opposite hand, arm hanging straight", "Row the dumbbell up to your hip, leading with the elbow", "Lower with control and repeat all reps before switching sides"],
    commonMistakes: ["Rotating the torso instead of pulling straight", "Not getting a full stretch at the bottom", "Rowing to the shoulder instead of the hip"],
  },
  {
    id: "lat-pulldown", name: "Lat Pulldown", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Biceps", "Rhomboids", "Rear Deltoids"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "lat-pulldown",
    instructions: ["Sit with thighs under the pads, grip the bar wider than shoulders", "Lean back slightly and pull the bar to your upper chest", "Squeeze shoulder blades together at the bottom", "Slowly return to full stretch at the top"],
    commonMistakes: ["Pulling behind the neck", "Leaning too far back", "Using momentum to yank the weight", "Not getting a full stretch at the top"],
  },
  {
    id: "deadlift", name: "Barbell Deadlift", category: "back",
    primaryMuscle: "Erector Spinae", secondaryMuscles: ["Glutes", "Hamstrings", "Traps", "Lats", "Core"],
    equipment: ["barbell"], difficulty: "Advanced", animationPlaceholder: "deadlift",
    instructions: ["Stand with feet hip-width, bar over mid-foot", "Hinge down and grip the bar just outside your legs", "Brace your core, flatten your back, and push the floor away", "Stand up fully, locking out hips and squeezing glutes"],
    commonMistakes: ["Rounding the lower back", "Bar drifting away from the body", "Jerking the bar off the floor", "Hyperextending at the top"],
  },
  {
    id: "seated-cable-row", name: "Seated Cable Row", category: "back",
    primaryMuscle: "Rhomboids", secondaryMuscles: ["Lats", "Traps", "Biceps", "Rear Deltoids"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "seated-cable-row",
    instructions: ["Sit upright with feet on the platform, slight knee bend", "Grip the handle and pull it to your abdomen", "Squeeze shoulder blades together at full contraction", "Return to the stretch position with control"],
    commonMistakes: ["Leaning too far forward and back (rowing with momentum)", "Not squeezing the back", "Rounding shoulders forward"],
  },
  {
    id: "t-bar-row", name: "T-Bar Row", category: "back",
    primaryMuscle: "Middle Back", secondaryMuscles: ["Lats", "Rhomboids", "Biceps"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "t-bar-row",
    instructions: ["Straddle the bar and grip the handle or V-grip attachment", "Hinge forward at the hips with a flat back", "Pull the weight to your chest", "Lower with control"],
    commonMistakes: ["Rounding the back", "Using too much body English", "Standing too upright"],
  },
  {
    id: "face-pull", name: "Face Pull", category: "back",
    primaryMuscle: "Rear Deltoids", secondaryMuscles: ["Rhomboids", "External Rotators", "Traps"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "face-pull",
    instructions: ["Set cable at face height with a rope attachment", "Pull the rope toward your face with elbows high", "Externally rotate at the end so knuckles point to the ceiling", "Slowly return to start"],
    commonMistakes: ["Elbows dropping below shoulder level", "Using too much weight", "Not externally rotating at the end"],
  },
  {
    id: "pendlay-row", name: "Pendlay Row", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Rhomboids", "Traps", "Biceps"],
    equipment: ["barbell"], difficulty: "Advanced", animationPlaceholder: "pendlay-row",
    instructions: ["Set up with a flat back, torso parallel to the floor", "Grip the bar and row explosively to your lower chest", "Lower the bar back to the floor with control", "Reset between each rep"],
    commonMistakes: ["Torso not parallel enough", "Not resetting on the floor", "Using too much body momentum"],
  },
  {
    id: "cable-pullover", name: "Cable Pullover", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Teres Major", "Chest"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "cable-pullover",
    instructions: ["Stand facing a high cable with a straight bar attachment", "With slightly bent arms, pull the bar down in an arc to your thighs", "Squeeze your lats at the bottom", "Return to start with control"],
    commonMistakes: ["Bending elbows too much", "Standing too close to the machine", "Using momentum"],
  },
  {
    id: "inverted-row", name: "Inverted Row", category: "back",
    primaryMuscle: "Rhomboids", secondaryMuscles: ["Lats", "Biceps", "Rear Deltoids"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "inverted-row",
    instructions: ["Set a bar at waist height and hang underneath it", "Body straight from head to heels", "Pull your chest to the bar", "Lower with control to full arm extension"],
    commonMistakes: ["Hips sagging", "Not pulling chest all the way to bar", "Neck craning forward"],
  },
  {
    id: "rack-pull", name: "Rack Pull", category: "back",
    primaryMuscle: "Erector Spinae", secondaryMuscles: ["Traps", "Glutes", "Hamstrings"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "rack-pull",
    instructions: ["Set the bar at knee height on safety pins", "Grip the bar and brace your core", "Drive hips forward to stand up fully", "Lower the bar back to the pins with control"],
    commonMistakes: ["Rounding the back", "Not bracing properly", "Hyperextending at the top"],
  },
  {
    id: "meadows-row", name: "Meadows Row", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Rear Deltoids", "Rhomboids"],
    equipment: ["barbell"], difficulty: "Advanced", animationPlaceholder: "meadows-row",
    instructions: ["Stand perpendicular to a landmine barbell", "Grip the end of the bar with an overhand grip", "Row the bar up to your hip", "Lower with control and repeat"],
    commonMistakes: ["Not getting enough hip hinge", "Rotating the torso", "Shrugging the shoulder"],
  },
  {
    id: "close-grip-pulldown", name: "Close-Grip Lat Pulldown", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Biceps", "Rhomboids"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "close-grip-pulldown",
    instructions: ["Attach a V-bar or close-grip handle to the cable", "Pull the handle to your upper chest", "Squeeze the lats at the bottom", "Return to full stretch with control"],
    commonMistakes: ["Leaning too far back", "Not getting a full stretch", "Using momentum"],
  },
  {
    id: "chest-supported-row", name: "Chest-Supported Dumbbell Row", category: "back",
    primaryMuscle: "Rhomboids", secondaryMuscles: ["Lats", "Rear Deltoids", "Biceps"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "chest-supported-row",
    instructions: ["Set an incline bench to about 45 degrees", "Lie face down with chest on the bench, holding dumbbells", "Row both dumbbells up, squeezing shoulder blades together", "Lower with control"],
    commonMistakes: ["Lifting chest off the bench", "Not getting a full contraction", "Rushing the movement"],
  },
  {
    id: "straight-arm-pulldown", name: "Straight-Arm Pulldown", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Teres Major"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "straight-arm-pulldown",
    instructions: ["Stand facing a high cable with a straight bar", "Keep arms straight with a slight elbow bend", "Pull the bar down to your thighs in an arc", "Slowly return to the start"],
    commonMistakes: ["Bending elbows too much", "Using body momentum", "Not squeezing lats at the bottom"],
  },
  {
    id: "kroc-row", name: "Kroc Row", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Rhomboids", "Biceps", "Forearms"],
    equipment: ["dumbbells"], difficulty: "Advanced", animationPlaceholder: "kroc-row",
    instructions: ["Use a heavy dumbbell with one hand braced on a surface", "Row the dumbbell explosively to your hip", "Use some controlled body English for heavier weights", "High reps — aim for 15–25 per set"],
    commonMistakes: ["Too much swing with light weights", "Not using heavy enough weight", "Poor bracing"],
  },
  {
    id: "reverse-grip-row", name: "Reverse-Grip Barbell Row", category: "back",
    primaryMuscle: "Lower Lats", secondaryMuscles: ["Biceps", "Rhomboids"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "reverse-grip-row",
    instructions: ["Grip the bar underhand at shoulder width", "Hinge at hips with a flat back", "Row the bar to your lower abdomen", "Lower with control"],
    commonMistakes: ["Rounding the lower back", "Grip too wide", "Standing too upright"],
  },
  {
    id: "neutral-grip-pulldown", name: "Neutral-Grip Pulldown", category: "back",
    primaryMuscle: "Latissimus Dorsi", secondaryMuscles: ["Biceps", "Brachialis"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "neutral-grip-pulldown",
    instructions: ["Use a neutral-grip (palms facing) handle", "Pull down to your upper chest", "Squeeze the lats at the bottom", "Return to full stretch"],
    commonMistakes: ["Using too much body momentum", "Not stretching fully at the top", "Going too heavy"],
  },
  {
    id: "seal-row", name: "Seal Row", category: "back",
    primaryMuscle: "Rhomboids", secondaryMuscles: ["Lats", "Rear Deltoids"],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "seal-row",
    instructions: ["Lie face down on a high bench so arms hang freely", "Row dumbbells up, squeezing shoulder blades", "Hold the contraction for a second", "Lower with control"],
    commonMistakes: ["Bench too low", "Not getting a full squeeze", "Using momentum"],
  },
  {
    id: "banded-pull-apart", name: "Band Pull-Apart", category: "back",
    primaryMuscle: "Rear Deltoids", secondaryMuscles: ["Rhomboids", "Traps"],
    equipment: ["resistance_bands"], difficulty: "Beginner", animationPlaceholder: "band-pull-apart",
    instructions: ["Hold a band at shoulder height with arms extended", "Pull the band apart by squeezing your shoulder blades together", "Pause at full contraction", "Return to start with control"],
    commonMistakes: ["Using a band that's too heavy", "Shrugging shoulders", "Not squeezing at the end"],
  },
  {
    id: "good-morning", name: "Good Morning", category: "back",
    primaryMuscle: "Erector Spinae", secondaryMuscles: ["Hamstrings", "Glutes"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "good-morning",
    instructions: ["Place the barbell on your upper back as for a squat", "With a slight knee bend, hinge at the hips", "Lower your torso until it's near parallel to the floor", "Drive hips forward to stand back up"],
    commonMistakes: ["Rounding the lower back", "Going too heavy", "Knees locking out"],
  },
  {
    id: "db-shrug", name: "Dumbbell Shrug", category: "back",
    primaryMuscle: "Upper Trapezius", secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "db-shrug",
    instructions: ["Stand holding dumbbells at your sides", "Shrug your shoulders straight up toward your ears", "Hold the top for a second", "Lower with control"],
    commonMistakes: ["Rolling shoulders (just go straight up)", "Using too much weight and losing range", "Bending elbows"],
  },
  {
    id: "barbell-shrug", name: "Barbell Shrug", category: "back",
    primaryMuscle: "Upper Trapezius", secondaryMuscles: ["Rhomboids"],
    equipment: ["barbell"], difficulty: "Beginner", animationPlaceholder: "barbell-shrug",
    instructions: ["Stand holding a barbell in front of your thighs", "Shrug your shoulders straight up toward your ears", "Hold at the top for 1–2 seconds", "Lower with control"],
    commonMistakes: ["Rolling shoulders", "Using too much weight", "Bending elbows"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOULDERS (20)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "overhead-press", name: "Barbell Overhead Press", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids", "Triceps", "Upper Traps", "Core"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "overhead-press",
    instructions: ["Stand with bar at collarbone height, grip just outside shoulders", "Brace core, press the bar straight overhead", "Lock out elbows at the top", "Lower the bar with control back to the start"],
    commonMistakes: ["Excessive lower back arch", "Pressing the bar forward instead of straight up", "Not locking out fully", "Flaring ribs"],
  },
  {
    id: "dumbbell-shoulder-press", name: "Dumbbell Shoulder Press", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids", "Triceps"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "db-shoulder-press",
    instructions: ["Sit or stand holding dumbbells at shoulder height, palms forward", "Press both dumbbells overhead until arms are fully extended", "Lower the weights back to shoulder height with control", "Keep core braced throughout"],
    commonMistakes: ["Arching the back excessively", "Not pressing to full lockout", "Pressing unevenly"],
  },
  {
    id: "lateral-raise", name: "Dumbbell Lateral Raise", category: "shoulders",
    primaryMuscle: "Side Deltoids", secondaryMuscles: ["Front Deltoids", "Traps"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "lateral-raise",
    instructions: ["Stand holding dumbbells at your sides", "Raise arms out to shoulder height, leading with elbows", "Slight forward lean and thumbs slightly tilted down", "Lower slowly — control the eccentric"],
    commonMistakes: ["Using too much weight and swinging", "Shrugging shoulders up", "Going above shoulder height", "Straight arms (keep a slight bend)"],
  },
  {
    id: "arnold-press", name: "Arnold Press", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids", "Triceps"],
    equipment: ["dumbbells"], difficulty: "Intermediate", animationPlaceholder: "arnold-press",
    instructions: ["Start with dumbbells at chin height, palms facing you", "As you press up, rotate palms to face forward", "Full lockout at the top", "Reverse the rotation as you lower"],
    commonMistakes: ["Not completing the full rotation", "Using momentum", "Not controlling the descent"],
  },
  {
    id: "front-raise", name: "Dumbbell Front Raise", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "front-raise",
    instructions: ["Stand holding dumbbells in front of thighs", "Raise one or both arms to shoulder height", "Pause briefly at the top", "Lower with control"],
    commonMistakes: ["Swinging the weights", "Going above shoulder height", "Leaning back"],
  },
  {
    id: "rear-delt-fly", name: "Rear Delt Fly", category: "shoulders",
    primaryMuscle: "Rear Deltoids", secondaryMuscles: ["Rhomboids", "Traps"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "rear-delt-fly",
    instructions: ["Bend forward at hips holding dumbbells", "Raise the dumbbells out to the sides with slightly bent elbows", "Squeeze shoulder blades together at the top", "Lower with control"],
    commonMistakes: ["Using momentum", "Not bending forward enough", "Shrugging shoulders"],
  },
  {
    id: "cable-lateral-raise", name: "Cable Lateral Raise", category: "shoulders",
    primaryMuscle: "Side Deltoids", secondaryMuscles: ["Front Deltoids"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "cable-lateral-raise",
    instructions: ["Stand beside a low cable with the handle in the far hand", "Raise your arm out to shoulder height", "Pause at the top and control the return", "Repeat all reps then switch sides"],
    commonMistakes: ["Standing too close to the machine", "Using too much weight", "Shrugging"],
  },
  {
    id: "upright-row", name: "Barbell Upright Row", category: "shoulders",
    primaryMuscle: "Side Deltoids", secondaryMuscles: ["Front Deltoids", "Traps"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "upright-row",
    instructions: ["Hold the bar with a shoulder-width grip", "Pull the bar up along your body to chest height", "Lead with elbows — they should go higher than your hands", "Lower with control"],
    commonMistakes: ["Grip too narrow (impingement risk)", "Pulling above chest height", "Using momentum"],
  },
  {
    id: "behind-neck-press", name: "Behind-the-Neck Press", category: "shoulders",
    primaryMuscle: "Side Deltoids", secondaryMuscles: ["Front Deltoids", "Triceps", "Traps"],
    equipment: ["barbell"], difficulty: "Advanced", animationPlaceholder: "btn-press",
    instructions: ["Only perform if you have adequate shoulder mobility", "Lower the bar behind your head to ear level", "Press overhead to full lockout", "Use lighter weight than standard OHP"],
    commonMistakes: ["Going too deep behind the neck", "Using too much weight", "Insufficient shoulder mobility"],
  },
  {
    id: "lu-raise", name: "Lu Raise", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids"],
    equipment: ["dumbbells"], difficulty: "Intermediate", animationPlaceholder: "lu-raise",
    instructions: ["Hold dumbbells with thumbs up at your sides", "Raise arms forward to shoulder height with thumbs pointing up", "Rotate to lateral raise position", "Lower with control"],
    commonMistakes: ["Using too heavy a weight", "Not maintaining thumb-up position", "Rushing the movement"],
  },
  {
    id: "machine-shoulder-press", name: "Machine Shoulder Press", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids", "Triceps"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "machine-shoulder-press",
    instructions: ["Adjust seat so handles start at shoulder height", "Press handles overhead to full extension", "Lower with control", "Keep back against the pad"],
    commonMistakes: ["Seat too high or low", "Not getting full range of motion", "Leaning forward"],
  },
  {
    id: "reverse-pec-deck", name: "Reverse Pec Deck", category: "shoulders",
    primaryMuscle: "Rear Deltoids", secondaryMuscles: ["Rhomboids", "Traps"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "reverse-pec-deck",
    instructions: ["Face the pad on the pec deck machine", "Grip handles with arms extended", "Pull handles back, squeezing shoulder blades", "Return to start with control"],
    commonMistakes: ["Using too much weight", "Not squeezing at the back", "Shrugging shoulders"],
  },
  {
    id: "pike-push-up", name: "Pike Push-Up", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Triceps", "Upper Chest"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "pike-push-up",
    instructions: ["Start in a downward dog position with hips high", "Bend elbows to lower the top of your head toward the floor", "Push back up to the starting position", "Keep hips high throughout"],
    commonMistakes: ["Hips dropping", "Not going deep enough", "Feet too close to hands"],
  },
  {
    id: "handstand-push-up", name: "Handstand Push-Up", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Triceps", "Traps", "Core"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "handstand-push-up",
    instructions: ["Kick up to a handstand against a wall", "Lower your head toward the floor by bending elbows", "Press back up to full arm extension", "Keep core tight and body straight"],
    commonMistakes: ["Flaring elbows too wide", "Not controlling the descent", "Arching the back"],
  },
  {
    id: "cable-face-pull", name: "Cable Face Pull (High)", category: "shoulders",
    primaryMuscle: "Rear Deltoids", secondaryMuscles: ["External Rotators", "Traps"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "cable-face-pull",
    instructions: ["Set cable at upper chest height with rope attachment", "Pull the rope toward your face, separating the ends", "Externally rotate at the end position", "Return to start with control"],
    commonMistakes: ["Elbows below shoulders", "Not separating the rope", "Using too much weight"],
  },
  {
    id: "db-y-raise", name: "Dumbbell Y-Raise", category: "shoulders",
    primaryMuscle: "Lower Traps", secondaryMuscles: ["Rear Deltoids", "Rotator Cuff"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "db-y-raise",
    instructions: ["Bend forward or lie face down on an incline bench", "Hold light dumbbells with thumbs up", "Raise arms in a Y-shape overhead", "Lower with control"],
    commonMistakes: ["Using too much weight", "Not maintaining thumb-up position", "Shrugging shoulders"],
  },
  {
    id: "plate-bus-driver", name: "Plate Bus Driver", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids", "Forearms"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "plate-bus-driver",
    instructions: ["Hold a plate at arm's length in front of you at shoulder height", "Rotate the plate like a steering wheel, alternating sides", "Keep arms extended throughout", "Continue for time or reps"],
    commonMistakes: ["Arms dropping below shoulder height", "Using too heavy a plate", "Rushing the rotations"],
  },
  {
    id: "smith-shoulder-press", name: "Smith Machine Shoulder Press", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Side Deltoids", "Triceps"],
    equipment: ["smith_machine"], difficulty: "Beginner", animationPlaceholder: "smith-shoulder-press",
    instructions: ["Set a bench upright inside the Smith machine", "Unrack the bar at forehead height", "Press overhead to full lockout", "Lower with control to chin level"],
    commonMistakes: ["Seat positioned too far forward or back", "Not getting full range of motion", "Over-relying on the guided track"],
  },
  {
    id: "landmine-lateral-raise", name: "Landmine Lateral Raise", category: "shoulders",
    primaryMuscle: "Side Deltoids", secondaryMuscles: ["Front Deltoids"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "landmine-lateral-raise",
    instructions: ["Stand beside the end of a landmine barbell", "Grip the end with the near hand", "Raise the bar out to shoulder height", "Lower with control"],
    commonMistakes: ["Standing too close", "Using too much weight", "Leaning away"],
  },
  {
    id: "kettlebell-press", name: "Kettlebell Overhead Press", category: "shoulders",
    primaryMuscle: "Front Deltoids", secondaryMuscles: ["Triceps", "Core"],
    equipment: ["kettlebells"], difficulty: "Intermediate", animationPlaceholder: "kb-press",
    instructions: ["Clean a kettlebell to the rack position at your shoulder", "Press the kettlebell overhead to full lockout", "Control the descent back to the rack", "Complete all reps then switch sides"],
    commonMistakes: ["Leaning sideways", "Not locking out fully", "Pressing forward instead of straight up"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BICEPS (15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "barbell-curl", name: "Barbell Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Brachialis", "Brachioradialis"],
    equipment: ["barbell"], difficulty: "Beginner", animationPlaceholder: "barbell-curl",
    instructions: ["Stand holding a barbell with an underhand shoulder-width grip", "Curl the bar toward your shoulders keeping elbows pinned", "Squeeze at the top", "Lower with a controlled 2-second negative"],
    commonMistakes: ["Swinging the body", "Elbows drifting forward", "Partial range of motion"],
  },
  {
    id: "dumbbell-curl", name: "Dumbbell Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Brachialis"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "db-curl",
    instructions: ["Stand holding dumbbells at your sides, palms forward", "Curl both dumbbells up to shoulder height", "Squeeze the biceps at the top", "Lower with control"],
    commonMistakes: ["Swinging the torso", "Not supinating the wrist", "Using momentum"],
  },
  {
    id: "hammer-curl", name: "Hammer Curl", category: "biceps",
    primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps Brachii", "Brachioradialis"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "hammer-curl",
    instructions: ["Hold dumbbells with a neutral grip (palms facing each other)", "Curl to shoulder height", "Keep elbows at your sides", "Lower with control"],
    commonMistakes: ["Swinging", "Wrists rotating during the curl", "Elbows flaring"],
  },
  {
    id: "preacher-curl", name: "Preacher Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii (short head)", secondaryMuscles: ["Brachialis"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "preacher-curl",
    instructions: ["Rest upper arms on the preacher pad", "Curl the weight up with control", "Squeeze at the top", "Lower slowly to full extension — don't lock out aggressively"],
    commonMistakes: ["Swinging at the bottom", "Not getting a full stretch", "Going too heavy and losing control"],
  },
  {
    id: "incline-db-curl", name: "Incline Dumbbell Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii (long head)", secondaryMuscles: ["Brachialis"],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "incline-db-curl",
    instructions: ["Set bench to 45 degrees and lie back holding dumbbells", "Let arms hang straight down", "Curl the dumbbells up, keeping upper arms stationary", "Lower with control to full stretch"],
    commonMistakes: ["Bringing elbows forward", "Bench angle too upright", "Using momentum"],
  },
  {
    id: "cable-curl", name: "Cable Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Brachialis"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "cable-curl",
    instructions: ["Stand facing a low cable with a bar attachment", "Curl the bar up to shoulder height", "Squeeze at the top", "Lower with control, maintaining tension"],
    commonMistakes: ["Standing too close to the machine", "Elbows drifting forward", "Swinging"],
  },
  {
    id: "concentration-curl", name: "Concentration Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "concentration-curl",
    instructions: ["Sit on a bench with elbow braced against inner thigh", "Curl the dumbbell up to shoulder height", "Squeeze the bicep hard at the top", "Lower slowly with control"],
    commonMistakes: ["Using the shoulder to lift", "Not bracing the elbow properly", "Rushing reps"],
  },
  {
    id: "ez-bar-curl", name: "EZ-Bar Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Brachialis", "Brachioradialis"],
    equipment: ["barbell"], difficulty: "Beginner", animationPlaceholder: "ez-bar-curl",
    instructions: ["Grip the EZ bar on the angled portions", "Curl the bar up to shoulder height", "Keep elbows pinned at your sides", "Lower with control"],
    commonMistakes: ["Swinging the torso", "Elbows moving forward", "Using too much weight"],
  },
  {
    id: "spider-curl", name: "Spider Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii (short head)", secondaryMuscles: [],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "spider-curl",
    instructions: ["Lie face down on an incline bench", "Let arms hang straight down with dumbbells", "Curl the weights up, squeezing biceps hard", "Lower with control"],
    commonMistakes: ["Using momentum", "Elbows swinging", "Not getting full contraction"],
  },
  {
    id: "cross-body-curl", name: "Cross-Body Hammer Curl", category: "biceps",
    primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps Brachii"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "cross-body-curl",
    instructions: ["Hold dumbbells at sides with neutral grip", "Curl one dumbbell across your body toward the opposite shoulder", "Squeeze at the top", "Lower and alternate sides"],
    commonMistakes: ["Swinging", "Not crossing far enough", "Elbow moving forward"],
  },
  {
    id: "reverse-curl", name: "Reverse Barbell Curl", category: "biceps",
    primaryMuscle: "Brachioradialis", secondaryMuscles: ["Biceps Brachii", "Forearm Extensors"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "reverse-curl",
    instructions: ["Grip the bar overhand at shoulder width", "Curl the bar up keeping wrists straight", "Lower with control", "Keep elbows pinned at sides"],
    commonMistakes: ["Wrists bending", "Elbows flaring", "Using too much weight"],
  },
  {
    id: "bayesian-curl", name: "Bayesian Cable Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii (long head)", secondaryMuscles: [],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "bayesian-curl",
    instructions: ["Stand facing away from a low cable, grip in one hand", "Start with your arm behind your body (shoulder extended)", "Curl the handle up to shoulder height", "Lower with control to full stretch"],
    commonMistakes: ["Not standing far enough from the cable", "Elbow drifting forward", "Using momentum"],
  },
  {
    id: "zottman-curl", name: "Zottman Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Brachioradialis", "Forearm Extensors"],
    equipment: ["dumbbells"], difficulty: "Intermediate", animationPlaceholder: "zottman-curl",
    instructions: ["Curl dumbbells up with palms facing up (supinated)", "At the top, rotate palms to face down (pronated)", "Lower slowly with the pronated grip", "Rotate back to supinated at the bottom"],
    commonMistakes: ["Not rotating fully", "Lowering too fast", "Using too much weight"],
  },
  {
    id: "band-curl", name: "Resistance Band Curl", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Brachialis"],
    equipment: ["resistance_bands"], difficulty: "Beginner", animationPlaceholder: "band-curl",
    instructions: ["Stand on the band with feet shoulder-width apart", "Grip the band handles with palms up", "Curl up to shoulder height", "Lower with control against the band tension"],
    commonMistakes: ["Band too loose (no tension at bottom)", "Swinging", "Not controlling the eccentric"],
  },
  {
    id: "chin-up-biceps", name: "Close-Grip Chin-Up", category: "biceps",
    primaryMuscle: "Biceps Brachii", secondaryMuscles: ["Lats", "Brachialis"],
    equipment: ["pullup_bar"], difficulty: "Intermediate", animationPlaceholder: "close-grip-chinup",
    instructions: ["Grip the bar with palms facing you, hands close together", "Pull up until chin clears the bar", "Squeeze biceps at the top", "Lower with control to full extension"],
    commonMistakes: ["Kipping", "Partial reps", "Not stretching fully at the bottom"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRICEPS (15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "tricep-pushdown", name: "Cable Tricep Pushdown", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: [],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "tricep-pushdown",
    instructions: ["Stand at a cable machine with a bar or rope at the top", "Push the attachment down by extending your elbows", "Squeeze triceps at full lockout", "Return to 90 degrees with control"],
    commonMistakes: ["Elbows drifting away from sides", "Leaning over the cable", "Using momentum"],
  },
  {
    id: "skull-crusher", name: "Skull Crusher", category: "triceps",
    primaryMuscle: "Triceps (long head)", secondaryMuscles: [],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "skull-crusher",
    instructions: ["Lie on a bench holding a bar or EZ bar above your chest", "Lower the bar toward your forehead by bending only at the elbows", "Stop just above the forehead", "Extend elbows to press the bar back up"],
    commonMistakes: ["Elbows flaring out", "Moving upper arms", "Going too heavy and losing control"],
  },
  {
    id: "overhead-tricep-extension", name: "Overhead Tricep Extension", category: "triceps",
    primaryMuscle: "Triceps (long head)", secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "overhead-tri-ext",
    instructions: ["Hold a dumbbell overhead with both hands behind your head", "Lower the weight behind your head by bending elbows", "Extend back to the top", "Keep upper arms close to your ears"],
    commonMistakes: ["Elbows flaring out", "Not going to full extension", "Arching the back"],
  },
  {
    id: "tricep-dips", name: "Bench Dips", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: ["Front Deltoids", "Chest"],
    equipment: ["bench"], difficulty: "Beginner", animationPlaceholder: "bench-dips",
    instructions: ["Place hands on a bench behind you, fingers forward", "Extend legs in front or bend knees for easier version", "Lower by bending elbows to about 90 degrees", "Press back up to full extension"],
    commonMistakes: ["Shoulders shrugging up", "Elbows flaring out", "Not going deep enough"],
  },
  {
    id: "cable-overhead-extension", name: "Cable Overhead Extension", category: "triceps",
    primaryMuscle: "Triceps (long head)", secondaryMuscles: [],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "cable-overhead-ext",
    instructions: ["Face away from a low cable with a rope attachment overhead", "Start with elbows bent behind your head", "Extend arms overhead to lockout", "Return with control"],
    commonMistakes: ["Elbows moving position", "Arching the back", "Using momentum"],
  },
  {
    id: "tricep-kickback", name: "Dumbbell Tricep Kickback", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "tricep-kickback",
    instructions: ["Bend forward with one arm braced on a bench", "Hold dumbbell with upper arm parallel to floor, elbow at 90°", "Extend the forearm back until arm is straight", "Squeeze tricep and lower with control"],
    commonMistakes: ["Upper arm dropping", "Swinging the weight", "Not reaching full extension"],
  },
  {
    id: "diamond-pushup-tri", name: "Diamond Push-Up", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: ["Chest", "Front Deltoids"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "diamond-pushup",
    instructions: ["Hands close together forming a diamond shape", "Lower chest toward your hands", "Press back up focusing on tricep contraction", "Keep elbows tracking back, not flaring"],
    commonMistakes: ["Elbows flaring out", "Not going deep enough", "Hips sagging"],
  },
  {
    id: "rope-pushdown", name: "Rope Tricep Pushdown", category: "triceps",
    primaryMuscle: "Triceps (lateral head)", secondaryMuscles: [],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "rope-pushdown",
    instructions: ["Grip the rope attachment at a high cable", "Push down and separate the rope at the bottom", "Squeeze triceps at full extension", "Return to 90 degrees with control"],
    commonMistakes: ["Not separating the rope at the bottom", "Elbows drifting forward", "Leaning over"],
  },
  {
    id: "close-grip-bp-tri", name: "Close-Grip Bench Press", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: ["Chest", "Front Deltoids"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "close-grip-bench-tri",
    instructions: ["Lie on bench with a shoulder-width or narrower grip", "Lower bar to lower chest with elbows tucked", "Press up focusing on tricep drive", "Lock out fully at the top"],
    commonMistakes: ["Grip too narrow (wrist pain)", "Elbows flaring", "Not tucking elbows"],
  },
  {
    id: "jm-press", name: "JM Press", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: ["Chest"],
    equipment: ["barbell", "bench"], difficulty: "Advanced", animationPlaceholder: "jm-press",
    instructions: ["Lie on bench, grip the bar at shoulder width", "Lower the bar toward your chin/upper chest area", "Elbows drop straight down (hybrid of skull crusher and close-grip press)", "Press back to lockout"],
    commonMistakes: ["Bar path too much like a regular press", "Going too heavy before mastering form", "Elbows flaring"],
  },
  {
    id: "french-press", name: "Seated French Press", category: "triceps",
    primaryMuscle: "Triceps (long head)", secondaryMuscles: [],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "french-press",
    instructions: ["Sit holding a barbell or EZ bar overhead", "Lower behind your head by bending elbows", "Keep upper arms close to ears", "Extend back to lockout"],
    commonMistakes: ["Elbows flaring wide", "Arching the back", "Not controlling the descent"],
  },
  {
    id: "single-arm-pushdown", name: "Single-Arm Cable Pushdown", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: [],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "single-arm-pushdown",
    instructions: ["Stand at a cable machine with a single handle", "Push down with one arm to full extension", "Squeeze tricep at the bottom", "Return with control, repeat all reps then switch"],
    commonMistakes: ["Rotating the torso", "Elbow moving position", "Using too much weight"],
  },
  {
    id: "bodyweight-tri-ext", name: "Bodyweight Tricep Extension", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: ["Core"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "bw-tri-extension",
    instructions: ["Place hands on an elevated surface (bar, bench edge)", "Lean forward, lowering your head under and past your hands", "Keep elbows tight and extend back up", "Like a skull crusher but with body weight"],
    commonMistakes: ["Elbows flaring out", "Hips dropping", "Not going deep enough"],
  },
  {
    id: "tate-press", name: "Tate Press", category: "triceps",
    primaryMuscle: "Triceps (medial head)", secondaryMuscles: [],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "tate-press",
    instructions: ["Lie on bench holding dumbbells above chest, palms facing feet", "Lower dumbbells toward your chest by bending elbows inward", "Touch dumbbells to chest (elbows point out)", "Extend back to start"],
    commonMistakes: ["Not keeping elbows flared", "Going too heavy", "Losing control at the bottom"],
  },
  {
    id: "parallel-bar-dips-tri", name: "Tricep Dips (Parallel Bars)", category: "triceps",
    primaryMuscle: "Triceps", secondaryMuscles: ["Chest", "Front Deltoids"],
    equipment: ["pullup_bar"], difficulty: "Intermediate", animationPlaceholder: "parallel-bar-dips-tri",
    instructions: ["Grip parallel bars with arms locked out", "Keep torso upright (don't lean forward)", "Lower until elbows are at 90 degrees", "Press back up to full lockout"],
    commonMistakes: ["Leaning too far forward (shifts to chest)", "Going too deep", "Not locking out at top"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGS (20)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "barbell-squat", name: "Barbell Back Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings", "Core", "Erector Spinae"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "barbell-squat",
    instructions: ["Place bar on upper back, feet shoulder-width apart", "Brace core and descend by pushing hips back and bending knees", "Go to at least parallel (thighs parallel to floor)", "Drive through full foot to stand back up"],
    commonMistakes: ["Knees caving inward", "Heels rising off the floor", "Leaning too far forward", "Not hitting depth"],
  },
  {
    id: "front-squat", name: "Front Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Core"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "front-squat",
    instructions: ["Rest bar on front deltoids with elbows high", "Descend keeping torso very upright", "Go to full depth if mobility allows", "Drive up maintaining elbow position"],
    commonMistakes: ["Elbows dropping (bar rolls forward)", "Leaning forward", "Not bracing core", "Wrist flexibility issues"],
  },
  {
    id: "goblet-squat", name: "Goblet Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Core"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "goblet-squat",
    instructions: ["Hold a dumbbell or kettlebell at your chest", "Squat down between your knees", "Elbows should touch inside of knees at the bottom", "Drive through full foot to stand"],
    commonMistakes: ["Not going deep enough", "Rounding the back", "Weight shifting to toes"],
  },
  {
    id: "leg-press", name: "Leg Press", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: ["leg_press"], difficulty: "Beginner", animationPlaceholder: "leg-press",
    instructions: ["Sit in the machine with feet shoulder-width on the platform", "Lower the platform by bending knees to 90 degrees", "Press back up without locking knees fully", "Keep lower back pressed into the seat"],
    commonMistakes: ["Locking out knees at the top", "Hips coming off the seat", "Too narrow foot placement"],
  },
  {
    id: "romanian-deadlift", name: "Romanian Deadlift", category: "legs",
    primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes", "Erector Spinae"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "romanian-deadlift",
    instructions: ["Hold barbell at hip height, feet hip-width apart", "Hinge at hips pushing them back, keeping bar close to legs", "Lower until you feel a strong hamstring stretch", "Drive hips forward to return to standing"],
    commonMistakes: ["Rounding the lower back", "Bending knees too much (it's a hinge, not a squat)", "Bar drifting away from legs"],
  },
  {
    id: "walking-lunge", name: "Walking Lunge", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "walking-lunge",
    instructions: ["Step forward into a lunge position", "Lower back knee toward the floor", "Push off the front foot and step forward with the other leg", "Continue alternating for the desired distance or reps"],
    commonMistakes: ["Knee going past toes excessively", "Torso leaning forward", "Back knee slamming the floor"],
  },
  {
    id: "bulgarian-split-squat", name: "Bulgarian Split Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: ["bench"], difficulty: "Intermediate", animationPlaceholder: "bulgarian-split-squat",
    instructions: ["Place rear foot on a bench behind you", "Lower until front thigh is parallel to the floor", "Drive through the front heel to stand", "Complete all reps on one side before switching"],
    commonMistakes: ["Front foot too close to bench", "Leaning forward excessively", "Not going deep enough"],
  },
  {
    id: "leg-extension", name: "Leg Extension", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: [],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "leg-extension",
    instructions: ["Sit in the machine with pad on front of lower shins", "Extend your legs to full lockout", "Squeeze quads at the top", "Lower with a slow, controlled negative"],
    commonMistakes: ["Using momentum to swing the weight", "Not getting full extension", "Lowering too fast"],
  },
  {
    id: "lying-leg-curl", name: "Lying Leg Curl", category: "legs",
    primaryMuscle: "Hamstrings", secondaryMuscles: ["Calves"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "lying-leg-curl",
    instructions: ["Lie face down with pad above your heels", "Curl your heels toward your glutes", "Squeeze hamstrings at full contraction", "Lower with control"],
    commonMistakes: ["Hips rising off the pad", "Not getting full range of motion", "Using momentum"],
  },
  {
    id: "hack-squat", name: "Hack Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes"],
    equipment: ["leg_press"], difficulty: "Intermediate", animationPlaceholder: "hack-squat",
    instructions: ["Position shoulders under the pads, feet shoulder-width", "Unlock the safety and lower by bending knees", "Go to at least 90 degrees", "Press back up without locking out knees"],
    commonMistakes: ["Knees caving in", "Not going deep enough", "Locking out knees at top"],
  },
  {
    id: "step-up", name: "Dumbbell Step-Up", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: ["dumbbells", "bench"], difficulty: "Beginner", animationPlaceholder: "step-up",
    instructions: ["Hold dumbbells at sides, stand in front of a bench", "Step up with one foot onto the bench", "Drive through that foot to stand on top", "Lower back down with control"],
    commonMistakes: ["Pushing off the back foot", "Box too high for current strength", "Not driving through the lead leg"],
  },
  {
    id: "calf-raise", name: "Standing Calf Raise", category: "legs",
    primaryMuscle: "Gastrocnemius", secondaryMuscles: ["Soleus"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "calf-raise",
    instructions: ["Stand on the edge of a step with heels hanging off", "Rise up on your toes as high as possible", "Squeeze calves at the top", "Lower heels below the step for a full stretch"],
    commonMistakes: ["Bouncing at the bottom", "Not going through full range", "Bending knees"],
  },
  {
    id: "seated-calf-raise", name: "Seated Calf Raise", category: "legs",
    primaryMuscle: "Soleus", secondaryMuscles: ["Gastrocnemius"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "seated-calf-raise",
    instructions: ["Sit in machine with pads on lower thighs", "Lower heels for a full stretch", "Press up on toes to full contraction", "Hold at the top briefly"],
    commonMistakes: ["Bouncing", "Partial range of motion", "Going too fast"],
  },
  {
    id: "sumo-deadlift", name: "Sumo Deadlift", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings", "Adductors", "Core"],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "sumo-deadlift",
    instructions: ["Stand with a very wide stance, toes pointed out", "Grip the bar inside your legs at shoulder width", "Push the floor away, keeping chest up", "Lock out by squeezing glutes"],
    commonMistakes: ["Knees caving in", "Hips rising faster than shoulders", "Rounding the back"],
  },
  {
    id: "sissy-squat", name: "Sissy Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Core"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "sissy-squat",
    instructions: ["Hold onto something for balance", "Lean back as you bend your knees, rising onto your toes", "Lower until knees are past your toes significantly", "Press back up through the quads"],
    commonMistakes: ["Not going deep enough", "Losing balance", "Not enough quad engagement"],
  },
  {
    id: "nordic-curl", name: "Nordic Hamstring Curl", category: "legs",
    primaryMuscle: "Hamstrings", secondaryMuscles: [],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "nordic-curl",
    instructions: ["Kneel with ankles secured under a pad or by a partner", "Lower your body forward as slowly as possible", "Use hamstrings to control the descent", "Catch yourself and push back up"],
    commonMistakes: ["Bending at the hips instead of the knees", "Falling too fast", "Not engaging hamstrings"],
  },
  {
    id: "db-rdl", name: "Dumbbell Romanian Deadlift", category: "legs",
    primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes", "Erector Spinae"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "db-rdl",
    instructions: ["Hold dumbbells in front of thighs", "Hinge at hips, pushing them back", "Lower dumbbells along your legs until you feel the stretch", "Drive hips forward to stand"],
    commonMistakes: ["Rounding the back", "Bending knees too much", "Dumbbells drifting away from legs"],
  },
  {
    id: "reverse-lunge", name: "Reverse Lunge", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "reverse-lunge",
    instructions: ["Stand tall, step one foot backward", "Lower until back knee nearly touches the floor", "Push off the back foot to return to standing", "Alternate legs or do all reps on one side"],
    commonMistakes: ["Front knee caving inward", "Torso leaning forward", "Stepping back too short"],
  },
  {
    id: "wall-sit", name: "Wall Sit", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "wall-sit",
    instructions: ["Lean against a wall with feet shoulder-width apart", "Slide down until thighs are parallel to the floor", "Keep back flat against the wall", "Hold the position for time"],
    commonMistakes: ["Thighs not reaching parallel", "Pushing knees past toes", "Sliding up the wall as it gets hard"],
  },
  {
    id: "smith-squat", name: "Smith Machine Squat", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: ["smith_machine"], difficulty: "Beginner", animationPlaceholder: "smith-squat",
    instructions: ["Position the bar on your upper back in the Smith machine", "Feet slightly forward of the bar path", "Squat down to at least parallel", "Press back up to standing"],
    commonMistakes: ["Feet too far back (stresses knees)", "Not going deep enough", "Leaning on the guided track"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GLUTES (15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "barbell-hip-thrust", name: "Barbell Hip Thrust", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["barbell", "bench"], difficulty: "Intermediate", animationPlaceholder: "hip-thrust",
    instructions: ["Sit with upper back on a bench, barbell across hips", "Drive hips up until torso is parallel to floor", "Squeeze glutes hard at the top", "Lower with control"],
    commonMistakes: ["Hyperextending the lower back", "Not squeezing at the top", "Feet too close to or far from body"],
  },
  {
    id: "glute-bridge", name: "Glute Bridge", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "glute-bridge",
    instructions: ["Lie on back with knees bent, feet flat on floor", "Drive hips up by squeezing glutes", "Hold the top for a second", "Lower with control"],
    commonMistakes: ["Pushing through toes instead of heels", "Hyperextending the back", "Not squeezing at the top"],
  },
  {
    id: "cable-kickback", name: "Cable Glute Kickback", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "cable-kickback",
    instructions: ["Attach ankle strap to a low cable", "Kick leg back and up, squeezing the glute", "Pause at full extension", "Lower with control"],
    commonMistakes: ["Arching the lower back", "Using momentum", "Not squeezing at the top"],
  },
  {
    id: "sumo-squat", name: "Sumo Squat", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Adductors", "Quadriceps"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "sumo-squat",
    instructions: ["Wide stance with toes pointed outward", "Hold a dumbbell at chest or between legs", "Squat down keeping chest tall", "Drive through heels to stand"],
    commonMistakes: ["Knees caving in", "Leaning forward", "Not going deep enough"],
  },
  {
    id: "donkey-kick", name: "Donkey Kick", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "donkey-kick",
    instructions: ["On all fours, keep one knee bent at 90 degrees", "Lift that leg up toward the ceiling", "Squeeze the glute at the top", "Lower with control without touching the floor"],
    commonMistakes: ["Arching the lower back", "Not squeezing at the top", "Rotating the hips"],
  },
  {
    id: "fire-hydrant", name: "Fire Hydrant", category: "glutes",
    primaryMuscle: "Gluteus Medius", secondaryMuscles: ["Gluteus Maximus", "Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "fire-hydrant",
    instructions: ["On all fours with core braced", "Lift one knee out to the side keeping it bent at 90°", "Raise to hip height", "Lower with control"],
    commonMistakes: ["Rotating the torso", "Not keeping the knee bent", "Arching the back"],
  },
  {
    id: "single-leg-bridge", name: "Single-Leg Glute Bridge", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "single-leg-bridge",
    instructions: ["Lie on back, extend one leg toward ceiling", "Drive hips up using the grounded leg", "Squeeze glute at the top", "Lower with control"],
    commonMistakes: ["Hips rotating to one side", "Not squeezing at top", "Non-working leg not stable"],
  },
  {
    id: "band-hip-abduction", name: "Banded Hip Abduction", category: "glutes",
    primaryMuscle: "Gluteus Medius", secondaryMuscles: ["Gluteus Minimus"],
    equipment: ["resistance_bands"], difficulty: "Beginner", animationPlaceholder: "band-hip-abduction",
    instructions: ["Place band above knees while standing or seated", "Push knees apart against the band", "Hold the open position briefly", "Return with control"],
    commonMistakes: ["Using a band that's too light", "Leaning to one side", "Not controlling the return"],
  },
  {
    id: "curtsy-lunge", name: "Curtsy Lunge", category: "glutes",
    primaryMuscle: "Gluteus Medius", secondaryMuscles: ["Quadriceps", "Adductors"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "curtsy-lunge",
    instructions: ["Stand tall, step one foot behind and across the other", "Lower into a lunge position", "Push back to standing", "Alternate sides"],
    commonMistakes: ["Knee caving inward", "Not stepping far enough back", "Torso leaning forward"],
  },
  {
    id: "frog-pump", name: "Frog Pump", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: [],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "frog-pump",
    instructions: ["Lie on back with soles of feet together, knees out", "Drive hips up by squeezing glutes", "Hold briefly at the top", "Lower and repeat for high reps"],
    commonMistakes: ["Not squeezing hard enough at top", "Pushing through toes", "Lower back arching"],
  },
  {
    id: "cable-pull-through", name: "Cable Pull-Through", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "cable-pull-through",
    instructions: ["Face away from a low cable, grip between legs", "Hinge at hips letting the cable pull you back", "Drive hips forward explosively", "Squeeze glutes at the top"],
    commonMistakes: ["Squatting instead of hinging", "Not squeezing at lockout", "Rounding the back"],
  },
  {
    id: "kb-swing", name: "Kettlebell Swing", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings", "Core", "Shoulders"],
    equipment: ["kettlebells"], difficulty: "Intermediate", animationPlaceholder: "kb-swing",
    instructions: ["Stand with feet wider than shoulders, kettlebell in front", "Hike the bell between your legs", "Drive hips forward to swing the bell to chest height", "Let the bell fall back and repeat"],
    commonMistakes: ["Squatting instead of hinging", "Using arms to lift (it's hip drive)", "Rounding the back"],
  },
  {
    id: "lateral-band-walk", name: "Lateral Band Walk", category: "glutes",
    primaryMuscle: "Gluteus Medius", secondaryMuscles: ["Gluteus Minimus"],
    equipment: ["resistance_bands"], difficulty: "Beginner", animationPlaceholder: "lateral-band-walk",
    instructions: ["Place band above knees or ankles", "Assume a half-squat position", "Step sideways maintaining tension on the band", "Keep toes forward and core braced"],
    commonMistakes: ["Standing too tall", "Toes pointing out", "Steps too small"],
  },
  {
    id: "step-up-glute", name: "High Step-Up", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Quadriceps", "Hamstrings"],
    equipment: ["bench"], difficulty: "Intermediate", animationPlaceholder: "high-step-up",
    instructions: ["Use a bench or box at knee height or higher", "Step up driving through the heel of the lead leg", "Stand fully on top, squeezing the glute", "Lower with control on the same leg"],
    commonMistakes: ["Box too low to activate glutes", "Pushing off the back foot", "Not controlling the descent"],
  },
  {
    id: "b-stance-rdl", name: "B-Stance Romanian Deadlift", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings"],
    equipment: ["dumbbells"], difficulty: "Intermediate", animationPlaceholder: "b-stance-rdl",
    instructions: ["Stagger your stance with one foot slightly behind", "Hinge at hips with most weight on the front leg", "Lower dumbbells along the front leg", "Drive hips forward to stand"],
    commonMistakes: ["Too even a stance", "Rounding the back", "Not feeling the working side"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ABS (15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "plank", name: "Plank", category: "abs",
    primaryMuscle: "Transverse Abdominis", secondaryMuscles: ["Rectus Abdominis", "Obliques", "Shoulders"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "plank",
    instructions: ["Support body on forearms and toes", "Keep body in a straight line from head to heels", "Brace core as if bracing for a punch", "Hold for the prescribed time"],
    commonMistakes: ["Hips sagging", "Hips too high", "Not breathing", "Looking up (keep neck neutral)"],
  },
  {
    id: "crunch", name: "Crunch", category: "abs",
    primaryMuscle: "Rectus Abdominis", secondaryMuscles: ["Obliques"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "crunch",
    instructions: ["Lie on back with knees bent, hands behind head", "Curl shoulders off floor by contracting abs", "Exhale and squeeze at the top", "Lower with control"],
    commonMistakes: ["Pulling on the neck", "Using hip flexors instead of abs", "Jerking up"],
  },
  {
    id: "hanging-leg-raise", name: "Hanging Leg Raise", category: "abs",
    primaryMuscle: "Lower Abs", secondaryMuscles: ["Hip Flexors", "Obliques"],
    equipment: ["pullup_bar"], difficulty: "Advanced", animationPlaceholder: "hanging-leg-raise",
    instructions: ["Hang from a pull-up bar with arms straight", "Raise your legs to 90 degrees or higher", "Tilt pelvis to engage lower abs", "Lower with control — no swinging"],
    commonMistakes: ["Swinging to generate momentum", "Not tilting pelvis (uses hip flexors instead of abs)", "Dropping legs too fast"],
  },
  {
    id: "russian-twist", name: "Russian Twist", category: "abs",
    primaryMuscle: "Obliques", secondaryMuscles: ["Rectus Abdominis"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "russian-twist",
    instructions: ["Sit with knees bent, feet slightly off floor", "Lean back to about 45 degrees", "Rotate your torso side to side, touching the floor each side", "Move slowly and with control"],
    commonMistakes: ["Moving arms without rotating torso", "Feet on the floor (less challenging)", "Going too fast"],
  },
  {
    id: "mountain-climber", name: "Mountain Climber", category: "abs",
    primaryMuscle: "Core", secondaryMuscles: ["Shoulders", "Hip Flexors", "Legs"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "mountain-climber",
    instructions: ["Start in push-up position", "Drive one knee toward your chest", "Quickly switch legs", "Keep hips level and core braced throughout"],
    commonMistakes: ["Hips bouncing up", "Not bringing knees far enough forward", "Letting form break down with speed"],
  },
  {
    id: "bicycle-crunch", name: "Bicycle Crunch", category: "abs",
    primaryMuscle: "Obliques", secondaryMuscles: ["Rectus Abdominis"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "bicycle-crunch",
    instructions: ["Lie on back, hands behind head, legs lifted", "Bring opposite elbow to opposite knee", "Extend the other leg straight out", "Alternate sides with a pedalling motion"],
    commonMistakes: ["Pulling on neck", "Moving too fast without control", "Not fully extending the straight leg"],
  },
  {
    id: "ab-wheel", name: "Ab Wheel Rollout", category: "abs",
    primaryMuscle: "Rectus Abdominis", secondaryMuscles: ["Obliques", "Shoulders", "Lats"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "ab-wheel",
    instructions: ["Kneel holding the ab wheel handles", "Roll forward extending your body as far as you can", "Keep core braced and back flat — don't let hips sag", "Pull the wheel back to the starting position"],
    commonMistakes: ["Hips sagging", "Going too far without strength", "Arching the lower back"],
  },
  {
    id: "dead-bug", name: "Dead Bug", category: "abs",
    primaryMuscle: "Transverse Abdominis", secondaryMuscles: ["Rectus Abdominis"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "dead-bug",
    instructions: ["Lie on back with arms extended and knees at 90 degrees", "Slowly extend opposite arm and leg toward the floor", "Keep lower back pressed into the floor", "Return to start and switch sides"],
    commonMistakes: ["Lower back lifting off the floor", "Moving too fast", "Not breathing properly"],
  },
  {
    id: "side-plank", name: "Side Plank", category: "abs",
    primaryMuscle: "Obliques", secondaryMuscles: ["Core", "Shoulders"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "side-plank",
    instructions: ["Lie on your side, prop up on your forearm", "Lift hips off the floor forming a straight line", "Keep core braced and hips stacked", "Hold for time, then switch sides"],
    commonMistakes: ["Hips dropping", "Not stacking hips", "Holding breath"],
  },
  {
    id: "cable-crunch", name: "Cable Crunch", category: "abs",
    primaryMuscle: "Rectus Abdominis", secondaryMuscles: ["Obliques"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "cable-crunch",
    instructions: ["Kneel in front of a high cable with rope attachment", "Hold the rope behind your head", "Crunch down by contracting your abs", "Return to upright with control"],
    commonMistakes: ["Using hip flexors to pull", "Not crunching — just bending at the hips", "Using too much weight"],
  },
  {
    id: "v-up", name: "V-Up", category: "abs",
    primaryMuscle: "Rectus Abdominis", secondaryMuscles: ["Hip Flexors"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "v-up",
    instructions: ["Lie flat with arms overhead and legs straight", "Simultaneously lift arms and legs to touch toes", "Form a V shape at the top", "Lower with control back to the start"],
    commonMistakes: ["Using momentum instead of abs", "Not touching or getting close to toes", "Lower back taking too much strain"],
  },
  {
    id: "hollow-body-hold", name: "Hollow Body Hold", category: "abs",
    primaryMuscle: "Core", secondaryMuscles: ["Hip Flexors"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "hollow-body",
    instructions: ["Lie flat, press lower back into the floor", "Lift arms overhead and legs slightly off the floor", "Maintain the hollow position", "Hold for time"],
    commonMistakes: ["Lower back arching off the floor", "Legs or arms too high", "Holding breath"],
  },
  {
    id: "bird-dog", name: "Bird Dog", category: "abs",
    primaryMuscle: "Core", secondaryMuscles: ["Erector Spinae", "Glutes"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "bird-dog",
    instructions: ["On all fours with a neutral spine", "Extend opposite arm and leg simultaneously", "Hold briefly at full extension", "Return to start and switch sides"],
    commonMistakes: ["Hips rotating", "Arching the back", "Moving too fast"],
  },
  {
    id: "pallof-press", name: "Pallof Press", category: "abs",
    primaryMuscle: "Obliques", secondaryMuscles: ["Core"],
    equipment: ["cable_machine"], difficulty: "Intermediate", animationPlaceholder: "pallof-press",
    instructions: ["Stand perpendicular to a cable machine, hold handle at chest", "Press the handle straight out in front", "Resist the rotation — keep core braced", "Return to chest and repeat"],
    commonMistakes: ["Rotating the torso", "Standing too close to the machine", "Not bracing core"],
  },
  {
    id: "toe-touch", name: "Toe Touch", category: "abs",
    primaryMuscle: "Rectus Abdominis", secondaryMuscles: [],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "toe-touch",
    instructions: ["Lie on back with legs extended straight up", "Reach hands toward toes by crunching your abs", "Touch toes at the top", "Lower shoulders back to the floor"],
    commonMistakes: ["Using momentum", "Not lifting shoulders off the floor", "Bending legs"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOREARMS (8)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "wrist-curl", name: "Wrist Curl", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "wrist-curl",
    instructions: ["Sit with forearms on thighs, wrists hanging off the edge", "Hold dumbbells with palms up", "Curl the wrists up", "Lower with control"],
    commonMistakes: ["Forearms moving off the thighs", "Going too heavy", "Partial range of motion"],
  },
  {
    id: "reverse-wrist-curl", name: "Reverse Wrist Curl", category: "forearms",
    primaryMuscle: "Forearm Extensors", secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "reverse-wrist-curl",
    instructions: ["Same setup as wrist curl but palms face down", "Extend wrists upward", "Lower with control", "Use lighter weight than regular wrist curls"],
    commonMistakes: ["Using too much weight", "Moving the forearm", "Partial reps"],
  },
  {
    id: "farmers-carry", name: "Farmer's Carry", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: ["Traps", "Core", "Shoulders"],
    equipment: ["dumbbells"], difficulty: "Beginner", animationPlaceholder: "farmers-carry",
    instructions: ["Pick up heavy dumbbells or kettlebells at your sides", "Stand tall with shoulders back", "Walk a set distance with a tight grip", "Keep core braced throughout"],
    commonMistakes: ["Leaning to one side", "Not gripping hard enough", "Taking too-short steps"],
  },
  {
    id: "plate-pinch", name: "Plate Pinch Hold", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: [],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "plate-pinch",
    instructions: ["Pinch two weight plates together smooth sides out", "Hold with fingers and thumb only", "Hold for time", "Gradually increase plate weight"],
    commonMistakes: ["Using ridged/grippable surfaces", "Not holding long enough", "Grip too close to centre"],
  },
  {
    id: "dead-hang", name: "Dead Hang", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: ["Lats", "Shoulders"],
    equipment: ["pullup_bar"], difficulty: "Beginner", animationPlaceholder: "dead-hang",
    instructions: ["Hang from a pull-up bar with full arm extension", "Grip firmly and relax the body", "Hold for as long as possible", "Build up time gradually"],
    commonMistakes: ["Bending elbows", "Excessive swinging", "Giving up too early"],
  },
  {
    id: "towel-hang", name: "Towel Hang", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: ["Lats"],
    equipment: ["pullup_bar"], difficulty: "Advanced", animationPlaceholder: "towel-hang",
    instructions: ["Drape a towel over a pull-up bar", "Grip the towel ends firmly", "Hang with full arm extension", "Hold for time"],
    commonMistakes: ["Towel too thick for grip strength", "Not engaging lats", "Swinging"],
  },
  {
    id: "behind-back-curl", name: "Behind-the-Back Wrist Curl", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: [],
    equipment: ["barbell"], difficulty: "Intermediate", animationPlaceholder: "behind-back-wrist-curl",
    instructions: ["Stand holding a barbell behind your back", "Let the bar roll to your fingertips", "Curl your fingers and wrists back up", "Squeeze at the top"],
    commonMistakes: ["Using too much weight", "Bending elbows", "Rushing the movement"],
  },
  {
    id: "fat-grip-curl", name: "Fat Grip Curl", category: "forearms",
    primaryMuscle: "Brachioradialis", secondaryMuscles: ["Biceps", "Forearm Flexors"],
    equipment: ["dumbbells"], difficulty: "Intermediate", animationPlaceholder: "fat-grip-curl",
    instructions: ["Wrap a towel around dumbbell handles or use fat grips", "Curl as normal with the thicker grip", "Focus on squeezing the handle throughout", "Lower with control"],
    commonMistakes: ["Going too heavy with the thicker grip", "Not squeezing grip throughout", "Using momentum"],
  },
  {
    id: "finger-curls", name: "Finger Curls", category: "forearms",
    primaryMuscle: "Forearm Flexors", secondaryMuscles: [],
    equipment: ["barbell"], difficulty: "Beginner", animationPlaceholder: "finger-curls",
    instructions: ["Sit on a bench with forearms resting on your thighs", "Let the barbell roll down to your fingertips", "Curl your fingers up to close your fist around the bar", "Squeeze briefly and lower"],
    commonMistakes: ["Lifting forearms off thighs", "Using too much weight", "Not full range of motion"],
  },
  {
    id: "plate-pinch", name: "Plate Pinch Hold", category: "forearms",
    primaryMuscle: "Forearm Extensors", secondaryMuscles: ["Forearm Flexors"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "plate-pinch",
    instructions: ["Pinch two weight plates together smooth-side out", "Hold them at your side with fingers and thumb only", "Maintain the pinch grip for time", "Switch hands and repeat"],
    commonMistakes: ["Resting plates against leg", "Starting too heavy", "Not timing the holds"],
  },
  {
    id: "dumbbell-step-up", name: "Dumbbell Step-Up", category: "legs",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "db-step-up",
    instructions: ["Hold dumbbells at your sides", "Step onto a bench with one foot", "Drive through the heel to stand fully on the bench", "Lower back down with control and repeat"],
    commonMistakes: ["Pushing off the back foot", "Leaning forward", "Box too high for mobility"],
  },
  {
    id: "incline-hammer-curl", name: "Incline Hammer Curl", category: "biceps",
    primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps", "Brachioradialis"],
    equipment: ["dumbbells", "bench"], difficulty: "Intermediate", animationPlaceholder: "incline-hammer-curl",
    instructions: ["Set a bench to 45 degrees and sit back", "Hold dumbbells at your sides with neutral grip", "Curl both dumbbells up keeping palms facing each other", "Lower with control to full extension"],
    commonMistakes: ["Bench angle too upright", "Swinging the weights", "Not going to full extension"],
  },
  {
    id: "cable-kickback", name: "Cable Glute Kickback", category: "glutes",
    primaryMuscle: "Gluteus Maximus", secondaryMuscles: ["Hamstrings"],
    equipment: ["cable_machine"], difficulty: "Beginner", animationPlaceholder: "cable-kickback",
    instructions: ["Attach an ankle cuff to a low cable", "Face the machine and hold for balance", "Kick the working leg straight back squeezing glutes at top", "Return slowly and repeat all reps before switching"],
    commonMistakes: ["Arching the lower back", "Swinging the leg", "Using too much weight"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDIO (15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "running", name: "Running", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Quadriceps", "Calves", "Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "running",
    instructions: ["Start with a warm-up walk or light jog", "Maintain an upright posture with relaxed shoulders", "Land with foot under your hip, not in front", "Breathe rhythmically — in through nose, out through mouth"],
    commonMistakes: ["Over-striding (landing ahead of center of mass)", "Tensing shoulders and upper body", "Starting too fast", "Increasing mileage more than 10% per week"],
  },
  {
    id: "jump-rope", name: "Jump Rope", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Calves", "Shoulders", "Core"],
    equipment: ["jump_rope"], difficulty: "Beginner", animationPlaceholder: "jump-rope",
    instructions: ["Hold handles at hip height with elbows close to sides", "Rotate the rope with wrists, not arms", "Jump just high enough to clear the rope", "Land softly on the balls of your feet"],
    commonMistakes: ["Jumping too high", "Using entire arm to rotate rope", "Landing flat-footed"],
  },
  {
    id: "cycling", name: "Cycling", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Quadriceps", "Glutes", "Calves"],
    equipment: ["stationary_bike"], difficulty: "Beginner", animationPlaceholder: "cycling",
    instructions: ["Adjust seat height so there's a slight knee bend at the bottom", "Pedal at a comfortable cadence (70–90 RPM)", "Vary resistance for different intensity levels", "Maintain upright posture, don't hunch"],
    commonMistakes: ["Seat too high or low", "Gripping handlebars too tightly", "Pedalling with toes only"],
  },
  {
    id: "rowing-machine", name: "Rowing", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Back", "Legs", "Arms", "Core"],
    equipment: ["rowing_machine"], difficulty: "Intermediate", animationPlaceholder: "rowing",
    instructions: ["Drive with legs first (60% of the stroke)", "Lean back slightly, then pull handle to lower chest", "Reverse the motion: arms, lean, then slide", "Keep a smooth, consistent stroke rate"],
    commonMistakes: ["Pulling with arms first", "Hunching the back", "Opening legs and back simultaneously", "Rushing the recovery"],
  },
  {
    id: "burpee", name: "Burpee", category: "cardio",
    primaryMuscle: "Full Body", secondaryMuscles: ["Chest", "Legs", "Core"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "burpee",
    instructions: ["From standing, drop hands to the floor", "Jump or step feet back to plank position", "Do a push-up (optional for easier variation)", "Jump feet to hands and explode up with arms overhead"],
    commonMistakes: ["Not doing the push-up portion", "Landing hard on the jump", "Sagging hips in the plank"],
  },
  {
    id: "box-jump", name: "Box Jump", category: "cardio",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Calves", "Core"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "box-jump",
    instructions: ["Stand in front of a box or platform", "Swing arms back and load your legs", "Jump explosively onto the box, landing softly", "Stand up fully, then step down — don't jump down"],
    commonMistakes: ["Jumping down (stresses joints)", "Box too high for current ability", "Landing with straight legs"],
  },
  {
    id: "battle-ropes", name: "Battle Ropes", category: "cardio",
    primaryMuscle: "Shoulders", secondaryMuscles: ["Core", "Arms", "Cardiovascular System"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "battle-ropes",
    instructions: ["Hold one end of the rope in each hand", "Create alternating waves by moving arms up and down", "Keep core braced and knees slightly bent", "Maintain consistent rhythm for the prescribed time"],
    commonMistakes: ["Standing too upright", "Waves dying before reaching the anchor", "Using only arms without core engagement"],
  },
  {
    id: "stair-climber", name: "Stair Climber", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Quadriceps", "Glutes", "Calves"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "stair-climber",
    instructions: ["Stand upright on the machine, hands lightly on rails", "Step at a steady, controlled pace", "Push through the full foot on each step", "Avoid leaning heavily on the handrails"],
    commonMistakes: ["Leaning on handrails (reduces effectiveness)", "Taking too-small steps", "Hunching forward"],
  },
  {
    id: "high-knees", name: "High Knees", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Hip Flexors", "Core", "Calves"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "high-knees",
    instructions: ["Stand tall and run in place", "Drive knees up to hip height or higher", "Pump arms in sync with legs", "Stay on the balls of your feet"],
    commonMistakes: ["Knees not reaching hip height", "Leaning back", "Landing flat-footed"],
  },
  {
    id: "jumping-jacks", name: "Jumping Jacks", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Shoulders", "Calves"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "jumping-jacks",
    instructions: ["Start standing with arms at sides", "Jump feet apart while raising arms overhead", "Jump feet together while lowering arms", "Maintain a steady rhythm"],
    commonMistakes: ["Arms not going fully overhead", "Landing flat-footed", "Not staying on balls of feet"],
  },
  {
    id: "sled-push", name: "Sled Push", category: "cardio",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Core", "Cardiovascular System"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "sled-push",
    instructions: ["Grip sled handles at about hip height", "Lean into the sled at a 45-degree angle", "Drive through the balls of your feet", "Take quick, powerful steps"],
    commonMistakes: ["Standing too upright", "Steps too long", "Not driving through the full foot"],
  },
  {
    id: "skater-jump", name: "Skater Jump", category: "cardio",
    primaryMuscle: "Gluteus Medius", secondaryMuscles: ["Quadriceps", "Cardiovascular System"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "skater-jump",
    instructions: ["Start on one foot, jump laterally to the opposite foot", "Land softly on the outside foot", "Swing arms naturally for balance", "Continue alternating sides"],
    commonMistakes: ["Not jumping far enough", "Landing too hard", "Not bending the landing knee"],
  },
  {
    id: "swimming", name: "Swimming", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Back", "Shoulders", "Core", "Legs"],
    equipment: ["swimming_pool"], difficulty: "Beginner", animationPlaceholder: "swimming",
    instructions: ["Warm up with easy laps", "Maintain good form — streamlined body position", "Breathe bilaterally (every 3 strokes for freestyle)", "Vary strokes for full-body conditioning"],
    commonMistakes: ["Lifting head too high to breathe", "Kicking too much from the knees", "Not rotating the torso"],
  },
  {
    id: "sprints", name: "Sprint Intervals", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Quadriceps", "Hamstrings", "Glutes"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "sprint-intervals",
    instructions: ["Warm up thoroughly for 5–10 minutes", "Sprint at 90–100% effort for 15–30 seconds", "Walk or light jog for 60–90 seconds to recover", "Repeat for 6–10 rounds"],
    commonMistakes: ["Not warming up properly", "Starting too fast (pacing)", "Too many rounds for fitness level"],
  },
  {
    id: "elliptical", name: "Elliptical Trainer", category: "cardio",
    primaryMuscle: "Cardiovascular System", secondaryMuscles: ["Quadriceps", "Glutes"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "elliptical",
    instructions: ["Stand upright on the pedals", "Push and pull the handles while pedalling", "Maintain a smooth, continuous motion", "Vary resistance for different intensities"],
    commonMistakes: ["Leaning on the handles", "Too-low resistance", "Slouching posture"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BODYWEIGHT (12)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "bodyweight-squat", name: "Bodyweight Squat", category: "bodyweight",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Core"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "bw-squat",
    instructions: ["Stand with feet shoulder-width apart", "Push hips back and bend knees to descend", "Go to at least parallel", "Drive through heels to stand"],
    commonMistakes: ["Knees caving in", "Heels rising", "Not going deep enough"],
  },
  {
    id: "bear-crawl", name: "Bear Crawl", category: "bodyweight",
    primaryMuscle: "Core", secondaryMuscles: ["Shoulders", "Quadriceps"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "bear-crawl",
    instructions: ["Start on all fours with knees hovering off the floor", "Move opposite hand and foot forward together", "Keep hips level and core braced", "Crawl forward for distance or time"],
    commonMistakes: ["Hips too high", "Moving same-side hand and foot", "Core not engaged"],
  },
  {
    id: "superman", name: "Superman", category: "bodyweight",
    primaryMuscle: "Erector Spinae", secondaryMuscles: ["Glutes", "Shoulders"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "superman",
    instructions: ["Lie face down with arms extended overhead", "Lift arms, chest, and legs off the floor simultaneously", "Hold for 2–3 seconds, squeezing the back", "Lower with control"],
    commonMistakes: ["Jerking up too fast", "Only lifting one end", "Not squeezing glutes"],
  },
  {
    id: "inchworm", name: "Inchworm", category: "bodyweight",
    primaryMuscle: "Core", secondaryMuscles: ["Hamstrings", "Shoulders"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "inchworm",
    instructions: ["Stand tall, fold forward and touch the floor", "Walk hands out to a plank position", "Walk feet up to your hands", "Stand up and repeat"],
    commonMistakes: ["Bending knees too much", "Hips sagging in plank", "Moving too fast"],
  },
  {
    id: "broad-jump", name: "Broad Jump", category: "bodyweight",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Calves", "Core"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "broad-jump",
    instructions: ["Stand with feet hip-width apart", "Swing arms back and load the legs", "Jump forward as far as possible", "Land softly with bent knees"],
    commonMistakes: ["Not using arm swing", "Landing with straight legs", "Not absorbing the landing"],
  },
  {
    id: "pistol-squat", name: "Pistol Squat", category: "bodyweight",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Core", "Hip Flexors"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "pistol-squat",
    instructions: ["Stand on one foot with the other leg extended forward", "Lower into a full squat on the standing leg", "Keep the extended leg off the floor throughout", "Drive through the heel to stand back up"],
    commonMistakes: ["Knee caving in", "Not going deep enough", "Losing balance"],
  },
  {
    id: "l-sit", name: "L-Sit", category: "bodyweight",
    primaryMuscle: "Core", secondaryMuscles: ["Hip Flexors", "Triceps"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "l-sit",
    instructions: ["Place hands on parallel bars or the floor", "Press body up with arms locked", "Raise legs straight out in front forming an L", "Hold for time"],
    commonMistakes: ["Legs not straight", "Shoulders shrugging up", "Not locking out arms"],
  },
  {
    id: "jump-squat", name: "Jump Squat", category: "bodyweight",
    primaryMuscle: "Quadriceps", secondaryMuscles: ["Glutes", "Calves"],
    equipment: ["none"], difficulty: "Intermediate", animationPlaceholder: "jump-squat",
    instructions: ["Perform a bodyweight squat", "At the bottom, explode upward into a jump", "Land softly with bent knees", "Immediately descend into the next rep"],
    commonMistakes: ["Landing with straight legs", "Not squatting deep enough", "Knees caving in on landing"],
  },
  {
    id: "muscle-up", name: "Muscle-Up", category: "bodyweight",
    primaryMuscle: "Lats", secondaryMuscles: ["Chest", "Triceps", "Core"],
    equipment: ["pullup_bar"], difficulty: "Advanced", animationPlaceholder: "muscle-up",
    instructions: ["Hang from a bar with a false grip (wrists over the bar)", "Perform an explosive pull-up", "Transition over the bar by driving elbows back", "Press to full lockout above the bar"],
    commonMistakes: ["Not enough explosive pull", "Poor transition technique", "Kipping excessively"],
  },
  {
    id: "crab-walk", name: "Crab Walk", category: "bodyweight",
    primaryMuscle: "Triceps", secondaryMuscles: ["Core", "Glutes", "Shoulders"],
    equipment: ["none"], difficulty: "Beginner", animationPlaceholder: "crab-walk",
    instructions: ["Sit on the floor, place hands behind you", "Lift hips off the floor", "Walk forward using hands and feet", "Keep hips elevated throughout"],
    commonMistakes: ["Hips dropping", "Wrists uncomfortable (try angling hands out)", "Moving same-side limbs together"],
  },
  {
    id: "push-up-clap", name: "Clap Push-Up", category: "bodyweight",
    primaryMuscle: "Pectorals", secondaryMuscles: ["Triceps", "Core"],
    equipment: ["none"], difficulty: "Advanced", animationPlaceholder: "clap-push-up",
    instructions: ["Start in standard push-up position", "Lower your chest to the floor", "Push up explosively to get airborne", "Clap hands quickly and land softly"],
    commonMistakes: ["Not getting enough height", "Landing with locked elbows", "Hips sagging"],
  },
  {
    id: "dragon-flag", name: "Dragon Flag", category: "bodyweight",
    primaryMuscle: "Core", secondaryMuscles: ["Hip Flexors"],
    equipment: ["bench"], difficulty: "Advanced", animationPlaceholder: "dragon-flag",
    instructions: ["Lie on a bench, grip the edge behind your head", "Raise your body up to a vertical position", "Lower your body as a straight plank — slowly", "Only your upper back remains on the bench"],
    commonMistakes: ["Bending at the hips", "Lowering too fast", "Not bracing the core throughout"],
  },
];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => e.category === category);
}

export function searchExercises(query: string): Exercise[] {
  const q = query.toLowerCase();
  return EXERCISES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.primaryMuscle.toLowerCase().includes(q) ||
      e.secondaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
      e.category.includes(q)
  );
}

/**
 * Returns the canonical library name if the input is a case-insensitive
 * exact match for a known exercise, otherwise returns the original string.
 * Prevents "bench press" / "Barbell Bench Press" history splits.
 */
export function normalizeExerciseName(name: string): string {
  const lower = name.toLowerCase().trim();
  const match = EXERCISES.find((e) => e.name.toLowerCase() === lower);
  return match ? match.name : name;
}
