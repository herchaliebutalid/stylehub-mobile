import { Ionicons } from '@expo/vector-icons';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  COLORS,
} from '@/src/constants/colors';

import {
  RADII,
  SHADOWS,
  TYPOGRAPHY,
} from '@/src/constants/design';

import type {
  ShopOwnerAppointment,
  ShopOwnerAppointmentStatus,
} from '@/src/types/shop-owner';


/* ==========================================================================
   PROPS
   ========================================================================== */

interface ShopOwnerAppointmentCardProps {
  appointment:
    ShopOwnerAppointment;

  onPress:
    () => void;
}


/* ==========================================================================
   FORMAT PRICE
   ========================================================================== */

function formatPrice(
  value:
    | string
    | number,
): string {
  const numericValue =
    Number(
      value,
    );


  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(
      value,
    );
  }


  return `₱${numericValue.toFixed(2)}`;
}


/* ==========================================================================
   FORMAT DATE
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
    undefined,
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
   FORMAT TIME
   ========================================================================== */

function formatTime(
  value: string,
): string {
  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/,
    );


  if (
    !match
  ) {
    return value;
  }


  const rawHour =
    Number(
      match[1],
    );


  const minute =
    match[2];


  if (
    Number.isNaN(
      rawHour,
    )
    ||
    rawHour <
      0
    ||
    rawHour >
      23
  ) {
    return value;
  }


  const period =
    rawHour >=
    12
      ? 'PM'
      : 'AM';


  const hour =
    rawHour %
      12
    ||
    12;


  return `${hour}:${minute} ${period}`;
}


/* ==========================================================================
   STATUS STYLE
   ========================================================================== */

function getStatusStyle(
  status:
    ShopOwnerAppointmentStatus,
) {
  switch (
    status
  ) {
    case 'pending':
      return {
        background:
          COLORS.warningSoft,

        text:
          COLORS.warning,

        dot:
          COLORS.warning,
      };


    case 'confirmed':
      return {
        background:
          COLORS.blueSoft,

        text:
          COLORS.blue,

        dot:
          COLORS.blue,
      };


    case 'completed':
      return {
        background:
          COLORS.successSoft,

        text:
          COLORS.success,

        dot:
          COLORS.success,
      };


    case 'no_show':
      return {
        background:
          COLORS.orangeSoft,

        text:
          COLORS.orange,

        dot:
          COLORS.orange,
      };


    case 'cancelled':
    case 'declined':
      return {
        background:
          COLORS.dangerSoft,

        text:
          COLORS.danger,

        dot:
          COLORS.danger,
      };
  }
}


