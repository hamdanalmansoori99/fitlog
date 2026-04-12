/**
 * Ramadan utilities — fasting period detection and prayer times.
 *
 * Approximate Ramadan dates are hardcoded for the next few years.
 * For prayer times we call the free Aladhan API.
 */

// Approximate Ramadan start/end in Gregorian (may vary ±1 day by region).
const RAMADAN_DATES: { year: number; start: string; end: string }[] = [
  { year: 2025, start: "2025-02-28", end: "2025-03-30" },
  { year: 2026, start: "2026-02-17", end: "2026-03-19" },
  { year: 2027, start: "2027-02-07", end: "2027-03-08" },
  { year: 2028, start: "2028-01-27", end: "2028-02-25" },
  { year: 2029, start: "2029-01-15", end: "2029-02-13" },
];

export function isRamadan(date: Date = new Date()): boolean {
  const iso = date.toISOString().slice(0, 10);
  for (const r of RAMADAN_DATES) {
    if (iso >= r.start && iso <= r.end) return true;
  }
  return false;
}

export function getRamadanInfo(date: Date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  for (const r of RAMADAN_DATES) {
    if (iso >= r.start && iso <= r.end) {
      const dayNum = Math.ceil(
        (date.getTime() - new Date(r.start).getTime()) / 86400000
      ) + 1;
      const totalDays = Math.ceil(
        (new Date(r.end).getTime() - new Date(r.start).getTime()) / 86400000
      ) + 1;
      return { isRamadan: true, day: dayNum, totalDays, startDate: r.start, endDate: r.end };
    }
  }
  return { isRamadan: false, day: 0, totalDays: 0, startDate: "", endDate: "" };
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

/**
 * Fetch prayer times from the free Aladhan API.
 * Falls back to approximate UAE times if the API is unreachable.
 */
export async function getPrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date()
): Promise<PrayerTimes> {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=4`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error("Aladhan API error");
    const json = await res.json();
    const t = json.data.timings;
    return {
      Fajr: t.Fajr,
      Sunrise: t.Sunrise,
      Dhuhr: t.Dhuhr,
      Asr: t.Asr,
      Maghrib: t.Maghrib,
      Isha: t.Isha,
    };
  } catch {
    // Fallback: approximate Abu Dhabi times
    return {
      Fajr: "05:00",
      Sunrise: "06:20",
      Dhuhr: "12:25",
      Asr: "15:40",
      Maghrib: "18:15",
      Isha: "19:35",
    };
  }
}

/**
 * Get fasting window for water reminder adjustments.
 * Returns the suhoor cutoff (Fajr) and iftar time (Maghrib).
 */
export function getFastingWindow(prayerTimes: PrayerTimes) {
  return {
    suhoorEnd: prayerTimes.Fajr,
    iftarTime: prayerTimes.Maghrib,
  };
}
