# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: FitLog

A full-featured mobile fitness tracking PWA built with Expo React Native. Features workout logging (8 activity types), meal tracking with macros, progress analytics, body measurements, a beautiful dark-mode UI, a smart fitness coach system with personalised workout recommendations, weekly plan generation, and a 25+ template library. Also includes: smart meal logging intelligence, saved workout templates, a gamification system (streaks, badges, personal records, weekly score), and UI enhancements including shimmer skeleton loading, animated success overlays, contextual empty states, and staggered spring animations.

PWA features: manifest.json with 10 icon sizes (72–512px + apple-touch-icon), service worker with cache-first/network-first/stale-while-revalidate strategies, iOS standalone mode meta tags, install prompt banner (BeforeInstallPromptEvent), and app shortcuts (Log Workout, Log Meal). Key PWA files: `public/manifest.json`, `public/sw.js`, `public/icons/`, `app/+html.tsx`, `hooks/useInstallPrompt.ts`, `hooks/useServiceWorker.ts`, `components/InstallBanner.tsx`.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Mobile**: Expo React Native (web/iOS/Android)
- **State**: Zustand + React Query
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   └── fitlog/             # Expo React Native mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
└── pnpm-workspace.yaml
```

## FitLog App (`artifacts/fitlog`)

### Screens
- **Login / Register** — `app/auth/login.tsx`, `app/auth/register.tsx`
- **Home** — `app/(tabs)/index.tsx` — today stats, "Today's Recommended Workout" AI card, weekly bar chart, recent activity, FAB for quick logging
- **Workouts (Coach Hub)** — `app/(tabs)/workouts.tsx` — today's suggestion, recommendations carousel, quick-log row, template browser, workout history
- **Coach Onboarding** — `app/workouts/onboarding.tsx` — 7-step animated setup (equipment, location, goals, days, duration, experience, preferences)
- **Workout Template** — `app/workouts/template.tsx` — full workout preview, exercises with sets/reps, equipment substitutions, benefits, log CTA
- **Weekly Plan** — `app/workouts/plan.tsx` — AI-generated 7-day plan with mark-done and save
- **Log Workout** — `app/workouts/log.tsx` — 8 activity types with activity-specific fields, gym exercise tracker with autocomplete
- **Meals** — `app/(tabs)/meals.tsx` — date navigation, calorie summary with progress ring, per-category view
- **Add Meal** — `app/meals/add.tsx` — multi-item food logging with macros
- **Progress** — `app/(tabs)/progress.tsx` — streaks, activity breakdown, weight chart, nutrition stats, PRs
- **Profile** — `app/(tabs)/profile.tsx` — personal info, fitness goals, daily targets, settings
- **Add Measurement** — `app/measurements/add.tsx`
- **Add Equipment** — `app/equipment/add.tsx`

### Smart Coach System
- `lib/workoutTemplates.ts` — 25+ workout templates (bodyweight, dumbbells, barbell, bands, kettlebells, sport-specific)
- `lib/coachEngine.ts` — recommendation scoring algorithm (equipment match, goal alignment, difficulty, duration, recency), weekly plan generator, substitution suggestions, benefit descriptions

### Key Files
- `constants/colors.ts` — dark/light theme colors
- `hooks/useTheme.ts` — theme hook
- `store/authStore.ts` — Zustand auth state
- `store/settingsStore.ts` — Zustand settings
- `lib/api.ts` — API client
- `components/ui/` — Card, Button, Input, Toast
- `components/StatCard.tsx` — stat display
- `components/WeeklyBarChart.tsx` — SVG bar chart
- `components/ActivityItem.tsx` — recent activity list item

### Design System
- Background: `#0f0f1a`, Cards: `#1a1a2e`
- Primary green: `#00e676`, Secondary blue: `#448aff`
- Font: Inter (400/500/600/700)
- Dark mode first, light mode supported

### Auth
- Custom SHA-256 password hashing + session tokens
- Stored in Zustand + AsyncStorage (persisted)

## API Server (`artifacts/api-server`)

