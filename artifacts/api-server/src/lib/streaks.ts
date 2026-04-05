/**
 * Shared streak-calculation utilities.
 *
 * All functions normalise dates to UTC midnight before comparison so that
 * timezone differences never break the "same calendar day" check.
 */

const DAY_MS = 86_400_000;

/** Normalise a Date to UTC midnight and return its epoch-ms. */
function toUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** De-duplicate and sort an array of epoch-ms day values (descending). */
function uniqueSortedDesc(dates: Date[]): number[] {
  const set = new Set(dates.map(toUTCDay));
  return [...set].sort((a, b) => b - a);
}

/**
 * Compute the current workout streak from an array of Date objects.
 *
 * Counts consecutive calendar days ending at today. If today has no entry
 * the streak may still start from yesterday (i.e. the user still has until
 * end-of-day to keep the streak alive).
 *
 * Returns 0 for an empty array.
 */
export function computeCurrentStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const days = uniqueSortedDesc(dates);
  const today = toUTCDay(new Date());

  let streak = 0;
  let expected = today;

  for (const day of days) {
    if (day === expected) {
      streak++;
      expected -= DAY_MS;
    } else if (streak === 0 && day === today - DAY_MS) {
      // Today has no entry yet — start counting from yesterday
      streak = 1;
      expected = day - DAY_MS;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute the longest-ever streak from an array of Date objects.
 *
 * Scans all dates and returns the length of the longest run of consecutive
 * calendar days.
 *
 * Returns 0 for an empty array.
 */
export function computeLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const set = new Set(dates.map(toUTCDay));
  const days = [...set].sort((a, b) => a - b);

  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === DAY_MS) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

/**
 * Convenience wrapper that returns both current and longest (best) streak.
 * Equivalent to calling computeCurrentStreak + computeLongestStreak and
 * clamping best to at least the current value.
 */
export function computeStreaks(dates: Date[]): { current: number; best: number } {
  const current = computeCurrentStreak(dates);
  const best = Math.max(computeLongestStreak(dates), current);
  return { current, best };
}
