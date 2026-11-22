import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dateLabel, parseDate } from '@/lib/format';
import { colors, maxWidth, radius, space } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  if (!scroll) {
    return (
      <View style={styles.screen}>
        <View style={styles.inner}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

export function SafeScreen({ children }: { children: ReactNode }) {
  return <SafeAreaView style={styles.screen}>{children}</SafeAreaView>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </Row>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function Strong({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.strong, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvValue}>{v === null || v === undefined || v === '' ? '—' : v}</Text>
    </View>
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
const toneColors: Record<Tone, [string, string]> = {
  neutral: ['#F3F4F6', colors.muted],
  primary: [colors.primarySoft, colors.primary],
  success: [colors.successSoft, colors.success],
  warning: [colors.warningSoft, colors.warning],
  danger: [colors.dangerSoft, colors.danger],
};

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const [bg, fg] = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.primarySoft : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export function Field({
  label,
  value,
  onChangeText,
  required,
  hint,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  required?: boolean;
  hint?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#9CA3AF"
        style={[styles.input, rest.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        {...rest}
      />
      {hint ? <Muted style={{ marginTop: 2, fontSize: 12 }}>{hint}</Muted> : null}
    </View>
  );
}

/** Date input: the user types DD-MM-YYYY; value is stored as YYYY-MM-DD. */
export function DateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  required?: boolean;
}) {
  const toDisplay = (iso: string | null) => (iso ? iso.split('-').reverse().join('-') : '');
  const [text, setText] = useState(toDisplay(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(toDisplay(value));
  }
  const parsed = parseDate(text);
  const invalid = text.trim() !== '' && !parsed;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <TextInput
        value={text}
        placeholder="DD-MM-YYYY"
        placeholderTextColor="#9CA3AF"
        keyboardType="numbers-and-punctuation"
        onChangeText={(s) => {
          setText(s);
          const p = parseDate(s);
          if (p) {
            setLastValue(p);
            onChange(p);
          } else if (s.trim() === '') {
            setLastValue(null);
            onChange(null);
          }
        }}
        style={[styles.input, invalid && { borderColor: colors.danger }]}
      />
      {invalid ? <Text style={{ color: colors.danger, fontSize: 12 }}>Use DD-MM-YYYY</Text> : parsed ? <Muted style={{ fontSize: 12 }}>{dateLabel(parsed)}</Muted> : null}
    </View>
  );
}

/** Small set of options shown as tappable chips. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  allowClear,
}: {
  label?: string;
  options: { value: T; label: string }[] | T[];
  value: T | null;
  onChange: (v: T | null) => void;
  allowClear?: boolean;
}) {
  const opts = (options as (T | { value: T; label: string })[]).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips}>
        {opts.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(selected && allowClear ? null : o.value)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Searchable picker for long lists (insurers, clients). */
export function Picker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  required,
  onCreateNew,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string; sub?: string }[];
  onChange: (v: string | null) => void;
  placeholder?: string;
  required?: boolean;
  onCreateNew?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = options.find((o) => o.value === value);
  const filtered = q ? options.filter((o) => (o.label + ' ' + (o.sub ?? '')).toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.input, { justifyContent: 'center' }]}>
        <Text style={{ color: selected ? colors.text : '#9CA3AF', fontSize: 15 }}>{selected ? selected.label : placeholder}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
              <Strong>{label}</Strong>
              <Button title="Close" variant="ghost" small onPress={() => setOpen(false)} />
            </Row>
            <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor="#9CA3AF" style={styles.input} autoFocus />
            {onCreateNew ? (
              <Button
                title="+ Add new"
                variant="secondary"
                small
                style={{ marginTop: space.sm, alignSelf: 'flex-start' }}
                onPress={() => {
                  setOpen(false);
                  onCreateNew();
                }}
              />
            ) : null}
            <FlatList
              style={{ marginTop: space.sm }}
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                    setQ('');
                  }}
                  style={({ pressed }) => [styles.pickerItem, pressed && { backgroundColor: colors.primarySoft }]}>
                  <Text style={{ fontSize: 15, color: colors.text }}>{item.label}</Text>
                  {item.sub ? <Muted style={{ fontSize: 12 }}>{item.sub}</Muted> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Muted style={{ padding: space.md }}>No matches</Muted>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function SearchBox({ value, onChangeText, placeholder = 'Search' }: { value: string; onChangeText: (s: string) => void; placeholder?: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      style={[styles.input, { marginBottom: space.md, backgroundColor: '#fff' }]}
      autoCorrect={false}
    />
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function Loading() {
  return (
    <View style={{ padding: space.xl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: colors.danger }}>
      <Text style={{ color: colors.danger, marginBottom: onRetry ? space.sm : 0 }}>{message}</Text>
      {onRetry ? <Button title="Try again" small variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <View style={{ padding: space.xl, alignItems: 'center', gap: space.md }}>
      <Muted style={{ textAlign: 'center' }}>{text}</Muted>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: space.lg, paddingBottom: 48 },
  inner: { width: '100%', maxWidth, alignSelf: 'center', flex: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: space.md },
  strong: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  kv: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  kvKey: { width: 140, color: colors.muted, fontSize: 13 },
  kvValue: { flex: 1, color: colors.text, fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  field: { marginBottom: space.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 560,
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: space.lg,
  },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
