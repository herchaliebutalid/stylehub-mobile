import {
  ActivityIndicator,
  ScrollView,
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
import type { CustomerAvailableDate } from '@/src/types/appointment-availability';

interface CustomerBookingDatePickerProps {
  dates: CustomerAvailableDate[];
  selectedDate: string | null;
  isLoading?: boolean;
  disabled?: boolean;
  onSelect: (date: CustomerAvailableDate) => void;
}

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

function parseDateParts(value: string): {
  day: string;
  month: string;
} {
  const [, monthValue, dayValue] = value.split('-');
  const monthIndex = Number(monthValue) - 1;

  return {
    day: dayValue ?? '--',
    month: MONTHS[monthIndex] ?? '---',
  };
}

function getUnavailableLabel(
  date: CustomerAvailableDate,
): string {
  switch (date.unavailable_reason) {
    case 'shop_closed':
      return 'Closed';

    case 'shop_blocked_date':
      return 'Blocked';

    case 'shop_not_accepting_appointments':
      return 'Unavailable';

    case 'no_available_slots':
      return 'No slots';

    default:
      return 'Unavailable';
  }
}

function getSlotCountLabel(
  count: number,
): string {
  return count === 1
    ? '1 slot'
    : `${count} slots`;
}

export default function CustomerBookingDatePicker({
  dates,
  selectedDate,
  isLoading = false,
  disabled = false,
  onSelect,
}: CustomerBookingDatePickerProps) {
  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator
          size="small"
          color={COLORS.navy}
        />

        <View style={styles.stateCopy}>
          <Text style={styles.stateTitle}>
            Checking available dates
          </Text>

          <Text style={styles.stateText}>
            StyleHub is asking Laravel for the latest bookable dates.
          </Text>
        </View>
      </View>
    );
  }

  if (dates.length === 0) {
    return (
      <View style={styles.stateBox}>
        <View style={styles.stateDot} />

        <View style={styles.stateCopy}>
          <Text style={styles.stateTitle}>
            No dates available
          </Text>

          <Text style={styles.stateText}>
            No bookable dates were returned for this service right now.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map((date) => {
        const selected =
          selectedDate === date.date;

        const unavailable =
          !date.is_available;

        const dateParts =
          parseDateParts(date.date);

        const buttonDisabled =
          disabled || unavailable;

        return (
          <TouchableOpacity
            key={date.date}
            activeOpacity={0.8}
            disabled={buttonDisabled}
            onPress={() =>
              onSelect(date)
            }
            accessibilityRole="button"
            accessibilityLabel={
              date.is_available
                ? `${date.day_label}, ${date.date}, ${getSlotCountLabel(date.available_slot_count)} available`
                : `${date.day_label}, ${date.date}, ${getUnavailableLabel(date)}`
            }
            accessibilityState={{
              disabled: buttonDisabled,
              selected,
            }}
            style={[
              styles.dateCard,

              selected &&
                styles.dateCardSelected,

              unavailable &&
                styles.dateCardUnavailable,
            ]}
          >
            <Text
              style={[
                styles.weekday,

                selected &&
                  styles.selectedMutedText,
              ]}
            >
              {date.short_day_label}
            </Text>

            <Text
              style={[
                styles.day,

                selected &&
                  styles.selectedText,
              ]}
            >
              {dateParts.day}
            </Text>

            <Text
              style={[
                styles.month,

                selected &&
                  styles.selectedMutedText,
              ]}
            >
              {dateParts.month}
            </Text>

            <View
              style={[
                styles.statusBadge,

                selected &&
                  styles.statusBadgeSelected,

                unavailable &&
                  styles.statusBadgeUnavailable,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.statusText,

                  selected &&
                    styles.statusTextSelected,

                  unavailable &&
                    styles.statusTextUnavailable,
                ]}
              >
                {date.is_available
                  ? getSlotCountLabel(
                      date.available_slot_count,
                    )
                  : getUnavailableLabel(date)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
    paddingBottom: 2,
  },

  dateCard: {
    width: 94,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  dateCardSelected: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
  },

  dateCardUnavailable: {
    opacity: 0.48,
    backgroundColor: COLORS.surfaceSoft,
  },

  weekday: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  day: {
    marginTop: 4,
    color: COLORS.navy,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
  },

  month: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  statusBadge: {
    minHeight: 24,
    marginTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.greenSoft,
  },

  statusBadgeSelected: {
    backgroundColor: COLORS.navyMuted,
  },

  statusBadgeUnavailable: {
    backgroundColor: COLORS.accentSoft,
  },

  statusText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
  },

  statusTextSelected: {
    color: COLORS.white,
  },

  statusTextUnavailable: {
    color: COLORS.textLight,
  },

  selectedText: {
    color: COLORS.white,
  },

  selectedMutedText: {
    color: '#D4DAE1',
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