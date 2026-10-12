"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import {
  Avatar,
  Button,
  Dialog,
  DialogClose,
  IconButton,
  Menu,
  MenuItem,
  RelativeTime,
  Spinner,
  TextArea,
} from "@repo/ui";
import { MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { graphql } from "@/gql";
import type { KudoCommentsQuery } from "@/gql/graphql";
import styles from "./Comments.module.css";

const COMMENTS = graphql(`
  query KudoComments($kudoId: ID!) {
    kudo(id: $kudoId) {
      id
      commentCount
      comments(first: 100) {
        edges {
          node {
            id
            body
            createdAt
            isEdited
            viewerCanEdit
            viewerCanDelete
            author {
              id
              handle
              name
              isActive
            }
          }
        }
      }
    }
  }
`);

const ADD_COMMENT = graphql(`
  mutation AddComment($kudoId: ID!, $body: String!) {
    addComment(kudoId: $kudoId, body: $body) {
      __typename
      ... on ValidationError {
        fieldErrors {
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

const UPDATE_COMMENT = graphql(`
  mutation UpdateComment($id: ID!, $body: String!) {
    updateComment(id: $id, body: $body) {
      __typename
      ... on UpdateCommentSuccess {
        data {
          id
          body
          isEdited
        }
      }
      ... on ValidationError {
        fieldErrors {
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

const DELETE_COMMENT = graphql(`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id) {
      __typename
      ... on DeleteCommentSuccess {
        data {
          id
          commentCount
        }
      }
    }
  }
`);

const MAX_LENGTH = 1000;
type CommentNode = NonNullable<KudoCommentsQuery["kudo"]>["comments"]["edges"][number]["node"];

function errorFrom(
  result: { __typename: string; fieldErrors?: { message: string }[]; message?: string } | undefined,
) {
  return result?.fieldErrors?.[0]?.message ?? result?.message ?? "Something went wrong";
}

function CommentItem({ comment, kudoId }: { comment: CommentNode; kudoId: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [update, updating] = useMutation(UPDATE_COMMENT);
  const [remove, removing] = useMutation(DELETE_COMMENT, {
    refetchQueries: [{ query: COMMENTS, variables: { kudoId } }],
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    const { data } = await update({ variables: { id: comment.id, body: draft } });
    if (data?.updateComment.__typename === "UpdateCommentSuccess") {
      setEditing(false);
      setError(null);
    } else setError(errorFrom(data?.updateComment as never));
  }

  const author = comment.author;
  return (
    <li className={styles.comment}>
      <Avatar name={author.name} size="sm" decorative />
      <div className={styles.main}>
        <p className={styles.meta}>
          {author.isActive ? (
            <Link href={`/people/${author.handle}`} className={styles.author}>
              {author.name}
            </Link>
          ) : (
            <span className={styles.author}>{author.name}</span>
          )}{" "}
          · <RelativeTime date={new Date(comment.createdAt)} />
          {comment.isEdited && " · edited"}
        </p>
        {editing ? (
          <form onSubmit={(e) => void save(e)} className={styles.editForm}>
            <TextArea
              label="Edit comment"
              hideLabel
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              error={error}
              autoFocus
            />
            <div className={styles.actions}>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={updating.loading}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <p className={styles.body}>{comment.body}</p>
        )}
      </div>
      {(comment.viewerCanEdit || comment.viewerCanDelete) && !editing && (
        <Menu
          trigger={
            <IconButton label="Comment actions" size="sm" icon={<MoreHorizontal size={16} />} />
          }
        >
          {comment.viewerCanEdit && (
            <MenuItem icon={<Pencil size={16} />} onSelect={() => setEditing(true)}>
              Edit
            </MenuItem>
          )}
          {comment.viewerCanDelete && (
            <MenuItem
              icon={<Trash2 size={16} />}
              tone="danger"
              onSelect={() => setConfirming(true)}
            >
              Delete
            </MenuItem>
          )}
        </Menu>
      )}
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        size="sm"
        title="Delete this comment?"
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={removing.loading}
              onClick={() =>
                void remove({ variables: { id: comment.id } }).then(() => setConfirming(false))
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <p>{comment.body}</p>
      </Dialog>
    </li>
  );
}

function Thread({ kudoId, id }: { kudoId: string; id: string }) {
  const { data, loading } = useQuery(COMMENTS, { variables: { kudoId } });
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [add, adding] = useMutation(ADD_COMMENT, {
    refetchQueries: [{ query: COMMENTS, variables: { kudoId } }],
    awaitRefetchQueries: true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { data: result } = await add({ variables: { kudoId, body } });
    if (result?.addComment.__typename === "AddCommentSuccess") {
      setBody("");
      setError(null);
    } else setError(errorFrom(result?.addComment as never));
  }

  const comments = data?.kudo?.comments.edges.map((e) => e.node) ?? [];
  return (
    <div id={id} className={styles.thread}>
      {loading && !data ? (
        <Spinner label="Loading comments" size="sm" />
      ) : (
        comments.length > 0 && (
          <ul role="list" className={styles.list} aria-label="Comments">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} kudoId={kudoId} />
            ))}
          </ul>
        )
      )}
      <form
        className={styles.form}
        onSubmit={(e) => void submit(e)}
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter sends, like most chat tools.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(e);
        }}
      >
        <TextArea
          label="Add a comment"
          hideLabel
          placeholder="Add a comment…"
          rows={2}
          value={body}
          maxLength={MAX_LENGTH}
          showCount={body.length > MAX_LENGTH - 100}
          onChange={(e) => setBody(e.target.value)}
          error={error}
        />
        <Button size="sm" type="submit" loading={adding.loading} disabled={!body.trim()}>
          Post comment
        </Button>
      </form>
    </div>
  );
}

/** "💬 3 comments" toggle with the thread underneath. Open by default on the kudo's own page. */
export function Comments({
  kudoId,
  count,
  defaultOpen = false,
}: {
  kudoId: string;
  count: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const threadId = useId();
  const label = count === 0 ? "Comment" : `${count} ${count === 1 ? "comment" : "comments"}`;
  return (
    <div className={styles.comments}>
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        aria-controls={open ? threadId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle size={16} aria-hidden /> {label}
      </Button>
      {open && <Thread kudoId={kudoId} id={threadId} />}
    </div>
  );
}
