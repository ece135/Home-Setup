import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

export default function Stepper({
  label,
  value,
  min = 0,
  max = 10,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, !canDecrease && styles.disabled]}
          onPress={() => canDecrease && onChange(value - 1)}
          hitSlop={8}
        >
          <Text style={styles.buttonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{value}</Text>
        <TouchableOpacity
          style={[styles.button, !canIncrease && styles.disabled]}
          onPress={() => canIncrease && onChange(value + 1)}
          hitSlop={8}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: fontSize.lg, color: colors.text },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 20, color: colors.primary, fontWeight: "600" },
  disabled: { opacity: 0.35 },
  value: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
    color: colors.text,
  },
});