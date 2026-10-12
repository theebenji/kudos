CREATE TYPE "public"."notification_kind" AS ENUM('kudo_received', 'comment', 'mention', 'reaction');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kudo_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	CONSTRAINT "comments_body_length" CHECK (char_length("comments"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "kudo_mentions" (
	"kudo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "kudo_mentions_kudo_id_user_id_pk" PRIMARY KEY("kudo_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "kudo_recipients" (
	"kudo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "kudo_recipients_kudo_id_user_id_pk" PRIMARY KEY("kudo_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "kudos" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sender_id" uuid NOT NULL,
	"value_id" uuid,
	"body_doc" jsonb NOT NULL,
	"body_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	CONSTRAINT "kudos_body_text_length" CHECK (char_length("kudos"."body_text") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"kudo_id" uuid,
	"comment_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"kudo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_kudo_id_user_id_emoji_pk" PRIMARY KEY("kudo_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"department" text,
	"team" text,
	"manager_id" uuid,
	"avatar_key" text,
	"bio" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"joined_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "users_bio_length" CHECK (char_length("users"."bio") <= 280)
);
--> statement-breakpoint
CREATE TABLE "values" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"emoji" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_kudo_id_kudos_id_fk" FOREIGN KEY ("kudo_id") REFERENCES "public"."kudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudo_mentions" ADD CONSTRAINT "kudo_mentions_kudo_id_kudos_id_fk" FOREIGN KEY ("kudo_id") REFERENCES "public"."kudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudo_mentions" ADD CONSTRAINT "kudo_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudo_recipients" ADD CONSTRAINT "kudo_recipients_kudo_id_kudos_id_fk" FOREIGN KEY ("kudo_id") REFERENCES "public"."kudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudo_recipients" ADD CONSTRAINT "kudo_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_value_id_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kudo_id_kudos_id_fk" FOREIGN KEY ("kudo_id") REFERENCES "public"."kudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_kudo_id_kudos_id_fk" FOREIGN KEY ("kudo_id") REFERENCES "public"."kudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_kudo_idx" ON "comments" USING btree ("kudo_id","created_at");--> statement-breakpoint
CREATE INDEX "kudo_recipients_user_idx" ON "kudo_recipients" USING btree ("user_id","kudo_id");--> statement-breakpoint
CREATE INDEX "kudos_feed_idx" ON "kudos" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "kudos"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "kudos_sender_idx" ON "kudos" USING btree ("sender_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("created_at") WHERE "outbox_events"."processed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_key" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "users_name_trgm_idx" ON "users" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_title_trgm_idx" ON "users" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_team_trgm_idx" ON "users" USING gin ("team" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "values_name_key" ON "values" USING btree (lower("name"));