### Routes
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user
- `GET/PUT /api/profile` — user profile
- `GET/POST /api/workouts` — workout CRUD
- `GET /api/workouts/stats/today` — today's stats
- `GET /api/workouts/stats/weekly` — 7-day activity chart data
- `GET /api/workouts/stats/summary` — workout summary for progress
- `GET /api/workouts/recent` — recent activity feed
- `GET/POST /api/meals` — meal CRUD with food items
- `GET /api/meals/stats/nutrition` — nutrition statistics
- `GET/POST /api/equipment` — equipment CRUD
- `GET/POST /api/measurements` — body measurements CRUD
- `GET /api/progress/streaks` — workout/meal streaks
- `GET /api/progress/records` — personal records
- `GET/PUT /api/settings` — user settings
- `GET/POST/DELETE /api/water/...` — water intake tracking
- `GET /api/recovery/today` — today's recovery log
- `GET /api/recovery/recent` — last 7 days of recovery logs
- `POST /api/recovery/log` — upsert today's recovery (sleep, energy, soreness, stress)

### Auth
- `requireAuth` middleware checks `Authorization: Bearer <token>` header
- Sessions stored in `sessions` table with 30-day expiry
- `requireRole(role)` middleware enforces `user → premium → admin` hierarchy (see `src/middleware/requireRole.ts`)

### Service Layer (`src/services/`)
- `workoutService.ts` — workout CRUD + personal records (extracted from routes)
- `mealService.ts` — meal CRUD + macro aggregation + recent food names
- `analyticsService.ts` — fire-and-forget `trackEvent(userId, eventType, properties)` — never throws

### Feature Flags (`src/lib/features.ts`)
- `hasFeature(role, feature)` — checks access by role
- `getPlanLimits(role)` — returns `{maxSavedTemplates, maxFavoriteMeals, aiRequestsPerDay, dataRetentionDays}`
- `getUserTier(role)` — returns `"free" | "premium" | "admin"`
- All current users default to `"user"` role; `"premium"` and `"admin"` gates exist for future use

## Database Schema

Tables: `users` (with `role` column), `sessions`, `profiles`, `workouts`, `workout_exercises`, `workout_sets`, `meals`, `meal_food_items`, `equipment`, `body_measurements`, `settings`, `water_logs`, `recovery_logs`, `conversations`, `messages`, `achievements`, `user_workout_templates`, `favorite_meals`, `analytics_events`

### Performance Indexes
- `workouts`: `(user_id, date)`, `(user_id)`, `(date)`
- `meals`: `(user_id, date)`, `(user_id)`, `(date)`
- `workout_exercises`: `(workout_id)`, `(name)`
- `workout_sets`: `(exercise_id)`, `(weight_kg)`
- `meal_food_items`: `(meal_id)`, `(name)`
- `analytics_events`: `(user_id)`, `(event_type)`, `(created_at)`, `(user_id, event_type)`
- `sessions`: `(user_id)`, `(expires_at)`

### Analytics Events Schema
`analytics_events(id, user_id, event_type, properties jsonb, platform, app_version, session_id, created_at)`
Event types tracked: `workout.logged`, `meal.logged`, `achievement.earned`, `template.saved`, `water.logged`, `photo.analyzed`, `ai_coach.queried`, `measurement.logged`, `recovery.logged`

### Admin Readiness
- `role` column on users (`"user" | "premium" | "admin"`, default `"user"`)
- `requireRole("admin")` middleware ready to gate any future admin routes
- `analytics_events` table feeds a future admin dashboard (queries by event_type, date range, user cohort)

## Subscription / Plan System

### Plan catalog — `artifacts/api-server/src/lib/plans.ts`
Single source of truth for plan definitions. Two plans defined:
- **Free** — AI coach, 25+ templates, 10 saved plans, 20 favourite meals, 50 AI req/day
- **Premium** — Everything + AI photo analysis, advanced analytics, advanced nutrition, smart progression, deeper recovery, unlimited templates/favourites, data export, barcode scanner, priority support

`PLANS`, `getPlan(key)`, `hasFeatureForPlan(key, feature)`, `getLimitsForPlan(key)`, `getEffectivePlanKey(role, planKey)` — all exported.

