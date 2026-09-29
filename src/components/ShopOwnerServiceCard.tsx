import { Ionicons } from '@expo/vector-icons';

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
  ShopOwnerService,
} from '@/src/types/shop-owner';


/* ==========================================================================
   PROPS
   ========================================================================== */

interface ShopOwnerServiceCardProps {
  service:
    ShopOwnerService;

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
   COMPONENT
   ========================================================================== */

export default function ShopOwnerServiceCard({
  service,
  onPress,
}: ShopOwnerServiceCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.82
      }
      accessibilityRole="button"
      accessibilityLabel={
        `Manage ${service.name}`
      }
      onPress={
        onPress
      }
      style={[
        styles.card,

        !service.is_active
        &&
          styles.cardInactive,
      ]}
    >

      {/* ================================================================
          TITLE
          ================================================================ */}

      <View
        style={
          styles.topRow
        }
      >
        <View
          style={[
            styles.serviceIcon,

            !service.is_active
            &&
              styles.serviceIconInactive,
          ]}
        >
          <Ionicons
            name="cut-outline"
            size={
              21
            }
            color={
              service.is_active
                ? COLORS.navy
                : COLORS.textMuted
            }
          />
        </View>

        <View
          style={
            styles.serviceIdentity
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={
              styles.serviceName
            }
          >
            {service.name}
          </Text>

          <View
            style={
              styles.durationRow
            }
          >
            <Ionicons
              name="time-outline"
              size={
                14
              }
              color={
                COLORS.textMuted
              }
            />

            <Text
              style={
                styles.durationText
              }
            >
              {
                service.duration_minutes
              } min
            </Text>
          </View>
        </View>

        {/* STATUS */}

        <View
          style={[
            styles.statusBadge,

            service.is_active
              ? styles.activeBadge
              : styles.inactiveBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,

              service.is_active
                ? styles.activeDot
                : styles.inactiveDot,
            ]}
          />

          <Text
            style={[
              styles.statusText,

              service.is_active
                ? styles.activeText
                : styles.inactiveText,
            ]}
          >
            {service.is_active
              ? 'Active'
              : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* ================================================================
          DESCRIPTION
          ================================================================ */}

      {service.description ? (
        <Text
          numberOfLines={
            2
          }
          style={
            styles.description
          }
        >
          {service.description}
        </Text>
      ) : (
        <Text
          style={
            styles.noDescription
          }
        >
          No description added.
        </Text>
      )}

      {/* ================================================================
          PRICE / BOOKING STATUS
          ================================================================ */}

      <View
        style={
          styles.infoPanel
        }
      >
        <View
          style={
            styles.infoItem
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Price
          </Text>

          <Text
            style={
              styles.priceValue
            }
          >
            {formatPrice(
              service.price,
            )}
          </Text>
        </View>

        <View
          style={
            styles.infoDivider
          }
        />

        <View
          style={
            styles.infoItem
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Booking status
          </Text>

          <Text
            style={[
              styles.infoValue,

              service.is_active
                ? styles.bookableText
                : styles.notBookableText,
            ]}
          >
            {service.is_active
              ? 'Bookable'
              : 'Hidden from booking'}
          </Text>
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
        <Text
          style={
            styles.footerHint
          }
        >
          Tap to edit details, photo, price, or availability
        </Text>

        <View
          style={
            styles.manageAction
          }
        >
          <Text
            style={
              styles.manageText
            }
          >
            Manage
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

    cardInactive: {
      backgroundColor:
        COLORS.surfaceSoft,
    },

    /* ======================================================================
       HEADER
       ====================================================================== */

    topRow: {
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

    serviceIconInactive: {
      backgroundColor:
        COLORS.border,
    },

    serviceIdentity: {
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

    durationRow: {
      marginTop:
        4,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    durationText: {
      color:
        COLORS.textMuted,

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
        29,

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

    activeBadge: {
      backgroundColor:
        COLORS.greenSoft,
    },

    inactiveBadge: {
      backgroundColor:
        COLORS.border,
    },

    statusDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
    },

    activeDot: {
      backgroundColor:
        COLORS.green,
    },

    inactiveDot: {
      backgroundColor:
        COLORS.textMuted,
    },

    statusText: {
      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    activeText: {
      color:
        COLORS.green,
    },

    inactiveText: {
      color:
        COLORS.textMuted,
    },

    /* ======================================================================
       DESCRIPTION
       ====================================================================== */

    description: {
      marginTop:
        14,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,
    },

    noDescription: {
      marginTop:
        14,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.caption,

      fontStyle:
        'italic',
    },

    /* ======================================================================
       SERVICE INFO
       ====================================================================== */

    infoPanel: {
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

    infoItem: {
      flex:
        1,

      minWidth:
        0,
    },

    infoDivider: {
      width:
        1,

      marginHorizontal:
        12,

      backgroundColor:
        COLORS.border,
    },

    infoLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    priceValue: {
      marginTop:
        3,

      color:
        COLORS.primary,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    infoValue: {
      marginTop:
        4,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,

      fontWeight:
        '700',
    },

    bookableText: {
      color:
        COLORS.green,
    },

    notBookableText: {
      color:
        COLORS.textMuted,
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

    manageAction: {
      minHeight:
        36,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,
    },

    manageText: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '800',
    },
  });