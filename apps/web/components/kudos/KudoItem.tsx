"use client";

import { useMutation } from "@apollo/client/react";
import type { RichTextDoc } from "@repo/rich-text";
import { Button, Dialog, DialogClose, IconButton, Menu, MenuItem } from "@repo/ui";
import { KudoCard } from "@repo/ui/patterns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useComposer } from "@/components/composer/ComposerProvider";
import { graphql } from "@/gql";
import type { KudoFieldsFragment } from "@/gql/graphql";
import { RichText } from "./RichText";

const DELETE_KUDO = graphql(`
  mutation DeleteKudo($id: ID!) {
    deleteKudo(id: $id) {
      __typename
      ... on DeleteKudoSuccess {
        data
      }
      ... on Error {
        message
      }
    }
  }
`);

const person = (p: { handle: string; name: string; isActive: boolean }) => ({
  name: p.name,
  href: p.isActive ? `/people/${p.handle}` : undefined,
});

export function KudoItem({
  kudo,
  onDeleted,
}: {
  kudo: KudoFieldsFragment;
  onDeleted?: () => void;
}) {
  const composer = useComposer();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteKudo, { loading }] = useMutation(DELETE_KUDO, {
    update(cache, { data }) {
      if (data?.deleteKudo.__typename !== "DeleteKudoSuccess") return;
      // Removes it from every cached list (feed, profiles) at once.
      cache.evict({ id: cache.identify({ __typename: "Kudo", id: kudo.id }) });
      cache.gc();
    },
  });

  async function confirmDelete() {
    setError(null);
    const { data } = await deleteKudo({ variables: { id: kudo.id } });
    if (data?.deleteKudo.__typename === "DeleteKudoSuccess") {
      setConfirming(false);
      onDeleted?.();
    } else {
      setError(
        data?.deleteKudo && "message" in data.deleteKudo
          ? data.deleteKudo.message
          : "Couldn't delete the kudo",
      );
    }
  }

  const canAct = kudo.viewerCanEdit || kudo.viewerCanDelete;
  return (
    <>
      <KudoCard
        sender={person(kudo.sender)}
        recipients={kudo.recipients.map(person)}
        value={kudo.value}
        createdAt={new Date(kudo.createdAt)}
        edited={kudo.isEdited}
        permalink={`/kudos/${encodeURIComponent(kudo.id)}`}
        linkComponent={Link}
        actions={
          canAct && (
            <Menu
              trigger={
                <IconButton label="More actions" size="sm" icon={<MoreHorizontal size={16} />} />
              }
            >
              {kudo.viewerCanEdit && (
                <MenuItem icon={<Pencil size={16} />} onSelect={() => composer.edit(kudo)}>
                  Edit
                </MenuItem>
              )}
              {kudo.viewerCanDelete && (
                <MenuItem
                  icon={<Trash2 size={16} />}
                  tone="danger"
                  onSelect={() => setConfirming(true)}
                >
                  Delete
                </MenuItem>
              )}
            </Menu>
          )
        }
      >
        <RichText doc={kudo.body as RichTextDoc} />
      </KudoCard>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        size="sm"
        title="Delete this kudo?"
        description="It will disappear from the feed and everyone's profile."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="danger" loading={loading} onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </>
        }
      >
        {error && <p role="alert">{error}</p>}
      </Dialog>
    </>
  );
}
