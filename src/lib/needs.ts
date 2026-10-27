import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Home, Need, NeedStatus } from "../types";
import { NeedDraft } from "./plan";

export async function saveNeeds(home: Home, drafts: NeedDraft[]): Promise<Need[]> {
  const batch = writeBatch(db);
  const saved: Need[] = [];
  for (const draft of drafts) {
    const ref = doc(collection(db, "needs"));
    const data = { ...draft, homeId: home.id, ownerId: home.ownerId };
    batch.set(ref, data);
    saved.push({ id: ref.id, ...data });
  }
  await batch.commit();
  return saved;
}

export async function getNeeds(home: Home): Promise<Need[]> {
  const q = query(
    collection(db, "needs"),
    where("homeId", "==", home.id),
    where("ownerId", "==", home.ownerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Need, "id">) }));
}

export interface NewNeedInput {
  name: string;
  room: string;
  priority: 1 | 2 | 3 | 4;
  estimatedCost: number;
}

export async function addNeed(home: Home, input: NewNeedInput): Promise<Need> {
  const data = {
    ...input,
    homeId: home.id,
    ownerId: home.ownerId,
    status: "planned" as const,
    source: "manual" as const,
  };
  const ref = await addDoc(collection(db, "needs"), data);
  return { id: ref.id, ...data };
}

export async function updateNeed(
  id: string,
  changes: Partial<Pick<Need, "status" | "estimatedCost" | "selectedOption" | "priority" | "autoDeferred" | "searchTerm">>
): Promise<void> {
  await updateDoc(doc(db, "needs", id), changes);
}

export async function deleteNeed(id: string): Promise<void> {
  await deleteDoc(doc(db, "needs", id));
}

export async function updateNeedsBatch(
  changes: { id: string; status: NeedStatus; autoDeferred: boolean }[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const c of changes) {
    batch.update(doc(db, "needs", c.id), {
      status: c.status,
      autoDeferred: c.autoDeferred,
    });
  }
  await batch.commit();
}