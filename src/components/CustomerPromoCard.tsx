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
    CustomerPromo,
} from '@/src/types/customer';

interface CustomerPromoCardProps {
  promo: CustomerPromo;
}

function formatDate(
  value: string | null,
): string {
  if (
    !value
  ) {
    return '—';
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

  return date.toLocaleDateString();
}

export default function CustomerPromoCard({
  promo,
}: CustomerPromoCardProps) {
  return (
    <View
      style={
        styles.card
      }
    >
      <View
        style={
          styles.icon
        }
      >
        <Ionicons
          name="pricetag-outline"
          size={21}
          color={
            COLORS.warning
          }
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <Text
          style={
            styles.title
          }
        >
          {promo.title}
        </Text>

        <Text
          style={
            styles.discount
          }
        >
          {promo.discount.type_label}: {String(
            promo.discount.value,
          )}
        </Text>

        {promo.service ? (
          <Text
            style={
              styles.service
            }
          >
            For {promo.service.name}
          </Text>
        ) : (
          <Text
            style={
              styles.service
            }
          >
            Shop-wide promotion
          </Text>
        )}

        {promo.description ? (
          <Text
            style={
              styles.description
            }
          >
            {promo.description}
          </Text>
        ) : null}

        <Text
          style={
            styles.period
          }
        >
          {formatDate(
            promo.starts_at,
          )} – {formatDate(
            promo.ends_at,
          )}
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      flexDirection:
        'row',

      gap:
        12,

      marginBottom:
        12,

      padding:
        15,

      borderRadius:
        17,

      backgroundColor:
        '#FFF8E8',
    },

    icon: {
      width:
        40,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        '#FFF0C8',
    },

    content: {
      flex:
        1,
    },

    title: {
      color:
        COLORS.text,

      fontSize:
        12,

      fontWeight:
        '700',
    },

    discount: {
      marginTop:
        4,

      color:
        COLORS.warning,

      fontSize:
        10,

      fontWeight:
        '700',
    },

    service: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        8,
    },

    description: {
      marginTop:
        7,

      color:
        COLORS.textMuted,

      fontSize:
        9,

      lineHeight:
        14,
    },

    period: {
      marginTop:
        8,

      color:
        COLORS.textLight,

      fontSize:
        8,
    },
  });