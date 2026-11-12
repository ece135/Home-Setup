import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth } from "../lib/firebase";
import { saveHome } from "../lib/homes";
import { Furnishing, Home, HomeType, StyleType } from "../types";
import { parseAmount, sanitizeAmountInput } from "../lib/validate";
import Button from "../components/Button";
import Chip from "../components/Chip";
import OptionCard from "../components/OptionCard";
import TextField from "../components/TextField";
import { colors, fontSize, radius, spacing } from "../theme";

const HOME_TYPES: HomeType[] = ["studio", "apartment", "house"];
const FURNISHINGS: Furnishing[] = ["unfurnished", "furnished"];
const STYLES: StyleType[] = ["minimal", "cozy", "modern", "classic"];
const LAYOUTS = ["1+1", "2+1", "3+1", "4+1"];
const OWNED_OPTIONS = [
  "bed",
  "sofa",
  "desk",
  "wardrobe",
  "fridge",
  "washing machine",
  "oven",
  "TV",
  "kitchenware",
  "bedding",
];

const HOME_TYPE_IMAGES: Record<HomeType, number> = {
  studio: require("../../assets/images/type-studio.jpg"),
  apartment: require("../../assets/images/type-apartment.jpg"),
  house: require("../../assets/images/type-house.jpg"),
};

const STYLE_SUBTITLES: Record<StyleType, string> = {
  minimal: "Clean and simple",
  cozy: "Warm and soft",
  modern: "Sleek and current",
  classic: "Timeless look",
};

