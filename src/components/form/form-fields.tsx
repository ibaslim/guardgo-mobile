/**
 * Form fields connected to React Hook Form (use with useApiForm). Each one shows its Zod and
 * server errors under the field:
 *
 *   <FormTextField control={form.control} name="email" label="Email" keyboardType="email-address" />
 */
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { DateField, TimeField, type DateFieldProps } from '@/components/ui/date-field';
import { ImageField, type ImageFieldProps } from '@/components/ui/image-field';
import { PasswordField, type PasswordFieldProps } from '@/components/ui/password-field';
import { Select, type SelectProps, type SelectValue } from '@/components/ui/select';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';

type ControlProps<T extends FieldValues, N extends FieldPath<T>> = {
  // `any` for the context and parsed-output types, so forms with a Zod transform are accepted too.
  control: Control<T, any, any>;
  name: N;
};

type Connected = 'value' | 'onChange' | 'onBlur' | 'error';

/**
 * The field's value, handlers and error. `inputRef` lets the form focus the first invalid field.
 * Kept apart from the rest: the React Compiler lint treats every property of an object holding a
 * ref as a ref.
 */
function useField<T extends FieldValues, N extends FieldPath<T>>({ control, name }: ControlProps<T, N>) {
  const {
    field: { ref: inputRef, value, onChange, onBlur },
    fieldState,
  } = useController({ control, name });
  return { inputRef, value, onChange, onBlur, error: fieldState.error?.message };
}

export function FormTextField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  ...props
}: ControlProps<T, N> & Omit<TextFieldProps, Connected | 'onChangeText' | 'ref'>) {
  const { inputRef, value, onChange, onBlur, error } = useField({ control, name });
  return <TextField {...props} ref={inputRef} value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={error} />;
}

export function FormPasswordField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  ...props
}: ControlProps<T, N> & Omit<PasswordFieldProps, Connected | 'onChangeText' | 'ref'>) {
  const { inputRef, value, onChange, onBlur, error } = useField({ control, name });
  return (
    <PasswordField {...props} ref={inputRef} value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={error} />
  );
}

export function FormDateField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  ...props
}: ControlProps<T, N> & Omit<DateFieldProps, Connected>) {
  const { value, onChange, onBlur, error } = useField({ control, name });
  return <DateField {...props} value={value ?? null} onChange={onChange} onBlur={onBlur} error={error} />;
}

export function FormTimeField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  ...props
}: ControlProps<T, N> & Omit<DateFieldProps, Connected>) {
  const { value, onChange, onBlur, error } = useField({ control, name });
  return <TimeField {...props} value={value ?? null} onChange={onChange} onBlur={onBlur} error={error} />;
}

export function FormSelect<T extends FieldValues, N extends FieldPath<T>, V extends SelectValue>({
  control,
  name,
  ...props
}: ControlProps<T, N> & Omit<SelectProps<V>, Connected>) {
  const { value, onChange, onBlur, error } = useField({ control, name });
  return <Select<V> {...props} value={value ?? null} onChange={onChange} onBlur={onBlur} error={error} />;
}

export function FormImageField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  ...props
}: ControlProps<T, N> & Omit<ImageFieldProps, Connected>) {
  const { value, onChange, onBlur, error } = useField({ control, name });
  return <ImageField {...props} value={value ?? null} onChange={onChange} onBlur={onBlur} error={error} />;
}
