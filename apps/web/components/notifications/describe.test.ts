import { describe, expect, it } from "vitest";
import { describeNotification } from "./describe";

describe("describeNotification", () => {
  const actor = { name: "Ana López" };
  it.each([
    [{ kind: "KUDO_RECEIVED", count: 1, actor }, "Ana López gave you kudos"],
    [{ kind: "MENTION", count: 1, actor }, "Ana López mentioned you in a kudo"],
    [{ kind: "COMMENT", count: 1, actor }, "Ana López commented on a kudo"],
    [{ kind: "REACTION", count: 1, actor }, "Ana López reacted to a kudo"],
    [{ kind: "REACTION", count: 2, actor }, "Ana López and 1 other reacted to a kudo"],
    [{ kind: "REACTION", count: 5, actor }, "Ana López and 4 others reacted to a kudo"],
    [{ kind: "COMMENT", count: 1, actor: null }, "Someone commented on a kudo"],
  ] as const)("%o → %s", (input, expected) => {
    expect(describeNotification(input)).toBe(expected);
  });
});
