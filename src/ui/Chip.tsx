import { Pressable, Text } from 'react-native';
import { color, radius, layout, space, type, font } from '@/theme/tokens';
export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (<Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ minHeight: layout.touchMin, justifyContent: 'center', paddingHorizontal: space[4], borderRadius: radius.pill, borderWidth: 1,
      borderColor: color.forest600, backgroundColor: pressed ? color.surface3 : color.surface2 })}>
    <Text style={{ ...type.body, fontFamily: font.regular, color: color.lime400 }}>{label}</Text></Pressable>);
}
