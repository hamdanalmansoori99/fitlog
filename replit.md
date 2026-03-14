# Overview

FitLog is a comprehensive mobile fitness tracking Progressive Web App (PWA) built with Expo React Native and a TypeScript-based pnpm monorepo. It offers robust workout logging across 8 activity types, detailed meal tracking with macro analysis, progress analytics, and body measurement tracking. A key feature is its AI-powered smart fitness coach system, providing personalized workout recommendations, weekly plan generation, and access to a library of 25+ workout templates. The app emphasizes a beautiful dark-mode UI with modern enhancements like shimmer loading, animated success overlays, and contextual empty states. It supports both metric and imperial unit systems, ensures all data is user-scoped and routes are authenticated. Advanced features include smart meal logging, saved workout templates, and a gamification system with streaks, badges, and personal records. The PWA functionality provides an installable experience with offline capabilities and app shortcuts.

# User Preferences

I prefer iterative development with a focus on delivering core features first, followed by enhancements.
Please ask before making major architectural changes or introducing new external dependencies.
I prefer clear and concise explanations for any complex logic or decisions.
Ensure code is well-documented, especially for business-critical logic.
Prioritize performance and user experience in all development tasks.
I prefer to maintain a consistent code style across the monorepo.
Do not make changes to the `artifacts-monorepo/lib/api-spec/` folder without prior discussion.
Do not make changes to the `artifacts-monorepo/lib/api-zod/` folder without prior discussion.

# System Architecture

## Monorepo Structure

The project is structured as a pnpm workspace monorepo using TypeScript, facilitating shared code and independent package management. It consists of an Express 5 API server (`artifacts/api-server`), an Expo React Native mobile app (`artifacts/fitlog`), and shared libraries (`lib/`).

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **TypeScript**: 5.9
- **API**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Mobile Framework**: Expo React Native (web/iOS/Android)
- **State Management**: Zustand + React Query
- **Validation**: Zod (v4) with `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## UI/UX and Design System

The application features a dark-mode-first design, with a primary background of `#0f0f1a` and card backgrounds of `#1a1a2e`. Accent colors include a primary green (`#00e676`) and secondary blue (`#448aff`). The Inter font family is used throughout. UI enhancements include shimmer skeleton loading, animated success overlays, contextual empty states, and staggered spring animations to improve user experience. The PWA includes a `manifest.json` with various icon sizes and a service worker implementing cache-first/network-first/stale-while-revalidate strategies.

## Core Features

### Authentication & Authorization
Custom SHA-256 password hashing and session tokens are used, with sessions stored in Zustand and persisted via AsyncStorage. All API routes are protected by `requireAuth` middleware, validating session tokens against the database. A `requireRole` middleware supports `user → premium → admin` hierarchies for feature gating.

### Data Scoping & Integrity
All database queries are scoped to the authenticated `user.id`. Mutations verify ownership before execution. Account deletion is a two-step process with cascade deletion of all associated user data at the DB level. Data integrity is enforced with unique constraints and appropriate indexes.

### Smart Coach System
The `coachEngine.ts` module powers workout recommendations, weekly plan generation, and substitution suggestions. Recommendations are based on an algorithm considering equipment match, goal alignment, difficulty, duration, and recency, with a recent overhaul to minimize muscle group overlap. Weekly plans are generated prioritizing muscle-group rotation and adapting difficulty based on user consistency.

### Subscription & Plan System
A flexible subscription system (`src/lib/plans.ts`) defines 'Free' and 'Premium' plans, controlling access to features like AI photo analysis, advanced analytics, and template limits. The `user_subscriptions` table tracks user plans, managed by `subscriptionService.ts`. Frontend components dynamically gate premium features and display upgrade options using `PremiumGate.tsx` and `PremiumBadge.tsx`.

### Data Management
- **Workouts**: Comprehensive logging for 8 activity types, gym exercise tracker with autocomplete, workout templates, and history.
- **Meals**: Multi-item food logging with macros, calorie summaries, and nutrition statistics.
- **Progress**: Tracks streaks, activity breakdown, weight charts, PRs, and body measurements.
- **Goal-Based Insights**: Client-side engine (`lib/goalInsights.ts`) provides personalized insights based on fitness goals (e.g., weight loss, muscle gain, endurance).

## API Server
The Express API server exposes endpoints for user authentication, profile management, workout and meal CRUD operations, progress tracking, equipment, measurements, water intake, and recovery logs. A service layer (`src/services/`) encapsulates business logic.

## Database Schema
The PostgreSQL database uses Drizzle ORM. Key tables include `users`, `profiles`, `workouts`, `meals`, `equipment`, `body_measurements`, `settings`, `water_logs`, `recovery_logs`, `sessions`, `conversations`, `messages`, `achievements`, `user_workout_templates`, `favorite_meals`, and `analytics_events`. Performance is optimized with numerous indexes.

## Security & Privacy
- Route protection with `requireAuth` and `requireRole` middleware.
- All DB queries and mutations are `userId`-scoped.
- SHA-256 + hardcoded salt for passwords; 256-bit random session IDs with 30-day expiry.
- Input validation on all critical endpoints (e.g., registration, photo uploads).
- Global JSON body limit of 1 MB, with a higher 6 MB limit for image analysis endpoints.
- Sensitive data like `passwordHash` is never returned in API responses.
- Exported user data strips `userId` for privacy.
- Feature gating prevents unauthorized access to premium features.
- Two-step account deletion with cascade ensures all user data is purged.

## Cache Invalidation
A robust cache invalidation pattern is implemented using React Query. Mutations invalidate relevant query keys to ensure data freshness across the application (e.g., workout mutations invalidate `workouts`, `todayStats`, `weeklyStats`).

## AI Coach Context
The `/api/coach/message` endpoint builds a rich system prompt for the AI coach, incorporating user profile details (goals, experience, equipment), recent workout history, today's nutrition, and a list of all available workout templates for context.

# External Dependencies

- **PostgreSQL**: Relational database for all application data.
- **Expo React Native**: Framework for building universal mobile applications.
- **Zustand**: State management library.
- **React Query**: Data fetching and caching library.
- **Zod**: Schema declaration and validation library.
- **Orval**: OpenAPI spec code generator for API clients and schemas.
- **AsyncStorage**: For persisting client-side data (e.g., auth tokens).
- **expo-crypto**: For cryptographic operations on the client.
- **Stripe**: (Future integration) For subscription billing and payment processing.