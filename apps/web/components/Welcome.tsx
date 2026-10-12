import { Button } from "@repo/ui";
import styles from "./Welcome.module.css";

export type WelcomeProps = {
  viewer: { name: string; title: string | null; role: "ADMIN" | "MEMBER" };
  values: { id: string; name: string; emoji: string | null }[];
  signOutAction: () => Promise<void>;
};

/** Temporary home content proving the auth bridge end to end; the real feed arrives in Phase 4. */
export function Welcome({ viewer, values, signOutAction }: WelcomeProps) {
  const firstName = viewer.name.split(" ")[0];
  return (
    <section className={styles.welcome}>
      <h2>Welcome, {firstName}</h2>
      <p className={styles.meta}>
        {viewer.title ?? "No title"} · {viewer.role === "ADMIN" ? "Admin" : "Member"}
      </p>
      <h3>Our values</h3>
      <ul className={styles.values}>
        {values.map((value) => (
          <li key={value.id}>
            {value.emoji && <span aria-hidden="true">{value.emoji} </span>}
            {value.name}
          </li>
        ))}
      </ul>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </section>
  );
}
