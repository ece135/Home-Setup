import { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import Button from "../components/Button";
import TextField from "../components/TextField";
import { colors, fontSize, radius, spacing } from "../theme";
function getErrorMessage(code: string, errorMessage = ""): string {
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "Invalid email or password.";
    case "auth/weak-password":
      return "Password must be at least 7 characters and include uppercase, lowercase letters and numbers.";
    case "auth/password-does-not-meet-requirements": {
      const message = errorMessage.toLowerCase();

      const missingRequirements: string[] = [];

      if (message.includes("uppercase") || message.includes("upper case")) {
        missingRequirements.push("an uppercase letter");
      }

      if (message.includes("lowercase") || message.includes("lower case")) {
        missingRequirements.push("a lowercase letter");
      }
      if (message.includes("numeric") || message.includes("number")) {
        missingRequirements.push("a number");
      }

      if (
        message.includes("at least") &&
        (message.includes("character") || message.includes("length"))
      ) {
        missingRequirements.push("at least 7 characters");
      }

      if (missingRequirements.length > 0) {
        return `Password must contain ${missingRequirements.join(", ")}.`;
      }

      return "Password does not meet the security requirements.";
    }
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/network-request-failed":
      return "No internet connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (isSignUp) {
      if (password.length < 7) {
        setError("Password must be at least 7 characters long.");
        return;
      }

      if (!/[A-Z]/.test(password)) {
        setError("Password must contain at least one uppercase letter.");
        return;
      }

      if (!/[a-z]/.test(password)) {
        setError("Password must contain at least one lowercase letter.");
        return;
      }

      if (!/\d/.test(password)) {
        setError("Password must contain at least one number.");
        return;
      }
    }

    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        try {
          await sendEmailVerification(cred.user);
        } catch {}
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      console.log("Firebase error code:", e?.code);
      setError(getErrorMessage(e?.code ?? "", e?.message ?? ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/auth-hero.jpg")}
      style={styles.formArea}
      imageStyle={{ resizeMode: "cover" }}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Home Setup</Text>
          </View>
          <Text style={styles.heroTitle}>
            Set up your new home within your budget
          </Text>
          <Text style={styles.heroSubtitle}>
            A prioritised plan, tracked purchases, and a budget that adapts.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>

          <TextField
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            maxLength={100}
          />
          <TextField
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            maxLength={100}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={isSignUp ? "Sign up" : "Log in"}
            onPress={handleSubmit}
            loading={loading}
          />

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.switchText}>
              {isSignUp
                ? "Already have an account? Log in"
                : "No account yet? Sign up"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    marginTop: -25,
    backgroundColor: colors.primaryDark,
    paddingTop: 70,
    paddingBottom: 50,
    paddingHorizontal: spacing.xl,
    position: "relative",
    overflow: "hidden",
    zIndex: 1,
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
  },
  badge: {
    alignSelf: "center",
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  heroTitle: {
    color: colors.onPrimary,
    fontSize: fontSize.hero,
    fontWeight: "700",
    lineHeight: 40,
    textAlign: "center",
  },
  heroSubtitle: {
    color: colors.accentSoft,
    fontSize: fontSize.lg,
    marginTop: spacing.md,
    lineHeight: 22,
    textAlign: "center",
  },
  heroImage: {
    position: "absolute",
    marginTop: 0,
    left: 0,
    right: 0,
    resizeMode: "cover",
    borderRadius: 90,
    overflow: "hidden",
   
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 1,
    resizeMode: "cover",
  },
  formArea: {
    flex: 1,
    justifyContent: "center",
    marginTop: -32,
    paddingTop: spacing.xl + 32,
    paddingBottom: spacing.xl,
    overflow: "hidden",
    backgroundColor: "transparent",
    position: "relative",
  },

  formCard: {
    backgroundColor: "rgba(210, 230, 222, 0.8)",
    marginHorizontal: spacing.lg,
    marginTop: 42,
    padding: spacing.xl,
    borderRadius: 40,
    shadowColor: "#277681",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  formTitle: {
    fontSize: fontSize.xl + 4,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginTop: spacing.md },
  switchText: {
    textAlign: "center",
    marginTop: spacing.xl,
    color: colors.primary,
  },
});
