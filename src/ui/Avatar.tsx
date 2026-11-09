import { View, Text } from 'react-native';
import { color, font, size, type } from '@/theme/tokens';
/** Initial in a circle. Decorative: the name next to it is what gets read aloud. */
export function Avatar({ name, large }: { name?: string | null; large?: boolean }) {
  const d = large ? size.avatarLg : size.avatar;
  return (<View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color.surface3, borderWidth: 1, borderColor: color.forest600, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ ...(large ? type.title : type.heading), fontFamily: font.bold, color: color.lime400 }}>{(name?.trim()[0] ?? '?').toUpperCase()}</Text></View>);
}
