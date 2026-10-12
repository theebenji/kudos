"use client";

import { brand } from "@repo/config/brand";
import { Avatar, Button, Menu, MenuItem, MenuSeparator } from "@repo/ui";
import { LogOut, Plus, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useComposer } from "@/components/composer/ComposerProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import styles from "./AppHeader.module.css";

type Props = {
  viewer: { handle: string; name: string; title?: string | null };
  signOutAction: () => Promise<void>;
};

export function AppHeader({ viewer, signOutAction }: Props) {
  const composer = useComposer();
  const router = useRouter();
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          {brand.name}
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <Link href="/">Feed</Link>
          <Link href={`/people/${viewer.handle}`}>My kudos</Link>
        </nav>
        <div className={styles.actions}>
          <NotificationBell />
          <Button size="sm" onClick={() => composer.open()}>
            <Plus size={16} aria-hidden /> Give kudos
          </Button>
          <Menu
            trigger={
              <button
                type="button"
                className={styles.account}
                aria-label={`Account: ${viewer.name}`}
              >
                <Avatar name={viewer.name} size="sm" decorative />
              </button>
            }
          >
            <MenuItem
              icon={<User size={16} />}
              onSelect={() => router.push(`/people/${viewer.handle}`)}
            >
              My profile
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<LogOut size={16} />} onSelect={() => void signOutAction()}>
              Sign out
            </MenuItem>
          </Menu>
        </div>
      </div>
    </header>
  );
}
