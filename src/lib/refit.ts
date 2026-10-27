export interface Refittable {
  id: string;
  priority: number;
  estimatedCost: number;
  status: string;
  autoDeferred?: boolean;
}

export interface StatusChange {
  id: string;
  status: "planned" | "deferred";
  autoDeferred: boolean;
}

export function refitStatuses(
  needs: Refittable[],
  budget: number,
  spent: number,
): StatusChange[] {
  const pool = needs
    .filter(
      (n) =>
        n.status === "planned" || (n.status === "deferred" && n.autoDeferred),
    )
    .sort((a, b) => a.priority - b.priority || a.estimatedCost - b.estimatedCost);

  const target = new Map<string, "planned" | "deferred">();
  let remaining = budget - spent;
  let blocked = false;

  for (const priority of [1, 2, 3, 4]) {
    const group = pool.filter((n) => n.priority === priority);
    const groupTotal = group.reduce((sum, n) => sum + n.estimatedCost, 0);

    if (priority === 1) {
      group.forEach((n) => target.set(n.id, "planned"));
      remaining -= groupTotal;
      if (remaining < 0) blocked = true;
      continue;
    }

    if (!blocked && groupTotal <= remaining) {
      group.forEach((n) => target.set(n.id, "planned"));
      remaining -= groupTotal;
      continue;
    }

    for (const n of group) {
      if (!blocked && n.estimatedCost <= remaining) {
        target.set(n.id, "planned");
        remaining -= n.estimatedCost;
      } else {
        blocked = true;
        target.set(n.id, "deferred");
      }
    }
    blocked = true;
  }

  const changes: StatusChange[] = [];
  for (const n of pool) {
    const next = target.get(n.id);
    if (!next) continue;
    const nextAuto = next === "deferred";
    if (next !== n.status || nextAuto !== Boolean(n.autoDeferred)) {
      changes.push({ id: n.id, status: next, autoDeferred: nextAuto });
    }
  }
  return changes;
}