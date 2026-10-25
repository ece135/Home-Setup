import { Home } from "../types";
import { NeedDraft, generatePlan } from "./plan";
import { fitToBudget } from "./budgetFit";

const TIMEOUT_MS = 30000;

interface AIItem {
  name: unknown;
  room: unknown;
  priority: unknown;
  estimatedCost: unknown;
  reason: unknown;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s*x\d+$/, "").trim();
}

async function fetchExtras(home: Home, base: NeedDraft[]): Promise<NeedDraft[]> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("EXPO_PUBLIC_API_URL is not set.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        home: {
          type: home.type,
          furnishing: home.furnishing,
          peopleCount: home.peopleCount,
          bedrooms: home.bedrooms,
          livingRooms: home.livingRooms,
          budget: home.budget,
          style: home.style,
          worksFromHome: home.worksFromHome,
          hasPet: home.hasPet,
          hasGarden: home.hasGarden,
          ownedItems: home.ownedItems,
        },
        existingItems: base.map((need) => need.name),
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = (await response.json()) as { items?: AIItem[] };
    if (!Array.isArray(data.items)) {
      throw new Error("Invalid AI response.");
    }

    const taken = new Set(base.map((need) => normalizeName(need.name)));
    const extras: NeedDraft[] = [];

    for (const item of data.items) {
      if (typeof item.name !== "string" || typeof item.room !== "string") continue;

      const priority = Number(item.priority);
      const cost = Number(item.estimatedCost);
      if (!Number.isInteger(priority) || priority < 2 || priority > 4) continue;
      if (!Number.isFinite(cost) || cost <= 0) continue;

      const name = item.name.trim();
      if (!name || taken.has(normalizeName(name))) continue;
      taken.add(normalizeName(name));

      const draft: NeedDraft = {
        name,
        room: item.room.trim() || "General",
        priority: priority as 2 | 3 | 4,
        estimatedCost: cost,
        status: "planned",
        source: "ai",
      };
      if (typeof item.reason === "string" && item.reason.trim()) {
        draft.reason = item.reason.trim();
      }
      extras.push(draft);
    }

    return extras;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateAIPlan(home: Home): Promise<NeedDraft[]> {
  const base = generatePlan(home);

  try {
    const extras = await fetchExtras(home, base);
    const combined = [...base, ...extras];
    return fitToBudget(combined, home.budget).drafts;
  } catch (error) {
    console.error("AI suggestions failed, using the template plan:", error);
    return fitToBudget(base, home.budget).drafts;
  }
}