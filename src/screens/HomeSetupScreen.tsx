import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { auth } from "../lib/firebase";
import { saveHome } from "../lib/homes";
import { Furnishing, Home, HomeType, StyleType } from "../types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

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

interface Props {
  onSaved: (home: Home) => void;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Chip({
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
    const people = parseInt(peopleCount, 10);
    const budgetNumber = parseFloat(budget.replace(",", "."));

    if (!people || people < 1) {
      setError("Enter a valid number of people.");
      return;
    }
    if (!budgetNumber || budgetNumber <= 0) {
      setError("Enter a valid budget.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveInDate)) {
      setError("Please select a move-in date.");
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
        peopleCount: people,
        bedrooms,
        livingRooms,
        budget: budgetNumber,
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Define your home</Text>

      <Text style={styles.label}>Home type</Text>
      <View style={styles.row}>
        {HOME_TYPES.map((t) => (
          <Chip
            key={t}
            label={t}
            selected={type === t}
            onPress={() => setType(t)}
          />
        ))}
      </View>

      <Text style={styles.label}>Furnishing</Text>
      <View style={styles.row}>
        {FURNISHINGS.map((f) => (
          <Chip
            key={f}
            label={f}
            selected={furnishing === f}
            onPress={() => setFurnishing(f)}
          />
        ))}
      </View>

      <Text style={styles.label}>Number of people</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={peopleCount}
        onChangeText={setPeopleCount}
      />

      <Text style={styles.label}>Budget (₺)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="e.g. 50000"
        value={budget}
        onChangeText={setBudget}
      />

      <Text style={styles.label}>Move-in date</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={{ fontSize: 16, color: moveInDate ? "#000" : "#999" }}>
          {moveInDate || "Select a date"}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={moveInDate ? new Date(moveInDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          onChange={(event, selected) => {
            if (Platform.OS !== "ios") setShowPicker(false);
            if (event.type === "set" && selected)
              setMoveInDate(formatDate(selected));
          }}
        />
      )}

      <Text style={styles.label}>Style</Text>
      <View style={styles.row}>
        {STYLES.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={style === s}
            onPress={() => setStyle(s)}
          />
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>I work from home</Text>
        <Switch value={worksFromHome} onValueChange={setWorksFromHome} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>I have a pet</Text>
        <Switch value={hasPet} onValueChange={setHasPet} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>I have a garden or balcony</Text>
        <Switch value={hasGarden} onValueChange={setHasGarden} />
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save my home</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  chipSelected: { backgroundColor: "#1f6f6b", borderColor: "#1f6f6b" },
  chipText: { color: "#333" },
  chipTextSelected: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  switchLabel: { fontSize: 16 },
  error: { color: "#c62828", marginTop: 16 },
  button: {
    backgroundColor: "#1f6f6b",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
