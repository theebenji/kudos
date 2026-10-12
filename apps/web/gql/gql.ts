/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query ProfileExists($handle: String!) {\n    user(handle: $handle) {\n      name\n    }\n  }\n": typeof types.ProfileExistsDocument,
    "\n  query UserById($id: ID!) {\n    node(id: $id) {\n      ... on User {\n        handle\n      }\n    }\n  }\n": typeof types.UserByIdDocument,
    "\n  query ComposerData {\n    values {\n      id\n      name\n      emoji\n    }\n    gifSource\n  }\n": typeof types.ComposerDataDocument,
    "\n  query SearchPeople($query: String!) {\n    searchPeople(query: $query, first: 8) {\n      id\n      name\n      title\n      team\n    }\n  }\n": typeof types.SearchPeopleDocument,
    "\n  query SearchGifs($query: String!) {\n    gifs(query: $query, first: 12) {\n      id\n      src\n      alt\n      width\n      height\n    }\n  }\n": typeof types.SearchGifsDocument,
    "\n  mutation CreateKudo($input: CreateKudoInput!) {\n    createKudo(input: $input) {\n      __typename\n      ... on CreateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n": typeof types.CreateKudoDocument,
    "\n  mutation UpdateKudo($input: UpdateKudoInput!) {\n    updateKudo(input: $input) {\n      __typename\n      ... on UpdateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n": typeof types.UpdateKudoDocument,
    "\n  query Feed($first: Int!, $after: String, $filter: KudoFilter) {\n    kudos(first: $first, after: $after, filter: $filter) {\n      edges {\n        node {\n          ...KudoFields\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.FeedDocument,
    "\n  query FeedFilters {\n    values {\n      id\n      name\n      emoji\n    }\n    departments\n    teams\n  }\n": typeof types.FeedFiltersDocument,
    "\n  mutation DeleteKudo($id: ID!) {\n    deleteKudo(id: $id) {\n      __typename\n      ... on DeleteKudoSuccess {\n        data\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n": typeof types.DeleteKudoDocument,
    "\n  query KudoPage($id: ID!) {\n    kudo(id: $id) {\n      ...KudoFields\n    }\n  }\n": typeof types.KudoPageDocument,
    "\n  query Profile($handle: String!) {\n    viewer {\n      id\n    }\n    user(handle: $handle) {\n      id\n      handle\n      name\n      title\n      department\n      team\n      bio\n      joinedOn\n      isActive\n      role\n      kudosReceivedCount\n      kudosGivenCount\n      manager {\n        handle\n        name\n        isActive\n      }\n    }\n  }\n": typeof types.ProfileDocument,
    "\n  query ProfileReceived($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosReceived(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.ProfileReceivedDocument,
    "\n  query ProfileGiven($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosGiven(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.ProfileGivenDocument,
    "\n  fragment KudoFields on Kudo {\n    id\n    body\n    bodyText\n    createdAt\n    isEdited\n    viewerCanEdit\n    viewerCanDelete\n    sender {\n      id\n      handle\n      name\n      isActive\n    }\n    recipients {\n      id\n      handle\n      name\n      isActive\n    }\n    value {\n      id\n      name\n      emoji\n    }\n  }\n": typeof types.KudoFieldsFragmentDoc,
    "\n  query Viewer {\n    viewer {\n      id\n      handle\n      name\n      title\n      role\n    }\n  }\n": typeof types.ViewerDocument,
};
const documents: Documents = {
    "\n  query ProfileExists($handle: String!) {\n    user(handle: $handle) {\n      name\n    }\n  }\n": types.ProfileExistsDocument,
    "\n  query UserById($id: ID!) {\n    node(id: $id) {\n      ... on User {\n        handle\n      }\n    }\n  }\n": types.UserByIdDocument,
    "\n  query ComposerData {\n    values {\n      id\n      name\n      emoji\n    }\n    gifSource\n  }\n": types.ComposerDataDocument,
    "\n  query SearchPeople($query: String!) {\n    searchPeople(query: $query, first: 8) {\n      id\n      name\n      title\n      team\n    }\n  }\n": types.SearchPeopleDocument,
    "\n  query SearchGifs($query: String!) {\n    gifs(query: $query, first: 12) {\n      id\n      src\n      alt\n      width\n      height\n    }\n  }\n": types.SearchGifsDocument,
    "\n  mutation CreateKudo($input: CreateKudoInput!) {\n    createKudo(input: $input) {\n      __typename\n      ... on CreateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n": types.CreateKudoDocument,
    "\n  mutation UpdateKudo($input: UpdateKudoInput!) {\n    updateKudo(input: $input) {\n      __typename\n      ... on UpdateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n": types.UpdateKudoDocument,
    "\n  query Feed($first: Int!, $after: String, $filter: KudoFilter) {\n    kudos(first: $first, after: $after, filter: $filter) {\n      edges {\n        node {\n          ...KudoFields\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.FeedDocument,
    "\n  query FeedFilters {\n    values {\n      id\n      name\n      emoji\n    }\n    departments\n    teams\n  }\n": types.FeedFiltersDocument,
    "\n  mutation DeleteKudo($id: ID!) {\n    deleteKudo(id: $id) {\n      __typename\n      ... on DeleteKudoSuccess {\n        data\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n": types.DeleteKudoDocument,
    "\n  query KudoPage($id: ID!) {\n    kudo(id: $id) {\n      ...KudoFields\n    }\n  }\n": types.KudoPageDocument,
    "\n  query Profile($handle: String!) {\n    viewer {\n      id\n    }\n    user(handle: $handle) {\n      id\n      handle\n      name\n      title\n      department\n      team\n      bio\n      joinedOn\n      isActive\n      role\n      kudosReceivedCount\n      kudosGivenCount\n      manager {\n        handle\n        name\n        isActive\n      }\n    }\n  }\n": types.ProfileDocument,
    "\n  query ProfileReceived($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosReceived(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.ProfileReceivedDocument,
    "\n  query ProfileGiven($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosGiven(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.ProfileGivenDocument,
    "\n  fragment KudoFields on Kudo {\n    id\n    body\n    bodyText\n    createdAt\n    isEdited\n    viewerCanEdit\n    viewerCanDelete\n    sender {\n      id\n      handle\n      name\n      isActive\n    }\n    recipients {\n      id\n      handle\n      name\n      isActive\n    }\n    value {\n      id\n      name\n      emoji\n    }\n  }\n": types.KudoFieldsFragmentDoc,
    "\n  query Viewer {\n    viewer {\n      id\n      handle\n      name\n      title\n      role\n    }\n  }\n": types.ViewerDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProfileExists($handle: String!) {\n    user(handle: $handle) {\n      name\n    }\n  }\n"): (typeof documents)["\n  query ProfileExists($handle: String!) {\n    user(handle: $handle) {\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query UserById($id: ID!) {\n    node(id: $id) {\n      ... on User {\n        handle\n      }\n    }\n  }\n"): (typeof documents)["\n  query UserById($id: ID!) {\n    node(id: $id) {\n      ... on User {\n        handle\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ComposerData {\n    values {\n      id\n      name\n      emoji\n    }\n    gifSource\n  }\n"): (typeof documents)["\n  query ComposerData {\n    values {\n      id\n      name\n      emoji\n    }\n    gifSource\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchPeople($query: String!) {\n    searchPeople(query: $query, first: 8) {\n      id\n      name\n      title\n      team\n    }\n  }\n"): (typeof documents)["\n  query SearchPeople($query: String!) {\n    searchPeople(query: $query, first: 8) {\n      id\n      name\n      title\n      team\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchGifs($query: String!) {\n    gifs(query: $query, first: 12) {\n      id\n      src\n      alt\n      width\n      height\n    }\n  }\n"): (typeof documents)["\n  query SearchGifs($query: String!) {\n    gifs(query: $query, first: 12) {\n      id\n      src\n      alt\n      width\n      height\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateKudo($input: CreateKudoInput!) {\n    createKudo(input: $input) {\n      __typename\n      ... on CreateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateKudo($input: CreateKudoInput!) {\n    createKudo(input: $input) {\n      __typename\n      ... on CreateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateKudo($input: UpdateKudoInput!) {\n    updateKudo(input: $input) {\n      __typename\n      ... on UpdateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateKudo($input: UpdateKudoInput!) {\n    updateKudo(input: $input) {\n      __typename\n      ... on UpdateKudoSuccess {\n        data {\n          ...KudoFields\n        }\n      }\n      ... on ValidationError {\n        fieldErrors {\n          path\n          message\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Feed($first: Int!, $after: String, $filter: KudoFilter) {\n    kudos(first: $first, after: $after, filter: $filter) {\n      edges {\n        node {\n          ...KudoFields\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): (typeof documents)["\n  query Feed($first: Int!, $after: String, $filter: KudoFilter) {\n    kudos(first: $first, after: $after, filter: $filter) {\n      edges {\n        node {\n          ...KudoFields\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FeedFilters {\n    values {\n      id\n      name\n      emoji\n    }\n    departments\n    teams\n  }\n"): (typeof documents)["\n  query FeedFilters {\n    values {\n      id\n      name\n      emoji\n    }\n    departments\n    teams\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteKudo($id: ID!) {\n    deleteKudo(id: $id) {\n      __typename\n      ... on DeleteKudoSuccess {\n        data\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteKudo($id: ID!) {\n    deleteKudo(id: $id) {\n      __typename\n      ... on DeleteKudoSuccess {\n        data\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query KudoPage($id: ID!) {\n    kudo(id: $id) {\n      ...KudoFields\n    }\n  }\n"): (typeof documents)["\n  query KudoPage($id: ID!) {\n    kudo(id: $id) {\n      ...KudoFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Profile($handle: String!) {\n    viewer {\n      id\n    }\n    user(handle: $handle) {\n      id\n      handle\n      name\n      title\n      department\n      team\n      bio\n      joinedOn\n      isActive\n      role\n      kudosReceivedCount\n      kudosGivenCount\n      manager {\n        handle\n        name\n        isActive\n      }\n    }\n  }\n"): (typeof documents)["\n  query Profile($handle: String!) {\n    viewer {\n      id\n    }\n    user(handle: $handle) {\n      id\n      handle\n      name\n      title\n      department\n      team\n      bio\n      joinedOn\n      isActive\n      role\n      kudosReceivedCount\n      kudosGivenCount\n      manager {\n        handle\n        name\n        isActive\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProfileReceived($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosReceived(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProfileReceived($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosReceived(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProfileGiven($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosGiven(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProfileGiven($handle: String!, $first: Int!, $after: String) {\n    user(handle: $handle) {\n      id\n      kudosGiven(first: $first, after: $after) {\n        edges {\n          node {\n            ...KudoFields\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment KudoFields on Kudo {\n    id\n    body\n    bodyText\n    createdAt\n    isEdited\n    viewerCanEdit\n    viewerCanDelete\n    sender {\n      id\n      handle\n      name\n      isActive\n    }\n    recipients {\n      id\n      handle\n      name\n      isActive\n    }\n    value {\n      id\n      name\n      emoji\n    }\n  }\n"): (typeof documents)["\n  fragment KudoFields on Kudo {\n    id\n    body\n    bodyText\n    createdAt\n    isEdited\n    viewerCanEdit\n    viewerCanDelete\n    sender {\n      id\n      handle\n      name\n      isActive\n    }\n    recipients {\n      id\n      handle\n      name\n      isActive\n    }\n    value {\n      id\n      name\n      emoji\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Viewer {\n    viewer {\n      id\n      handle\n      name\n      title\n      role\n    }\n  }\n"): (typeof documents)["\n  query Viewer {\n    viewer {\n      id\n      handle\n      name\n      title\n      role\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;