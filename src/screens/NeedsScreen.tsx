import { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Home, Need, NeedStatus } from "../types";
import { BASE_TEMPLATE } from "../data/baseTemplate";
import { generatePlan } from "../lib/plan";
import {
  addNeed,
  deleteNeed,
  getNeeds,
  saveNeeds,
  updateNeed,
} from "../lib/needs";
import {
  getPlannedTotal,
  getPurchasedTotal,
  getRemaining,
} from "../lib/budget";

const GROUPS: { priority: 1 | 2 | 3 | 4; title: string }[] = [
  { priority: 1, title: "Essentials" },
  { priority: 2, title: "Needed soon" },
  { priority: 3, title: "Nice-to-haves" },
  { priority: 4, title: "Extras" },
];

const STATUSES: { value: NeedStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "purchased", label: "Bought" },
  { value: "owned", label: "Owned" },
  { value: "deferred", label: "Later" },
];

const money = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

function SmallChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function NeedsScreen({ home }: { home: Home }) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRoom, setNewRoom] = useState("General");
  const [newCost, setNewCost] = useState("");
  const [newPriority, setNewPriority] = useState<1 | 2 | 3 | 4>(2);
  const [formError, setFormError] = useState("");

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

  const patchLocal = (id: string, changes: Partial<Need>) => {
    setNeeds((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    );
  };

  const handleStatus = async (need: Need, status: NeedStatus) => {
    if (need.status === status) return;
    const previous = need.status;
    patchLocal(need.id, { status });
    try {
      await updateNeed(need.id, { status });
    } catch {
      patchLocal(need.id, { status: previous });
      setError("Could not update. Check your connection.");
    }
  };

  const handleOption = async (need: Need, label: string, cost: number) => {
    if (need.selectedOption === label) return;
    const previous = {
      selectedOption: need.selectedOption,
      estimatedCost: need.estimatedCost,
    };
    patchLocal(need.id, { selectedOption: label, estimatedCost: cost });
    try {
      await updateNeed(need.id, { selectedOption: label, estimatedCost: cost });
    } catch {
      patchLocal(need.id, previous);
      setError("Could not update. Check your connection.");
    }
  };

  const handleDelete = (need: Need) => {
    Alert.alert("Remove item", `Remove "${need.name}" from your plan?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNeed(need.id);
            setNeeds((prev) => prev.filter((n) => n.id !== need.id));
          } catch {
            setError("Could not remove. Check your connection.");
          }
        },
      },
    ]);
  };

  const handleAdd = async () => {
    const cost = parseFloat(newCost.replace(",", "."));
    if (!newName.trim()) {
      setFormError("Enter a name.");
      return;
    }
    if (!cost || cost < 0) {
      setFormError("Enter a valid cost.");
      return;
    }
    setFormError("");
    try {
      const created = await addNeed(home, {
        name: newName.trim(),
        room: newRoom.trim() || "General",
        priority: newPriority,
        estimatedCost: cost,
      });
      setNeeds((prev) => [...prev, created]);
      setNewName("");
      setNewCost("");
      setNewRoom("General");
      setNewPriority(2);
      setShowForm(false);
    } catch {
      setFormError("Could not save. Check your connection.");
    }
  };

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
          <Text style={styles.summaryValue}>
            {money(getPlannedTotal(needs))}
          </Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Bought</Text>
          <Text style={styles.summaryValue}>
            {money(getPurchasedTotal(needs))}
          </Text>
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
            {items.map((n) => {
              const templateItem = BASE_TEMPLATE.find(
                (t) => t.name === n.name && t.options,
              );
              const inactive =
                n.status === STATUSES[2].value ||
                n.status === STATUSES[3].value;
              return (
                <View
                  key={n.id}
                  style={[styles.card, inactive && styles.inactive]}
                >
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{n.name}</Text>
                      <Text style={styles.room}>{n.room}</Text>
                    </View>
                    <Text style={styles.cost}>{money(n.estimatedCost)}</Text>
                  </View>

                  {templateItem?.options ? (
                    <View style={styles.chipRow}>
                      {templateItem.options.map((o) => (
                        <SmallChip
                          key={o.label}
                          label={`${o.label} · ${money(o.cost)}`}
                          selected={n.selectedOption === o.label}
                          onPress={() => handleOption(n, o.label, o.cost)}
                        />
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.chipRow}>
                    {STATUSES.map((s) => (
                      <SmallChip
                        key={s.value}
                        label={s.label}
                        selected={n.status === s.value}
                        onPress={() => handleStatus(n, s.value)}
                      />
                    ))}
                  </View>

                  <TouchableOpacity onPress={() => handleDelete(n)}>
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        );
      })}

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.groupTitle}>Add an item</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={styles.input}
            placeholder="Room"
            value={newRoom}
            onChangeText={setNewRoom}
          />
          <TextInput
            style={styles.input}
            placeholder="Estimated cost (₺)"
            keyboardType="decimal-pad"
            value={newCost}
            onChangeText={setNewCost}
          />
          <View style={styles.chipRow}>
            {GROUPS.map((g) => (
              <SmallChip
                key={g.priority}
                label={g.title}
                selected={newPriority === g.priority}
                onPress={() => setNewPriority(g.priority)}
              />
            ))}
          </View>
          {formError ? <Text style={styles.over}>{formError}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleAdd}>
            <Text style={styles.buttonText}>Add to plan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Text style={styles.remove}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.addButtonText}>+ Add an item</Text>
        </TouchableOpacity>
      )}

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
  summaryLabel: { color: "#666", fontSize: 12 },
  summaryValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  over: { color: "#c62828" },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  inactive: { opacity: 0.5 },
  cardTop: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "600" },
  room: { fontSize: 13, color: "#888", marginTop: 2 },
  cost: { fontSize: 15, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  chipSelected: { backgroundColor: "#1f6f6b", borderColor: "#1f6f6b" },
  chipText: { fontSize: 13, color: "#333" },
  chipTextSelected: { color: "#fff" },
  remove: { color: "#c62828", fontSize: 13, marginTop: 10 },
  form: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    fontSize: 15,
  },
  button: {
    backgroundColor: "#1f6f6b",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  addButton: {
    borderWidth: 1,
    borderColor: "#1f6f6b",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  addButtonText: { color: "#1f6f6b", fontSize: 16, fontWeight: "600" },
  logout: {
    textAlign: "center",
    color: "#1f6f6b",
    marginTop: 32,
    marginBottom: 40,
  },
});
