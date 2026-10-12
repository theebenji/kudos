import { brand } from "@repo/config/brand";
import { signOut } from "@/auth";
import { Welcome, type WelcomeProps } from "@/components/Welcome";
import { apiQuery } from "@/lib/api";
import styles from "./page.module.css";

type HomeData = { viewer: WelcomeProps["viewer"] | null; values: WelcomeProps["values"] };

export default async function HomePage() {
  const data = await apiQuery<HomeData>(/* GraphQL */ `
    {
      viewer {
        name
        title
        role
      }
      values {
        id
        name
        emoji
      }
    }
  `);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <main className={styles.main}>
      <h1>{brand.name}</h1>
      <p className={styles.tagline}>{brand.tagline}</p>
      {data.viewer && (
        <Welcome viewer={data.viewer} values={data.values} signOutAction={signOutAction} />
      )}
    </main>
  );
}
