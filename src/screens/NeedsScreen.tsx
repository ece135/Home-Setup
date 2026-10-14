import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Home, Need } from "../types";
import { generatePlan } from "../lib/plan";
import { getNeeds, saveNeeds } from "../lib/needs";
import { getPlannedTotal, getRemaining } from "../lib/budget";

const GROUPS: { priority: 1 | 2 | 3; title: string }[] = [
  { priority: 1, title: "Essentials" },
  { priority: 2, title: "Needed soon" },
  { priority: 3, title: "Nice-to-haves" },
];

const money = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

export default function NeedsScreen({ home }: { home: Home }) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        let list = await getNeeds(home);
        if (list.length === 0) {
          list = await saveNeeds(home, generatePlan(home));
        }
        setNeeds(list);
      } catch {
        setError("Could not load your plan. Check your connection.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [home]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const remaining = getRemaining(home.budget, needs);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your setup plan</Text>

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Budget</Text>
          <Text style={styles.summaryValue}>{money(home.budget)}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Planned</Text>
          <Text style={styles.summaryValue}>{money(getPlannedTotal(needs))}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Remaining</Text>
          <Text style={[styles.summaryValue, remaining < 0 && styles.over]}>
            {money(remaining)}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.over}>{error}</Text> : null}

      {GROUPS.map((group) => {
        const items = needs.filter((n) => n.priority === group.priority);
        if (items.length === 0) return null;
        return (
          <View key={group.priority}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {items.map((n) => (
              <View key={n.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{n.name}</Text>
                  <Text style={styles.room}>{n.room}</Text>
                </View>
                <Text style={styles.cost}>{money(n.estimatedCost)}</Text>
              </View>
            ))}
          </View>
        );
      })}

      <TouchableOpacity onPress={() => signOut(auth)}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#eef6f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  summaryLabel: { color: "#666", fontSize: 13 },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  over: { color: "#c62828" },
  groupTitle: { fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  name: { fontSize: 16 },
  room: { fontSize: 13, color: "#888", marginTop: 2 },
  cost: { fontSize: 15, fontWeight: "600" },
  logout: { textAlign: "center", color: "#1f6f6b", marginTop: 32, marginBottom: 40 },
});