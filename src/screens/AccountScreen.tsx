import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { deleteAccount, sendResetEmail } from "../lib/account";

export default function AccountScreen({ onBack }: { onBack: () => void }) {
  const email = auth.currentUser?.email ?? "";
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log out", "Do you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", onPress: () => signOut(auth) },
    ]);
  };

  const handleReset = async () => {
    setError("");
    setInfo("");
    try {
      await sendResetEmail();
      setInfo(`Password reset email sent to ${email}.`);
    } catch {
      setError("Could not send the email. Try again later.");
    }
  };

  const handleDelete = () => {
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all your plans. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setError("");
            setDeleting(true);
            try {
              await deleteAccount(password);
            } catch (e) {
              const code = (e as { code?: string }).code ?? "";
              if (
                code === "auth/wrong-password" ||
                code === "auth/invalid-credential"
              ) {
                setError("Wrong password.");
              } else {
                setError("Could not delete the account. Check your connection.");
              }
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Back to plan</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Account</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email}</Text>
      </View>

      <TouchableOpacity style={styles.outlineButton} onPress={handleReset}>
        <Text style={styles.outlineText}>Send password reset email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>

      {info ? <Text style={styles.info}>{info}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        {showDelete ? (
          <View>
            <Text style={styles.label}>
              Enter your password to permanently delete your account and data.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Delete my account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowDelete(false);
                setPassword("");
                setError("");
              }}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowDelete(true)}>
            <Text style={styles.deleteLink}>Delete my account…</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  back: { color: "#1f6f6b", fontSize: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: "#eef6f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: { color: "#666", fontSize: 13 },
  value: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  button: {
    backgroundColor: "#1f6f6b",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#1f6f6b",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  outlineText: { color: "#1f6f6b", fontSize: 16, fontWeight: "600" },
  info: { color: "#1f6f6b", marginTop: 12 },
  error: { color: "#c62828", marginTop: 12 },
  danger: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 20,
  },
  dangerTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  deleteLink: { color: "#c62828", fontSize: 15 },
  deleteButton: {
    backgroundColor: "#c62828",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  cancel: { color: "#666", textAlign: "center", marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    fontSize: 15,
  },
});