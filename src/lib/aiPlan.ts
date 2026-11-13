
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
  
  const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || "https://home-setup-api.vercel.app";
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, "");
  const fullUrl = `${baseUrl}/api/plan`;

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
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
        hasBalcony: home.hasBalcony,
        ownedItems: home.ownedItems,
      },
      existingItems: base.map((need) => need.name),
    }),
  });


  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
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