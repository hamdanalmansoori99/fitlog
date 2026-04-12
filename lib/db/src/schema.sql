-- FitLog database schema
-- Auto-applied by the server on first startup when using embedded PGlite (no DATABASE_URL set).
-- Safe to run multiple times — all statements use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" ("expires_at");

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "photo_url" text,
  "age" integer,
  "gender" text,
  "height_cm" real,
  "weight_kg" real,
  "waist_cm" real,
  "fitness_goals" jsonb NOT NULL DEFAULT '[]',
  "activity_level" text,
  "daily_calorie_goal" integer,
  "daily_protein_goal" integer,
  "daily_carbs_goal" integer,
  "daily_fat_goal" integer,
  "available_equipment" jsonb NOT NULL DEFAULT '[]',
  "workout_location" text,
  "training_preferences" jsonb NOT NULL DEFAULT '[]',
  "experience_level" text,
  "preferred_workout_duration" text,
  "weekly_workout_days" integer,
  "daily_water_goal_ml" integer NOT NULL DEFAULT 2000,
  "onboarding_complete" boolean NOT NULL DEFAULT false,
  "coach_onboarding_complete" boolean NOT NULL DEFAULT false,
  "xp" integer NOT NULL DEFAULT 0,
  "saved_weekly_plan" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "dark_mode" boolean NOT NULL DEFAULT true,
  "unit_system" text NOT NULL DEFAULT 'metric',
  "language" text NOT NULL DEFAULT 'en',
  "notifications_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_key" text NOT NULL DEFAULT 'free',
  "status" text NOT NULL DEFAULT 'active',
  "trial_ends_at" timestamp,
  "period_start" timestamp NOT NULL DEFAULT now(),
  "period_end" timestamp,
  "cancelled_at" timestamp,
  "external_id" text,
  "external_customer_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "user_subscriptions_user_id_idx" ON "user_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "user_subscriptions_plan_key_idx" ON "user_subscriptions" ("plan_key");
CREATE INDEX IF NOT EXISTS "user_subscriptions_status_idx" ON "user_subscriptions" ("status");

CREATE TABLE IF NOT EXISTS "workouts" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" text NOT NULL,
  "name" text,
  "date" timestamp NOT NULL,
  "duration_minutes" integer,
  "distance_km" real,
  "pace_min_per_km" real,
  "calories_burned" integer,
  "mood" text,
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workouts_user_id_date_idx" ON "workouts" ("user_id", "date");
CREATE INDEX IF NOT EXISTS "workouts_user_id_idx" ON "workouts" ("user_id");
CREATE INDEX IF NOT EXISTS "workouts_date_idx" ON "workouts" ("date");

