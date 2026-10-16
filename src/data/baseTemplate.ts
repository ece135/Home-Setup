import { HomeType } from "../types";
export interface TemplateOption {
  label: string;
  cost: number;
}
export interface TemplateItem {
  name: string;
  room: string;
  priority: 1 | 2 | 3 | 4;
  cost: number;
  ownedKey?: string;
  coveredByFurnished?: boolean;
  onlyForTypes?: HomeType[];
  skipForTypes?: HomeType[];
  scale?: "person" | "bedroom" | "room" | "bed";
  workBoost?: boolean;
  options?: TemplateOption[];
  onlyIf?: {
    worksFromHome?: boolean;
    hasPet?: boolean;
    hasGarden?: boolean;
    minPeople?: number;
  };
}

export const BASE_TEMPLATE: TemplateItem[] = [
  { name: "Bed and mattress", room: "Bedroom", priority: 1, cost: 15000, ownedKey: "bed", coveredByFurnished: true, scale: "bed", options: [{ label: "single", cost: 22000 }, { label: "double", cost: 40000 }] },
  { name: "Bedding set", room: "Bedroom", priority: 1, cost: 1500, ownedKey: "bedding", scale: "bed" },
  { name: "Wardrobe", room: "Bedroom", priority: 2, cost: 10000, ownedKey: "wardrobe", coveredByFurnished: true, scale: "bedroom" },
  { name: "Curtains", room: "Bedroom", priority: 2, cost: 2000, scale: "room" },
  { name: "Bedside lamp", room: "Bedroom", priority: 3, cost: 700, scale: "bedroom" },
  { name: "Rug", room: "Bedroom", priority: 4, cost: 1500, scale: "room" },

  { name: "Refrigerator", room: "Kitchen", priority: 1, cost: 25000, ownedKey: "fridge", coveredByFurnished: true },
  { name: "Oven", room: "Kitchen", priority: 2, cost: 8000, ownedKey: "oven", coveredByFurnished: true },
  { name: "Kitchenware set", room: "Kitchen", priority: 1, cost: 5000, ownedKey: "kitchenware" },
  { name: "Kettle", room: "Kitchen", priority: 3, cost: 700 },
  { name: "Dining table and chairs", room: "Kitchen", priority: 2, cost: 13000, skipForTypes: ["studio"] },
  { name: "Folding table and chairs", room: "Kitchen", priority: 2, cost: 4000, onlyForTypes: ["studio"] },
  { name: "Microwave", room: "Kitchen", priority: 3, cost: 4000 },
  { name: "Dishwasher", room: "Kitchen", priority: 2, cost: 18000, ownedKey: "dishwasher", coveredByFurnished: true},

  { name: "Sofa", room: "Living room", priority: 2, cost: 15000, ownedKey: "sofa", coveredByFurnished: true, options: [{ label: "single", cost: 10000 }, { label: "set", cost: 25000 }] },
  { name: "TV", room: "Living room", priority: 3, cost: 12000, ownedKey: "TV" },
  { name: "TV unit", room: "Living room", priority: 3, cost: 8000 },
  { name: "Coffee table", room: "Living room", priority: 4, cost: 2500, skipForTypes: ["studio"] },
  { name: "Storage shelves", room: "Living room", priority: 3, cost: 2500, onlyForTypes: ["studio"] },

  { name: "Washing machine", room: "Bathroom", priority: 1, cost: 23000, ownedKey: "washing machine", coveredByFurnished: true },
  { name: "Towels", room: "Bathroom", priority: 1, cost: 800, scale: "person" },
  { name: "Bath mat", room: "Bathroom", priority: 2, cost: 700 },
  { name: "Laundry basket", room: "Bathroom", priority: 3, cost: 400 },

  { name: "Cleaning supplies", room: "General", priority: 1, cost: 800 },
  { name: "Light bulbs", room: "General", priority: 1, cost: 600 },
  { name: "Trash bins", room: "General", priority: 2, cost: 500 },
  { name: "Vacuum cleaner", room: "General", priority: 2, cost: 4000 },
  { name: "Iron", room: "General", priority: 3, cost: 3000 },
  { name: "Ironing board", room: "General", priority: 4, cost: 1000 },
  { name: "tool kit", room: "General", priority: 3, cost: 1500 },
  { name: "ladder", room: "General", priority: 4, cost: 2000 },


  { name: "Desk", room: "Workspace", priority: 3, cost: 4000, ownedKey: "desk", workBoost: true },
  { name: "Office chair", room: "Workspace", priority: 3, cost: 4500, workBoost: true, onlyIf: { worksFromHome: true } },

  { name: "Outdoor table and chairs", room: "Outdoor", priority: 4, cost: 5000, onlyIf: { hasGarden: true } },
  { name: "Plant pots", room: "Outdoor", priority: 4, cost: 800, onlyIf: { hasGarden: true } },
  { name: "Garden hose and tools", room: "Outdoor", priority: 2, cost: 2000, onlyForTypes: ["house"], onlyIf: { hasGarden: true } },

  { name: "Food and water bowls", room: "Pet", priority: 1, cost: 300, onlyIf: { hasPet: true } },
  { name: "Pet bed", room: "Pet", priority: 4, cost: 800, onlyIf: { hasPet: true } },
  { name: "Carrier", room: "Pet", priority: 4, cost: 900, onlyIf: { hasPet: true } },
];