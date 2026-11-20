import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("user_profiles_role_check", sql`${table.role} in ('teacher', 'student')`),
  check("user_profiles_status_check", sql`${table.status} in ('active', 'paused')`),
])

export const teacherStudents = pgTable("teacher_students", {
  teacherUserId: uuid("teacher_user_id").notNull(),
  studentUserId: uuid("student_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_teacher_students_student").on(table.studentUserId),
])

export const studentInvitations = pgTable("student_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  teacherUserId: uuid("teacher_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  acceptedByUserId: uuid("accepted_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (table) => [
  check("student_invitations_status_check", sql`${table.status} in ('pending', 'accepted', 'revoked')`),
  unique("student_invitations_email_teacher_user_id_key").on(table.email, table.teacherUserId),
  index("idx_student_invitations_teacher").on(table.teacherUserId),
])

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  level: text("level").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  focus: text("focus"),
  theory: jsonb("theory"),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("topics_slug_level_key").on(table.slug, table.level),
  index("idx_topics_level").on(table.level),
])

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  conceptKey: text("concept_key").notNull().unique(),
  provider: text("provider").notNull(),
  mediaType: text("media_type").notNull(),
  externalId: text("external_id"),
  url: text("url").notNull(),
  previewUrl: text("preview_url"),
  mp4Url: text("mp4_url"),
  title: text("title"),
  altText: text("alt_text"),
  width: integer("width"),
  height: integer("height"),
  decisionScore: integer("decision_score"),
  decisionMeta: jsonb("decision_meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("media_assets_provider_check", sql`${table.provider} in ('klipy', 'noto_emoji', 'custom')`),
  index("idx_media_assets_provider").on(table.provider),
])

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicSlug: text("topic_slug").notNull(),
  level: text("level").notNull(),
  exerciseType: text("exercise_type").notNull().default("multiple_choice"),
  prompt: text("prompt").notNull(),
  options: jsonb("options").notNull().default(sql`'[]'::jsonb`),
  correctAnswerIndex: integer("correct_answer_index").notNull().default(0),
  expectedAnswer: text("expected_answer"),
  acceptableAnswers: jsonb("acceptable_answers"),
  hint: text("hint"),
  mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  explanation: text("explanation").notNull(),
  word: text("word"),
  phonetic: text("phonetic"),
  spanishTranslation: text("spanish_translation"),
  difficulty: text("difficulty").notNull().default("medium"),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("exercises_exercise_type_check", sql`${table.exerciseType} in ('multiple_choice', 'open_response')`),
  index("idx_exercises_topic_level").on(table.topicSlug, table.level),
  index("idx_exercises_word").on(table.word),
  index("idx_exercises_type").on(table.exerciseType),
  index("idx_exercises_media_asset").on(table.mediaAssetId),
])

export const exerciseCache = pgTable("exercise_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: text("cache_key").notNull().unique(),
  level: text("level").notNull(),
  topicSlug: text("topic_slug").notNull(),
  word: text("word").notNull(),
  exercise: jsonb("exercise").notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  quality: text("quality").notNull().default("ok"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_exercise_cache_topic_level").on(table.topicSlug, table.level),
  index("idx_exercise_cache_word").on(table.word),
])

export const practiceRounds = pgTable("practice_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  topicSlug: text("topic_slug").notNull(),
  level: text("level").notNull(),
  status: text("status").notNull().default("active"),
  exerciseIds: jsonb("exercise_ids").notNull(),
  score: integer("score"),
  total: integer("total").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  check("practice_rounds_status_check", sql`${table.status} in ('active', 'completed', 'abandoned')`),
  index("idx_practice_rounds_user").on(table.userId, table.startedAt),
])

export const practiceAttempts = pgTable("practice_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  roundId: uuid("round_id").notNull(),
  exerciseId: uuid("exercise_id").notNull(),
  selectedAnswer: text("selected_answer").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  evaluation: jsonb("evaluation"),
  responseTimeMs: integer("response_time_ms"),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("exercise_attempts_round_id_exercise_id_key").on(table.roundId, table.exerciseId),
  index("idx_exercise_attempts_user").on(table.userId, table.answeredAt),
])

export const speakingSessions = pgTable("speaking_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  level: text("level").notNull(),
  topicSlug: text("topic_slug").notNull(),
  missionTitle: text("mission_title").notNull(),
  missionGoal: text("mission_goal").notNull(),
  voiceName: text("voice_name").notNull().default("Aoede"),
  status: text("status").notNull().default("active"),
  durationSec: integer("duration_sec").notNull().default(0),
  turnCount: integer("turn_count").notNull().default(0),
  transcript: jsonb("transcript").notNull().default(sql`'[]'::jsonb`),
  checklist: jsonb("checklist").notNull().default(sql`'[]'::jsonb`),
  evaluation: jsonb("evaluation"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  check("speaking_sessions_status_check", sql`${table.status} in ('active', 'completed', 'abandoned')`),
  index("idx_speaking_sessions_user").on(table.userId, table.startedAt),
  index("idx_speaking_sessions_topic").on(table.topicSlug, table.level),
])
