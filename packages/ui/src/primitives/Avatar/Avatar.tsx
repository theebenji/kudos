import { clsx } from "clsx";
import { Avatar as AvatarPrimitive } from "radix-ui";
import styles from "./Avatar.module.css";
import { initials } from "./initials";

export type AvatarProps = {
  /** Used for the image alt text and the initials fallback. */
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  /** Hide from assistive tech when the name is already next to the avatar. */
  decorative?: boolean;
  className?: string;
};

export function Avatar({ name, src, size = "md", decorative = false, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={clsx(styles.avatar, styles[size], className)}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
    >
      {src && <AvatarPrimitive.Image className={styles.image} src={src} alt="" />}
      <AvatarPrimitive.Fallback className={styles.fallback} delayMs={src ? 300 : 0}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export type AvatarGroupProps = {
  people: { name: string; src?: string | null }[];
  /** Avatars shown before collapsing the rest into "+N". */
  max?: number;
  size?: AvatarProps["size"];
};

/** Overlapping avatars, e.g. a kudo's recipients. Announces the full list of names. */
export function AvatarGroup({ people, max = 3, size = "sm" }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  return (
    <span className={styles.group} role="img" aria-label={people.map((p) => p.name).join(", ")}>
      {shown.map((person, i) => (
        <Avatar
          key={`${person.name}-${i}`}
          name={person.name}
          src={person.src}
          size={size}
          decorative
        />
      ))}
      {hidden > 0 && (
        <span className={clsx(styles.avatar, styles[size], styles.more)} aria-hidden="true">
          +{hidden}
        </span>
      )}
    </span>
  );
}
