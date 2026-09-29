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
  ShopOwnerPromo,
} from '@/src/types/shop-owner';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

interface Props {
  promo:
    ShopOwnerPromo;

  onPress:
    () => void;
}


/* ==========================================================================
   DISCOUNT
   ========================================================================== */

function formatDiscount(
  promo:
    ShopOwnerPromo,
): string {
  const value =
    Number(
      promo.discount.value,
    );

  const normalized =
    Number.isNaN(
      value,
    )
      ? String(
          promo.discount.value,
        )
      : value.toFixed(
          2,
        );

  return promo.discount.type ===
    'percentage'
    ? `${normalized}% OFF`
    : `₱${normalized} OFF`;
}


/* ==========================================================================
   DATE
   ========================================================================== */

function formatDate(
  value:
    string
    | null,
): string {
  if (!value) {
    return 'No date';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        timeZone:
          'Asia/Manila',

        month:
          'short',

        day:
          'numeric',

        year:
          'numeric',

        hour:
          'numeric',

        minute:
          '2-digit',
      },
    ).format(
      date,
    );
  } catch {
    return value;
  }
}


/* ==========================================================================
   PROMOTION STATUS
   ========================================================================== */

function getPromoState(
  promo:
    ShopOwnerPromo,
): {
  label:
    string;

  background:
    string;

  text:
    string;

  icon:
    IconName;
} {
  if (
    !promo.is_active
  ) {
    return {
      label:
        'Disabled',

      background:
        COLORS.surfaceSoft,

      text:
        COLORS.textMuted,

      icon:
        'eye-off-outline',
    };
  }

  if (
    promo.is_currently_active
  ) {
    return {
      label:
        'Live',

      background:
        COLORS.greenSoft,

      text:
        COLORS.green,

      icon:
        'radio-outline',
    };
  }

  if (
    promo.is_upcoming
  ) {
    return {
      label:
        'Upcoming',

      background:
        COLORS.warningSoft,

      text:
        COLORS.warning,

      icon:
        'time-outline',
    };
  }

  if (
    promo.has_ended
  ) {
    return {
      label:
        'Ended',

      background:
        COLORS.dangerSoft,

      text:
        COLORS.danger,

      icon:
        'flag-outline',
    };
  }

  return {
    label:
      'Scheduled',

    background:
      COLORS.blueSoft,

    text:
      COLORS.blue,

    icon:
      'calendar-outline',
  };
}


