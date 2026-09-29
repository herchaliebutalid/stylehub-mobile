import { Ionicons } from '@expo/vector-icons';

import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import type { CustomerService } from '@/src/types/customer';
import { resolveApiAssetUrl } from '@/src/utils/api-asset-url';

interface CustomerServiceCardProps {
  service: CustomerService;

  canBook: boolean;

  onBook: () => void;
}

function formatPrice(
  value: string | number,
): string {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  return `₱${numericValue.toFixed(2)}`;
}

export default function CustomerServiceCard({
  service,
  canBook,
  onBook,
}: CustomerServiceCardProps) {
  const serviceImageUrl =
    resolveApiAssetUrl(
      service.image?.image_url,
    );

  return (
    <View style={styles.card}>
      {serviceImageUrl ? (
        <Image
          source={{
            uri:
              serviceImageUrl,
          }}
          resizeMode="cover"
          style={styles.serviceImage}
        />
      ) : (
        <View
          style={
            styles.serviceImageFallback
          }
        >
          <View style={styles.fallbackIcon}>
            <Ionicons
              name="cut-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.fallbackText}>
            Service photo not available
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.content}>
            <Text
              numberOfLines={2}
              style={styles.name}
            >
              {service.name}
            </Text>

            <View style={styles.durationRow}>
              <Ionicons
                name="time-outline"
                size={13}
                color={COLORS.textMuted}
              />

              <Text style={styles.duration}>
                {service.duration_minutes} minutes
              </Text>
            </View>
          </View>

          <Text style={styles.price}>
            {formatPrice(
              service.price,
            )}
          </Text>
        </View>

        {service.description ? (
          <Text style={styles.description}>
            {service.description}
          </Text>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!canBook}
          accessibilityRole="button"
          accessibilityLabel={
            canBook
              ? `Book ${service.name}`
              : `${service.name} booking unavailable`
          }
          onPress={onBook}
          style={[
            styles.button,

            !canBook &&
              styles.buttonDisabled,
          ]}
        >
          <Ionicons
            name={
              canBook
                ? 'calendar-outline'
                : 'lock-closed-outline'
            }
            size={16}
            color={
              canBook
                ? COLORS.white
                : COLORS.textLight
            }
          />

          <Text
            style={[
              styles.buttonText,

              !canBook &&
                styles.buttonTextDisabled,
            ]}
          >
            {canBook
              ? 'Book This Service'
              : 'Booking Unavailable'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      overflow: 'hidden',

      marginBottom: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 18,

      backgroundColor:
        COLORS.surface,
    },

    serviceImage: {
      width: '100%',

      aspectRatio: 16 / 9,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    serviceImageFallback: {
      minHeight: 118,

      alignItems: 'center',

      justifyContent: 'center',

      gap: 8,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    fallbackIcon: {
      width: 46,

      height: 46,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius: 14,

      backgroundColor:
        COLORS.accentSoft,
    },

    fallbackText: {
      color:
        COLORS.textLight,

      fontSize: 8,

      fontWeight: '600',
    },

    body: {
      padding: 16,
    },

    header: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 12,
    },

    content: {
      flex: 1,

      minWidth: 0,
    },

    name: {
      color:
        COLORS.text,

      fontSize: 13,

      lineHeight: 18,

      fontWeight: '700',
    },

    durationRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,

      marginTop: 5,
    },

    duration: {
      color:
        COLORS.textMuted,

      fontSize: 8,
    },

    price: {
      flexShrink: 0,

      color:
        COLORS.primary,

      fontSize: 13,

      fontWeight: '700',
    },

    description: {
      marginTop: 12,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 15,
    },

    button: {
      minHeight: 43,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 7,

      marginTop: 14,

      borderRadius: 13,

      backgroundColor:
        COLORS.primary,
    },

    buttonDisabled: {
      backgroundColor:
        COLORS.surfaceSoft,
    },

    buttonText: {
      color:
        COLORS.white,

      fontSize: 9,

      fontWeight: '700',
    },

    buttonTextDisabled: {
      color:
        COLORS.textLight,
    },
  });