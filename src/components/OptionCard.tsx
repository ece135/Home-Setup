import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

export default function OptionCard({
  title,
  subtitle,
  image,
  selected,
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        selected ? styles.cardSelected : styles.cardIdle,
        style,
      ]}
    >
      {image ? (
        <Image
          source={image}
          style={[styles.image, !selected && styles.imageIdle]}
        />
      ) : null}

      <View style={[styles.body, selected && styles.bodySelected]}>
        <Text style={[styles.title, selected && styles.titleSelected]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 2,
  },
  cardIdle: {
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.primary,
    transform: [{ scale: 1.04 }],
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  image: { width: "100%", height: 90, resizeMode: "cover" },
  imageIdle: { opacity: 0.55 },
  body: { padding: spacing.md },
  bodySelected: { backgroundColor: colors.primary },
  title: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
  titleSelected: { color: colors.onPrimary, fontWeight: "700" },
  subtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  subtitleSelected: { color: colors.accentSoft },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: colors.onPrimary, fontSize: 14, fontWeight: "700" },
});
