// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'grid.fill': 'grid-view',
  'plus.circle.fill': 'add-circle',
  'list.bullet': 'view-list',
  'timer': 'timer',
  'calendar': 'event',
  'pencil': 'edit',
  'checkmark.circle.fill': 'check-circle',
  'chart.bar.fill': 'bar-chart',
  'ruler.fill': 'straighten',
  'chart.pie': 'pie-chart',
  'gearshape.fill': 'settings',
  'bolt.fill': 'bolt',
  'star.fill': 'star',
  'square.and.arrow.up': 'file-upload',
  'square.and.arrow.down': 'file-download',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color as any} size={size} name={MAPPING[name as keyof typeof MAPPING]} style={style} />;
}