/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function ShopOwnerPromoCard({
  promo,
  onPress,
}: Props) {
  const state =
    getPromoState(
      promo,
    );

  const scopeLabel =
    promo.scope ===
    'shop_wide'
      ? 'Shop-wide promotion'
      : promo.service?.name
        ??
        'Service-specific promotion';

  const scopeIcon:
    IconName =
    promo.scope ===
    'shop_wide'
      ? 'storefront-outline'
      : 'cut-outline';

  return (
    <TouchableOpacity
      activeOpacity={
        0.82
      }
      accessibilityRole="button"
      accessibilityLabel={
        `Manage ${promo.title}`
      }
      onPress={
        onPress
      }
      style={
        styles.card
      }
    >

      {/* ================================================================
          HEADER
          ================================================================ */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.icon
          }
        >
          <Ionicons
            name="pricetag-outline"
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
            numberOfLines={
              1
            }
            style={
              styles.title
            }
          >
            {promo.title}
          </Text>

          <View
            style={
              styles.scopeRow
            }
          >
            <Ionicons
              name={
                scopeIcon
              }
              size={
                13
              }
              color={
                COLORS.textMuted
              }
            />

            <Text
              numberOfLines={
                1
              }
              style={
                styles.scopeText
              }
            >
              {scopeLabel}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,

            {
              backgroundColor:
                state.background,
            },
          ]}
        >
          <Ionicons
            name={
              state.icon
            }
            size={
              13
            }
            color={
              state.text
            }
          />

          <Text
            style={[
              styles.statusText,

              {
                color:
                  state.text,
              },
            ]}
          >
            {state.label}
          </Text>
        </View>
      </View>


      {/* ================================================================
          DISCOUNT
          ================================================================ */}

      <View
        style={
          styles.discountCard
        }
      >
        <View
          style={
            styles.discountCopy
          }
        >
          <Text
            style={
              styles.discountLabel
            }
          >
            CUSTOMER DISCOUNT
          </Text>

          <Text
            style={
              styles.discountValue
            }
          >
            {formatDiscount(
              promo,
            )}
          </Text>

          <Text
            style={
              styles.discountType
            }
          >
            {
              promo.discount
                .type_label
            }
          </Text>
        </View>

        <View
          style={
            styles.discountIcon
          }
        >
          <Ionicons
            name="sparkles-outline"
            size={
              23
            }
            color={
              COLORS.white
            }
          />
        </View>
      </View>


      {/* ================================================================
          DESCRIPTION
          ================================================================ */}

      {promo.description ? (
        <Text
          style={
            styles.description
          }
          numberOfLines={
            2
          }
        >
          {promo.description}
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
          VALIDITY PERIOD
          ================================================================ */}

      <View
        style={
          styles.periodCard
        }
      >
        <View
          style={
            styles.periodItem
          }
        >
          <View
            style={
              styles.periodIcon
            }
          >
            <Ionicons
              name="play-outline"
              size={
                15
              }
              color={
                COLORS.green
              }
            />
          </View>

          <View
            style={
              styles.periodContent
            }
          >
            <Text
              style={
                styles.periodLabel
              }
            >
              Starts
            </Text>

            <Text
              style={
                styles.periodValue
              }
            >
              {formatDate(
                promo.starts_at,
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.periodDivider
          }
        />

        <View
          style={
            styles.periodItem
          }
        >
          <View
            style={
              styles.periodIcon
            }
          >
            <Ionicons
              name="stop-outline"
              size={
                15
              }
              color={
                COLORS.danger
              }
            />
          </View>

          <View
            style={
              styles.periodContent
            }
          >
            <Text
              style={
                styles.periodLabel
              }
            >
              Ends
            </Text>

            <Text
              style={
                styles.periodValue
              }
            >
              {formatDate(
                promo.ends_at,
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
        <Text
          style={
            styles.footerHint
          }
        >
          {promo.is_active
            ? 'Open to edit details, schedule, discount, or visibility.'
            : 'This promotion is currently hidden from customers.'}
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

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    icon: {
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

    title: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    scopeRow: {
      marginTop:
        4,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    scopeText: {
      flex:
        1,

      color:
        COLORS.textMuted,

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

    discountCard: {
      marginTop:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        12,

      padding:
        15,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.primary,
    },

    discountCopy: {
      flex:
        1,

      minWidth:
        0,
    },

    discountLabel: {
      color:
        '#AEB8C5',

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',

      letterSpacing:
        0.9,
    },

    discountValue: {
      marginTop:
        4,

      color:
        COLORS.white,

      fontSize:
        24,

      lineHeight:
        30,

      fontWeight:
        '800',

      letterSpacing:
        -0.4,
    },

    discountType: {
      marginTop:
        2,

      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.micro,
    },

    discountIcon: {
      width:
        45,

      height:
        45,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        15,

      backgroundColor:
        COLORS.navyMuted,
    },

    description: {
      marginTop:
        13,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,
    },

    noDescription: {
      marginTop:
        13,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.caption,

      fontStyle:
        'italic',
    },

    periodCard: {
      marginTop:
        14,

      padding:
        12,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    periodItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    periodIcon: {
      width:
        30,

      height:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.surface,
    },

    periodContent: {
      flex:
        1,

      minWidth:
        0,
    },

    periodLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    periodValue: {
      marginTop:
        2,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,

      fontWeight:
        '700',
    },

    periodDivider: {
      height:
        1,

      marginVertical:
        9,

      marginLeft:
        39,

      backgroundColor:
        COLORS.border,
    },

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