import { Image } from 'expo-image';

type LogoMarkProps = { size?: number };

/** The GuardGo shield mark (from the GuardGo web client's branding). */
export function LogoMark({ size = 56 }: LogoMarkProps) {
  return (
    <Image
      source={require('../../../assets/images/logo-mark.png')}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );
}
