import { TextInput, type TextInputProps } from 'react-native';
import { color, radius, layout, space, type, font } from '@/theme/tokens';
export function Input(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return <TextInput accessibilityLabel={label} placeholderTextColor={color.textMuted} {...rest}
    style={[{ ...type.body, fontFamily: font.regular, minHeight: layout.touchMin, backgroundColor: color.surface2, borderRadius: radius.input, paddingHorizontal: space[4], color: color.textPrimary }, style]} />;
}
