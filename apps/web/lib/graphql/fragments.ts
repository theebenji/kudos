import { graphql } from "@/gql";

/** Everything a KudoCard needs. Shared so feed, profile and permalink pages hit the same cache entries. */
export const KUDO_FIELDS = graphql(`
  fragment KudoFields on Kudo {
    id
    body
    bodyText
    createdAt
    isEdited
    viewerCanEdit
    viewerCanDelete
    sender {
      id
      handle
      name
      isActive
    }
    recipients {
      id
      handle
      name
      isActive
    }
    value {
      id
      name
      emoji
    }
  }
`);

export const VIEWER_QUERY = graphql(`
  query Viewer {
    viewer {
      id
      handle
      name
      title
      role
    }
  }
`);
