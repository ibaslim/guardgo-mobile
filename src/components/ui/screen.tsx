import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

export type ScreenProps = ViewProps & {
  /** Screen edges to keep clear of the status bar, notch and navigation bar. */
  edges?: Edge[];
};

/** Full-screen container with the theme background and safe-area padding. */
export function Screen({ edges = ['top', 'bottom'], className, style, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return <View className={`flex-1 bg-background ${className ?? ''}`} style={[padding, style]} {...rest} />;
}
