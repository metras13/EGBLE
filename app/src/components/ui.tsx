/**
 * EGBLE - small shared UI pieces
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Radius, Spacing } from '../constants/colors';

export function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const accent = color ?? Colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? accent + '22' : Colors.bg3,
          borderColor: active ? accent : Colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? accent : Colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>
          {Math.round(value)}
          {unit ?? ''}
        </Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onSlidingComplete={onChange}
        minimumTrackTintColor={Colors.accent}
        maximumTrackTintColor={Colors.bg4}
        thumbTintColor={Colors.accent}
      />
    </View>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  sliderRow: { marginBottom: Spacing.sm },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabel: { color: Colors.text, fontSize: 13 },
  sliderValue: { color: Colors.muted, fontSize: 13 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    color: Colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
});
