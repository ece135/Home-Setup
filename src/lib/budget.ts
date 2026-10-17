import { Expense, Need } from "../types";

export function getPlannedTotal(needs: Need[]): number {
  return needs
    .filter((n) => n.status === "planned")
    .reduce((sum, n) => sum + n.estimatedCost, 0);
}

export function getSpentTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getUnplannedTotal(expenses: Expense[]): number {
  return expenses
    .filter((e) => !e.needId)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getRemaining(
  budget: number,
  needs: Need[],
  expenses: Expense[]
): number {
  return budget - getSpentTotal(expenses) - getPlannedTotal(needs);
}

export function getProgress(needs: Need[]): number {
  const counted = needs.filter((n) => n.status !== "deferred");
  if (counted.length === 0) return 0;
  const done = counted.filter(
    (n) => n.status === "purchased" || n.status === "owned"
  );
  return Math.round((done.length / counted.length) * 100);
}