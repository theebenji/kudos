import { ToastProvider } from "@repo/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { ComposerProvider } from "@/components/composer/ComposerProvider";
import { AppHeader } from "@/components/shell/AppHeader";
import { ApolloWrapper } from "@/lib/apollo/ApolloWrapper";
import { apiQuery, currentApiToken } from "@/lib/api";
import { env } from "@/lib/env";
import { VIEWER_QUERY } from "@/lib/graphql/fragments";
import styles from "./layout.module.css";

/** Every signed-in page: the API token for Apollo, the header, and the "Give kudos" composer. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [token, { viewer }] = await Promise.all([currentApiToken(), apiQuery(VIEWER_QUERY)]);
  // A valid session but no viewer means the account was deactivated since signing in.
  if (!viewer) redirect("/signin");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  const { API_URL, PUBLIC_API_URL } = env();
  return (
    <ApolloWrapper serverApiUrl={API_URL} browserApiUrl={PUBLIC_API_URL} initialToken={token}>
      <ToastProvider>
        <ComposerProvider viewerId={viewer.id}>
          <a href="#main" className={styles.skipLink}>
            Skip to content
          </a>
          <AppHeader viewer={viewer} signOutAction={signOutAction} />
          <main id="main" className={styles.main} tabIndex={-1}>
            {children}
          </main>
        </ComposerProvider>
      </ToastProvider>
    </ApolloWrapper>
  );
}
