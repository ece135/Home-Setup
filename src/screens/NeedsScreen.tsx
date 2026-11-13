import { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { auth } from "../lib/firebase";
import { updateHome } from "../lib/homes";
import { Expense, Home, Need, NeedStatus } from "../types";
import { BASE_TEMPLATE } from "../data/baseTemplate";
import { generateAIPlan } from "../lib/aiPlan";
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
import {
  addNeed,
  getNeeds,
  saveNeeds,
  updateNeed,
  updateNeedsBatch,
} from "../lib/needs";
import { refitStatuses } from "../lib/refit";
import { STORES, openStore } from "../lib/storeLinks";
import { parseAmount, sanitizeAmountInput } from "../lib/validate";
import AccountScreen from "./AccountScreen";
import Button from "../components/Button";
import Card from "../components/Card";
import SmallChip from "../components/Chip";
import TextField from "../components/TextField";
import { colors, fontSize, radius, spacing } from "../theme";

const GROUPS: { priority: 1 | 2 | 3 | 4; title: string }[] = [
  { priority: 1, title: "Essentials" },
  { priority: 2, title: "Needed soon" },
  { priority: 3, title: "Nice-to-haves" },
  { priority: 4, title: "Optional extras" },
];

const PRIORITY_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: colors.accent,
  2: "#e9a45c",
  3: "#2D5A47",
  4: "#8AB8A4",
};

const STATUSES: { value: NeedStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "purchased", label: "Bought" },
  { value: "owned", label: "Owned" },
  { value: "deferred", label: "Later" },
];

const money = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

