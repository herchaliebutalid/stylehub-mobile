import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

import type {
    CustomerShopSchedule,
} from '@/src/types/customer';

interface CustomerScheduleCardProps {
  schedule: CustomerShopSchedule[];
}

function formatTime(
  time: string | null,
): string {
  if (
    !time
  ) {
    return '—';
  }

  const parts =
    time.split(':');

  if (
    parts.length < 2
  ) {
    return time;
  }

  const hour =
    Number(
      parts[0],
    );

  const minute =
    parts[1];

  if (
    Number.isNaN(
      hour,
    )
  ) {
    return time;
  }

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  const twelveHour =
    hour % 12 === 0
      ? 12
      : hour % 12;

  return `${twelveHour}:${minute} ${suffix}`;
}

export default function CustomerScheduleCard({
  schedule,
}: CustomerScheduleCardProps) {
  return (
    <View
      style={
        styles.card
      }
    >
      {schedule.map(
        (
          day,
          index,
        ) => (
          <View
            key={
              day.day_of_week
            }
            style={[
              styles.row,

              index !==
                schedule.length -
                  1 &&
                styles.rowBorder,
            ]}
          >
            <Text
              style={
                styles.day
              }
            >
              {day.day_label}
            </Text>

            <Text
              style={[
                styles.hours,

                !day.is_open &&
                  styles.closed,
              ]}
            >
              {day.is_open
                ? `${formatTime(day.opens_at)} – ${formatTime(day.closes_at)}`
                : 'Closed'}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        18,

      backgroundColor:
        COLORS.surface,
    },

    row: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        16,

      paddingVertical:
        13,
    },

    rowBorder: {
      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    day: {
      color:
        COLORS.text,

      fontSize:
        10,

      fontWeight:
        '600',
    },

    hours: {
      color:
        COLORS.success,

      fontSize:
        9,

      fontWeight:
        '600',
    },

    closed: {
      color:
        COLORS.textLight,
    },
  });