### DB — `user_subscriptions` table
One row per user. Columns: `plan_key`, `status` (active/trialing/cancelled/expired), `trial_ends_at`, `period_start`, `period_end`, `cancelled_at`, `external_id` (Stripe sub ID), `external_customer_id` (Stripe customer ID). All existing users backfilled to `free/active`.

### Subscription service — `src/services/subscriptionService.ts`
- `getActiveSubscription(userId, role)` — returns plan + features + limits + upgrade flag
- `ensureFreeSubscription(userId)` — idempotent, called on register
- `setSubscriptionPlan(userId, planKey, opts)` — upserts on conflict; call from Stripe webhook
- `cancelSubscription(userId)` — marks cancelled at period end

### API endpoint — `GET /api/subscription`
Returns: `{ plan, subscription, features, limits, upgradeAvailable, availablePlans }`. All `Infinity` limits serialized as `null` for JSON safety.

### Feature flags — `src/lib/features.ts`
- `hasPlanFeature(role, planKey, feature)` — combines role override + plan lookup
- `getEffectiveLimits(role, planKey)` — returns limit set
- `isUpgradeAvailable(role, planKey)` — whether upgrade CTA should show

### Frontend
- `api.getSubscription()` in `lib/api.ts`
- Settings tab in `profile.tsx` shows a **Plan card** with current plan badge, upgrade CTA ("Coming soon") when on Free plan

### Wiring Stripe (when ready)
1. Add Stripe integration (see integrations skill)
2. Create a checkout route that creates a Stripe session
3. Add a webhook route that calls `setSubscriptionPlan(userId, "premium", { externalId, periodEnd })`
4. Gate premium routes with `requireRole("premium")` or `hasPlanFeature` checks

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Always typecheck from root with `pnpm run typecheck`.

## Goal-Based Insights

`lib/goalInsights.ts` — pure client-side engine that takes already-fetched data and produces `GoalInsight[]` cards per fitness goal:
- **Lose Weight**: calorie trend, weekly deficit estimate, workout consistency, cardio mix
- **Build Muscle**: protein intake, gym frequency, weight progression (from PRs), recovery quality
- **Improve Endurance**: weekly cardio minutes (vs 150 min WHO target), active days, activity variety, monthly volume
- **Improve Flexibility**: mobility session frequency, stretching consistency, monthly total, soreness/recovery synergy
- **Stay Active**: active days, week-over-week, activity variety, monthly total

`components/GoalInsightsPanel.tsx` — renders goal sections with collapsible headers, 2-column insight cards (icon, value, progress bar, trend arrow, detail text). `compact` prop shows top 2 per goal (dashboard). Full mode (progress page) shows all 4.

## Health Integration Architecture

`lib/healthIntegration.ts` — Apple Health & Google Fit ready stub module:
- Full TypeScript type definitions for `HealthWorkout`, `HealthBodyMeasurement`, `HealthStepCount`, `HealthSleep`, `HealthHeartRate`
- `getHealthPlatform()` — returns `"apple_health" | "health_connect" | "none"`
- `requestHealthPermissions()` / `getHealthPermissions()` — stub permission flow
- Read stubs: `fetchHealthWorkouts()`, `fetchLatestWeight()`, `fetchStepCounts()`, `fetchSleepData()`, `fetchHeartRateData()`
- Write stubs: `writeWorkoutToHealth()`, `writeWaterIntakeToHealth()`
- `getImportableWorkouts()` — diff helper for future Health → FitLog import flow
- All stubs return empty/null with documented TODO comments for native SDK wiring

## Cache Invalidation Pattern

All mutations that modify state invalidate the full set of affected query keys:

**Workout mutations** (`log.tsx`, `execute.tsx`, `workouts.tsx` delete) invalidate:
`workouts`, `todayStats`, `weeklyStats`, `workoutSummary`, `recentActivity`, `streaks`, `achievements`

**Meal mutations** (`meals/add.tsx` create; `meals.tsx` delete/duplicate/logFav) invalidate via `invalidateMealRelated()` helper:
`meals`, `mealsToday`, `todayStats`, `nutritionStats`, `streaks`, `achievements`

## AI Coach Context

