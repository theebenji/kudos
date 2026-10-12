"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { Inbox, Send } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { useComposer } from "@/components/composer/ComposerProvider";
import { FeedSkeleton } from "@/components/kudos/FeedSkeleton";
import { KudoList } from "@/components/kudos/KudoList";
import { graphql } from "@/gql";
import styles from "./Profile.module.css";

const PROFILE = graphql(`
  query Profile($handle: String!) {
    viewer {
      id
    }
    user(handle: $handle) {
      id
      handle
      name
      title
      department
      team
      bio
      joinedOn
      isActive
      role
      kudosReceivedCount
      kudosGivenCount
      manager {
        handle
        name
        isActive
      }
    }
  }
`);

const RECEIVED = graphql(`
  query ProfileReceived($handle: String!, $first: Int!, $after: String) {
    user(handle: $handle) {
      id
      kudosReceived(first: $first, after: $after) {
        edges {
          node {
            ...KudoFields
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

const GIVEN = graphql(`
  query ProfileGiven($handle: String!, $first: Int!, $after: String) {
    user(handle: $handle) {
      id
      kudosGiven(first: $first, after: $after) {
        edges {
          node {
            ...KudoFields
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

const PAGE_SIZE = 10;
const joined = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

function ReceivedList({ handle, name }: { handle: string; name: string }) {
  const { data, fetchMore } = useSuspenseQuery(RECEIVED, {
    variables: { handle, first: PAGE_SIZE },
  });
  const conn = data.user?.kudosReceived;
  return (
    <KudoList
      label={`Kudos ${name} received`}
      kudos={conn?.edges.map((e) => e.node) ?? []}
      hasMore={conn?.pageInfo.hasNextPage ?? false}
      loadMore={() => fetchMore({ variables: { after: conn?.pageInfo.endCursor } })}
      empty={
        <EmptyState
          icon={<Inbox size={32} />}
          title="No kudos yet"
          description={`When someone recognizes ${name}, it shows up here.`}
        />
      }
    />
  );
}

function GivenList({ handle, name }: { handle: string; name: string }) {
  const { data, fetchMore } = useSuspenseQuery(GIVEN, { variables: { handle, first: PAGE_SIZE } });
  const conn = data.user?.kudosGiven;
  return (
    <KudoList
      label={`Kudos ${name} gave`}
      kudos={conn?.edges.map((e) => e.node) ?? []}
      hasMore={conn?.pageInfo.hasNextPage ?? false}
      loadMore={() => fetchMore({ variables: { after: conn?.pageInfo.endCursor } })}
      empty={
        <EmptyState
          icon={<Send size={32} />}
          title="Hasn't given kudos yet"
          description={`Kudos ${name} sends show up here.`}
        />
      }
    />
  );
}

export function Profile({ handle }: { handle: string }) {
  const composer = useComposer();
  const { data } = useSuspenseQuery(PROFILE, { variables: { handle } });
  const user = data.user;
  if (!user) return null;
  const isViewer = data.viewer?.id === user.id;
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <article aria-labelledby="profile-name">
      <header className={styles.header}>
        <Avatar name={user.name} size="lg" decorative />
        <div className={styles.identity}>
          <h1 id="profile-name" className={styles.name}>
            {user.name} {user.role === "ADMIN" && <Badge tone="accent">Admin</Badge>}
          </h1>
          {user.isActive ? (
            <p className={styles.meta}>
              {[user.title, user.team, user.department].filter(Boolean).join(" · ")}
            </p>
          ) : (
            <p className={styles.meta}>No longer with the company</p>
          )}
          {user.manager && (
            <p className={styles.meta}>
              Reports to{" "}
              {user.manager.isActive ? (
                <Link href={`/people/${user.manager.handle}`}>{user.manager.name}</Link>
              ) : (
                user.manager.name
              )}
            </p>
          )}
          {user.joinedOn && (
            <p className={styles.meta}>
              Joined {joined.format(new Date(`${user.joinedOn}T00:00:00`))}
            </p>
          )}
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
        </div>
        {!isViewer && user.isActive && (
          <Button onClick={() => composer.open({ recipients: [{ id: user.id, name: user.name }] })}>
            Give {firstName} kudos
          </Button>
        )}
      </header>

      <Tabs defaultValue="received">
        <TabsList aria-label={`${firstName}'s kudos`}>
          <TabsTrigger value="received">Received ({user.kudosReceivedCount})</TabsTrigger>
          <TabsTrigger value="given">Given ({user.kudosGivenCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <Suspense fallback={<FeedSkeleton count={2} />}>
            <ReceivedList handle={user.handle} name={firstName} />
          </Suspense>
        </TabsContent>
        <TabsContent value="given">
          <Suspense fallback={<FeedSkeleton count={2} />}>
            <GivenList handle={user.handle} name={firstName} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </article>
  );
}
