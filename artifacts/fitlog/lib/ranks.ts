export interface Rank {
  tier: number;
  key: string;
  nameKey: string;
  flavorKey: string;
  minXp: number;
  maxXp: number | null; // null for last tier
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const RANKS: Rank[] = [
  { tier: 1,  key: "hollow",           nameKey: "ranks.hollow.name",           flavorKey: "ranks.hollow.flavor",           minXp: 0,      maxXp: 99,     bgColor: "#2a2a3e", borderColor: "#444466", textColor: "#9e9e9e" },
  { tier: 2,  key: "ashWalker",        nameKey: "ranks.ashWalker.name",        flavorKey: "ranks.ashWalker.flavor",        minXp: 100,    maxXp: 299,    bgColor: "#2d2417", borderColor: "#8b6914", textColor: "#c8a84b" },
  { tier: 3,  key: "cinderAcolyte",    nameKey: "ranks.cinderAcolyte.name",    flavorKey: "ranks.cinderAcolyte.flavor",    minXp: 300,    maxXp: 599,    bgColor: "#1e2224", borderColor: "#607d8b", textColor: "#90a4ae" },
  { tier: 4,  key: "moltenApprentice", nameKey: "ranks.moltenApprentice.name", flavorKey: "ranks.moltenApprentice.flavor", minXp: 600,    maxXp: 1199,   bgColor: "#241a10", borderColor: "#a0522d", textColor: "#cd853f" },
  { tier: 5,  key: "basaltWatcher",    nameKey: "ranks.basaltWatcher.name",    flavorKey: "ranks.basaltWatcher.flavor",    minXp: 1200,   maxXp: 2399,   bgColor: "#1a1a1a", borderColor: "#757575", textColor: "#bdbdbd" },
  { tier: 6,  key: "spectralVanguard", nameKey: "ranks.spectralVanguard.name", flavorKey: "ranks.spectralVanguard.flavor", minXp: 2400,   maxXp: 4799,   bgColor: "#1a2030", borderColor: "#90caf9", textColor: "#e3f2fd" },
  { tier: 7,  key: "auricTemplar",     nameKey: "ranks.auricTemplar.name",     flavorKey: "ranks.auricTemplar.flavor",     minXp: 4800,   maxXp: 9599,   bgColor: "#2a2000", borderColor: "#ffd700", textColor: "#ffee58" },
  { tier: 8,  key: "voidColossus",     nameKey: "ranks.voidColossus.name",     flavorKey: "ranks.voidColossus.flavor",     minXp: 9600,   maxXp: 19199,  bgColor: "#0d0d0d", borderColor: "#6a1a6a", textColor: "#ce93d8" },
  { tier: 9,  key: "crimsonChampion",  nameKey: "ranks.crimsonChampion.name",  flavorKey: "ranks.crimsonChampion.flavor",  minXp: 19200,  maxXp: 38399,  bgColor: "#1a0000", borderColor: "#c62828", textColor: "#ef9a9a" },
  { tier: 10, key: "arcaneSovereign",  nameKey: "ranks.arcaneSovereign.name",  flavorKey: "ranks.arcaneSovereign.flavor",  minXp: 38400,  maxXp: 76799,  bgColor: "#0a0a1a", borderColor: "#7c4dff", textColor: "#b39ddb" },
  { tier: 11, key: "theInfinite",      nameKey: "ranks.theInfinite.name",      flavorKey: "ranks.theInfinite.flavor",      minXp: 76800,  maxXp: null,   bgColor: "#0a1a0a", borderColor: "#00e676", textColor: "#b9f6ca" },
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
