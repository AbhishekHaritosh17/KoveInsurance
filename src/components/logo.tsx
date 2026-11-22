import { Text, View } from 'react-native';

import { colors } from '@/lib/theme';

/**
 * Fizzy wordmark. Placeholder until the Kove logo file is added:
 * drop it in assets/images/logo.png and swap this for an <Image>.
 */
export function Logo({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: light ? '#fff' : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ color: light ? colors.primary : '#fff', fontWeight: '900', fontSize: size * 0.6 }}>F</Text>
      </View>
      <Text style={{ fontSize: size * 0.75, fontWeight: '800', color: light ? '#fff' : colors.text, letterSpacing: 0.3 }}>
        Fizzy
      </Text>
    </View>
  );
}
