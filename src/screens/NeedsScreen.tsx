// @ts-nocheck
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
import { updateHome } from "../lib/homes";
import { Expense, Home, Need, NeedStatus } from "../types";
import { BASE_TEMPLATE } from "../data/baseTemplate";
import { generateAIPlan } from "../lib/aiPlan";
import { addNeed, getNeeds, saveNeeds, updateNeed } from "../lib/needs";
import {
  addExpense,
  deleteExpense,
  getExpenses,
  markPurchased,
  removeNeed,
  undoPurchase,
} from "../lib/expenses";
import {
  getPlannedTotal,
  getProgress,
  getRemaining,
  getSpentTotal,
  getUnplannedTotal,
} from "../lib/budget";

const GROUPS: { priority: 1 | 2 | 3 | 4; title: string }[] = [
  { priority: 1, title: "Essentials" },
  { priority: 2, title: "Needed soon" },
  { priority: 3, title: "Nice-to-haves" },
  { priority: 4, title: "Optional extras" },
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

export default function NeedsScreen({
  home,
  onHomeUpdated,
}: {
  home: Home;
  onHomeUpdated: (home: Home) => void;
}) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState(String(home.budget));
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRoom, setNewRoom] = useState("General");
  const [newCost, setNewCost] = useState("");
  const [newPriority, setNewPriority] = useState<1 | 2 | 3 | 4>(2);
  const [formError, setFormError] = useState("");

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buyPrice, setBuyPrice] = useState("");
  const [buyError, setBuyError] = useState("");

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expError, setExpError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [existingNeeds, expenseList] = await Promise.all([
          getNeeds(home),
          getExpenses(home),
        ]);

        let list = existingNeeds;

        if (list.length === 0) {
          const drafts = await generateAIPlan(home);

          if (cancelled) return;

          list = await saveNeeds(home, drafts);
        }

        if (cancelled) return;

        setNeeds(list);
        setExpenses(expenseList);
      } catch (error) {
        console.error("Plan loading failed:", error);

        if (!cancelled) {
          setError("Could not load your plan. Check your connection.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [home]);

  const patchLocal = (id: string, changes: Partial<Need>) => {
    setNeeds((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    );
  };

  const linkedExpenses = (needId: string) =>
    expenses.filter((e) => e.needId === needId);

  const handleStatus = async (need: Need, status: NeedStatus) => {
    if (need.status === status) return;
    setError("");

    if (status === "purchased") {
      setBuyingId(need.id);
      setBuyPrice(String(need.estimatedCost));
      setBuyError("");
      return;
    }

    setBuyingId(null);
    try {
      if (need.status === "purchased") {
        await undoPurchase(need, status, linkedExpenses(need.id));
        setExpenses((prev) => prev.filter((e) => e.needId !== need.id));
      } else {
        await updateNeed(need.id, { status });
      }
      patchLocal(need.id, { status });
    } catch {
      setError("Could not update. Check your connection.");
    }
  };

  const confirmPurchase = async (need: Need) => {
    const amount = parseFloat(buyPrice.replace(",", "."));
    if (!amount || amount < 0) {
      setBuyError("Enter a valid price.");
      return;
    }
    try {
      const expense = await markPurchased(home, need, amount);
      patchLocal(need.id, { status: "purchased" });
      setExpenses((prev) => [...prev, expense]);
      setBuyingId(null);
      setBuyError("");
    } catch {
      setBuyError("Could not save. Check your connection.");
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
            await removeNeed(need, linkedExpenses(need.id));
            setNeeds((prev) => prev.filter((n) => n.id !== need.id));
            setExpenses((prev) => prev.filter((e) => e.needId !== need.id));
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

  const handleAddExpense = async () => {
    const amount = parseFloat(expAmount.replace(",", "."));
    if (!expTitle.trim()) {
      setExpError("Enter what you bought.");
      return;
    }
    if (!amount || amount < 0) {
      setExpError("Enter a valid amount.");
      return;
    }
    setExpError("");
    try {
      const created = await addExpense(home, {
        title: expTitle.trim(),
        amount,
      });
      setExpenses((prev) => [...prev, created]);
      setExpTitle("");
      setExpAmount("");
      setShowExpenseForm(false);
    } catch {
      setExpError("Could not save. Check your connection.");
    }
  };

  const handleUpdateBudget = async () => {
    const amount = Number(newBudget.replace(",", "."));

    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetError("Enter a valid budget.");
      return;
    }

    if (!auth.currentUser) {
      setBudgetError("You are not signed in.");
      return;
    }

    setBudgetError("");
    setBudgetLoading(true);

    try {
      const updatedHome = await updateHome(home.id, auth.currentUser.uid, {
        type: home.type,
        furnishing: home.furnishing,
        peopleCount: home.peopleCount,
        bedrooms: home.bedrooms,
        livingRooms: home.livingRooms,
        budget: amount,
        moveInDate: home.moveInDate,
        style: home.style,
        worksFromHome: home.worksFromHome,
        hasPet: home.hasPet,
        hasGarden: home.hasGarden,
        ownedItems: home.ownedItems,
      });

      onHomeUpdated(updatedHome);
      setNewBudget(String(amount));
      setEditingBudget(false);
      setBudgetError("");
    } catch (e) {
      setBudgetError(
        e instanceof Error ? e.message : "Could not update the budget.",
      );
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleDeleteExpense = (expense: Expense) => {
    Alert.alert("Remove expense", `Remove "${expense.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExpense(expense.id);
            setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
          } catch {
            setError("Could not remove. Check your connection.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const remaining = getRemaining(home.budget, needs, expenses);
  const progress = getProgress(needs);
  const unplanned = getUnplannedTotal(expenses);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your setup plan</Text>

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Budget</Text>
          <Text style={styles.summaryValue}>{money(home.budget)}</Text>

          <TouchableOpacity
            onPress={() => {
              setNewBudget(String(home.budget));
              setBudgetError("");
              setEditingBudget((prev) => !prev);
            }}
          >
            <Text style={styles.addButtonText}>
              {editingBudget ? "Cancel" : "Edit budget"}
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Planned</Text>
          <Text style={styles.summaryValue}>
            {money(getPlannedTotal(needs))}
          </Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Spent</Text>
          <Text style={styles.summaryValue}>
            {money(getSpentTotal(expenses))}
          </Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Remaining</Text>
          <Text style={[styles.summaryValue, remaining < 0 && styles.over]}>
            {money(remaining)}
          </Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.summaryLabel}>Setup progress</Text>
          <Text style={styles.progressValue}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {editingBudget ? (
        <View style={styles.form}>
          <Text style={styles.groupTitle}>Update your budget</Text>

          <TextInput
            style={styles.input}
            placeholder="New budget (₺)"
            keyboardType="decimal-pad"
            value={newBudget}
            onChangeText={setNewBudget}
          />

          {budgetError ? <Text style={styles.over}>{budgetError}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdateBudget}
            disabled={budgetLoading}
          >
            {budgetLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save budget</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {unplanned > 0 ? (
        <Text style={styles.unplannedNote}>
          Unplanned spending so far: {money(unplanned)}
        </Text>
      ) : null}

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
              const actual = linkedExpenses(n.id)[0];
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
                      {n.source === "ai" ? (
                        <Text style={styles.aiNote}>
                          AI suggestion{n.reason ? `: ${n.reason}` : ""}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.cost}>
                      {n.status === "purchased" && actual
                        ? money(actual.amount)
                        : money(n.estimatedCost)}
                    </Text>
                  </View>

                  {templateItem?.options && n.status === STATUSES[0].value ? (
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
                        selected={
                          n.status === s.value ||
                          (buyingId === n.id && s.value === "purchased")
                        }
                        onPress={() => handleStatus(n, s.value)}
                      />
                    ))}
                  </View>

                  {buyingId === n.id ? (
                    <View style={styles.buyBox}>
                      <Text style={styles.room}>How much did you pay?</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={buyPrice}
                        onChangeText={setBuyPrice}
                      />
                      {buyError ? (
                        <Text style={styles.over}>{buyError}</Text>
                      ) : null}
                      <View style={styles.buyActions}>
                        <TouchableOpacity
                          style={styles.smallButton}
                          onPress={() => confirmPurchase(n)}
                        >
                          <Text style={styles.buttonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setBuyingId(null)}>
                          <Text style={styles.remove}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

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

      <Text style={styles.groupTitle}>Expenses</Text>
      {expenses.length === 0 ? (
        <Text style={styles.room}>No expenses yet.</Text>
      ) : (
        expenses.map((e) => (
          <View key={e.id} style={styles.expenseRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{e.title}</Text>
              <Text style={styles.room}>
                {e.date}
                {e.needId ? "" : " · Unplanned"}
              </Text>
            </View>
            <Text style={styles.cost}>{money(e.amount)}</Text>
            {!e.needId ? (
              <TouchableOpacity onPress={() => handleDeleteExpense(e)}>
                <Text style={styles.expenseRemove}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}

      {showExpenseForm ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="What did you buy?"
            value={expTitle}
            onChangeText={setExpTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (₺)"
            keyboardType="decimal-pad"
            value={expAmount}
            onChangeText={setExpAmount}
          />
          {expError ? <Text style={styles.over}>{expError}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleAddExpense}>
            <Text style={styles.buttonText}>Add expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExpenseForm(false)}>
            <Text style={styles.remove}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowExpenseForm(true)}
        >
          <Text style={styles.addButtonText}>+ Add an unplanned expense</Text>
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
  progressWrap: { marginTop: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressValue: { fontSize: 13, fontWeight: "700", color: "#1f6f6b" },
  progressTrack: {
    height: 8,
    backgroundColor: "#e3eceb",
    borderRadius: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: "#1f6f6b", borderRadius: 4 },
  unplannedNote: { marginTop: 10, fontSize: 13, color: "#b26a00" },
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
  aiNote: { fontSize: 12, color: "#1f6f6b", marginTop: 4 },
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
  buyBox: {
    backgroundColor: "#f6faf9",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  buyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
  },
  smallButton: {
    backgroundColor: "#1f6f6b",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  remove: { color: "#c62828", fontSize: 13, marginTop: 10 },
  form: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    fontSize: 15,
    backgroundColor: "#fff",
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
    marginTop: 16,
  },
  addButtonText: { color: "#1f6f6b", fontSize: 16, fontWeight: "600" },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  expenseRemove: { color: "#c62828", fontSize: 16, paddingHorizontal: 4 },
  logout: {
    textAlign: "center",
    color: "#1f6f6b",
    marginTop: 32,
    marginBottom: 40,
  },
});
