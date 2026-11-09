import { Pressable, Text } from 'react-native';
import { color, radius, layout, type, font, space, motion } from '@/theme/tokens';
export function Button({ label, onPress, variant = 'primary', disabled }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean }) {
  const p = variant === 'primary';
  return (<Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: layout.touchMin, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[5], opacity: disabled ? 0.5 : 1,
      backgroundColor: p ? (pressed ? color.lime600 : color.lime500) : variant === 'secondary' || variant === 'danger' ? (pressed ? color.surface3 : color.surface2) : 'transparent',
      borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0, borderColor: variant === 'danger' ? color.danger : color.border, transform: [{ scale: pressed ? motion.press : 1 }] })}>
    <Text style={{ ...type.body, fontFamily: font.bold, color: p ? color.onLime : variant === 'danger' ? color.danger : color.textPrimary }}>{label}</Text>
  </Pressable>);
}
