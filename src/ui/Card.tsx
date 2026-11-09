import { View, type ViewProps } from 'react-native';
import { color, radius, space } from '@/theme/tokens';
export function Card({ style, ...p }: ViewProps) {
  return <View {...p} style={[{ backgroundColor: color.surface1, borderRadius: radius.card, borderWidth: 1, borderColor: color.border, padding: space[5], gap: space[3] }, style]} />;
}
