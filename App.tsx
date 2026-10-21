import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./src/lib/firebase";
import { getHome } from "./src/lib/homes";
import { Home } from "./src/types";
import AuthScreen from "./src/screens/AuthScreen";
import HomeSetupScreen from "./src/screens/HomeSetupScreen";
import NeedsScreen from "./src/screens/NeedsScreen";

const centered = { flex: 1, justifyContent: "center", alignItems: "center" } as const;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          setHome(await getHome(u.uid));
        } catch {
          setHome(null);
        }
      } else {
        setHome(null);
      }
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <View style={centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!home) {
    return <HomeSetupScreen onSaved={setHome} />;
  }

  return <NeedsScreen home={home} onHomeUpdated={setHome} />;
}