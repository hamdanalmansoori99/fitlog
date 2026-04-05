import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";

interface BodyMuscleMapProps {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  size?: "compact" | "full";
}

// Colors
const BASE_COLOR = "#2a2a3e";
const OUTLINE_COLOR = "#444466";
const INACTIVE_COLOR = "#2a2a3e";
const INACTIVE_OUTLINE = "#3a3a5e";
const PRIMARY_COLOR = "#00e676";
const SECONDARY_COLOR = "#ffab40";

// Front view paths
const FRONT_PATHS: Record<string, string> = {
  chest: "M 38 42 L 62 42 L 60 65 L 40 65 Z",
  abs: "M 40 65 L 60 65 L 58 88 L 42 88 Z",
  shoulders_front_left: "M 20 38 L 32 38 L 30 52 L 18 50 Z",
  shoulders_front_right: "M 68 38 L 80 38 L 82 50 L 70 52 Z",
  biceps_left: "M 20 52 L 30 52 L 29 70 L 21 70 Z",
  biceps_right: "M 70 52 L 80 52 L 79 70 L 71 70 Z",
  forearms_front_left: "M 21 72 L 29 72 L 28 100 L 22 100 Z",
  forearms_front_right: "M 71 72 L 79 72 L 78 100 L 72 100 Z",
  quads_left: "M 32 106 L 47 106 L 46 148 L 33 148 Z",
  quads_right: "M 53 106 L 68 106 L 67 148 L 54 148 Z",
  calves_front_left: "M 33 151 L 46 151 L 45 188 L 34 188 Z",
  calves_front_right: "M 54 151 L 67 151 L 66 188 L 55 188 Z",
};

// Back view paths
const BACK_PATHS: Record<string, string> = {
  back_lats: "M 35 42 L 65 42 L 68 80 L 32 80 Z",
  glutes: "M 30 90 L 70 90 L 68 106 L 32 106 Z",
  hamstrings_left: "M 32 106 L 47 106 L 46 148 L 33 148 Z",
  hamstrings_right: "M 53 106 L 68 106 L 67 148 L 54 148 Z",
  triceps_left: "M 18 52 L 30 52 L 29 74 L 17 74 Z",
  triceps_right: "M 70 52 L 82 52 L 83 74 L 71 74 Z",
  calves_back_left: "M 33 151 L 46 151 L 45 188 L 34 188 Z",
  calves_back_right: "M 54 151 L 67 151 L 66 188 L 55 188 Z",
  shoulders_back_left: "M 20 38 L 33 38 L 32 52 L 18 50 Z",
  shoulders_back_right: "M 67 38 L 80 38 L 82 50 L 68 52 Z",
  trapezius: "M 40 32 L 60 32 L 64 42 L 36 42 Z",
};

// Muscle name → front path keys
const MUSCLE_TO_FRONT: Record<string, string[]> = {
  chest: ["chest"],
  abs: ["abs"],
  shoulders: ["shoulders_front_left", "shoulders_front_right"],
  biceps: ["biceps_left", "biceps_right"],
  triceps: [],
  forearms: ["forearms_front_left", "forearms_front_right"],
  legs: ["quads_left", "quads_right"],
  glutes: [],
  back: [],
  calves: ["calves_front_left", "calves_front_right"],
  cardio: [],
  bodyweight: [],
};

// Muscle name → back path keys
const MUSCLE_TO_BACK: Record<string, string[]> = {
  back: ["back_lats", "trapezius"],
  glutes: ["glutes"],
  legs: ["hamstrings_left", "hamstrings_right"],
  triceps: ["triceps_left", "triceps_right"],
  shoulders: ["shoulders_back_left", "shoulders_back_right"],
  calves: ["calves_back_left", "calves_back_right"],
  chest: [],
  abs: [],
  biceps: [],
  forearms: ["forearms_front_left", "forearms_front_right"],
  cardio: [],
  bodyweight: [],
};

const MUSCLE_ALIASES: Record<string, string> = {
  // Chest
  "pectoralis major": "chest", "pectorals": "chest",
  "upper pectorals": "chest", "lower pectorals": "chest", "inner pectorals": "chest",
  "upper chest": "chest",
  // Back
  "latissimus dorsi": "back", "lats": "back", "lower lats": "back",
  "rhomboids": "back", "erector spinae": "back", "middle back": "back",
  "trapezius": "back", "upper trapezius": "back", "lower traps": "back",
  "traps": "back", "upper traps": "back", "teres major": "back",
  // Shoulders
  "front deltoids": "shoulders", "rear deltoids": "shoulders",
  "side deltoids": "shoulders", "deltoids": "shoulders",
  "rotator cuff": "shoulders", "external rotators": "shoulders",
  // Legs
  "quadriceps": "legs", "hamstrings": "legs",
  "adductors": "legs", "hip flexors": "legs",
  // Glutes
  "gluteus maximus": "glutes", "gluteus medius": "glutes", "gluteus minimus": "glutes",
  // Biceps
  "biceps brachii": "biceps", "biceps brachii (long head)": "biceps",
  "biceps brachii (short head)": "biceps", "brachialis": "biceps",
  // Triceps
  "triceps (long head)": "triceps", "triceps (lateral head)": "triceps",
  "triceps (medial head)": "triceps",
  // Forearms
  "forearm flexors": "forearms", "forearm extensors": "forearms",
  "brachioradialis": "forearms",
  // Calves
  "gastrocnemius": "calves", "soleus": "calves",
  // Abs
  "rectus abdominis": "abs", "obliques": "abs",
  "transverse abdominis": "abs", "core": "abs", "lower abs": "abs",
  // Cardio / Full Body
  "cardiovascular system": "cardio", "full body": "bodyweight",
};

