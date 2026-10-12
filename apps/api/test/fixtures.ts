import { encodeGlobalID } from "@pothos/plugin-relay";
import { type Database, kudoMentions, kudoRecipients, kudos } from "@repo/db";
import { docFromText } from "@repo/rich-text";

export const gid = (type: "User" | "Value" | "Kudo" | "Comment" | "Notification", id: string) =>
  encodeGlobalID(type, id);

/** Inserts a kudo directly (bypassing the API), for tests that start from existing data. */
export async function insertKudo(
  db: Database,
  {
    senderId,
    recipientIds,
    mentionIds = [],
    text = "Thanks!",
  }: { senderId: string; recipientIds: string[]; mentionIds?: string[]; text?: string },
) {
  const [kudo] = await db
    .insert(kudos)
    .values({ senderId, bodyDoc: docFromText(text), bodyText: text })
    .returning();
  if (!kudo) throw new Error("insertKudo failed");
  await db
    .insert(kudoRecipients)
    .values(recipientIds.map((userId) => ({ kudoId: kudo.id, userId })));
  if (mentionIds.length)
    await db.insert(kudoMentions).values(mentionIds.map((userId) => ({ kudoId: kudo.id, userId })));
  return kudo;
}
