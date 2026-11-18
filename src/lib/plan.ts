import { Home, Need } from "../types";
import { BASE_TEMPLATE, TemplateItem } from "../data/baseTemplate";
import { SEARCH_TERMS } from "../data/searchTerms";

export type NeedDraft = Omit<Need, "id" | "homeId" | "ownerId">;

function getQuantity(item: TemplateItem, home: Home): number {
  switch (item.scale) {
    case "person":
      return home.peopleCount;
    case "bedroom":
      return home.bedrooms;
    case "singleBed":
      return home.singleBeds ?? 0;
    case "doubleBed":
      return home.doubleBeds ?? 0;
    case "bed":
      return (home.singleBeds ?? 0) + (home.doubleBeds ?? 0);
    default:
      return 1;
    case "room":
      return Math.max(1, home.bedrooms + home.livingRooms + (item.extraRooms ?? 0));
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
    if (item.onlyIf?.hasBalcony && !home.hasBalcony) continue;
    if (item.onlyIf?.minPeople && home.peopleCount < item.onlyIf.minPeople) {
      continue;
    }

    if (item.onlyIfAny) {
      const matches =
        (item.onlyIfAny.hasGarden === true && home.hasGarden) ||
        (item.onlyIfAny.hasBalcony === true && (home.hasBalcony ?? false));

      if (!matches) continue;
    }

    const quantity = getQuantity(item, home);
    if (quantity <= 0) continue;

    let priority: number = item.priority;
    if (item.workBoost && home.worksFromHome) {
      priority = Math.min(priority, 2);
    }

    const selectedOption = item.options?.[0];
    const unitCost = selectedOption?.cost ?? item.cost;

    const draft: NeedDraft = {
      name: quantity > 1 ? `${item.name} x${quantity}` : item.name,
      room: item.room,
      priority: priority as 1 | 2 | 3 | 4,
      quantity,
      unitCost,
      estimatedCost: unitCost * quantity,
      quantityEditable: item.quantityEditable ?? false,
      status: "planned",
      source: "template",
      autoDeferred: false,
      searchTerm: SEARCH_TERMS[item.name] ?? item.name,
      quantityEditable: item.quantityEditable ?? false,
    };

    if (selectedOption) {
      draft.selectedOption = selectedOption.label;
    }

    drafts.push(draft);
  }

  return drafts.sort(
    (a, b) => a.priority - b.priority || a.room.localeCompare(b.room),
  );
}