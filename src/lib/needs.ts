import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Home, Need } from "../types";
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