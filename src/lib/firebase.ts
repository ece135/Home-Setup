import { initializeApp, getApps, getApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import type { Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAdVuXhNry7L6xFvEfAV-00ksH9ZTW52zE",
  authDomain: "homesetup-43a4a.firebaseapp.com",
  projectId: "homesetup-43a4a",
  storageBucket: "homesetup-43a4a.firebasestorage.app",
  messagingSenderId: "288436915190",
  appId: "1:288436915190:web:a9e2bd71e349fd8db415d7",
  measurementId: "G-NQWDJZEZEL"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const getReactNativePersistence = (
  FirebaseAuth as unknown as {
    getReactNativePersistence: (
      storage: typeof AsyncStorage
    ) => Persistence;
  }
).getReactNativePersistence;

export const auth = FirebaseAuth.initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);