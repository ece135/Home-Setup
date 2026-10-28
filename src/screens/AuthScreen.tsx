import { createElement, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase";

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

      if (!/[0-9]/.test(password)) {
        setError("Password must contain at least one number.");
        return;
      }
    }

    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
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

  return createElement(
    KeyboardAvoidingView,
    {
      style: styles.container,
      behavior: Platform.OS === "ios" ? "padding" : undefined,
    },
    createElement(Text, { style: styles.title }, "Home Setup"),
    createElement(
      Text,
      { style: styles.subtitle },
      isSignUp ? "Create your account" : "Welcome back",
    ),
    createElement(TextInput, {
      style: styles.input,
      placeholder: "Email",
      autoCapitalize: "none",
      keyboardType: "email-address",
      value: email,
      onChangeText: setEmail,
    }),
    createElement(TextInput, {
      style: styles.input,
      placeholder: "Password",
      secureTextEntry: true,
      value: password,
      onChangeText: setPassword,
    }),
    error ? createElement(Text, { style: styles.error }, error) : null,
    createElement(
      TouchableOpacity,
      { style: styles.button, onPress: handleSubmit, disabled: loading },
      loading
        ? createElement(ActivityIndicator, { color: "#fff" })
        : createElement(
            Text,
            { style: styles.buttonText },
            isSignUp ? "Sign up" : "Log in",
          ),
    ),
    createElement(
      TouchableOpacity,
      { onPress: () => setIsSignUp(!isSignUp) },
      createElement(
        Text,
        { style: styles.switchText },
        isSignUp
          ? "Already have an account? Log in"
          : "No account yet? Sign up",
      ),
    ),
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  error: { color: "#c62828", marginBottom: 12 },
  button: {
    backgroundColor: "#1f6f6b",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { textAlign: "center", marginTop: 20, color: "#1f6f6b" },
});
