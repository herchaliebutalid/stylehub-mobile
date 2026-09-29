import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import {
    RADII,
    SHADOWS,
    TYPOGRAPHY,
} from '@/src/constants/design';
import type {
    AppointmentStatus,
    CustomerAppointment,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

function formatDate(value: string): string {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (!match) {
    return value;
  }

  const date = new Date(
    `${value}T12:00:00+08:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

function formatTime(value: string): string {
  const match = value.match(
    /^(\d{1,2}):(\d{2})/,
  );

  if (!match) {
    return value;
  }

  const hour24 = Number(match[1]);
  const minute = match[2];

  if (
    Number.isNaN(hour24)
    || hour24 < 0
    || hour24 > 23
  ) {
    return value;
  }

  const suffix =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

function formatPrice(
  value: string | number | null,
): string {
  if (value === null) {
    return 'Price unavailable';
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return `\u20B1${numericValue.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function statusPresentation(
  status: AppointmentStatus,
): {
  icon: IconName;
  background: string;
  color: string;
  accent: string;
} {
  switch (status) {
    case 'confirmed':
      return {
        icon: 'checkmark-circle-outline',
        background: COLORS.greenSoft,
        color: COLORS.green,
        accent: COLORS.green,
      };

    case 'pending':
      return {
        icon: 'time-outline',
        background: COLORS.warningSoft,
        color: COLORS.warning,
        accent: COLORS.warning,
      };

    case 'completed':
      return {
        icon: 'checkmark-done-outline',
        background: COLORS.blueSoft,
        color: COLORS.blue,
        accent: COLORS.blue,
      };

    case 'cancelled':
      return {
        icon: 'close-circle-outline',
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        accent: COLORS.danger,
      };

    case 'declined':
    default:
      return {
        icon: 'remove-circle-outline',
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        accent: COLORS.danger,
      };
  }
}

export default function CustomerAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: CustomerAppointment;
  onPress: () => void;
}) {
  const status =
    statusPresentation(
      appointment.status,
    );

  const duration =
    appointment
      .service_snapshot
      .duration_minutes;

  const shopName =
    appointment.shop?.name
    ?? 'StyleHub Shop';

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Open ${appointment.service_snapshot.name} appointment at ${shopName}`}
      onPress={onPress}
      style={styles.card}
    >
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor:
              status.accent,
          },
        ]}
      />

      <View style={styles.header}>
        <View style={styles.shopIcon}>
          <Ionicons
            name={
              appointment.shop?.type
              === 'barber_shop'
                ? 'cut-outline'
                : 'sparkles-outline'
            }
            size={20}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.heading}>
          <Text
            numberOfLines={1}
            style={styles.shopName}
          >
            {shopName}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.shopType}
          >
            {appointment.shop?.type_label
              ?? 'Appointment'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <Ionicons
            name={status.icon}
            size={12}
            color={status.color}
          />

          <Text
            style={[
              styles.statusText,
              {
                color:
                  status.color,
              },
            ]}
          >
            {appointment.status_label}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={styles.serviceName}
      >
        {
          appointment
            .service_snapshot
            .name
        }
      </Text>

      <View style={styles.scheduleCard}>
        <View style={styles.scheduleIcon}>
          <Ionicons
            name="calendar-clear-outline"
            size={18}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.scheduleCopy}>
          <Text style={styles.scheduleLabel}>
            Appointment schedule
          </Text>

          <Text style={styles.scheduleDate}>
            {formatDate(
              appointment.appointment_date,
            )}
          </Text>

          <Text style={styles.scheduleTime}>
            {formatTime(
              appointment.starts_at,
            )}{' '}
            -{' '}
            {formatTime(
              appointment.ends_at,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons
            name="cash-outline"
            size={13}
            color={COLORS.textMuted}
          />

          <Text style={styles.metaValue}>
            {formatPrice(
              appointment
                .service_snapshot
                .price,
            )}
          </Text>
        </View>

        {duration !== null ? (
          <View style={styles.metaPill}>
            <Ionicons
              name="hourglass-outline"
              size={13}
              color={COLORS.textMuted}
            />

            <Text style={styles.metaValue}>
              {duration} min
            </Text>
          </View>
        ) : null}

        {appointment.notes?.trim() ? (
          <View style={styles.metaPill}>
            <Ionicons
              name="document-text-outline"
              size={13}
              color={COLORS.textMuted}
            />

            <Text style={styles.metaValue}>
              Notes added
            </Text>
          </View>
        ) : null}
      </View>

      {appointment.status === 'cancelled'
      && appointment.cancellation_reason?.trim()
        ? (
          <View style={styles.reasonCard}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.danger}
            />

            <View style={styles.reasonCopy}>
              <Text style={styles.reasonLabel}>
                Cancellation reason
              </Text>

              <Text
                numberOfLines={2}
                style={styles.reasonText}
              >
                {
                  appointment
                    .cancellation_reason
                }
              </Text>
            </View>
          </View>
        )
        : null}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {appointment.status === 'completed'
            ? 'Open details and review options'
            : appointment.status === 'pending'
              ? 'Open details and booking actions'
              : appointment.status === 'confirmed'
                ? 'Open details and schedule actions'
                : 'Open appointment details'}
        </Text>

        <View style={styles.footerAction}>
          <Text style={styles.footerActionText}>
            View details
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color={COLORS.navy}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  accentBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 2,
  },

  shopIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  heading: {
    flex: 1,
    minWidth: 0,
  },

  shopName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  statusBadge: {
    maxWidth: 112,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  statusText: {
    flexShrink: 1,
    fontSize: 8,
    fontWeight: '800',
  },

  serviceName: {
    marginTop: 14,
    paddingLeft: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    lineHeight: 22,
    fontWeight: '800',
  },

  scheduleCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  scheduleIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  scheduleCopy: {
    flex: 1,
    minWidth: 0,
  },

  scheduleLabel: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  scheduleDate: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  scheduleTime: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  metaRow: {
    marginTop: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  metaPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  metaValue: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  reasonCard: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  reasonCopy: {
    flex: 1,
  },

  reasonLabel: {
    color: COLORS.danger,
    fontSize: 9,
    fontWeight: '800',
  },

  reasonText: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
  },

  footer: {
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  footerHint: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
  },

  footerAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  footerActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },
});