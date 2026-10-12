import { brand } from "@repo/config/brand";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/kudos/FeedSkeleton";
import { Profile } from "@/components/people/Profile";
import { graphql } from "@/gql";
import { apiQuery } from "@/lib/api";

const PROFILE_EXISTS = graphql(`
  query ProfileExists($handle: String!) {
    user(handle: $handle) {
      name
    }
  }
`);

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { user } = await apiQuery(PROFILE_EXISTS, { handle: (await params).handle });
  return { title: user ? `${user.name} · ${brand.name}` : brand.name };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const { user } = await apiQuery(PROFILE_EXISTS, { handle });
  if (!user) notFound();
  return (
    <Suspense fallback={<FeedSkeleton count={2} />}>
      <Profile handle={handle} />
    </Suspense>
  );
}
