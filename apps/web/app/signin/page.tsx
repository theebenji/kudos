import { listActiveUsers } from "@repo/db";
import { brand } from "@repo/config/brand";
import { Button } from "@repo/ui";
import { redirect } from "next/navigation";
import { auth, DEV_PROVIDER, OIDC_PROVIDER, signIn } from "@/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import styles from "./page.module.css";

export const metadata = { title: `Sign in · ${brand.name}` };

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const redirectTo = safeRedirectPath((await searchParams).callbackUrl);
  if (await auth()) redirect(redirectTo);

  const { devLoginEnabled, oidcEnabled, AUTH_OIDC_NAME } = env();
  const people = devLoginEnabled ? await listActiveUsers(db()) : [];

  async function signInAs(formData: FormData) {
    "use server";
    await signIn(DEV_PROVIDER, { userId: formData.get("userId"), redirectTo });
  }

  async function signInWithSso() {
    "use server";
    await signIn(OIDC_PROVIDER, { redirectTo });
  }

  return (
    <main className={styles.main}>
      <h1>Sign in to {brand.name}</h1>

      {oidcEnabled && (
        <form action={signInWithSso}>
          <Button type="submit">Continue with {AUTH_OIDC_NAME}</Button>
        </form>
      )}

      {devLoginEnabled && (
        <section aria-labelledby="demo-heading" className={styles.demo}>
          <h2 id="demo-heading">Demo: sign in as a seeded user</h2>
          <p className={styles.note}>Development only — no password. Admins are listed first.</p>
          <form action={signInAs}>
            <ul role="list" className={styles.people}>
              {people.map((person) => (
                <li key={person.id}>
                  <Button type="submit" name="userId" value={person.id} variant="secondary">
                    <span>{person.name}</span>
                    <span className={styles.meta}>
                      {person.title ?? "—"}
                      {person.role === "admin" && " · Admin"}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </form>
          {people.length === 0 && (
            <p>
              No users yet. Run <code>pnpm db:seed</code>.
            </p>
          )}
        </section>
      )}

      {!devLoginEnabled && !oidcEnabled && (
        <p role="alert">No sign-in method is configured. Set the AUTH_OIDC_* variables.</p>
      )}
    </main>
  );
}
