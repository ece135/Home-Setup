import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { checkVerified, sendVerificationEmail } from "../lib/account";

export default function VerifyEmailScreen({
  onVerified,
}: {
  readonly onVerified: () => void;
}) {
  const email = auth.currentUser?.email ?? "";
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setError("");
    setInfo("");
    setChecking(true);
    try {
      const verified = await checkVerified();
      if (verified) {
        onVerified();
      } else {
        setError("Your email is not verified yet. Open the link in the email first.");
      }
    } catch {
      setError("Could not check. Check your connection.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      await sendVerificationEmail();
      setInfo("Verification email sent. Check your inbox and spam folder.");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        code === "auth/too-many-requests"
          ? "Too many requests. Wait a few minutes and try again."
          : "Could not send the email. Try again later.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.text}>
        We sent a verification link to {email}. Open it, then come back and
        continue.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCheck}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>I have verified my email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.outlineButton} onPress={handleResend}>
        <Text style={styles.outlineText}>Resend email</Text>
      </TouchableOpacity>

      {info ? <Text style={styles.info}>{info}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={() => signOut(auth)}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  text: { fontSize: 15, color: "#444", marginBottom: 24, lineHeight: 22 },
  button: {
    backgroundColor: "#1f6f6b",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#1f6f6b",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  outlineText: { color: "#1f6f6b", fontSize: 16, fontWeight: "600" },
  info: { color: "#1f6f6b", marginTop: 16 },
  error: { color: "#c62828", marginTop: 16 },
  logout: { color: "#1f6f6b", textAlign: "center", marginTop: 32 },
});