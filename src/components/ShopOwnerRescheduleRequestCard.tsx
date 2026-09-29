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
  ShopOwnerRescheduleRequest,
  ShopOwnerRescheduleRequestStatus,
} from '@/src/types/shop-owner';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

interface Props {
  request:
    ShopOwnerRescheduleRequest;

  onPress:
    () => void;
}


/* ==========================================================================
   DATE
   ========================================================================== */

function formatDate(
  value: string,
): string {
  const parts =
    value
      .split('-')
      .map(
        Number,
      );

  if (
    parts.length !==
      3
    ||
    parts.some(
      (
        part,
      ) =>
        Number.isNaN(
          part,
        ),
    )
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] =
    parts;

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return date.toLocaleDateString(
    'en-PH',
    {
      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',
    },
  );
}


/* ==========================================================================
   TIME
   ========================================================================== */

function formatTime(
  value: string,
): string {
  const match =
    value.match(
      /^([0-2]?\d):(\d{2})/,
    );

  if (
    !match
  ) {
    return value;
  }

  const hour24 =
    Number(
      match[1],
    );

  const minute =
    match[2];

  if (
    !Number.isInteger(
      hour24,
    )
    ||
    hour24 <
      0
    ||
    hour24 >
      23
  ) {
    return value;
  }

  const suffix =
    hour24 >=
    12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 %
      12
    ||
    12;

  return `${hour12}:${minute} ${suffix}`;
}


/* ==========================================================================
   STATUS
   ========================================================================== */

function getStatusPresentation(
  status:
    ShopOwnerRescheduleRequestStatus,
): {
  background:
    string;

  text:
    string;

  icon:
    IconName;
} {
  switch (
    status
  ) {
    case 'pending':
      return {
        background:
          COLORS.warningSoft,

        text:
          COLORS.warning,

        icon:
          'time-outline',
      };

    case 'approved':
      return {
        background:
          COLORS.greenSoft,

        text:
          COLORS.green,

        icon:
          'checkmark-circle-outline',
      };

    case 'rejected':
      return {
        background:
          COLORS.dangerSoft,

        text:
          COLORS.danger,

        icon:
          'close-circle-outline',
      };

    case 'withdrawn':
      return {
        background:
          COLORS.surfaceSoft,

        text:
          COLORS.textMuted,

        icon:
          'return-up-back-outline',
      };
  }
}