CREATE TABLE IF NOT EXISTS "workout_exercises" (
  "id" serial PRIMARY KEY,
  "workout_id" integer NOT NULL REFERENCES "workouts"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "order" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "workout_exercises_workout_id_idx" ON "workout_exercises" ("workout_id");
CREATE INDEX IF NOT EXISTS "workout_exercises_name_idx" ON "workout_exercises" ("name");

CREATE TABLE IF NOT EXISTS "workout_sets" (
  "id" serial PRIMARY KEY,
  "exercise_id" integer NOT NULL REFERENCES "workout_exercises"("id") ON DELETE CASCADE,
  "reps" integer,
  "weight_kg" real,
  "rpe" integer,
  "completed" boolean DEFAULT true,
  "order" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "workout_sets_exercise_id_idx" ON "workout_sets" ("exercise_id");
CREATE INDEX IF NOT EXISTS "workout_sets_weight_kg_idx" ON "workout_sets" ("weight_kg");

CREATE TABLE IF NOT EXISTS "user_workout_templates" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "activity_type" text NOT NULL DEFAULT 'gym',
  "description" text,
  "estimated_minutes" integer,
  "exercises" jsonb NOT NULL DEFAULT '[]',
  "is_favorite" boolean NOT NULL DEFAULT false,
  "usage_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "user_workout_templates_user_id_idx" ON "user_workout_templates" ("user_id");

CREATE TABLE IF NOT EXISTS "meals" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "date" timestamp NOT NULL,
  "photo_url" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "meals_user_id_date_idx" ON "meals" ("user_id", "date");
CREATE INDEX IF NOT EXISTS "meals_user_id_idx" ON "meals" ("user_id");
CREATE INDEX IF NOT EXISTS "meals_date_idx" ON "meals" ("date");

CREATE TABLE IF NOT EXISTS "meal_food_items" (
  "id" serial PRIMARY KEY,
  "meal_id" integer NOT NULL REFERENCES "meals"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "portion_size" real NOT NULL,
  "unit" text NOT NULL,
  "calories" real NOT NULL,
  "protein_g" real NOT NULL,
  "carbs_g" real NOT NULL,
  "fat_g" real NOT NULL
);
CREATE INDEX IF NOT EXISTS "meal_food_items_meal_id_idx" ON "meal_food_items" ("meal_id");
CREATE INDEX IF NOT EXISTS "meal_food_items_name_idx" ON "meal_food_items" ("name");

CREATE TABLE IF NOT EXISTS "favorite_meals" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL DEFAULT 'snack',
  "food_items" jsonb NOT NULL DEFAULT '[]',
  "total_calories" real NOT NULL DEFAULT 0,
  "total_protein_g" real NOT NULL DEFAULT 0,
  "usage_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "favorite_meals_user_id_idx" ON "favorite_meals" ("user_id");

CREATE TABLE IF NOT EXISTS "equipment" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "photo_url" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "equipment_user_id_idx" ON "equipment" ("user_id");

CREATE TABLE IF NOT EXISTS "body_measurements" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "weight_kg" real,
  "body_fat_percent" real,
  "chest_cm" real,
  "waist_cm" real,
  "hips_cm" real,
  "arms_cm" real,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "body_measurements_user_id_idx" ON "body_measurements" ("user_id");
CREATE INDEX IF NOT EXISTS "body_measurements_user_id_date_idx" ON "body_measurements" ("user_id", "date");

CREATE TABLE IF NOT EXISTS "water_logs" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount_ml" integer NOT NULL,
  "logged_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "water_logs_user_id_idx" ON "water_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "water_logs_user_id_logged_at_idx" ON "water_logs" ("user_id", "logged_at");

CREATE TABLE IF NOT EXISTS "recovery_logs" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" timestamp NOT NULL,
  "sleep_hours" real,
  "sleep_quality" integer,
  "energy_level" integer,
  "stress_level" integer,
  "overall_feeling" integer,
  "soreness" jsonb NOT NULL DEFAULT '{}',
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "recovery_logs_user_id_idx" ON "recovery_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "recovery_logs_user_id_date_idx" ON "recovery_logs" ("user_id", "date");

CREATE TABLE IF NOT EXISTS "progress_photos" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" varchar(10) NOT NULL,
  "note" text NOT NULL DEFAULT '',
  "image_data" text NOT NULL,
  "mime_type" varchar(50) NOT NULL DEFAULT 'image/jpeg',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "progress_photos_user_id_idx" ON "progress_photos" ("user_id");

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" ("user_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY,
  "conversation_id" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages" ("conversation_id");

CREATE TABLE IF NOT EXISTS "achievements" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "title" text NOT NULL,
  "earned_at" timestamp NOT NULL DEFAULT now(),
  "metadata" jsonb DEFAULT '{}',
  CONSTRAINT "achievements_user_id_key_uniq" UNIQUE ("user_id", "key")
);
CREATE INDEX IF NOT EXISTS "achievements_user_id_idx" ON "achievements" ("user_id");

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "properties" jsonb DEFAULT '{}',
  "platform" text,
  "app_version" text,
  "session_id" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events" ("user_id");
CREATE INDEX IF NOT EXISTS "analytics_events_event_type_idx" ON "analytics_events" ("event_type");
CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events" ("created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_user_event_idx" ON "analytics_events" ("user_id", "event_type");

-- ── Columns added after initial schema ──────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "device_fingerprint" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "invite_code" text UNIQUE;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "email_digest_enabled" boolean NOT NULL DEFAULT true;

ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "default_rest_time_sec" integer NOT NULL DEFAULT 60;

ALTER TABLE "progress_photos" ADD COLUMN IF NOT EXISTS "r2_key" text;
-- Make image_data nullable (was NOT NULL in the original schema but now optional with R2)
ALTER TABLE "progress_photos" ALTER COLUMN "image_data" DROP NOT NULL;

-- ── Tables added after initial schema ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens" ("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "friends" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "friend_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "friends_user_friend_idx" ON "friends" ("user_id", "friend_id");
CREATE INDEX IF NOT EXISTS "friends_friend_status_idx" ON "friends" ("friend_id", "status");

CREATE TABLE IF NOT EXISTS "challenges" (
  "id" serial PRIMARY KEY,
  "creator_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "type" text NOT NULL,
  "target_value" integer NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "challenges_creator_idx" ON "challenges" ("creator_id");
CREATE INDEX IF NOT EXISTS "challenges_status_idx" ON "challenges" ("status");

CREATE TABLE IF NOT EXISTS "challenge_participants" (
  "id" serial PRIMARY KEY,
  "challenge_id" integer NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "progress" jsonb NOT NULL DEFAULT '{}',
  "joined_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "challenge_participants_challenge_idx" ON "challenge_participants" ("challenge_id");
CREATE INDEX IF NOT EXISTS "challenge_participants_user_idx" ON "challenge_participants" ("user_id");

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" serial PRIMARY KEY,
  "referrer_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referee_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reward_granted_to_referrer" boolean NOT NULL DEFAULT false,
  "reward_granted_to_referee" boolean NOT NULL DEFAULT false,
  "device_fingerprint_match" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "referrals_referrer_idx" ON "referrals" ("referrer_id");
CREATE INDEX IF NOT EXISTS "referrals_referee_idx" ON "referrals" ("referee_id");

CREATE TABLE IF NOT EXISTS "custom_exercises" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "primary_muscle" text NOT NULL,
  "secondary_muscles" jsonb NOT NULL DEFAULT '[]',
  "instructions" jsonb NOT NULL DEFAULT '[]',
  "equipment" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "custom_exercises_user_idx" ON "custom_exercises" ("user_id");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
  "preferred_workout_time" text,
  "enabled" boolean NOT NULL DEFAULT true,
  "quiet_hours_start" text,
  "quiet_hours_end" text,
  "last_reengagement_sent" timestamp,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
