import { Home, Need } from "../types";
import { BASE_TEMPLATE } from "../data/baseTemplate";

export type NeedDraft = Omit<Need, "id" | "homeId" | "ownerId">;
import { TemplateItem } from "../data/baseTemplate";

function getQuantity(item: TemplateItem, home: Home): number {
  switch (item.scale) {
    case "person":
      return home.peopleCount;
    case "bedroom":
      return home.bedrooms;
    case "room":
      return Math.max(1, home.bedrooms + home.livingRooms);
    case "bed":
      return Math.max(1, Math.min(home.peopleCount, home.bedrooms));
    default:
      return 1;
  }
}
export function generatePlan(home: Home): NeedDraft[] {
  const owned = new Set(home.ownedItems);
  const drafts: NeedDraft[] = [];

  for (const item of BASE_TEMPLATE) {
    if (item.onlyForTypes && !item.onlyForTypes.includes(home.type)) continue;
    if (item.skipForTypes?.includes(home.type)) continue;
    if (home.furnishing === "furnished" && item.coveredByFurnished) continue;
    if (item.ownedKey && owned.has(item.ownedKey)) continue;
    if (item.onlyIf?.worksFromHome && !home.worksFromHome) continue;
    if (item.onlyIf?.hasPet && !home.hasPet) continue;
    if (item.onlyIf?.hasGarden && !home.hasGarden) continue;
    if (item.onlyIf?.minPeople && home.peopleCount < item.onlyIf.minPeople) continue;

    let priority: number = item.priority;
    if (item.workBoost && home.worksFromHome) priority = Math.min(priority, 2);

    const quantity = getQuantity(item, home);
    drafts.push({
      name: quantity > 1 ? `${item.name} x${quantity}` : item.name,
      room: item.room,
      priority: priority as 1 | 2 | 3,
      estimatedCost: item.cost * quantity,
      status: "planned",
      source: "template",
    });
  }

  return drafts.sort(
    (a, b) => a.priority - b.priority || a.room.localeCompare(b.room)
  );
}