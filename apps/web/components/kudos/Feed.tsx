"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { Button, CheckboxField, EmptyState, SelectField } from "@repo/ui";
import { PartyPopper } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useComposer } from "@/components/composer/ComposerProvider";
import { graphql } from "@/gql";
import type { KudoFilter } from "@/gql/graphql";
import { KudoList } from "./KudoList";
import styles from "./Feed.module.css";

const FEED = graphql(`
  query Feed($first: Int!, $after: String, $filter: KudoFilter) {
    kudos(first: $first, after: $after, filter: $filter) {
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
`);

const FEED_FILTERS = graphql(`
  query FeedFilters {
    values {
      id
      name
      emoji
    }
    departments
    teams
  }
`);

const PAGE_SIZE = 10;

export function Feed() {
  const composer = useComposer();
  // The controls update immediately; the query follows the deferred value, so the current results
  // stay on screen (dimmed) while the next ones load instead of the list suspending.
  const [filter, setFilter] = useState<KudoFilter>({});
  const deferredFilter = useDeferredValue(filter);
  const isFiltering = filter !== deferredFilter;
  const { data: filters } = useSuspenseQuery(FEED_FILTERS);
  const { data, fetchMore } = useSuspenseQuery(FEED, {
    variables: { first: PAGE_SIZE, filter: deferredFilter },
  });

  const update = (patch: Partial<KudoFilter>) => setFilter((current) => ({ ...current, ...patch }));
  const isFiltered = Object.values(deferredFilter).some(Boolean);

  return (
    <>
      <form
        className={styles.filters}
        aria-label="Filter kudos"
        onSubmit={(e) => e.preventDefault()}
      >
        <SelectField
          label="Value"
          placeholder="All values"
          value={filter.valueId ?? ""}
          onChange={(e) => update({ valueId: e.target.value || null })}
          options={filters.values.map((v) => ({
            value: v.id,
            label: `${v.emoji ?? ""} ${v.name}`.trim(),
          }))}
        />
        <SelectField
          label="Department"
          placeholder="All departments"
          value={filter.department ?? ""}
          onChange={(e) => update({ department: e.target.value || null })}
          options={filters.departments.map((d) => ({ value: d, label: d }))}
        />
        <SelectField
          label="Team"
          placeholder="All teams"
          value={filter.team ?? ""}
          onChange={(e) => update({ team: e.target.value || null })}
          options={filters.teams.map((t) => ({ value: t, label: t }))}
        />
        <CheckboxField
          label="Involving me"
          checked={filter.involvingMe ?? false}
          onChange={(e) => update({ involvingMe: e.target.checked || null })}
        />
      </form>
      <div aria-busy={isFiltering} className={isFiltering ? styles.dimmed : undefined}>
        <KudoList
          label="Kudos feed"
          kudos={data.kudos.edges.map((e) => e.node)}
          hasMore={data.kudos.pageInfo.hasNextPage}
          loadMore={() => fetchMore({ variables: { after: data.kudos.pageInfo.endCursor } })}
          empty={
            <EmptyState
              icon={<PartyPopper size={32} />}
              title={isFiltered ? "No kudos match these filters" : "No kudos yet"}
              description={
                isFiltered
                  ? "Try a different value, team or department."
                  : "Be the first to recognize someone."
              }
              action={
                isFiltered ? (
                  <Button variant="secondary" onClick={() => setFilter({})}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => composer.open()}>Give kudos</Button>
                )
              }
            />
          }
        />
      </div>
    </>
  );
}
