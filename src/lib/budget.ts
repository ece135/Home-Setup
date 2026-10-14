import { Need } from "../types";

export function getPlannedTotal(needs: Need[]): number {
  return needs
    .filter((n) => n.status === "planned")
    .reduce((sum, n) => sum + n.estimatedCost, 0);
}

export function getRemaining(budget: number, needs: Need[]): number {
  return budget - getPlannedTotal(needs);
}