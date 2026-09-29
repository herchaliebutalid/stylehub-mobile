import {
    Ionicons,
} from '@expo/vector-icons';

import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

import type {
    ShopOwnerShop,
} from '@/src/types/shop-owner';

interface ShopOwnerDashboardCardProps {
  shop: ShopOwnerShop;
}

export default function ShopOwnerDashboardCard({
  shop,
}: ShopOwnerDashboardCardProps) {
  return (
    <>
      <View
        style={
          styles.approvedCard
        }
      >
        <View
          style={
            styles.approvedIcon
          }
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={30}
            color={
              COLORS.success
            }
          />
        </View>

        <View
          style={
            styles.approvedContent
          }
        >
          <Text
            style={
              styles.approvedLabel
            }
          >
            APPROVED SHOP
          </Text>

          <Text
            style={
              styles.shopName
            }
          >
            {shop.name}
          </Text>

          <Text
            style={
              styles.shopType
            }
          >
            {shop.type_label}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.locationCard
        }
      >
        <InfoRow
          icon="location-outline"
          label="Location"
          value={`${shop.address}, ${shop.city}, ${shop.province}`}
        />

        {shop.phone_number ? (
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={
              shop.phone_number
            }
          />
        ) : null}

        {shop.email ? (
          <InfoRow
            icon="mail-outline"
            label="Shop Email"
            value={
              shop.email
            }
          />
        ) : null}
      </View>

      <View
        style={
          styles.availabilityCard
        }
      >
        <View
          style={
            styles.availabilityHeader
          }
        >
          <View
            style={
              styles.availabilityIcon
            }
          >
            <Ionicons
              name="storefront-outline"
              size={21}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={
              styles.availabilityContent
            }
          >
            <Text
              style={
                styles.availabilityLabel
              }
            >
              Shop Availability
            </Text>

            <Text
              style={
                styles.availabilityValue
              }
            >
              {shop.availability_status_label}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.availabilityDescription
          }
        >
          Your shop has Administrator approval. Secure management tools
          for services, schedules, availability, appointments, reschedule
          requests, and promotions can now use the approved Shop Owner API.
        </Text>
      </View>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon:
    | 'location-outline'
    | 'call-outline'
    | 'mail-outline';

  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            COLORS.textMuted
          }
        />
      </View>

      <View
        style={
          styles.infoContent
        }
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.infoValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    approvedCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        22,

      padding:
        18,

      borderRadius:
        20,

      backgroundColor:
        COLORS.primary,
    },

    approvedIcon: {
      width:
        54,

      height:
        54,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        17,

      backgroundColor:
        '#EAF6EE',
    },

    approvedContent: {
      flex:
        1,

      marginLeft:
        13,
    },

    approvedLabel: {
      color:
        '#CFC2BB',

      fontSize:
        8,

      fontWeight:
        '700',

      letterSpacing:
        1,
    },

    shopName: {
      marginTop:
        5,

      color:
        COLORS.white,

      fontSize:
        17,

      fontWeight:
        '700',
    },

    shopType: {
      marginTop:
        3,

      color:
        '#D8CDC7',

      fontSize:
        9,
    },

    locationCard: {
      gap:
        14,

      marginTop:
        14,

      padding:
        17,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        18,

      backgroundColor:
        COLORS.surface,
    },

    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    infoIcon: {
      width:
        39,

      height:
        39,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    infoContent: {
      flex:
        1,

      marginLeft:
        10,
    },

    infoLabel: {
      color:
        COLORS.textLight,

      fontSize:
        8,
    },

    infoValue: {
      marginTop:
        3,

      color:
        COLORS.text,

      fontSize:
        9,

      fontWeight:
        '600',

      lineHeight:
        14,
    },

    availabilityCard: {
      marginTop:
        14,

      padding:
        17,

      borderRadius:
        18,

      backgroundColor:
        COLORS.accentSoft,
    },

    availabilityHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    availabilityIcon: {
      width:
        43,

      height:
        43,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        COLORS.surface,
    },

    availabilityContent: {
      marginLeft:
        11,
    },

    availabilityLabel: {
      color:
        COLORS.textMuted,

      fontSize:
        8,
    },

    availabilityValue: {
      marginTop:
        3,

      color:
        COLORS.primary,

      fontSize:
        12,

      fontWeight:
        '700',
    },

    availabilityDescription: {
      marginTop:
        13,

      color:
        COLORS.textMuted,

      fontSize:
        8,

      lineHeight:
        14,
    },
  });