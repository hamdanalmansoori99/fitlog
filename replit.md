# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: FitLog

A full-featured mobile fitness tracking PWA built with Expo React Native. Features workout logging (8 activity types), meal tracking with macros, progress analytics, body measurements, a beautiful dark-mode UI, and a smart fitness coach system with personalised workout recommendations, weekly plan generation, and a 25+ template library. Also includes: smart meal logging intelligence (recent foods, serving suggestions, frequent meals, duplicate), saved workout templates, a gamification system (streaks, badges, personal records, weekly score), and UI enhancements including shimmer skeleton loading, animated success overlays, contextual empty states, and staggered spring animations.

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

## Key Decisions

- No JWT library — custom SHA-256 + random session tokens
- No `uuid` package — use `expo-crypto` or `crypto.randomBytes`
- No `victory-native` (requires Skia) — custom SVG/View-based charts
- Web platform: top inset 67px, bottom 34px
- `EXPO_PUBLIC_DOMAIN` env var used for API base URL
