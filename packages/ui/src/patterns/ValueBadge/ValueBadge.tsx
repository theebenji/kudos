import { Badge } from "../../primitives/Badge/Badge";

export type ValueBadgeProps = { name: string; emoji?: string | null };

/** The company value a kudo is tagged with. */
export function ValueBadge({ name, emoji }: ValueBadgeProps) {
  return (
    <Badge tone="accent">
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {name}
    </Badge>
  );
}
