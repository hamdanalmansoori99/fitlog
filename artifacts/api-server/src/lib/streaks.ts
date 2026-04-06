/**
 * Shared streak-calculation utilities.
 *
 * All functions normalise dates to UTC midnight before comparison so that
 * timezone differences never break the "same calendar day" check.
 *
 * Rest-day support: pass an optional `restDays` array of day-of-week
 * numbers (0 = Sunday … 6 = Saturday). Rest days are skipped when
 * checking for consecutive-day streaks — they neither count as workout
 * days nor break the streak.
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

/** Return the JS day-of-week (0=Sun … 6=Sat) for a UTC-midnight epoch-ms. */
function dayOfWeek(epochMs: number): number {
  return new Date(epochMs).getUTCDay();
}

/**
 * Compute the current workout streak from an array of Date objects.
 *
 * Counts consecutive calendar days ending at today. If today has no entry
 * the streak may still start from yesterday (i.e. the user still has until
 * end-of-day to keep the streak alive).
 *
 * When `restDays` is provided, rest days are transparently skipped — they
 * don't increment the streak counter and they don't break it.
 *
 * Returns 0 for an empty array.
 */
export function computeCurrentStreak(dates: Date[], restDays?: number[]): number {
  if (dates.length === 0) return 0;

  const days = uniqueSortedDesc(dates);
  const workoutDaySet = new Set(days);
  const restSet = restDays ? new Set(restDays) : undefined;
  const today = toUTCDay(new Date());

  let streak = 0;
  let cursor = today;

  // Walk backward day-by-day from today
  // Allow starting from yesterday if today has no entry yet (grace window)
  let started = false;

  while (true) {
    const isRest = restSet?.has(dayOfWeek(cursor));

    if (workoutDaySet.has(cursor)) {
      streak++;
      started = true;
      cursor -= DAY_MS;
    } else if (isRest) {
      // Rest day — skip without breaking or counting
      cursor -= DAY_MS;
      // If we haven't started yet, keep looking backward
    } else if (!started && cursor === today) {
      // Today has no entry and isn't a rest day — try yesterday (grace window)
      cursor -= DAY_MS;
    } else {
      // Non-rest, non-workout day — streak is broken
      break;
    }

    // Safety: don't walk more than a year back
    if (today - cursor > 366 * DAY_MS) break;
  }

  return streak;
}

/**
 * Compute the longest-ever streak from an array of Date objects.
 *
 * Scans all dates and returns the length of the longest run of consecutive
 * calendar days (skipping rest days when provided).
 *
 * Returns 0 for an empty array.
 */
export function computeLongestStreak(dates: Date[], restDays?: number[]): number {
  if (dates.length === 0) return 0;

  const set = new Set(dates.map(toUTCDay));
  const days = [...set].sort((a, b) => a - b);

  if (days.length === 0) return 0;

  const restSet = restDays ? new Set(restDays) : undefined;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    const gap = days[i] - days[i - 1];

    if (gap === DAY_MS) {
      // Consecutive day — extend the streak
      current++;
    } else if (restSet && gap > DAY_MS) {
      // Check if every day in the gap is a rest day
      let allRest = true;
      for (let d = days[i - 1] + DAY_MS; d < days[i]; d += DAY_MS) {
        if (!restSet.has(dayOfWeek(d))) {
          allRest = false;
          break;
        }
      }
      if (allRest) {
        current++;
      } else {
        current = 1;
      }
    } else {
      current = 1;
    }

    if (current > longest) longest = current;
  }

  return longest;
}

/**
 * Convenience wrapper that returns both current and longest (best) streak.
 * Equivalent to calling computeCurrentStreak + computeLongestStreak and
 * clamping best to at least the current value.
 */
export function computeStreaks(dates: Date[], restDays?: number[]): { current: number; best: number } {
  const current = computeCurrentStreak(dates, restDays);
  const best = Math.max(computeLongestStreak(dates, restDays), current);
  return { current, best };
}
