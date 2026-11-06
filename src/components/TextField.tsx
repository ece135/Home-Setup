import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, fontSize, radius } from "../theme";

export default function TextField({
  error,
  style,
  ...props
}: TextInputProps & { error?: string }) {
  return (
    <View>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, !!error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: 4 },
});