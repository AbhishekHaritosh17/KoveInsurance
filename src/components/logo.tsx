import { Image, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

const mark = require('@/assets/images/kove-mark.png');
const markWhite = require('@/assets/images/kove-mark-white.png');
const wordmarkWhite = require('@/assets/images/kove-logo-white.png');

// kove-mark.png is 320 x 298; keep its aspect ratio.
const MARK_RATIO = 320 / 298;

/** Header logo: Kove mark + "Fizzy". */
export function Logo({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      <Image source={light ? markWhite : mark} style={{ width: size * MARK_RATIO, height: size }} resizeMode="contain" accessibilityLabel="Kove" />
      <Text style={{ fontSize: size * 0.75, fontWeight: '800', color: light ? '#fff' : colors.text, letterSpacing: 0.3 }}>Fizzy</Text>
    </View>
  );
}

/** Full Kove wordmark (white), used on the sign-in screen. */
export function KoveWordmark({ width = 200 }: { width?: number }) {
  // kove-logo-white.png is 964 x 312
  return <Image source={wordmarkWhite} style={{ width, height: width * (312 / 964) }} resizeMode="contain" accessibilityLabel="Kove" />;
}