export default function NeedsScreen({
  home,
  onHomeUpdated,
  onBack,
}: {
  home: Home;
  onHomeUpdated: (home: Home) => void;
  onBack: () => void;
}) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState(String(home.budget));
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [refitNote, setRefitNote] = useState("");

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

  const [showAccount, setShowAccount] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

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
      } catch (err) {
        console.error("Plan loading failed:", err);

        if (!cancelled) {
          setError("Could not load your plan. Check your connection.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

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
        await updateNeed(need.id, { status, autoDeferred: false });
      }
      patchLocal(need.id, { status, autoDeferred: false });
    } catch {
      setError("Could not update. Check your connection.");
    }
  };

  const confirmPurchase = async (need: Need) => {
    const parsed = parseAmount(buyPrice);
    if (parsed.value === null) {
      setBuyError(parsed.error);
      return;
    }
    try {
      const expense = await markPurchased(home, need, parsed.value);
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
    if (!newName.trim()) {
      setFormError("Enter a name.");
      return;
    }
    const parsed = parseAmount(newCost);
    if (parsed.value === null) {
      setFormError(parsed.error);
      return;
    }
    setFormError("");
    try {
      const created = await addNeed(home, {
        name: newName.trim(),
        room: newRoom.trim() || "General",
        priority: newPriority,
        estimatedCost: parsed.value,
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
    if (!expTitle.trim()) {
      setExpError("Enter what you bought.");
      return;
    }
    const parsed = parseAmount(expAmount);
    if (parsed.value === null) {
      setExpError(parsed.error);
      return;
    }
    setExpError("");
    try {
      const created = await addExpense(home, {
        title: expTitle.trim(),
        amount: parsed.value,
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
    const parsed = parseAmount(newBudget);
    if (parsed.value === null) {
      setBudgetError(parsed.error);
      return;
    }
    const amount = parsed.value;

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
        hasBalcony: home.hasBalcony ?? false,
        ownedItems: home.ownedItems,
      });

      const changes = refitStatuses(needs, amount, getSpentTotal(expenses));
      if (changes.length > 0) {
        await updateNeedsBatch(changes);
        setNeeds((prev) =>
          prev.map((n) => {
            const c = changes.find((x) => x.id === n.id);
            return c
              ? { ...n, status: c.status, autoDeferred: c.autoDeferred }
              : n;
          }),
        );
      }
      const movedLater = changes.filter((c) => c.status === "deferred").length;
      const movedBack = changes.length - movedLater;
      const parts: string[] = [];
      if (movedLater > 0) parts.push(`${movedLater} moved to Later`);
      if (movedBack > 0) parts.push(`${movedBack} moved back to Planned`);
      setRefitNote(
        parts.length > 0 ? `Budget updated: ${parts.join(", ")}.` : "",
      );

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showAccount) {
    return <AccountScreen onBack={() => setShowAccount(false)} />;
  }

  const toggleGroup = (priority: number) => {
    setCollapsed((prev) => ({ ...prev, [priority]: !prev[priority] }));
  };

  const remaining = getRemaining(home.budget, needs, expenses);
  const progress = getProgress(needs);
  const unplanned = getUnplannedTotal(expenses);
  const deferredCount = needs.filter((n) => n.status === "deferred").length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        activeOpacity={0.8}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.title}>Your setup plan</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Budget</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {money(home.budget)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Planned</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {money(getPlannedTotal(needs))}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {money(getSpentTotal(expenses))}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text
              style={[styles.summaryValue, remaining < 0 && styles.over]}
              numberOfLines={1}
            >
              {money(remaining)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setNewBudget(String(home.budget));
            setBudgetError("");
            setEditingBudget((prev) => !prev);
          }}
        >
          <Text style={styles.linkText}>
            {editingBudget ? "Cancel" : "Edit budget"}
          </Text>
        </TouchableOpacity>

        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.summaryLabel}>Setup progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      {editingBudget ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Update your budget</Text>
          <TextField
            placeholder="New budget (₺)"
            keyboardType="decimal-pad"
            value={newBudget}
            onChangeText={(t) => setNewBudget(sanitizeAmountInput(t))}
            maxLength={12}
            style={styles.fieldInput}
          />
          {budgetError ? <Text style={styles.over}>{budgetError}</Text> : null}
          <Button
            title="Save budget"
            onPress={handleUpdateBudget}
            loading={budgetLoading}
            style={styles.primaryShadow}
          />
        </Card>
      ) : null}

      {refitNote ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{refitNote}</Text>
        </View>
      ) : null}

      {deferredCount > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {deferredCount} items are on Later. Move one back to Planned when
            your budget allows.
          </Text>
        </View>
      ) : null}

      {remaining < 0 ? (
        <View style={[styles.banner, styles.bannerDanger]}>
          <Text style={styles.dangerText}>
            Planned items are above your budget.
          </Text>
        </View>
      ) : null}

      {unplanned > 0 ? (
        <View style={[styles.banner, styles.bannerWarning]}>
          <Text style={styles.warningText}>
            Unplanned spending so far: {money(unplanned)}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.over}>{error}</Text> : null}

      {GROUPS.map((group) => {
        const items = needs.filter((n) => n.priority === group.priority);
        if (items.length === 0) return null;
        const isCollapsed = collapsed[group.priority] === true;
        const plannedTotal = items
          .filter((n) => n.status === "planned")
          .reduce((sum, n) => sum + n.estimatedCost, 0);

        return (
          <View key={group.priority}>
            <TouchableOpacity
              style={styles.groupHeader}
              activeOpacity={0.7}
              onPress={() => toggleGroup(group.priority)}
            >
              <View
                style={[
                  styles.groupDot,
                  { backgroundColor: PRIORITY_COLORS[group.priority] },
                ]}
              />
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupCount}>{items.length}</Text>
              <View style={{ flex: 1 }} />
              {isCollapsed ? (
                <Text style={styles.groupTotal}>{money(plannedTotal)}</Text>
              ) : null}
              <Text style={styles.chevron}>{isCollapsed ? "▸" : "▾"}</Text>
            </TouchableOpacity>

            {isCollapsed
              ? null
              : items.map((n) => {
                  const templateItem = BASE_TEMPLATE.find(
                    (t) => t.name === n.name && t.options,
                  );
                  const actual = linkedExpenses(n.id)[0];
                  const inactive =
                    n.status === STATUSES[2].value ||
                    n.status === STATUSES[3].value;

                  return (
                    <Card
                      key={n.id}
                      style={[styles.needCard, inactive && styles.inactive]}
                    >
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{n.name}</Text>
                          <Text style={styles.room}>{n.room}</Text>
                          {n.source === "ai" ? (
                            <View style={styles.aiBadge}>
                              <Text style={styles.aiBadgeText}>
                                AI suggestion{n.reason ? `: ${n.reason}` : ""}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.cost}>
                          {n.status === "purchased" && actual
                            ? money(actual.amount)
                            : money(n.estimatedCost)}
                        </Text>
                      </View>

                      {templateItem?.options &&
                      n.status === STATUSES[0].value ? (
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

                      <View style={styles.divider} />

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

                      {n.status === "planned" || n.status === "deferred" ? (
                        <View style={styles.storeRow}>
                          <Text style={styles.storeLabel}>Find online</Text>
                          {STORES.map((s) => (
                            <SmallChip
                              key={s.id}
                              label={s.label}
                              selected={false}
                              onPress={() =>
                                openStore(s, n.searchTerm?.trim() || n.name)
                              }
                            />
                          ))}
                        </View>
                      ) : null}

                      {buyingId === n.id ? (
                        <View style={styles.buyBox}>
                          <Text style={styles.fieldLabel}>
                            How much did you pay?
                          </Text>
                          <TextField
                            keyboardType="decimal-pad"
                            value={buyPrice}
                            onChangeText={(t) =>
                              setBuyPrice(sanitizeAmountInput(t))
                            }
                            maxLength={12}
                            style={styles.fieldInput}
                          />
                          {buyError ? (
                            <Text style={styles.over}>{buyError}</Text>
                          ) : null}
                          <View style={styles.buyActions}>
                            <Button
                              title="Save"
                              onPress={() => confirmPurchase(n)}
                              style={styles.smallButton}
                            />
                            <Button
                              title="Cancel"
                              variant="link"
                              onPress={() => setBuyingId(null)}
                              style={styles.inlineLink}
                            />
                          </View>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        onPress={() => handleDelete(n)}
                        style={styles.removeWrap}
                      >
                        <Text style={styles.remove}>Remove</Text>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
          </View>
        );
      })}

      {showForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Add an item</Text>
          <TextField
            placeholder="Name"
            value={newName}
            onChangeText={setNewName}
            maxLength={60}
            style={styles.fieldInput}
          />
          <TextField
            placeholder="Room"
            value={newRoom}
            onChangeText={setNewRoom}
            maxLength={60}
            style={styles.fieldInput}
          />
          <TextField
            placeholder="Estimated cost (₺)"
            keyboardType="decimal-pad"
            value={newCost}
            onChangeText={(t) => setNewCost(sanitizeAmountInput(t))}
            maxLength={12}
            style={styles.fieldInput}
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
          <Button
            title="Add to plan"
            onPress={handleAdd}
            style={styles.primaryShadow}
          />
          <Button
            title="Cancel"
            variant="link"
            onPress={() => setShowForm(false)}
          />
        </Card>
      ) : (
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={styles.customOutlineBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.customOutlineBtnText}>+ Add an item</Text>
        </TouchableOpacity>
      )}

      <View style={styles.sectionHeader}>
        <View style={[styles.groupDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.groupTitle}>Expenses</Text>
      </View>

      <Card style={styles.expenseCard}>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet.</Text>
        ) : (
          expenses.map((e, index) => (
            <View
              key={e.id}
              style={[
                styles.expenseRow,
                index === expenses.length - 1 && styles.expenseRowLast,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{e.title}</Text>
                <View style={styles.expenseMeta}>
                  <Text style={styles.room}>{e.date}</Text>
                  {e.needId ? null : (
                    <View style={styles.unplannedBadge}>
                      <Text style={styles.unplannedBadgeText}>Unplanned</Text>
                    </View>
                  )}
                </View>
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
      </Card>

      {showExpenseForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Add an unplanned expense</Text>
          <TextField
            placeholder="What did you buy?"
            value={expTitle}
            onChangeText={setExpTitle}
            maxLength={60}
            style={styles.fieldInput}
          />
          <TextField
            placeholder="Amount (₺)"
            keyboardType="decimal-pad"
            value={expAmount}
            onChangeText={(t) => setExpAmount(sanitizeAmountInput(t))}
            maxLength={12}
            style={styles.fieldInput}
          />
          {expError ? <Text style={styles.over}>{expError}</Text> : null}
          <Button
            title="Add expense"
            onPress={handleAddExpense}
            style={styles.primaryShadow}
          />
          <Button
            title="Cancel"
            variant="link"
            onPress={() => setShowExpenseForm(false)}
          />
        </Card>
      ) : (
        <TouchableOpacity
          onPress={() => setShowExpenseForm(true)}
          style={styles.customOutlineBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.customOutlineBtnText}>
            + Add an unplanned expense
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => setShowAccount(true)}
        style={styles.accountButton}
        activeOpacity={0.85}
      >
        <Text style={styles.accountButtonText}>Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const cardShadow = {
  shadowColor: "#12302e",
  shadowOpacity: 0.1,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#AED4C3" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#AED4C3",
  },
  container: {
    padding: spacing.xl,
    paddingTop: 60,
    paddingBottom: 48,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FAF8F3",
    borderWidth: 1,
    borderColor: "#8FBAA7",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  backText: {
    color: "#1E2D27",
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  header: { marginBottom: spacing.lg },
  headerBar: {
    width: 48,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: "#1E2D27",
  },
  summaryCard: {
    backgroundColor: "#FAF8F3",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#D8E6DF",
    padding: spacing.lg,
    ...cardShadow,
  },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summaryItem: { flex: 1 },
  summaryLabel: { color: "#4A6358", fontSize: fontSize.xs },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: "#1E2D27",
    marginTop: 2,
  },
  linkText: {
    color: "#264E3D",
    fontSize: fontSize.sm,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  progressWrap: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#E5DFD3",
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: "#264E3D",
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#EFE9DC",
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    backgroundColor: "#264E3D",
    borderRadius: radius.pill,
  },
  banner: {
    backgroundColor: "#FAF8F3",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#D8E6DF",
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bannerText: { fontSize: fontSize.sm, color: "#1E2D27" },
  bannerDanger: { backgroundColor: "#fdecec", borderColor: "#f3c6c6" },
  dangerText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: "600",
  },
  bannerWarning: { backgroundColor: "#fff4e0", borderColor: "#f2d9a8" },
  warningText: { fontSize: fontSize.sm, color: colors.warning },
  over: { color: colors.danger, marginTop: spacing.sm },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  groupDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  groupTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: "#1E2D27",
  },
  groupCount: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: "#264E3D",
    backgroundColor: "#FAF8F3",
    borderWidth: 1,
    borderColor: "#D8E6DF",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: "hidden",
  },
  groupTotal: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: "#264E3D",
    marginRight: spacing.sm,
  },
  chevron: {
    fontSize: fontSize.xl,
    color: "#1E2D27",
    fontWeight: "700",
  },
  needCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.needs,
    ...cardShadow,
  },
  inactive: { opacity: 0.6 },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  name: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: "#1E2D27",
  },
  room: { fontSize: fontSize.sm, color: "#5C7368", marginTop: 2 },
  cost: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: "#1E2D27",
    marginLeft: spacing.md,
  },
  aiBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFE9DC",
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: spacing.sm,
  },
  aiBadgeText: { fontSize: fontSize.xs, color: "#264E3D", fontWeight: "600" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5DFD3",
    marginTop: spacing.md,
  },
  storeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  storeLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: "#4A6358",
    marginRight: 2,
  },
  buyBox: {
    backgroundColor: "#F5F0E6",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E5DFD3",
    padding: spacing.md,
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: "#264E3D",
  },
  fieldInput: {
    backgroundColor: "#FAF8F3",
    borderColor: "#D8E6DF",
  },
  buyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  smallButton: {
    marginTop: 0,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  inlineLink: { marginTop: 0 },
  removeWrap: {
    alignSelf: "flex-end",
    marginTop: spacing.md,
  },
  remove: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginTop: spacing.lg,
    backgroundColor: "#FAF8F3",
    ...cardShadow,
  },
  formTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: "#1E2D27",
  },
  primaryShadow: {
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  customOutlineBtn: {
    marginTop: spacing.lg,
    backgroundColor: "#FAF8F3",
    borderColor: "#264E3D",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  customOutlineBtnText: {
    color: "#1E2D27",
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  expenseCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: "#FAF8F3",
    ...cardShadow,
  },
  emptyText: { fontSize: fontSize.md, color: "#5C7368" },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5DFD3",
    gap: spacing.md,
  },
  expenseRowLast: { borderBottomWidth: 0 },
  expenseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  unplannedBadge: {
    backgroundColor: "#fff4e0",
    borderRadius: radius.sm,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  unplannedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: "600",
  },
  expenseRemove: {
    color: colors.danger,
    fontSize: fontSize.lg,
    paddingHorizontal: spacing.xs,
  },
  accountButton: {
    marginTop: spacing.xxl,
    backgroundColor: colors.accent,
    borderColor: "#FF7F50",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  accountButtonText: {
    color: "#FAF8F3",
    fontSize: fontSize.md,
    fontWeight: "700",
  },
});
