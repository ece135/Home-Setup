import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

type Variant = "primary" | "outline" | "danger" | "link";

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const textColor =
    variant === "primary" || variant === "danger"
      ? colors.onPrimary
      : variant === "outline"
        ? colors.primary
        : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  link: { padding: spacing.sm },
  disabled: { opacity: 0.5 },
  text: { fontSize: fontSize.lg, fontWeight: "600" },
});