`POST /api/coach/message` builds a rich system prompt including:
- User profile (goals, experience, equipment, location, duration preference, weekly days)
- Recent 20 workouts (last 30 days with days-ago labels)
- **Today's nutrition** — meals logged, calories, protein, carbs, fat vs. goals
- All 25+ workout template names (so coach can make precise in-app references)

## Full Product Pass Fixes (March 2026)

**Routing & Navigation:**
- `_layout.tsx` now registers all screens: `achievements`, `workouts/execute`, `workouts/my-templates`, `workouts/user-template` (were missing)
- `_layout.tsx` now redirects unauthenticated users to `/auth/login` and users with `onboardingComplete=false` to `/onboarding` (first-run detection)
- `WorkoutHistoryCard` in the Workouts tab is now tappable — tapping navigates to `/workouts/[id]` (delete trash icon still works separately)
- Meal cards in the Meals tab are now tappable — tapping navigates to `/meals/[id]` (star/copy/delete icons still work separately via event isolation)

**Detail Screens (were blank stubs):**
- `workouts/[id].tsx` — Full workout detail: header (name, date, type), stat pills (duration, distance, calories, mood), notes, exercises list with sets table (weight/reps/time, RPE, completion), delete with confirmation
- `meals/[id].tsx` — Full meal detail: header (name, category, date), calorie total, macro bars (protein/carbs/fat), notes, food items list with per-item macros, delete with confirmation, quick "log another" button

**Profile Screen:**
- BMR calculation now uses gender-correct Mifflin-St Jeor: Female = `10w + 6.25h − 5a − 161`, Male/Other = `10w + 6.25h − 5a + 5` (was always using male formula)
- `useQuery onSuccess` removed (React Query v5 removed this callback) — replaced with `useEffect` watching `profile` data

**API Client:**
- Added `getWorkout(id: number)` → `GET /workouts/:id`
- Added `getMeal(id: number)` → `GET /meals/:id`

## Smart Coach Engine Overhaul (March 2026 — Session 5)

**Template equipment accuracy fixes:**
- `db-upper-body` — `requiredEquipment` corrected from `["dumbbells"]` to `["dumbbells", "bench"]` (uses Dumbbell Bench Press + Incline Press, both require a bench)
- `db-hypertrophy` — same fix (uses Dumbbell Bench Press + Incline Dumbbell Fly, both require bench)
- `push-pull-legs` — exercise name `"Cable Fly / Dumbbell Fly"` corrected to `"Cable / Dumbbell Fly"` to match the substitution DB key (was silently unmatched)

**Missing substitutions added to `EXERCISE_SUBSTITUTIONS`:**
- `"Romanian Deadlift"` → needs barbell → dumbbell RDL, kettlebell deadlift, bodyweight hip hinge
- `"Deadlift"` → needs barbell → same alternatives as above
- `"Shoulder Press"` → needs barbell → dumbbell shoulder press, pike push-up, band shoulder press
- `"Lateral Raise"` → needs dumbbells → band lateral raise, arm circles
- `"Dumbbell Squat"` → needs dumbbells → bodyweight squat, band squat
- `"Dumbbell Curl"` → needs dumbbells → band curl, chin-up
- `"Dumbbell Incline Press"` → needs bench → floor press, pike push-up
- `"Cable Fly / Dumbbell Fly"` → alias pointing to cable_machine subs (for templates using that legacy name)

**`getRecommendations` — recency avoidance rewritten:**
- Was: penalised by raw `activityType` (e.g. any 2 gym sessions = same penalty whether upper/upper or upper/lower)
- Now: computes actual muscle groups worked in the last 7 days using `inferMuscleGroupsFromWorkout`, then penalises templates that overlap those groups (`-20` for 2+ group overlap, `-8` for 1 group overlap)
- Activity-type penalty retained but threshold raised (≥4 repeats before heavy penalty) — stops discouraging valid variety like gym upper + gym lower

