import { comments, type Database, kudos, outboxEvents, reactions } from "@repo/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Viewer } from "../context";
import { ForbiddenError, NotFoundError, ValidationError } from "../schema/errors";

// Reactions and comments (SPEC §1.6–1.7).

export const MAX_COMMENT_LENGTH = 1000;
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

/** Exactly one emoji (any, including skin tones and ZWJ sequences), Slack-style. */
export function isSingleEmoji(value: string): boolean {
  const graphemes = [...segmenter.segment(value)];
  return (
    graphemes.length === 1 &&
    value.length <= 32 &&
    /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value)
  );
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function visibleKudo(tx: Tx | Database, kudoId: string) {
  const [kudo] = await tx
    .select()
    .from(kudos)
    .where(and(eq(kudos.id, kudoId), isNull(kudos.deletedAt)));
  if (!kudo) throw new NotFoundError("That kudo doesn't exist");
  return kudo;
}

/** Adds the viewer's reaction, or removes it if it's already there. Returns the kudo. */
export async function toggleReaction(db: Database, viewer: Viewer, kudoId: string, emoji: string) {
  const value = emoji.trim();
  if (!isSingleEmoji(value))
    throw new ValidationError([{ path: "emoji", message: "Pick a single emoji" }]);
  return db.transaction(async (tx) => {
    const kudo = await visibleKudo(tx, kudoId);
    const where = and(
      eq(reactions.kudoId, kudoId),
      eq(reactions.userId, viewer.id),
      eq(reactions.emoji, value),
    );
    const [existing] = await tx.select().from(reactions).where(where);
    if (existing) {
      await tx.delete(reactions).where(where);
    } else {
      await tx.insert(reactions).values({ kudoId, userId: viewer.id, emoji: value });
      await tx
        .insert(outboxEvents)
        .values({ type: "reaction.added", payload: { kudoId, userId: viewer.id, emoji: value } });
    }
    return { kudo, added: !existing };
  });
}

function checkBody(body: string): string {
  const text = body.trim();
  if (!text) throw new ValidationError([{ path: "body", message: "Write a comment" }]);
  if (text.length > MAX_COMMENT_LENGTH) {
    throw new ValidationError([
      { path: "body", message: `Keep it under ${MAX_COMMENT_LENGTH} characters` },
    ]);
  }
  return text;
}

export async function addComment(db: Database, viewer: Viewer, kudoId: string, body: string) {
  const text = checkBody(body);
  return db.transaction(async (tx) => {
    await visibleKudo(tx, kudoId);
    const [comment] = await tx
      .insert(comments)
      .values({ kudoId, authorId: viewer.id, body: text })
      .returning();
    if (!comment) throw new Error("Insert returned no row");
    await tx.insert(outboxEvents).values({
      type: "comment.created",
      payload: { commentId: comment.id, kudoId, authorId: viewer.id },
    });
    return comment;
  });
}

async function visibleComment(tx: Tx, commentId: string) {
  const [row] = await tx
    .select({ comment: comments })
    .from(comments)
    .innerJoin(kudos, eq(kudos.id, comments.kudoId))
    .where(and(eq(comments.id, commentId), isNull(comments.deletedAt), isNull(kudos.deletedAt)));
  if (!row) throw new NotFoundError("That comment doesn't exist");
  return row.comment;
}

/** Only the author edits; the comment is marked edited. */
export async function updateComment(db: Database, viewer: Viewer, commentId: string, body: string) {
  const text = checkBody(body);
  return db.transaction(async (tx) => {
    const comment = await visibleComment(tx, commentId);
    if (comment.authorId !== viewer.id)
      throw new ForbiddenError("Only the author can edit a comment");
    const [updated] = await tx
      .update(comments)
      .set({ body: text, editedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning();
    if (!updated) throw new Error("Update returned no row");
    return updated;
  });
}

/** Soft delete by the author, or an admin for moderation. Returns the comment's kudo id. */
export async function deleteComment(db: Database, viewer: Viewer, commentId: string) {
  return db.transaction(async (tx) => {
    const comment = await visibleComment(tx, commentId);
    if (comment.authorId !== viewer.id && viewer.role !== "admin") {
      throw new ForbiddenError("Only the author or an admin can delete a comment");
    }
    await tx
      .update(comments)
      .set({ deletedAt: new Date(), deletedById: viewer.id })
      .where(eq(comments.id, commentId));
    return comment;
  });
}
