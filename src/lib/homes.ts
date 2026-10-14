import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { Home } from "../types";

export type HomeInput = Omit<Home, "id" | "ownerId" | "createdAt">;

export async function saveHome(ownerId: string, input: HomeInput): Promise<Home> {
  const data = { ...input, ownerId, createdAt: Date.now() };
  const ref = await addDoc(collection(db, "homes"), data);
  return { id: ref.id, ...data };
}

export async function getHome(ownerId: string): Promise<Home | null> {
  const q = query(
    collection(db, "homes"),
    where("ownerId", "==", ownerId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Home, "id">) };
}