**`generateWeeklyPlan` — full rewrite with muscle-group rotation:**
- Candidate pool expanded: 20 recs (was 12) to give the algorithm more to rotate
- Each workout slot now picks the highest-scored available template that **minimises muscle group overlap with the previous two slots** — prevents consecutive upper/upper or lower/lower days
- Difficulty adapts to history:
  - `isReturning`: user did <2 workouts in last 14 days → prefers Beginner templates, notes say "easing back in"
  - `isConsistent`: user hit weekly target → rewards Intermediate/Advanced templates
- Rest day notes retained as-is; muscle group context is preserved across rest days (1 rest day ≠ full recovery)

**`plan.tsx` — workout name now included in recentWorkouts:**
- Was: `{ activityType, date, durationMinutes }` — name was missing
- Now: `{ name, activityType, date, durationMinutes }` — muscle group inference from workout name now works correctly in the plan screen

**`measurements/edit.tsx` pre-existing import bug fixed:**
- `@/hooks/useToast` → `@/components/ui/Toast` (correct path)

## Schema Consistency Audit (March 2026 — Session 4)

**Bug Fixes:**
- `sessionsTable.userId` — changed from `serial()` to `integer()`. `serial` auto-generates values and must never be used for FK columns
- `conversations` / `messages` — renamed to `conversationsTable` / `messagesTable` to match the `*Table` convention used by every other table. Backward-compat aliases kept as `@deprecated` exports so nothing breaks silently

**Indexes Added (all missing):**
- `equipment`: `(userId)`
- `recovery_logs`: `(userId)` + `(userId, date)` composite
- `body_measurements`: `(userId)` + `(userId, date)` composite
- `achievements`: `(userId)`
- `water_logs`: `(userId)` + `(userId, loggedAt)` composite
- `user_workout_templates`: `(userId)`
- `favorite_meals`: `(userId)`
- `conversations`: `(userId)`
- `messages`: `(conversationId)`

**Data Integrity:**
- `achievementsTable` — added `unique("achievements_user_id_key_uniq").on(userId, key)` — prevents duplicate badge awards
- `bodyMeasurementsTable` — added `updatedAt` field (was missing, inconsistent with all other tables that have edit endpoints)

**TypeScript Fixes (surfaced by dist rebuild):**
- `parseInt(req.params.id)` → `parseInt(req.params.id as string)` across all route files (`measurements`, `equipment`, `meals`, `meal-favorites`, `user-templates`, `water`, `workouts`)
- `return res.status(X).json(...)` early-exit pattern replaced with `res.status(X).json(...); return;` across `meal-favorites`, `user-templates`, `water` — Express 5 returns `Response` from `.json()` causing TS7030 mixed-return-type errors

**Schema push:** `drizzle-kit push --force` applied all changes to the live database.

## Audit Fixes (March 2026 — Session 3)

**Progress / Streaks:**
- `calcLongestStreak()` added to `progress.ts` — correctly iterates all historical dates in ascending order to find the true maximum consecutive run (was just returning `currentWorkoutStreak`)
- `/progress/records` — removed arbitrary `.slice(0, 3)` cap so ALL unique exercises get PR records computed, not just the first three

**Measurements:**
- `GET /measurements/:id` endpoint added
- `PUT /measurements/:id` endpoint added (partial update: weightKg, bodyFatPercent, chestCm, waistCm, hipsCm, armsCm)
- `getMeasurement(id)` and `updateMeasurement(id, body)` added to `lib/api.ts`
- `app/measurements/edit.tsx` — new edit screen, loads existing values via GET-by-id, saves via PUT
- Progress tab → "Body Measurements" section now shows a "Recent entries" card (up to 5) with weight + body fat, tapping any row navigates to the edit screen

**Notification Preferences:**
- Confirmed working correctly — time prefs are device-local (AsyncStorage via Zustand persist `"fitlog-notifications"` key), no server columns needed since notifications are scheduled on-device

## Key Decisions

- No JWT library — custom SHA-256 + random session tokens
- No `uuid` package — use `expo-crypto` or `crypto.randomBytes`
- No `victory-native` (requires Skia) — custom SVG/View-based charts
- Web platform: top inset 67px, bottom 34px
- `EXPO_PUBLIC_DOMAIN` env var used for API base URL
- Query key convention: bare string arrays e.g. `["workouts"]`, never add numeric suffixes