/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function ShopOwnerRescheduleRequestCard({
  request,
  onPress,
}: Props) {
  const status =
    getStatusPresentation(
      request.status,
    );

  const appointment =
    request.appointment;

  const customerName =
    appointment
      ?.customer
      ?.full_name
      ?.trim()
    ||
    'Customer';

  const customerInitial =
    customerName
      .charAt(
        0,
      )
      .toUpperCase();

  const serviceName =
    appointment
      ?.service_snapshot
      .name
    ||
    'Appointment reschedule';

  const currentDate =
    appointment
      ?.appointment_date
      ? formatDate(
          appointment.appointment_date,
        )
      : 'Original date unavailable';

  const currentTime =
    appointment
      ? `${formatTime(
          appointment.starts_at,
        )} – ${formatTime(
          appointment.ends_at,
        )}`
      : 'Original time unavailable';

  const requestedDate =
    formatDate(
      request.requested_date,
    );

  const requestedTime =
    `${formatTime(
      request.requested_starts_at,
    )} – ${formatTime(
      request.requested_ends_at,
    )}`;

  return (
    <TouchableOpacity
      activeOpacity={
        0.82
      }
      accessibilityRole="button"
      accessibilityLabel={
        `Open reschedule request for ${customerName}`
      }
      onPress={
        onPress
      }
      style={
        styles.card
      }
    >

      {/* ================================================================
          SERVICE + STATUS
          ================================================================ */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.serviceIcon
          }
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={
              21
            }
            color={
              COLORS.navy
            }
          />
        </View>

        <View
          style={
            styles.headerContent
          }
        >
          <Text
            style={
              styles.serviceName
            }
            numberOfLines={
              1
            }
          >
            {serviceName}
          </Text>

          <Text
            style={
              styles.requestReference
            }
          >
            Request #{request.id}
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
            name={
              status.icon
            }
            size={
              13
            }
            color={
              status.text
            }
          />

          <Text
            style={[
              styles.statusText,

              {
                color:
                  status.text,
              },
            ]}
          >
            {
              request
                .status_label
            }
          </Text>
        </View>
      </View>


      {/* ================================================================
          CUSTOMER
          ================================================================ */}

      <View
        style={
          styles.customerRow
        }
      >
        <View
          style={
            styles.customerAvatar
          }
        >
          <Text
            style={
              styles.customerInitial
            }
          >
            {customerInitial}
          </Text>
        </View>

        <View
          style={
            styles.customerContent
          }
        >
          <Text
            style={
              styles.customerLabel
            }
          >
            Customer
          </Text>

          <Text
            style={
              styles.customerName
            }
            numberOfLines={
              1
            }
          >
            {customerName}
          </Text>
        </View>
      </View>


      {/* ================================================================
          CURRENT VS REQUESTED
          ================================================================ */}

      <View
        style={
          styles.scheduleComparison
        }
      >

        {/* CURRENT */}

        <View
          style={
            styles.scheduleBlock
          }
        >
          <View
            style={
              styles.scheduleHeadingRow
            }
          >
            <View
              style={
                styles.currentScheduleIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={
                  16
                }
                color={
                  COLORS.textMuted
                }
              />
            </View>

            <Text
              style={
                styles.scheduleHeading
              }
            >
              Current
            </Text>
          </View>

          <Text
            style={
              styles.currentDate
            }
          >
            {currentDate}
          </Text>

          <Text
            style={
              styles.currentTime
            }
          >
            {currentTime}
          </Text>
        </View>


        {/* ARROW */}

        <View
          style={
            styles.changeArrow
          }
        >
          <Ionicons
            name="arrow-forward"
            size={
              17
            }
            color={
              COLORS.navy
            }
          />
        </View>


        {/* REQUESTED */}

        <View
          style={
            styles.scheduleBlock
          }
        >
          <View
            style={
              styles.scheduleHeadingRow
            }
          >
            <View
              style={
                styles.requestedScheduleIcon
              }
            >
              <Ionicons
                name="calendar-clear-outline"
                size={
                  16
                }
                color={
                  COLORS.navy
                }
              />
            </View>

            <Text
              style={
                styles.requestedHeading
              }
            >
              Requested
            </Text>
          </View>

          <Text
            style={
              styles.requestedDate
            }
          >
            {requestedDate}
          </Text>

          <Text
            style={
              styles.requestedTime
            }
          >
            {requestedTime}
          </Text>
        </View>
      </View>


      {/* ================================================================
          CUSTOMER REASON
          ================================================================ */}

      {request.customer_reason ? (
        <View
          style={
            styles.reasonBox
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={
              17
            }
            color={
              COLORS.textMuted
            }
          />

          <View
            style={
              styles.reasonContent
            }
          >
            <Text
              style={
                styles.reasonLabel
              }
            >
              Customer reason
            </Text>

            <Text
              style={
                styles.reasonText
              }
              numberOfLines={
                2
              }
            >
              {
                request
                  .customer_reason
              }
            </Text>
          </View>
        </View>
      ) : null}


      {/* ================================================================
          FOOTER
          ================================================================ */}

      <View
        style={
          styles.footer
        }
      >
        <Text
          style={
            styles.footerHint
          }
        >
          {request.status ===
          'pending'
            ? 'Review the requested schedule before deciding.'
            : 'Open to view the full request history.'}
        </Text>

        <View
          style={
            styles.reviewAction
          }
        >
          <Text
            style={
              styles.reviewActionText
            }
          >
            {request.status ===
            'pending'
              ? 'Review'
              : 'View'}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={
              17
            }
            color={
              COLORS.navy
            }
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    card: {
      padding:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,

      ...SHADOWS.card,
    },

    /* ======================================================================
       HEADER
       ====================================================================== */

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    serviceIcon: {
      width:
        44,

      height:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        COLORS.accentSoft,
    },

    headerContent: {
      flex:
        1,

      minWidth:
        0,
    },

    serviceName: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    requestReference: {
      marginTop:
        3,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    statusBadge: {
      minHeight:
        29,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,

      paddingHorizontal:
        9,

      borderRadius:
        RADII.pill,
    },

    statusText: {
      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    /* ======================================================================
       CUSTOMER
       ====================================================================== */

    customerRow: {
      marginTop:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,
    },

    customerAvatar: {
      width:
        38,

      height:
        38,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.primary,
    },

    customerInitial: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    customerContent: {
      flex:
        1,

      minWidth:
        0,
    },

    customerLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    customerName: {
      marginTop:
        2,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '700',
    },

    /* ======================================================================
       SCHEDULE COMPARISON
       ====================================================================== */

    scheduleComparison: {
      marginTop:
        15,

      flexDirection:
        'row',

      alignItems:
        'stretch',

      padding:
        12,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    scheduleBlock: {
      flex:
        1,

      minWidth:
        0,
    },

    scheduleHeadingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    currentScheduleIcon: {
      width:
        28,

      height:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        9,

      backgroundColor:
        COLORS.surface,
    },

    requestedScheduleIcon: {
      width:
        28,

      height:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        9,

      backgroundColor:
        COLORS.accentSoft,
    },

    scheduleHeading: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    requestedHeading: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    currentDate: {
      marginTop:
        9,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '700',
    },

    currentTime: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        15,
    },

    requestedDate: {
      marginTop:
        9,

      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '800',
    },

    requestedTime: {
      marginTop:
        3,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        15,

      fontWeight:
        '700',
    },

    changeArrow: {
      width:
        32,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    /* ======================================================================
       REASON
       ====================================================================== */

    reasonBox: {
      marginTop:
        13,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      padding:
        12,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surface,
    },

    reasonContent: {
      flex:
        1,
    },

    reasonLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '700',
    },

    reasonText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    /* ======================================================================
       FOOTER
       ====================================================================== */

    footer: {
      marginTop:
        14,

      paddingTop:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,
    },

    footerHint: {
      flex:
        1,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        15,
    },

    reviewAction: {
      minHeight:
        36,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,
    },

    reviewActionText: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '800',
    },
  });