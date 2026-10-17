import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Expense, Home, Need, NeedStatus } from "../types";

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getExpenses(home: Home): Promise<Expense[]> {
  const q = query(
    collection(db, "expenses"),
    where("homeId", "==", home.id),
    where("ownerId", "==", home.ownerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, "id">) }));
}

export async function addExpense(
  home: Home,
  input: { title: string; amount: number }
): Promise<Expense> {
  const data = {
    homeId: home.id,
    ownerId: home.ownerId,
    title: input.title,
    amount: input.amount,
    date: todayString(),
  };
  const ref = await addDoc(collection(db, "expenses"), data);
  return { id: ref.id, ...data };
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "expenses", id));
}

export async function markPurchased(
  home: Home,
  need: Need,
  amount: number
): Promise<Expense> {
  const batch = writeBatch(db);
  const expenseRef = doc(collection(db, "expenses"));
  const data = {
    homeId: home.id,
    ownerId: home.ownerId,
    needId: need.id,
    title: need.name,
    amount,
    date: todayString(),
  };
  batch.set(expenseRef, data);
  batch.update(doc(db, "needs", need.id), { status: "purchased" });
  await batch.commit();
  return { id: expenseRef.id, ...data };
}

export async function undoPurchase(
  need: Need,
  status: NeedStatus,
  linked: Expense[]
): Promise<void> {
  const batch = writeBatch(db);
  linked.forEach((e) => batch.delete(doc(db, "expenses", e.id)));
  batch.update(doc(db, "needs", need.id), { status });
  await batch.commit();
}

export async function removeNeed(need: Need, linked: Expense[]): Promise<void> {
  const batch = writeBatch(db);
  linked.forEach((e) => batch.delete(doc(db, "expenses", e.id)));
  batch.delete(doc(db, "needs", need.id));
  await batch.commit();
}