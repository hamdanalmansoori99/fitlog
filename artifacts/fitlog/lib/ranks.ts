export interface Rank {
  tier: number;
  name: string;
  minXp: number;
  maxXp: number | null; // null for last tier
  flavorText: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const RANKS: Rank[] = [
  { tier: 1,  name: "Hollow",            minXp: 0,      maxXp: 99,     flavorText: "The unawakened. Your journey hasn't begun.",           bgColor: "#2a2a3e", borderColor: "#444466", textColor: "#9e9e9e" },
  { tier: 2,  name: "Ash Walker",        minXp: 100,    maxXp: 299,    flavorText: "You've taken your first steps into the forge.",         bgColor: "#2d2417", borderColor: "#8b6914", textColor: "#c8a84b" },
  { tier: 3,  name: "Iron Seeker",       minXp: 300,    maxXp: 599,    flavorText: "The iron calls to you. You're finding your path.",      bgColor: "#1e2224", borderColor: "#607d8b", textColor: "#90a4ae" },
  { tier: 4,  name: "Bronze Forger",     minXp: 600,    maxXp: 1199,   flavorText: "The body bends to your will. Keep shaping it.",         bgColor: "#241a10", borderColor: "#a0522d", textColor: "#cd853f" },
  { tier: 5,  name: "Stone Sentinel",    minXp: 1200,   maxXp: 2399,   flavorText: "Endurance etched in stone. You don't break.",           bgColor: "#1a1a1a", borderColor: "#757575", textColor: "#bdbdbd" },
  { tier: 6,  name: "Silver Vanguard",   minXp: 2400,   maxXp: 4799,   flavorText: "You lead the charge. Others watch your form.",          bgColor: "#1a2030", borderColor: "#90caf9", textColor: "#e3f2fd" },
  { tier: 7,  name: "Gold Templar",      minXp: 4800,   maxXp: 9599,   flavorText: "Sworn to the grind. Gold earned through fire.",         bgColor: "#2a2000", borderColor: "#ffd700", textColor: "#ffee58" },
  { tier: 8,  name: "Obsidian Titan",    minXp: 9600,   maxXp: 19199,  flavorText: "Forged in darkness. Nothing stops you now.",            bgColor: "#0d0d0d", borderColor: "#6a1a6a", textColor: "#ce93d8" },
  { tier: 9,  name: "Crimson Champion",  minXp: 19200,  maxXp: 38399,  flavorText: "Blood, sweat, proof. The arena bows.",                  bgColor: "#1a0000", borderColor: "#c62828", textColor: "#ef9a9a" },
  { tier: 10, name: "Arcane Sovereign",  minXp: 38400,  maxXp: 76799,  flavorText: "Beyond mortal limits. The realm feels it.",             bgColor: "#0a0a1a", borderColor: "#7c4dff", textColor: "#b39ddb" },
  { tier: 11, name: "Eternal Ascendant", minXp: 76800,  maxXp: null,   flavorText: "There is no ceiling. You ARE the ceiling.",             bgColor: "#0a1a0a", borderColor: "#00e676", textColor: "#b9f6ca" },
];

export function getRankByXp(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) return RANKS[i];
  }
  return RANKS[0];
}

export function getXpProgress(xp: number): { current: number; needed: number; percent: number } {
  const rank = getRankByXp(xp);
  if (rank.maxXp === null) return { current: xp - rank.minXp, needed: 0, percent: 1 };
  const current = xp - rank.minXp;
  const needed = rank.maxXp - rank.minXp + 1;
  return { current, needed, percent: Math.min(current / needed, 1) };
}
