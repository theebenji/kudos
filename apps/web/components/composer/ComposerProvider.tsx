"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { KudoFieldsFragment } from "@/gql/graphql";
import { Composer, type ComposerRecipient } from "./Composer";

type ComposerState =
  | { mode: "closed" }
  | { mode: "create"; recipients: ComposerRecipient[] }
  | { mode: "edit"; kudo: KudoFieldsFragment };

type ComposerApi = {
  /** Open the "Give kudos" composer, optionally with recipients pre-filled (e.g. from a profile). */
  open: (options?: { recipients?: ComposerRecipient[] }) => void;
  /** Open the composer on an existing kudo (sender only). */
  edit: (kudo: KudoFieldsFragment) => void;
};

const ComposerContext = createContext<ComposerApi | null>(null);

export function useComposer(): ComposerApi {
  const api = useContext(ComposerContext);
  if (!api) throw new Error("useComposer must be used inside <ComposerProvider>");
  return api;
}

/** One composer for the whole app, so any "Give kudos" button can open it. */
export function ComposerProvider({ children }: { viewerId: string; children: ReactNode }) {
  const [state, setState] = useState<ComposerState>({ mode: "closed" });
  const [announcement, setAnnouncement] = useState("");
  const open = useCallback<ComposerApi["open"]>(
    (options) => setState({ mode: "create", recipients: options?.recipients ?? [] }),
    [],
  );
  const edit = useCallback<ComposerApi["edit"]>((kudo) => setState({ mode: "edit", kudo }), []);
  const api = useMemo(() => ({ open, edit }), [open, edit]);

  return (
    <ComposerContext.Provider value={api}>
      {children}
      {state.mode !== "closed" && (
        <Composer
          // Remount per opening, so each kudo starts from a clean form.
          key={state.mode === "edit" ? state.kudo.id : "create"}
          kudo={state.mode === "edit" ? state.kudo : undefined}
          initialRecipients={state.mode === "create" ? state.recipients : undefined}
          onClose={() => setState({ mode: "closed" })}
          onDone={(message) => {
            setState({ mode: "closed" });
            setAnnouncement(message);
          }}
        />
      )}
      <p
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
      >
        {announcement}
      </p>
    </ComposerContext.Provider>
  );
}
