/**
 * Unique SVG icons for each of the 11 fantasy ranks.
 * All icons share a 24×24 viewBox and accept a `color` and `size` prop.
 */
import React from "react";
import Svg, { Path, Circle, Line, Rect, Polygon, Ellipse, G } from "react-native-svg";

interface IconProps { color: string; size: number; }

// 1. Hollow — cracked empty orb
export function HollowIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M10 5 L12.5 10 L15 7.5" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12.5 10 L11 13.5" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// 2. Ash Walker — two boot prints
export function AshWalkerIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7 18 C6.5 16 7 13 7.5 11 L9.5 11 C9.8 13.5 9.5 16 10 18 Z"
        fill={color} opacity={0.9}
      />
      <Path d="M7.5 11 L6.5 9.5 L8 9 L9.5 11" fill={color} opacity={0.6} />
      <Path
        d="M14 15 C13.5 13 14 10 14.5 8 L16.5 8 C16.8 10.5 16.5 13 17 15 Z"
        fill={color} opacity={0.9}
      />
      <Path d="M14.5 8 L13.5 6.5 L15 6 L16.5 8" fill={color} opacity={0.6} />
    </Svg>
  );
}

// 3. Cinder Acolyte — armored gauntlet fist
export function IronSeekerIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Knuckles */}
      <Rect x="7" y="5" width="2.2" height="4" rx="1" fill={color} />
      <Rect x="10" y="4" width="2.2" height="5" rx="1" fill={color} />
      <Rect x="13" y="4" width="2.2" height="5" rx="1" fill={color} />
      <Rect x="16" y="5.5" width="2" height="3.5" rx="1" fill={color} />
      {/* Palm */}
      <Rect x="7" y="9" width="11" height="7" rx="2" fill={color} />
      {/* Thumb */}
      <Path d="M7 11 C5.5 10.5 4.5 12 5 13.5 L7 14 Z" fill={color} />
      {/* Armor lines */}
      <Line x1="7" y1="12" x2="18" y2="12" stroke="#000" strokeWidth="0.6" opacity={0.3} />
      <Line x1="7" y1="14" x2="18" y2="14" stroke="#000" strokeWidth="0.6" opacity={0.3} />
      {/* Wrist guard */}
      <Rect x="7" y="16" width="11" height="3" rx="1.5" fill={color} opacity={0.7} />
    </Svg>
  );
}

// 4. Molten Apprentice — anvil with spark
export function BronzeForgerIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Spark */}
      <Path d="M17 2 L18 5 L21 4 L19 7 L22 8 L18.5 8.5 L19 12 L17 9 L14 11 L15.5 8 L13 6.5 L16 6 Z"
        fill={color} opacity={0.85} />
      {/* Anvil top */}
      <Path d="M4 10 L20 10 L20 14 L18 14 L18 12 L6 12 L6 14 L4 14 Z" fill={color} />
      {/* Anvil horn */}
      <Path d="M14 10 L20 8 L20 10 Z" fill={color} opacity={0.8} />
      {/* Anvil body */}
      <Rect x="7" y="14" width="10" height="4" rx="1" fill={color} />
      {/* Anvil base */}
      <Rect x="5" y="18" width="14" height="2.5" rx="1" fill={color} opacity={0.7} />
    </Svg>
  );
}

// 5. Basalt Watcher — shield with runic mark
export function StoneSentinelIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Shield */}
      <Path
        d="M12 2 L21 5.5 L21 12 C21 17.5 12 22 12 22 C12 22 3 17.5 3 12 L3 5.5 Z"
        fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"
      />
      {/* Rune — angular symbol */}
      <Path d="M9 9 L12 7 L15 9 L15 14 L12 16 L9 14 Z"
        stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <Line x1="12" y1="7" x2="12" y2="16" stroke={color} strokeWidth="1.2" />
    </Svg>
  );
}

// 6. Spectral Vanguard — winged helmet
export function SilverVanguardIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Helmet dome */}
      <Path
        d="M6 18 L6 12 C6 7.5 8.5 4 12 4 C15.5 4 18 7.5 18 12 L18 18"
        stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round"
      />
      {/* Visor */}
      <Line x1="6" y1="14" x2="18" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Cheek guards */}
      <Line x1="6" y1="14" x2="6" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="18" y1="14" x2="18" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Left wing */}
      <Path d="M6 12 C4 11 2 9 2 7 C3 8 4 8.5 6 9"
        stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d="M6 10.5 C3.5 9 2 7 2.5 5 C3.5 6.5 4.5 7 6 8"
        stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.7} />
      {/* Right wing */}
      <Path d="M18 12 C20 11 22 9 22 7 C21 8 20 8.5 18 9"
        stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d="M18 10.5 C20.5 9 22 7 21.5 5 C20.5 6.5 19.5 7 18 8"
        stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}

