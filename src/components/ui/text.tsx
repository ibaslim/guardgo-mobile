import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

const variants = {
  /** Largest heading, for entry screens like login. */
  display: 'font-sans-bold text-4xl tracking-tight',
  title: 'font-sans-semibold text-3xl',
  heading: 'font-sans-semibold text-xl',
  body: 'font-sans text-base',
  label: 'font-sans-medium text-sm',
  small: 'font-sans text-sm',
  caption: 'font-sans text-xs',
  code: 'font-mono text-xs',
} as const;

const tones = {
  default: 'text-content',
  secondary: 'text-content-secondary',
  muted: 'text-content-muted',
  link: 'text-link',
  success: 'text-success',
  danger: 'text-danger',
  inherit: '',
} as const;

export type TextProps = RNTextProps & {
  variant?: keyof typeof variants;
  tone?: keyof typeof tones;
};

/** Text in the app font and theme colours. Use `tone="inherit"` to set the colour via className. */
export function Text({ variant = 'body', tone = 'default', className, ...rest }: TextProps) {
  return <RNText className={`${variants[variant]} ${tones[tone]} ${className ?? ''}`} {...rest} />;
}