interface Props {
  onSaved: (home: Home) => void;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function HomeSetupScreen({ onSaved }: Props) {
  const [type, setType] = useState<HomeType>("apartment");
  const [furnishing, setFurnishing] = useState<Furnishing>("unfurnished");
  const [peopleCount, setPeopleCount] = useState("1");
  const [budget, setBudget] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [style, setStyle] = useState<StyleType>("minimal");
  const [worksFromHome, setWorksFromHome] = useState(false);
  const [hasPet, setHasPet] = useState(false);
  const [hasGarden, setHasGarden] = useState(false);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [layout, setLayout] = useState("1+1");
  const [hasBalcony, setHasBalcony] = useState(false);

  const toggleOwned = (item: string) => {
    setOwnedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleSave = async () => {
    const peopleCountNumber = Number(peopleCount);

    if (!peopleCount || peopleCountNumber < 1 || peopleCountNumber > 10) {
      setError("Enter a number between 1 and 10.");
      return;
    }
    const budgetResult = parseAmount(budget);
    if (budgetResult.value === null) {
      setError(budgetResult.error);
      return;
    }

    const [layoutBedrooms, layoutLiving] = layout.split("+").map(Number);
    const bedrooms = type === "studio" ? 1 : layoutBedrooms;
    const livingRooms = type === "studio" ? 0 : layoutLiving;

    const user = auth.currentUser;
    if (!user) {
      setError("You are not signed in.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const home = await saveHome(user.uid, {
        type,
        furnishing,
        peopleCount: peopleCountNumber,
        bedrooms,
        livingRooms,
        budget: budgetResult.value,
        moveInDate,
        style,
        worksFromHome,
        hasPet,
        ownedItems,
        hasGarden,
        hasBalcony,
      });

      onSaved(home);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.title}>Define your home</Text>
        <Text style={styles.subtitle}>
          Tell us about your new place so we can build your plan.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Home type</Text>
      <View style={styles.typeRow}>
        {HOME_TYPES.map((t) => (
          <View key={t} style={styles.typeItem}>
            <OptionCard
              title={capitalize(t)}
              image={HOME_TYPE_IMAGES[t]}
              selected={type === t}
              onPress={() => setType(t)}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>The basics</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Furnishing</Text>
        <View style={styles.row}>
          {FURNISHINGS.map((f) => (
            <Chip
              key={f}
              label={capitalize(f)}
              selected={furnishing === f}
              onPress={() => setFurnishing(f)}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, styles.fieldGap]}>
          Number of people
        </Text>
        <View style={styles.peopleRow}>
          <TouchableOpacity
            style={styles.counterButton}
            activeOpacity={0.8}
            onPress={() =>
              setPeopleCount((current) =>
                String(Math.max(1, Number(current || 1) - 1)),
              )
            }
          >
            <Text style={styles.counterButtonText}>−</Text>
          </TouchableOpacity>

          <View style={styles.peopleInputShadow}>
            <TextInput
              style={styles.peopleInput}
              value={peopleCount}
              keyboardType="number-pad"
              selectTextOnFocus
              textAlign="center"
              underlineColorAndroid="transparent"
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "");

                if (digits === "") {
                  setPeopleCount("");
                  return;
                }

                setPeopleCount(String(Math.min(10, Number(digits))));
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.counterButton}
            activeOpacity={0.8}
            onPress={() =>
              setPeopleCount((current) =>
                String(Math.min(10, Number(current || 0) + 1)),
              )
            }
          >
            <Text style={styles.counterButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.fieldLabel, styles.fieldGap]}>Budget (₺)</Text>
        <TextField
          placeholder="Enter your budget"
          keyboardType="decimal-pad"
          value={budget}
          onChangeText={(t) => setBudget(sanitizeAmountInput(t))}
          maxLength={12}
          style={styles.fieldInput}
        />

        <Text style={[styles.fieldLabel, styles.fieldGap]}>Move-in date</Text>
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => setShowPicker(true)}
        >
          <Text style={moveInDate ? styles.dateText : styles.datePlaceholder}>
            {moveInDate || "Select date"}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          Platform.OS === "ios" ? (
            <Modal transparent animationType="fade" visible={showPicker}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowPicker(false)}
              >
                <View
                  style={styles.modalContent}
                  onStartShouldSetResponder={() => true}
                >
                  <DateTimePicker
                    value={
                      moveInDate ? new Date(`${moveInDate}T00:00:00`) : new Date()
                    }
                    mode="date"
                    display="inline"
                    accentColor={colors.primary}
                    onChange={(event, date) => {
                      if (date) {
                        setMoveInDate(formatDate(date));
                        setShowPicker(false);
                      }
                    }}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          ) : (
            <DateTimePicker
              value={
                moveInDate ? new Date(`${moveInDate}T00:00:00`) : new Date()
              }
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowPicker(false);
                if (event.type === "set" && date) {
                  setMoveInDate(formatDate(date));
                }
              }}
            />
          )
        )}

        {type !== "studio" && (
          <>
            <Text style={[styles.fieldLabel, styles.fieldGap]}>
              Layout (bedrooms + living rooms)
            </Text>
            <View style={styles.row}>
              {LAYOUTS.map((l) => (
                <Chip
                  key={l}
                  label={l}
                  selected={layout === l}
                  onPress={() => setLayout(l)}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Style</Text>
      <View style={styles.styleGrid}>
        {STYLES.map((s) => (
          <View key={s} style={styles.styleItem}>
            <OptionCard
              title={capitalize(s)}
              subtitle={STYLE_SUBTITLES[s]}
              selected={style === s}
              onPress={() => setStyle(s)}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Lifestyle</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I work from home</Text>
          <Switch
            value={worksFromHome}
            onValueChange={setWorksFromHome}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I have a pet</Text>
          <Switch
            value={hasPet}
            onValueChange={setHasPet}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I have a balcony</Text>
          <Switch
            value={hasBalcony}
            onValueChange={setHasBalcony}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={[styles.switchRow, styles.switchRowLast]}>
          <Text style={styles.switchLabel}>I have a garden</Text>
          <Switch
            value={hasGarden}
            onValueChange={setHasGarden}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Items you already own</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          {OWNED_OPTIONS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={ownedItems.includes(item)}
              onPress={() => toggleOwned(item)}
            />
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Save my home"
        onPress={handleSave}
        loading={loading}
        style={styles.saveButton}
      />
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
  screen: { flex: 1, backgroundColor: colors.accentSoft },
  container: {
    padding: spacing.xl,
    paddingTop: 60,
    paddingBottom: 48,
  },
  header: { marginBottom: spacing.sm },
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
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.cornSilk,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.xxl,
    ...cardShadow,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  fieldGap: { marginTop: spacing.xl },
  fieldInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    marginTop: 0,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  peopleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  peopleInputShadow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  peopleInput: {
    width: 64,
    height: 44,
    padding: 0,
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    backgroundColor: "transparent",
    borderRadius: radius.md,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  counterButtonText: {
    color: colors.onPrimary,
    fontSize: 26,
    fontWeight: "600",
    lineHeight: 30,
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  typeItem: { flex: 1 },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  styleItem: { width: "47%" },
  dateField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.card,
  },
  dateText: { fontSize: fontSize.lg, color: colors.text },
  datePlaceholder: { fontSize: fontSize.lg, color: colors.textSubtle },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  switchRowLast: { borderBottomWidth: 0 },
  switchLabel: { fontSize: fontSize.lg, color: colors.text },
  error: { color: colors.danger, marginTop: spacing.xl },
  saveButton: {
    marginTop: spacing.xxl,
    paddingVertical: 16,
    borderRadius: radius.lg,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor:colors.AliceBlue,
    borderRadius: radius.xl,
    padding: spacing.sm,
    width: "100%",
    ...cardShadow,
  },
});
