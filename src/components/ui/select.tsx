import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PickerTrigger } from '@/components/ui/picker-trigger';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { FieldMeta, SymbolIcon } from '@/types/ui';

export type SelectValue = string | number;

export type SelectOption<T extends SelectValue = string> = {
  label: string;
  value: T;
  /** Second line under the label, e.g. an address. Also searched. */
  description?: string;
};

export type SelectProps<T extends SelectValue> = FieldMeta & {
  options: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Called when the list closes, so form validation can run. */
  onBlur?: () => void;
  placeholder?: string;
  /** Icon at the start of the field, e.g. ICONS.location for a site. */
  icon?: SymbolIcon;
  /** Adds a search box above the options. Use it for long lists. */
  searchable?: boolean;
  searchPlaceholder?: string;
};

const matches = (option: SelectOption<SelectValue>, query: string) =>
  option.label.toLowerCase().includes(query) || Boolean(option.description?.toLowerCase().includes(query));

/** Field that opens a list of options in a bottom sheet. */
export function Select<T extends SelectValue>({
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Select',
  icon,
  searchable = false,
  searchPlaceholder = 'Search',
  ...meta
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value) ?? null;

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = useMemo(
    () => (normalizedQuery ? options.filter((option) => matches(option, normalizedQuery)) : options),
    [options, normalizedQuery]
  );

  function close() {
    setOpen(false);
    onBlur?.();
  }

  function choose(next: T | null) {
    onChange(next);
    close();
  }

  return (
    <View>
      <PickerTrigger
        {...meta}
        valueLabel={selected?.label ?? null}
        placeholder={placeholder}
        icon={icon}
        open={open}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
      />

      <Sheet
        visible={open}
        onClose={close}
        title={meta.label}
        size={searchable ? 'tall' : 'auto'}
        footer={
          meta.optional && selected ? (
            <Button title="Clear selection" variant="link" onPress={() => choose(null)} />
          ) : undefined
        }>
        {searchable ? (
          <View className="px-5 pb-3">
            <View className="min-h-12 flex-row items-center gap-2.5 rounded-[12px] bg-surface-muted px-3.5">
              <Icon icon={ICONS.search} size={18} tone="field" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                accessibilityLabel={searchPlaceholder}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                placeholderTextColorClassName="accent-content-muted"
                cursorColorClassName="accent-primary"
                selectionColorClassName="accent-primary"
                className="min-h-12 flex-1 font-sans text-base text-content"
              />
              {query ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}>
                  <Icon icon={ICONS.clear} size={18} tone="field" />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <FlatList
          data={visibleOptions}
          keyExtractor={(option) => String(option.value)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // Size to the options in an auto-height sheet; scroll once they reach the sheet's max height.
          style={searchable ? undefined : { flexGrow: 0 }}
          contentContainerClassName="gap-0.5 px-3 pb-2"
          renderItem={({ item }) => (
            <OptionRow option={item} selected={item.value === value} onPress={() => choose(item.value)} />
          )}
          ListEmptyComponent={
            <View className="items-center gap-1 px-6 py-10">
              <Text variant="label">No matches</Text>
              <Text variant="small" tone="muted" className="text-center">
                {normalizedQuery ? `Nothing matches “${query.trim()}”. Try a shorter search.` : 'There are no options yet.'}
              </Text>
            </View>
          }
        />
      </Sheet>
    </View>
  );
}

type OptionRowProps = {
  option: SelectOption<SelectValue>;
  selected: boolean;
  onPress: () => void;
};

function OptionRow({ option, selected, onPress }: OptionRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 rounded-[12px] px-3 py-3 active:bg-surface-muted">
      <View className="flex-1 gap-0.5">
        <Text variant="body" className={selected ? 'font-sans-semibold' : ''}>
          {option.label}
        </Text>
        {option.description ? (
          <Text variant="small" tone="muted">
            {option.description}
          </Text>
        ) : null}
      </View>
      {/* Radio mark: a filled check when chosen, an empty ring otherwise. */}
      {selected ? (
        <View className="size-6 items-center justify-center rounded-full bg-primary">
          <Icon icon={ICONS.check} size={13} colorVar="--color-on-primary" />
        </View>
      ) : (
        <View className="size-6 rounded-full border-[1.5px] border-field-border" />
      )}
    </Pressable>
  );
}
