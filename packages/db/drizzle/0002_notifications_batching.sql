ALTER TABLE "notifications" ADD COLUMN "count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_unread_reaction_key" ON "notifications" USING btree ("user_id","kudo_id") WHERE "notifications"."kind" = 'reaction' and "notifications"."read_at" is null;