/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function ShopOwnerAppointmentCard({
  appointment,
  onPress,
}: ShopOwnerAppointmentCardProps) {
  const status =
    getStatusStyle(
      appointment.status,
    );


  const customerName =
    appointment
      .customer
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


  return (
    <TouchableOpacity
      activeOpacity={
        0.82
      }
      accessibilityRole="button"
      accessibilityLabel={
        `Open ${appointment.service_snapshot.name} appointment for ${customerName}`
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
          styles.topRow
        }
      >
        <View
          style={
            styles.serviceBlock
          }
        >
          <View
            style={
              styles.serviceIcon
            }
          >
            <Ionicons
              name="cut-outline"
              size={
                20
              }
              color={
                COLORS.navy
              }
            />
          </View>


          <View
            style={
              styles.serviceTextBlock
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
              {
                appointment
                  .service_snapshot
                  .name
              }
            </Text>


            <Text
              style={
                styles.bookingReference
              }
            >
              Booking #{appointment.id}
            </Text>
          </View>
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
          <View
            style={[
              styles.statusDot,

              {
                backgroundColor:
                  status.dot,
              },
            ]}
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
              appointment
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
          DATE + TIME
          ================================================================ */}

      <View
        style={
          styles.scheduleCard
        }
      >
        <View
          style={
            styles.scheduleItem
          }
        >
          <Ionicons
            name="calendar-clear-outline"
            size={
              17
            }
            color={
              COLORS.textMuted
            }
          />


          <View
            style={
              styles.scheduleTextBlock
            }
          >
            <Text
              style={
                styles.scheduleLabel
              }
            >
              Date
            </Text>


            <Text
              style={
                styles.scheduleValue
              }
              numberOfLines={
                1
              }
            >
              {formatDate(
                appointment
                  .appointment_date,
              )}
            </Text>
          </View>
        </View>


        <View
          style={
            styles.scheduleDivider
          }
        />


        <View
          style={
            styles.scheduleItem
          }
        >
          <Ionicons
            name="time-outline"
            size={
              17
            }
            color={
              COLORS.textMuted
            }
          />


          <View
            style={
              styles.scheduleTextBlock
            }
          >
            <Text
              style={
                styles.scheduleLabel
              }
            >
              Time
            </Text>


            <Text
              style={
                styles.scheduleValue
              }
              numberOfLines={
                1
              }
            >
              {formatTime(
                appointment
                  .starts_at,
              )}
              {' – '}
              {formatTime(
                appointment
                  .ends_at,
              )}
            </Text>
          </View>
        </View>
      </View>


      {/* ================================================================
          FOOTER
          ================================================================ */}

      <View
        style={
          styles.footer
        }
      >
        <View
          style={
            styles.metaRow
          }
        >
          <View
            style={
              styles.metaItem
            }
          >
            <Text
              style={
                styles.metaLabel
              }
            >
              Price
            </Text>


            <Text
              style={
                styles.price
              }
            >
              {formatPrice(
                appointment
                  .service_snapshot
                  .price,
              )}
            </Text>
          </View>


          <View
            style={
              styles.metaDivider
            }
          />


          <View
            style={
              styles.metaItem
            }
          >
            <Text
              style={
                styles.metaLabel
              }
            >
              Duration
            </Text>


            <Text
              style={
                styles.metaValue
              }
            >
              {
                appointment
                  .service_snapshot
                  .duration_minutes
              } min
            </Text>
          </View>
        </View>


        <View
          style={
            styles.viewAction
          }
        >
          <Text
            style={
              styles.viewActionText
            }
          >
            View details
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
       SERVICE
       ====================================================================== */

    topRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        10,
    },


    serviceBlock: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },


    serviceIcon: {
      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        COLORS.accentSoft,
    },


    serviceTextBlock: {
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


    bookingReference: {
      marginTop:
        3,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },


    /* ======================================================================
       STATUS
       ====================================================================== */

    statusBadge: {
      minHeight:
        28,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      paddingHorizontal:
        9,

      borderRadius:
        RADII.pill,
    },


    statusDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
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
        16,

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
       SCHEDULE
       ====================================================================== */

    scheduleCard: {
      marginTop:
        15,

      flexDirection:
        'row',

      alignItems:
        'stretch',

      padding:
        12,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    scheduleItem: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,
    },


    scheduleTextBlock: {
      flex:
        1,

      minWidth:
        0,
    },


    scheduleLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },


    scheduleValue: {
      marginTop:
        2,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '700',
    },


    scheduleDivider: {
      width:
        1,

      marginHorizontal:
        10,

      backgroundColor:
        COLORS.border,
    },


    /* ======================================================================
       FOOTER
       ====================================================================== */

    footer: {
      marginTop:
        15,

      paddingTop:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        12,

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,
    },


    metaRow: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    metaItem: {
      minWidth:
        64,
    },


    metaDivider: {
      width:
        1,

      height:
        28,

      marginHorizontal:
        12,

      backgroundColor:
        COLORS.border,
    },


    metaLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },


    price: {
      marginTop:
        2,

      color:
        COLORS.primary,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },


    metaValue: {
      marginTop:
        2,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',
    },


    viewAction: {
      minHeight:
        40,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,
    },


    viewActionText: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '800',
    },
  });