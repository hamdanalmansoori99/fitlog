# FitLog — AI-Powered Fitness Tracker

A full-featured mobile fitness tracking app built with Expo React Native. Track workouts, nutrition, and progress — with an AI coach powered by Claude to guide you every step of the way.

---

## Features

### Workouts
- **25+ workout templates** — Gym, running, cycling, yoga, swimming, HIIT, and more
- **Custom workout logging** — Track sets, reps, weight, duration, distance, and mood
- **AI recommendations** — Smart suggestions based on your goals, equipment, and recovery
- **Workout Execution Mode** — Live timer and set tracking during workouts
- **Progression system** — Personal records automatically tracked and celebrated
- **Weekly training plan** — 7-day planner with smart scheduling
- **Save templates** — Create reusable templates from any workout you log
- **Workout detail view** — Full breakdown with exercises, sets, and stats

### Nutrition & Meals
- **Daily meal logging** — Breakfast, lunch, dinner, and snacks
- **Calorie & macro tracking** — Protein, carbs, fat vs. personalised goals
- **Favourite meals** — Star meals for one-tap re-logging
- **Frequent meals** — Auto-detected and surfaced for quick logging
- **AI meal analysis** — Photo-based nutrition estimation (Claude)
- **Meal detail view** — Full macro breakdown per meal

### AI Coach
- **Streaming AI coach** — Real-time coaching powered by Claude claude-haiku-4-5
- **Nutrition-aware context** — Coach knows your today's calories, protein, and macros
- **Workout-aware context** — Coach sees your recent 20 workouts and activity patterns
- **Goal-aware** — Tailored advice based on your fitness goals and experience level

### Progress & Analytics
- **Weekly activity chart** — Visual bar chart of active minutes per day
- **Streak tracking** — Workout, meal, and hydration streaks with badges
- **Personal records** — Best lifts, distances, and durations highlighted
- **Body measurements** — Weight and body-fat tracking over time (30/90/365 day views)
- **Goal insights** — AI-computed progress analysis based on your goals
- **Nutrition stats** — Daily calories, macro averages, and trends

### Wellness
- **Water tracker** — Tap-to-log hydration with daily goal progress
- **Recovery check-in** — Daily sleep quality, energy, and soreness tracking
- **Smart reminder banners** — Contextual nudges based on your data
- **Gamification** — Streak badges, milestone achievements, and PR celebrations

### Profile & Settings
- **Personalised onboarding** — 9-step wizard: name, age, goals, equipment, schedule, experience
- **BMR / TDEE calculation** — Mifflin-St Jeor formula, gender-corrected calorie goals
- **Dark / light mode** — Automatic or manual system override
- **Unit preferences** — Metric (kg/cm) support
- **Subscription tiers** — Free, Pro, and Elite plans with feature gating

### Technical
- **PWA-ready** — Installable web app with proper manifest and theme colours
- **Apple Health / Google Fit stubs** — Ready-to-connect health platform integration
- **Role-based access control** — User, admin, and premium permission layers
- **Analytics event tracking** — Full event pipeline for usage insights
- **Premium subscription system** — Stripe-ready plan management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 53 + React Native |
| Navigation | Expo Router (file-based) |
| State | Zustand + React Query |
| UI | Custom design system (Inter font, dark/light) |
| Backend | Express + TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| AI | Anthropic Claude (SSE streaming) |
| Package manager | pnpm workspaces |

---

## Project Structure

```
.
├── artifacts/
│   ├── fitlog/              # Expo React Native app
│   │   ├── app/             # File-based routes
│   │   │   ├── (tabs)/      # Main tab screens (Home, Workouts, Meals, Progress, Profile)
│   │   │   ├── auth/        # Login & register
│   │   │   ├── workouts/    # Workout log, template, execute, plan screens
│   │   │   ├── meals/       # Meal add & detail screens
│   │   │   ├── coach/       # AI coach chat screen
│   │   │   └── onboarding.tsx
│   │   ├── components/      # Reusable UI components
│   │   ├── lib/             # API client, engine logic, templates
│   │   └── store/           # Zustand stores (auth, settings)
│   └── api-server/          # Express REST API
│       └── src/
│           ├── routes/      # Auth, workouts, meals, coach, profile...
│           └── lib/         # Plans, analytics, RBAC
└── lib/
    └── db/                  # Drizzle ORM schema + migrations
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- Anthropic API key (for AI coach)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the root (or use Replit Secrets):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fitlog
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-secret-key
```

### 3. Set up the database

```bash
cd lib/db && pnpm run push
```

### 4. Start development servers

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start Expo app (in a new terminal)
pnpm --filter @workspace/fitlog run dev
```

The Expo app opens at `http://localhost:<PORT>` for web, or scan the QR code with Expo Go for mobile.

### 5. Create your account

Navigate to the app and tap **Sign up**. Complete the onboarding wizard to set your goals, equipment, and preferences.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |
| GET | `/api/workouts` | List workouts |
| POST | `/api/workouts` | Log workout |
| GET | `/api/workouts/:id` | Get workout detail |
| DELETE | `/api/workouts/:id` | Delete workout |
| GET | `/api/meals` | List meals |
| POST | `/api/meals` | Log meal |
| GET | `/api/meals/:id` | Get meal detail |
| DELETE | `/api/meals/:id` | Delete meal |
| GET | `/api/workout-summary` | Weekly stats |
| GET | `/api/streaks` | Streak data |
| GET | `/api/records` | Personal records |
| GET | `/api/measurements` | Body measurements |
| POST | `/api/measurements` | Log measurement |
| POST | `/api/coach/chat` | AI coach (SSE stream) |
| GET | `/api/coach/history` | Chat history |
| GET | `/api/hydration/today` | Today's water intake |
| POST | `/api/hydration/log` | Log water |
| GET | `/api/recovery/today` | Today's recovery log |
| POST | `/api/recovery` | Log recovery data |

---

## Design System

| Token | Value |
|---|---|
| Background | `#0f0f1a` |
| Card | `#1a1a2e` |
| Primary (green) | `#00e676` |
| Secondary (blue) | `#448aff` |
| Text | `#f5f5f5` |
| Text muted | `#9e9e9e` |
| Danger | `#ff5252` |
| Warning | `#ffab40` |
| Font | Inter (400, 500, 600, 700) |

---

## Deployment

The app is PWA-ready. The `app.json` is configured with:
- `web.name`: FitLog
- `web.themeColor`: `#00e676`  
- `web.backgroundColor`: `#0f0f1a`

Deploy the API server and Expo web build to your preferred platform.
