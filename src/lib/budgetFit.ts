import { NeedDraft } from "./plan";

export interface FitResult {
  drafts: NeedDraft[];
  deferredCount: number;
  essentialsOverBudget: boolean;
}

export function fitToBudget(drafts: NeedDraft[], budget: number): FitResult {
  const sorted = [...drafts].sort(
    (a, b) => a.priority - b.priority || a.estimatedCost - b.estimatedCost,
  );

  const result: NeedDraft[] = [];
  let remaining = budget;
  let blocked = false;
  let deferredCount = 0;
  let essentialsOverBudget = false;

  for (const priority of [1, 2, 3, 4]) {
    const group = sorted.filter((d) => d.priority === priority);
    const groupTotal = group.reduce((sum, d) => sum + d.estimatedCost, 0);

    if (priority === 1) {
      result.push(...group);
      remaining -= groupTotal;
      if (remaining < 0) {
        essentialsOverBudget = true;
        blocked = true;
      }
      continue;
    }

    if (!blocked && groupTotal <= remaining) {
      result.push(...group);
      remaining -= groupTotal;
      continue;
    }

    for (const item of group) {
      if (!blocked && item.estimatedCost <= remaining) {
        result.push(item);
        remaining -= item.estimatedCost;
      } else {
        blocked = true;
        deferredCount += 1;
        result.push({ ...item, status: "deferred", autoDeferred: true });
      }
    }
    blocked = true;
  }

  result.sort((a, b) => a.priority - b.priority || a.room.localeCompare(b.room));

  return { drafts: result, deferredCount, essentialsOverBudget };
}