// 7. Auric Templar — upright sword with crossguard
export function GoldTemplarIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Blade */}
      <Path d="M12 2 L13.5 14 L12 15.5 L10.5 14 Z" fill={color} />
      {/* Crossguard */}
      <Rect x="6" y="13" width="12" height="2.5" rx="1.2" fill={color} />
      {/* Handle */}
      <Rect x="11" y="15.5" width="2" height="4.5" rx="1" fill={color} opacity={0.85} />
      {/* Pommel */}
      <Circle cx="12" cy="21.5" r="2" fill={color} />
      {/* Blade shine */}
      <Line x1="12" y1="3" x2="11.2" y2="12" stroke="#fff" strokeWidth="0.6" opacity={0.3} strokeLinecap="round" />
    </Svg>
  );
}

// 8. Void Colossus — skull
export function ObsidianTitanIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Skull dome */}
      <Path
        d="M12 2 C6.5 2 4 6.5 4 11 C4 14.5 6 16.5 8 17 L8 20.5 L16 20.5 L16 17 C18 16.5 20 14.5 20 11 C20 6.5 17.5 2 12 2 Z"
        fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"
      />
      {/* Eye sockets */}
      <Circle cx="9" cy="11" r="2.2" fill={color} />
      <Circle cx="15" cy="11" r="2.2" fill={color} />
      {/* Nasal cavity */}
      <Path d="M11.2 14.5 L12 13.5 L12.8 14.5" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Teeth */}
      <Line x1="9" y1="20.5" x2="9" y2="17.5" stroke={color} strokeWidth="1.4" />
      <Line x1="12" y1="20.5" x2="12" y2="17" stroke={color} strokeWidth="1.4" />
      <Line x1="15" y1="20.5" x2="15" y2="17.5" stroke={color} strokeWidth="1.4" />
    </Svg>
  );
}

// 9. Crimson Champion — dragon head silhouette
export function CrimsonChampionIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Dragon head */}
      <Path
        d="M4 18 C4 18 6 14 8 13 C8 13 7 11 8 9 C9 7 11 6 12 6 C13 6 15 5 17 3 C17 3 16 7 14 8 C16 8 18 9 19 11 C20 13 19 16 17 17 C15 18 13 20 12 21 C10 22 6 20 4 18 Z"
        fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Eye */}
      <Circle cx="14" cy="11" r="1.2" fill={color} />
      {/* Horn */}
      <Path d="M15 6 L18 2 L17 6" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Fire breath */}
      <Path d="M4 18 C2 19 1 21 2 22" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity={0.8} />
      <Path d="M4 18 C3 20 3.5 22 5 22" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

// 10. Arcane Sovereign — all-seeing eye with rays
export function ArcaneSovereignIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Eye rays */}
      <Line x1="12" y1="1" x2="12" y2="4" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.6} />
      <Line x1="19" y1="4" x2="17" y2="6" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.6} />
      <Line x1="5" y1="4" x2="7" y2="6" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.6} />
      {/* Eye outline */}
      <Path
        d="M2 12 C6 5 18 5 22 12 C18 19 6 19 2 12 Z"
        fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"
      />
      {/* Iris */}
      <Circle cx="12" cy="12" r="4" fill="none" stroke={color} strokeWidth="1.4" />
      {/* Pupil */}
      <Circle cx="12" cy="12" r="1.8" fill={color} />
      {/* Inner glow lines */}
      <Line x1="12" y1="8.5" x2="12" y2="10" stroke={color} strokeWidth="0.8" opacity={0.5} strokeLinecap="round" />
      <Line x1="15.5" y1="12" x2="14" y2="12" stroke={color} strokeWidth="0.8" opacity={0.5} strokeLinecap="round" />
    </Svg>
  );
}

// 11. The Infinite — figure rising with crown of rays
export function EternalAscendantIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Crown rays */}
      <Line x1="12" y1="1" x2="12" y2="4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="8" y1="2" x2="9.5" y2="5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="16" y1="2" x2="14.5" y2="5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="5.5" y1="4.5" x2="8" y2="6.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity={0.7} />
      <Line x1="18.5" y1="4.5" x2="16" y2="6.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity={0.7} />
      {/* Head */}
      <Circle cx="12" cy="8" r="2.5" fill="none" stroke={color} strokeWidth="1.6" />
      {/* Body */}
      <Line x1="12" y1="10.5" x2="12" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Arms raised */}
      <Path d="M12 13 L8 11" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M12 13 L16 11" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Legs */}
      <Path d="M12 18 L9.5 22" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M12 18 L14.5 22" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

// Master lookup — tier number → icon component
export const RANK_ICON_MAP: Record<number, React.ComponentType<IconProps>> = {
  1:  HollowIcon,
  2:  AshWalkerIcon,
  3:  IronSeekerIcon,
  4:  BronzeForgerIcon,
  5:  StoneSentinelIcon,
  6:  SilverVanguardIcon,
  7:  GoldTemplarIcon,
  8:  ObsidianTitanIcon,
  9:  CrimsonChampionIcon,
  10: ArcaneSovereignIcon,
  11: EternalAscendantIcon,
};
