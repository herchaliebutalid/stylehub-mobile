import {
  Ionicons,
} from '@expo/vector-icons';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  COLORS,
} from '@/src/constants/colors';

import type {
  CustomerShop,
  ShopAvailabilityStatus,
} from '@/src/types/customer';

interface CustomerShopCardProps {
  shop: CustomerShop;

  onPress?: () => void;
}

function getAvailabilityColors(
  status: ShopAvailabilityStatus,
): {
  backgroundColor: string;
  textColor: string;
} {
  switch (status) {
    case 'open':
      return {
        backgroundColor:
          '#EAF6EE',

        textColor:
          COLORS.success,
      };

    case 'accepting_walk_ins':
      return {
        backgroundColor:
          '#EEF5E7',

        textColor:
          '#587137',
      };

    case 'fully_booked':
      return {
        backgroundColor:
          '#FFF3E3',

        textColor:
          COLORS.warning,
      };

    case 'closed':
    default:
      return {
        backgroundColor:
          '#F2EFED',

        textColor:
          COLORS.textMuted,
      };
  }
}

export default function CustomerShopCard({
  shop,
  onPress,
}: CustomerShopCardProps) {
  const availabilityColors =
    getAvailabilityColors(
      shop.availability.status,
    );

  return (
    <TouchableOpacity
      activeOpacity={
        onPress
          ? 0.82
          : 1
      }
      disabled={
        !onPress
      }
      onPress={
        onPress
      }
      style={
        styles.card
      }
    >
      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.iconContainer
          }
        >
          <Ionicons
            name={
              shop.type ===
              'barber_shop'
                ? 'cut-outline'
                : 'sparkles-outline'
            }
            size={24}
            color={
              COLORS.primary
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
              styles.name
            }
            numberOfLines={1}
          >
            {shop.name}
          </Text>

          <Text
            style={
              styles.type
            }
          >
            {shop.type_label}
          </Text>
        </View>

        <View
          style={[
            styles.availabilityBadge,

            {
              backgroundColor:
                availabilityColors.backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.availabilityText,

              {
                color:
                  availabilityColors.textColor,
              },
            ]}
          >
            {shop.availability.status_label}
          </Text>
        </View>
      </View>

      {shop.description ? (
        <Text
          style={
            styles.description
          }
          numberOfLines={2}
        >
          {shop.description}
        </Text>
      ) : null}

      <View
        style={
          styles.locationRow
        }
      >
        <Ionicons
          name="location-outline"
          size={15}
          color={
            COLORS.textMuted
          }
        />

        <Text
          style={
            styles.location
          }
          numberOfLines={2}
        >
          {shop.address}, {shop.city}, {shop.province}
        </Text>
      </View>

      <View
        style={
          styles.divider
        }
      />

      <View
        style={
          styles.footer
        }
      >
        <View
          style={
            styles.infoItem
          }
        >
          <Ionicons
            name="star"
            size={15}
            color={
              COLORS.warning
            }
          />

          <Text
            style={
              styles.infoValue
            }
          >
            {shop.rating.average === null
              ? 'New'
              : shop.rating.average.toFixed(1)}
          </Text>

          <Text
            style={
              styles.infoMuted
            }
          >
            ({shop.rating.review_count})
          </Text>
        </View>

        <View
          style={
            styles.infoItem
          }
        >
          <Ionicons
            name="list-outline"
            size={15}
            color={
              COLORS.textMuted
            }
          />

          <Text
            style={
              styles.infoValue
            }
          >
            {shop.active_services_count ?? 0}
          </Text>

          <Text
            style={
              styles.infoMuted
            }
          >
            services
          </Text>
        </View>

        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={17}
            color={
              COLORS.textLight
            }
            style={
              styles.chevron
            }
          />
        ) : shop.availability.accepts_appointments ? (
          <View
            style={
              styles.bookable
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={
                COLORS.success
              }
            />

            <Text
              style={
                styles.bookableText
              }
            >
              Bookable
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    card: {
      marginBottom:
        14,

      padding:
        17,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        20,

      backgroundColor:
        COLORS.surface,
    },

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    iconContainer: {
      width:
        48,

      height:
        48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        15,

      backgroundColor:
        COLORS.accentSoft,
    },

    headerContent: {
      flex:
        1,

      marginHorizontal:
        12,
    },

    name: {
      color:
        COLORS.text,

      fontSize:
        15,

      fontWeight:
        '700',
    },

    type: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        9,
    },

    availabilityBadge: {
      maxWidth:
        105,

      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        20,
    },

    availabilityText: {
      fontSize:
        8,

      fontWeight:
        '700',

      textAlign:
        'center',
    },

    description: {
      marginTop:
        14,

      color:
        COLORS.textMuted,

      fontSize:
        10,

      lineHeight:
        16,
    },

    locationRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        6,

      marginTop:
        12,
    },

    location: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        9,

      lineHeight:
        14,
    },

    divider: {
      height:
        1,

      marginVertical:
        14,

      backgroundColor:
        COLORS.border,
    },

    footer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        15,
    },

    infoItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    infoValue: {
      color:
        COLORS.text,

      fontSize:
        10,

      fontWeight:
        '700',
    },

    infoMuted: {
      color:
        COLORS.textLight,

      fontSize:
        8,
    },

    chevron: {
      marginLeft:
        'auto',
    },

    bookable: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,

      marginLeft:
        'auto',
    },

    bookableText: {
      color:
        COLORS.success,

      fontSize:
        8,

      fontWeight:
        '700',
    },
  });