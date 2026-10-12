import { InMemoryCache } from "@apollo/client-integration-nextjs";
import { relayStylePagination } from "@apollo/client/utilities";

/** Shared cache config: cursor-paginated lists merge pages; each feed filter is its own list. */
export function createCache() {
  return new InMemoryCache({
    typePolicies: {
      Query: { fields: { kudos: relayStylePagination(["filter"]) } },
      User: {
        fields: { kudosReceived: relayStylePagination(), kudosGiven: relayStylePagination() },
      },
    },
  });
}
