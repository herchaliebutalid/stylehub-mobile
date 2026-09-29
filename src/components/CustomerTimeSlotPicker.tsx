import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import {
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import type { CustomerAvailableSlot } from '@/src/types/appointment-availability';

interface CustomerTimeSlotPickerProps {
  slots: CustomerAvailableSlot[];
  selectedStartsAt: string | null;
  isLoading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  onSelect: (
    slot: CustomerAvailableSlot,
  ) => void;
}

export default function CustomerTimeSlotPicker({
  slots,
  selectedStartsAt,
  isLoading = false,
  disabled = false,
  emptyMessage =
    'Select an available date to see appointment times.',
  onSelect,
}: CustomerTimeSlotPickerProps) {
  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator
          size="small"
          color={COLORS.navy}
        />

        <View style={styles.stateCopy}>
          <Text style={styles.stateTitle}>
            Checking available times
          </Text>

          <Text style={styles.stateText}>
            Getting the latest open appointment slots for this date.
          </Text>
        </View>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.stateBox}>
        <View style={styles.stateDot} />

        <View style={styles.stateCopy}>
          <Text style={styles.stateTitle}>
            No time selected
          </Text>

          <Text style={styles.stateText}>
            {emptyMessage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const selected =
          selectedStartsAt ===
          slot.starts_at;

        return (
          <TouchableOpacity
            key={`${slot.starts_at}-${slot.ends_at}`}
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() =>
              onSelect(slot)
            }
            accessibilityRole="button"
            accessibilityLabel={`Appointment time ${slot.label}`}
            accessibilityState={{
              disabled,
              selected,
            }}
            style={[
              styles.slot,

              selected &&
                styles.slotSelected,

              disabled &&
                styles.slotDisabled,
            ]}
          >
            <Text
              style={[
                styles.slotText,

                selected &&
                  styles.slotTextSelected,
              ]}
            >
              {slot.label}
            </Text>

            {selected ? (
              <Text
                style={
                  styles.slotSelectedCaption
                }
              >
                Selected
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles =
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },

    slot: {
      width: '47%',
      flexGrow: 1,
      minHeight: 58,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADII.md,
      backgroundColor: COLORS.surface,
    },

    slotSelected: {
      borderColor: COLORS.navy,
      backgroundColor: COLORS.navy,
    },

    slotDisabled: {
      opacity: 0.5,
    },

    slotText: {
      color: COLORS.navy,
      fontSize: TYPOGRAPHY.secondary,
      lineHeight: 18,
      fontWeight: '800',
      textAlign: 'center',
    },

    slotTextSelected: {
      color: COLORS.white,
    },

    slotSelectedCaption: {
      marginTop: 2,
      color: '#D4DAE1',
      fontSize: 9,
      fontWeight: '700',
    },

    stateBox: {
      minHeight: 84,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADII.lg,
      backgroundColor: COLORS.surfaceSoft,
    },

    stateDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: COLORS.textLight,
    },

    stateCopy: {
      flex: 1,
    },

    stateTitle: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.secondary,
      fontWeight: '800',
    },

    stateText: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize: TYPOGRAPHY.micro,
      lineHeight: 16,
    },
  });