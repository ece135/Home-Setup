import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, fontSize, radius } from "../theme";

export default function QuantityStepper({
  value,
  min = 1,
  max = 20,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.wrap}>
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    padding: 3,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  disabled: { opacity: 0.35 },
  value: {
    minWidth: 34,
    textAlign: "center",
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
  },
});