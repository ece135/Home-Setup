export type HomeType = "studio" | "apartment" | "house" ;
export type Furnishing = "furnished" | "unfurnished";
export type StyleType = "minimal" | "cozy" | "modern" | "classic";

export interface Home {
  id: string;
  ownerId: string;
  type: HomeType;
  furnishing: Furnishing;
  peopleCount: number;
  bedrooms: number;
  livingRooms: number;
  budget: number;
  moveInDate: string;
  style: StyleType;
  worksFromHome: boolean;
  hasPet: boolean;
  hasGarden: boolean;
  ownedItems: string[];
  createdAt: number;
}

export interface Room {
  id: string;
  homeId: string;
  ownerId: string;
  name: string;
}

export type NeedStatus = "planned" | "purchased" | "owned" | "deferred";

export interface Need {
  id: string;
  homeId: string;
  ownerId: string;
  room: string;
  name: string;
  priority: 1 | 2 | 3 | 4;
  estimatedCost: number;
  status: NeedStatus;
  source: "ai" | "template" | "manual";
  selectedOption?: string;
}

export interface Expense {
  id: string;
  homeId: string;
  ownerId: string;
  needId?: string;
  title: string;
  amount: number;
  date: string;
}

export interface Task {
  id: string;
  homeId: string;
  ownerId: string;
  title: string;
  dueDate?: string;
  done: boolean;
}