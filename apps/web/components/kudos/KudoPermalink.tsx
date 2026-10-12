"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { Button, EmptyState } from "@repo/ui";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { graphql } from "@/gql";
import { KudoItem } from "./KudoItem";

const KUDO = graphql(`
  query KudoPage($id: ID!) {
    kudo(id: $id) {
      ...KudoFields
    }
  }
`);

export function KudoPermalink({ id }: { id: string }) {
  const router = useRouter();
  const { data } = useSuspenseQuery(KUDO, { variables: { id } });
  if (!data.kudo) {
    return (
      <EmptyState
        headingLevel={2}
        icon={<SearchX size={32} />}
        title="This kudo isn't here"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Back to the feed</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      <h1 style={{ fontSize: "var(--font-size-xl)", marginBottom: "var(--space-4)" }}>Kudo</h1>
      <KudoItem kudo={data.kudo} onDeleted={() => router.push("/")} />
    </>
  );
}
