import { clsx } from "clsx";
import { type ElementType, Fragment, type ReactNode, useId } from "react";
import { Avatar } from "../../primitives/Avatar/Avatar";
import { Card } from "../../primitives/Card/Card";
import { formatFullDate, formatRelativeTime } from "../../utils/relative-time";
import { ValueBadge } from "../ValueBadge/ValueBadge";
import styles from "./KudoCard.module.css";

export type KudoPerson = { name: string; href?: string; avatarSrc?: string | null };

export type KudoCardProps = {
  sender: KudoPerson;
  recipients: KudoPerson[];
  value?: { name: string; emoji?: string | null } | null;
  createdAt: Date;
  /** Fixed "now" for deterministic rendering (stories, tests); defaults to the current time. */
  now?: Date;
  edited?: boolean;
  /** Link to the kudo's own page; the timestamp links there. */
  permalink?: string;
  /** The rendered kudo body (rich text is rendered by the app). */
  children: ReactNode;
  /** Usually a ReactionBar. */
  reactions?: ReactNode;
  /** Usually a Menu with Edit / Delete. */
  actions?: ReactNode;
  footer?: ReactNode;
  /** Link component, e.g. Next.js `Link`. Defaults to `<a>`. */
  linkComponent?: ElementType;
  className?: string;
};

function PersonName({ person, Link }: { person: KudoPerson; Link: ElementType }) {
  return person.href ? (
    <Link href={person.href} className={styles.person}>
      {person.name}
    </Link>
  ) : (
    <span className={styles.person}>{person.name}</span>
  );
}

/** "Ana", "Ana and Ben", "Ana, Ben, and Cleo" — with each name rendered as a link. */
function PeopleList({ people, Link }: { people: KudoPerson[]; Link: ElementType }) {
  const parts = new Intl.ListFormat("en", { type: "conjunction" }).formatToParts(
    people.map((p) => p.name),
  );
  let index = 0;
  return (
    <>
      {parts.map((part, i) =>
        part.type === "element" ? (
          <PersonName key={i} person={people[index++] as KudoPerson} Link={Link} />
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        ),
      )}
    </>
  );
}

export function KudoCard({
  sender,
  recipients,
  value,
  createdAt,
  now,
  edited = false,
  permalink,
  children,
  reactions,
  actions,
  footer,
  linkComponent: Link = "a",
  className,
}: KudoCardProps) {
  const headingId = useId();
  const time = (
    <time dateTime={createdAt.toISOString()} title={formatFullDate(createdAt)}>
      {formatRelativeTime(createdAt, now)}
    </time>
  );
  return (
    <Card asChild padding="none">
      <article className={clsx(styles.card, className)} aria-labelledby={headingId}>
        <header className={styles.header}>
          <Avatar name={sender.name} src={sender.avatarSrc} decorative />
          <div className={styles.headline}>
            <p id={headingId} className={styles.title}>
              <PersonName person={sender} Link={Link} /> recognized{" "}
              <PeopleList people={recipients} Link={Link} />
            </p>
            <p className={styles.meta}>
              {permalink ? (
                <Link href={permalink} className={styles.timeLink}>
                  {time}
                </Link>
              ) : (
                time
              )}
              {edited && <span> · edited</span>}
            </p>
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
        <div className={styles.body}>{children}</div>
        {value && (
          <div className={styles.tags}>
            <ValueBadge name={value.name} emoji={value.emoji} />
          </div>
        )}
        {(reactions || footer) && (
          <footer className={styles.footer}>
            {reactions}
            {footer}
          </footer>
        )}
      </article>
    </Card>
  );
}
