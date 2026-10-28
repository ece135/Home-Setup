import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const OWNED_COLLECTIONS = ["needs", "expenses", "tasks", "rooms", "homes"];

export async function sendResetEmail(): Promise<void> {
  const email = auth.currentUser?.email;
  if (!email) throw new Error("You are not signed in.");
  await sendPasswordResetEmail(auth, email);
}

export async function deleteAccount(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("You are not signed in.");

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );

  for (const name of OWNED_COLLECTIONS) {
    const snap = await getDocs(
      query(collection(db, name), where("ownerId", "==", user.uid)),
    );
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await deleteUser(user);
}