"use client";

import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import type { RichTextDoc } from "@repo/rich-text";
import { Button, Dialog, DialogClose, MultiCombobox, SelectField } from "@repo/ui";
import { type GifResult, type MentionCandidate, RichTextEditor } from "@repo/ui/patterns";
import { type FormEvent, useCallback, useState } from "react";
import { graphql } from "@/gql";
import type { KudoFieldsFragment } from "@/gql/graphql";
import { rawId } from "@/lib/global-id";
import styles from "./Composer.module.css";

export type ComposerRecipient = { id: string; name: string };

const COMPOSER_DATA = graphql(`
  query ComposerData {
    values {
      id
      name
      emoji
    }
    gifSource
  }
`);

const SEARCH_PEOPLE = graphql(`
  query SearchPeople($query: String!) {
    searchPeople(query: $query, first: 8) {
      id
      name
      title
      team
    }
  }
`);

const SEARCH_GIFS = graphql(`
  query SearchGifs($query: String!) {
    gifs(query: $query, first: 12) {
      id
      src
      alt
      width
      height
    }
  }
`);

const CREATE_KUDO = graphql(`
  mutation CreateKudo($input: CreateKudoInput!) {
    createKudo(input: $input) {
      __typename
      ... on CreateKudoSuccess {
        data {
          ...KudoFields
        }
      }
      ... on ValidationError {
        fieldErrors {
          path
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

const UPDATE_KUDO = graphql(`
  mutation UpdateKudo($input: UpdateKudoInput!) {
    updateKudo(input: $input) {
      __typename
      ... on UpdateKudoSuccess {
        data {
          ...KudoFields
        }
      }
      ... on ValidationError {
        fieldErrors {
          path
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

type Errors = { recipients?: string; value?: string; body?: string; form?: string };

/** API field paths → form fields (body.content.0… all belong to the message). */
function toErrors(fieldErrors: { path: string; message: string }[]): Errors {
  const errors: Errors = {};
  for (const { path, message } of fieldErrors) {
    if (path.startsWith("recipientIds")) errors.recipients ??= message;
    else if (path.startsWith("valueId")) errors.value ??= message;
    else if (path.startsWith("body")) errors.body ??= message;
    else errors.form ??= message;
  }
  return errors;
}

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
const firstNames = (list: { name: string }[]) =>
  new Intl.ListFormat("en").format(list.map((r) => r.name.split(" ")[0] ?? r.name));

type Props = {
  kudo?: KudoFieldsFragment;
  initialRecipients?: ComposerRecipient[];
  onClose: () => void;
  onDone: (announcement: string) => void;
};

export function Composer({ kudo, initialRecipients = [], onClose, onDone }: Props) {
  const editing = Boolean(kudo);
  const client = useApolloClient();
  const { data } = useQuery(COMPOSER_DATA);
  const [recipients, setRecipients] = useState(
    initialRecipients.map((r) => ({ id: r.id, label: r.name, description: null as string | null })),
  );
  const [valueId, setValueId] = useState(kudo?.value?.id ?? "");
  const [body, setBody] = useState<RichTextDoc | null>(
    (kudo?.body as RichTextDoc | undefined) ?? null,
  );
  const [errors, setErrors] = useState<Errors>({});
  const refetchQueries = ["Feed", "Profile", "ProfileReceived", "ProfileGiven"];
  const [createKudo, create] = useMutation(CREATE_KUDO, { refetchQueries });
  const [updateKudo, update] = useMutation(UPDATE_KUDO);

  const searchPeople = useCallback(
    async (query: string) => {
      const result = await client.query({
        query: SEARCH_PEOPLE,
        variables: { query },
        fetchPolicy: "network-only",
      });
      return (result.data?.searchPeople ?? []).map((p) => ({
        id: p.id,
        label: p.name,
        description: [p.title, p.team].filter(Boolean).join(" · ") || null,
      }));
    },
    [client],
  );
  const searchMentions = useCallback(
    async (query: string): Promise<MentionCandidate[]> =>
      (await searchPeople(query)).map((p) => ({ ...p, id: rawId(p.id) })),
    [searchPeople],
  );
  const searchGifs = useCallback(
    async (query: string): Promise<GifResult[]> =>
      (await client.query({ query: SEARCH_GIFS, variables: { query } })).data?.gifs ?? [],
    [client],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const local: Errors = {};
    if (!editing && recipients.length === 0) local.recipients = "Choose at least one person";
    if (!body) local.body = "Write a message";
    setErrors(local);
    if (Object.keys(local).length || !body) return;

    if (kudo) {
      const { data: result } = await updateKudo({
        variables: { input: { id: kudo.id, valueId: valueId || null, body } },
      });
      const r = result?.updateKudo;
      if (r?.__typename === "UpdateKudoSuccess") return onDone("Kudo updated.");
      return setErrors(
        r?.__typename === "ValidationError"
          ? toErrors(r.fieldErrors)
          : { form: r && "message" in r ? r.message : "Couldn't save" },
      );
    }
    const { data: result } = await createKudo({
      variables: {
        input: { recipientIds: recipients.map((r) => r.id), valueId: valueId || null, body },
      },
    });
    const r = result?.createKudo;
    if (r?.__typename === "CreateKudoSuccess")
      return onDone(`Kudos sent to ${firstNames(r.data.recipients)}.`);
    setErrors(
      r?.__typename === "ValidationError"
        ? toErrors(r.fieldErrors)
        : { form: r && "message" in r ? r.message : "Couldn't send" },
    );
  }

  const busy = create.loading || update.loading;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={editing ? "Edit kudo" : "Give kudos"}
      description={
        editing
          ? "Recipients stay the same; you can change the message and value."
          : "Recognize someone for something great."
      }
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="kudo-composer" loading={busy}>
            {editing ? "Save" : "Send kudos"}
          </Button>
        </>
      }
    >
      <form id="kudo-composer" className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
        {errors.form && (
          <p role="alert" className={styles.formError}>
            {errors.form}
          </p>
        )}
        {kudo ? (
          <p className={styles.to}>
            To {new Intl.ListFormat("en").format(kudo.recipients.map((r) => r.name))}
          </p>
        ) : (
          <MultiCombobox
            label="To"
            description="Up to 10 people. Type a name, title or team."
            placeholder="Search people"
            itemName={{ one: "person", other: "people" }}
            selected={recipients}
            onChange={(next) => {
              setRecipients(next);
              setErrors((e) => ({ ...e, recipients: undefined }));
            }}
            loadOptions={searchPeople}
            max={10}
            error={errors.recipients}
            autoFocus={initialRecipients.length === 0}
          />
        )}
        <SelectField
          label="Value"
          description="Optional: which company value does this show?"
          placeholder="No value"
          value={valueId}
          onChange={(e) => setValueId(e.target.value)}
          options={(data?.values ?? []).map((v) => ({
            value: v.id,
            label: `${v.emoji ?? ""} ${v.name}`.trim(),
          }))}
          error={errors.value}
        />
        <RichTextEditor
          label="Message"
          description="Type @ to mention someone (they'll be notified, but aren't a recipient)."
          initialContent={kudo?.body as RichTextDoc | undefined}
          onChange={(doc) => {
            setBody(doc);
            setErrors((e) => ({ ...e, body: undefined }));
          }}
          searchMentions={searchMentions}
          searchGifs={searchGifs}
          gifSource={data?.gifSource === "giphy" ? "giphy" : "bundled"}
          error={errors.body}
        />
        <p className={styles.hint}>
          {!editing && recipients.length > 0 && `Sending to ${people(recipients.length)}.`}
        </p>
      </form>
    </Dialog>
  );
}
