import { notFound, redirect } from "next/navigation";
import { graphql } from "@/gql";
import { apiQuery } from "@/lib/api";

const USER_BY_ID = graphql(`
  query UserById($id: ID!) {
    node(id: $id) {
      ... on User {
        handle
      }
    }
  }
`);

/** Mentions store user ids; this resolves one to the person's profile URL. */
export default async function UserByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Mention ids are raw UUIDs; the API's node lookup takes global ids ("User:<uuid>", base64).
  const globalId = Buffer.from(`User:${id}`).toString("base64");
  const data = await apiQuery(USER_BY_ID, { id: globalId }).catch(() => null);
  const handle = data?.node && "handle" in data.node ? data.node.handle : null;
  if (!handle) notFound();
  redirect(`/people/${handle}`);
}
