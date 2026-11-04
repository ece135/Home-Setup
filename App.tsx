import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./src/lib/firebase";
import { getHome } from "./src/lib/homes";
import { Home } from "./src/types";
import AuthScreen from "./src/screens/AuthScreen";
import VerifyEmailScreen from "./src/screens/VerifyEmailScreen";
import HomeSetupScreen from "./src/screens/HomeSetupScreen";
import NeedsScreen from "./src/screens/NeedsScreen";

const centered = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
} as const;

async function fetchHome(uid: string): Promise<Home | null> {
  try {
    return await getHome(uid);
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showHomeSetup, setShowHomeSetup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setVerified(u.emailVerified);
        if (u.emailVerified) {
          setHome(await fetchHome(u.uid));
        }
      } else {
        setVerified(false);
        setHome(null);
      }
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  const handleVerified = async () => {
    if (!user) return;
    setChecking(true);
    setHome(await fetchHome(user.uid));
    setVerified(true);
    setChecking(false);
  };

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

  if (!verified) {
    return <VerifyEmailScreen onVerified={handleVerified} />;
  }

  if (!home || showHomeSetup) {
    return (
      <HomeSetupScreen
        onSaved={(savedHome) => {
          setHome(savedHome);
          setShowHomeSetup(false);
        }}
      />
    );
  }

  return (
    <NeedsScreen
      home={home}
      onHomeUpdated={setHome}
      onBack={() => setShowHomeSetup(true)}
    />
  );
}
