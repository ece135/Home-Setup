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
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Define your home</Text>
      <Text style={styles.subtitle}>
        Tell us about your new place so we can build your plan.
      </Text>

      <Text style={styles.label}>Home type</Text>
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

      <Text style={styles.label}>Furnishing</Text>
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
      <Text style={styles.label}>Number of people</Text>

      <View style={styles.peopleRow}>
        <TouchableOpacity
          style={styles.counterButton}
          onPress={() =>
            setPeopleCount((current) =>
              String(Math.max(1, Number(current || 1) - 1))
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
        />
        </View>

        <TouchableOpacity
          style={styles.counterButton}
          onPress={() =>
            setPeopleCount((current) =>
              String(Math.min(10, Number(current || 0) + 1))
            )
          }
        >
          <Text style={styles.counterButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Budget (₺)</Text>
      <TextField
        placeholder="e.g. 80000"
        keyboardType="decimal-pad"
        value={budget}
        onChangeText={(t) => setBudget(sanitizeAmountInput(t))}
        maxLength={12}
      />

      <Text style={styles.label}>Move-in date</Text>
      <TouchableOpacity
        style={styles.dateField}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={moveInDate ? styles.dateText : styles.datePlaceholder}>
          {moveInDate || "Select a date"}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={moveInDate ? new Date(moveInDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          onValueChange={(event, selected) => {
            if (Platform.OS !== "ios") setShowPicker(false);
            if (selected) setMoveInDate(formatDate(selected));
          }}
        />
      )}

      {type !== "studio" && (
        <>
          <Text style={styles.label}>Layout (bedrooms + living rooms)</Text>
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

      <Text style={styles.label}>Style</Text>
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

      <Text style={styles.label}>Lifestyle</Text>
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
        <Text style={styles.switchLabel}>I have a garden or balcony</Text>
        <Switch
          value={hasGarden}
          onValueChange={setHasGarden}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Text style={styles.label}>Items you already own</Text>
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

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    paddingTop: 60,
    backgroundColor: colors.background,
  },
  title: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  section: { marginTop: spacing.lg },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  peopleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
 
  peopleInputShadow: {
  backgroundColor: colors.card,
  borderRadius: radius.md,
  shadowColor: "#000",
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 5,
  },

  peopleInput: {
    width: 64,
    height: 40,
    padding: 0,
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    backgroundColor: "transparent",
    borderRadius: radius.md,
  },
  peopleCounter: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: "#F1F7F6",
  borderWidth: 1,
  borderColor: "#D5E7E4",
  borderRadius: 16,
  padding: 3,
},

  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F6F6B",
  },

  counterButtonText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "600",
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
    backgroundColor: colors.background,
  },
  dateText: { fontSize: fontSize.lg, color: colors.text },
  datePlaceholder: { fontSize: fontSize.lg, color: colors.textSubtle },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: { fontSize: fontSize.lg, color: colors.text },
  error: { color: colors.danger, marginTop: spacing.lg },
  saveButton: { marginTop: spacing.xl, marginBottom: 40 },
});
