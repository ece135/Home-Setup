import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import { Home } from "../types";

export type HomeInput = Omit<Home, "id" | "ownerId" | "createdAt">;

export async function saveHome(
  ownerId: string,
  input: HomeInput
): Promise<Home> {
  const data = {
    ...input,
    ownerId,
    createdAt: Date.now(),
  };

  const ref = await addDoc(collection(db, "homes"), data);

  return {
    id: ref.id,
    ...data,
  };
}

export async function getHome(
  ownerId: string
): Promise<Home | null> {
  const q = query(
    collection(db, "homes"),
    where("ownerId", "==", ownerId),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const d = snap.docs[0];

  return {
    id: d.id,
    ...(d.data() as Omit<Home, "id">),
  };
}

export async function updateHome(
  homeId: string,
  ownerId: string,
  input: HomeInput
): Promise<Home> {
  const ref = doc(db, "homes", homeId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Home not found.");
  }

  const existing = snap.data();

  if (existing.ownerId !== ownerId) {
    throw new Error("You are not allowed to update this home.");
  }

  if (typeof existing.createdAt !== "number") {
    throw new Error("Home has an invalid creation date.");
  }

  const updatedAt = Date.now();

  await updateDoc(ref, {
    ...input,
    updatedAt: Date.now(),
  });

  return {
    ...existing,
    ...input,
    id: homeId,
    ownerId,
    createdAt: existing.createdAt,
  } as Home;
}