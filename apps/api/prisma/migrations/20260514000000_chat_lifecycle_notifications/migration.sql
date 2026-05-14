-- Conversation lifecycle + message types + notifications

CREATE TYPE "ConversationStatus" AS ENUM ('active', 'closed');

CREATE TYPE "MessageType" AS ENUM (
  'text',
  'appointment_proposal',
  'appointment_confirmed',
  'appointment_declined',
  'system'
);

CREATE TYPE "NotificationType" AS ENUM (
  'new_message',
  'appointment_proposed',
  'appointment_confirmed',
  'appointment_declined',
  'appointment_reminder',
  'conversation_closed',
  'conversation_reopened',
  'application_status_changed',
  'new_job_match',
  'premium_expiring',
  'daily_digest',
  'generic'
);

-- Conversation status + close metadata
ALTER TABLE "conversations"
  ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "closed_at" TIMESTAMP(3),
  ADD COLUMN "closed_by_user_id" TEXT;

-- Message type + metadata
ALTER TABLE "messages"
  ADD COLUMN "type" "MessageType" NOT NULL DEFAULT 'text',
  ADD COLUMN "metadata" JSONB;

-- User push notification token
ALTER TABLE "users"
  ADD COLUMN "push_token" TEXT;

-- Notifications table
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "read_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_read_at_idx"
  ON "notifications" ("user_id", "read_at");

CREATE INDEX "notifications_user_id_sent_at_idx"
  ON "notifications" ("user_id", "sent_at");
