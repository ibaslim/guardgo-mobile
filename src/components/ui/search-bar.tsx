import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { FieldIcon, fieldBoxClassName } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { ICONS } from '@/constants/icons';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Called when the keyboard's search key is pressed. */
  onSubmit?: () => void;
};

/**
 * A compact search box: a magnifier, the text, and a clear button once something is typed. It has the same
 * border as the form fields but is a little shorter (44px), so it lines up with a button of size `md` in one row. It only holds
 * the text; filtering is up to the screen.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search', onSubmit }: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    // Fully rounded ends; a little more side padding keeps the icon and text clear of the curve.
    <View className={fieldBoxClassName({ focused })} style={{ borderRadius: 999, paddingHorizontal: 16, minHeight: 44 }}>
      <FieldIcon icon={ICONS.search} focused={focused} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColorClassName="accent-content-muted"
        cursorColorClassName="accent-primary"
        selectionColorClassName="accent-primary"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="min-h-11 min-w-0 flex-1 font-sans text-base text-content"
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChangeText('')}>
          <Icon icon={ICONS.clear} size={18} tone="field" />
        </Pressable>
      ) : null}
    </View>
  );
}