function normalizeMuscle(name: string): string {
  const lower = name.toLowerCase().trim();
  return MUSCLE_ALIASES[lower] ?? lower;
}

function buildHighlightMap(
  primaryMuscles: string[],
  secondaryMuscles: string[],
  muscleMap: Record<string, string[]>
): Record<string, "primary" | "secondary"> {
  const result: Record<string, "primary" | "secondary"> = {};
  for (const m of secondaryMuscles) {
    const paths = muscleMap[normalizeMuscle(m)] ?? [];
    for (const p of paths) result[p] = "secondary";
  }
  // Primary overwrites secondary
  for (const m of primaryMuscles) {
    const paths = muscleMap[normalizeMuscle(m)] ?? [];
    for (const p of paths) result[p] = "primary";
  }
  return result;
}

interface BodySvgProps {
  highlights: Record<string, "primary" | "secondary">;
  pathDefs: Record<string, string>;
  svgSize: number;
}

function BodySvg({ highlights, pathDefs, svgSize }: BodySvgProps) {
  const scale = svgSize / 100;
  const height = 220 * scale;

  return (
    <Svg width={svgSize} height={height} viewBox="0 0 100 220">
      {/* Head */}
      <Circle cx={50} cy={18} r={12} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Neck */}
      <Rect x={45} y={30} width={10} height={8} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Torso */}
      <Rect x={32} y={38} width={36} height={50} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Upper arms */}
      <Rect x={18} y={38} width={12} height={35} rx={4} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      <Rect x={70} y={38} width={12} height={35} rx={4} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Forearms */}
      <Rect x={19} y={74} width={10} height={28} rx={3} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      <Rect x={71} y={74} width={10} height={28} rx={3} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Hips */}
      <Rect x={30} y={88} width={40} height={16} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Upper legs */}
      <Rect x={30} y={104} width={18} height={45} rx={4} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      <Rect x={52} y={104} width={18} height={45} rx={4} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      {/* Lower legs */}
      <Rect x={31} y={150} width={16} height={40} rx={3} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />
      <Rect x={53} y={150} width={16} height={40} rx={3} fill={BASE_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1} />

      {/* Muscle region overlays */}
      {Object.entries(pathDefs).map(([key, d]) => {
        const highlight = highlights[key];
        if (!highlight) {
          return (
            <Path
              key={key}
              d={d}
              fill={INACTIVE_COLOR}
              stroke={INACTIVE_OUTLINE}
              strokeWidth={0.5}
              opacity={0}
            />
          );
        }
        const fill = highlight === "primary" ? PRIMARY_COLOR : SECONDARY_COLOR;
        return (
          <Path
            key={key}
            d={d}
            fill={fill}
            stroke={fill}
            strokeWidth={0.5}
            opacity={0.72}
          />
        );
      })}
    </Svg>
  );
}

export default function BodyMuscleMap({
  primaryMuscles,
  secondaryMuscles,
  size = "compact",
}: BodyMuscleMapProps) {
  const svgSize = size === "compact" ? 80 : 130;

  const frontHighlights = buildHighlightMap(primaryMuscles, secondaryMuscles, MUSCLE_TO_FRONT);
  const backHighlights = buildHighlightMap(primaryMuscles, secondaryMuscles, MUSCLE_TO_BACK);

  return (
    <View style={{ flexDirection: "row", gap: 16, justifyContent: "center", alignItems: "center" }}>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 10, color: "#9e9e9e", marginBottom: 4, fontFamily: "Inter_500Medium", letterSpacing: 0.5 }}>
          FRONT
        </Text>
        <BodySvg highlights={frontHighlights} pathDefs={FRONT_PATHS} svgSize={svgSize} />
      </View>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 10, color: "#9e9e9e", marginBottom: 4, fontFamily: "Inter_500Medium", letterSpacing: 0.5 }}>
          BACK
        </Text>
        <BodySvg highlights={backHighlights} pathDefs={BACK_PATHS} svgSize={svgSize} />
      </View>
    </View>
  );
}
