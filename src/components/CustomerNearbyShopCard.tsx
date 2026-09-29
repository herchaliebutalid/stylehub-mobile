import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ShopOwnerAvatar from '@/src/components/ShopOwnerAvatar';
import { COLORS } from '@/src/constants/colors';
import {
  RADII,
  SHADOWS,
  TYPOGRAPHY,
} from '@/src/constants/design';
import type { ShopAvailabilityStatus } from '@/src/types/customer';
import type { CustomerNearbyShop } from '@/src/types/nearby-shop';

function formatDistance(
  distanceKm: number,
): string {
  if (distanceKm < 1) {
    return `${Math.max(
      0,
      Math.round(
        distanceKm * 1000,
      ),
    )} m away`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }

  return `${distanceKm.toFixed(0)} km away`;
}

function availabilityPresentation(
  status: ShopAvailabilityStatus,
): {
  background: string;
  color: string;
} {
  switch (status) {
    case 'open':
      return {
        background: COLORS.greenSoft,
        color: COLORS.green,
      };

    case 'accepting_walk_ins':
      return {
        background: COLORS.blueSoft,
        color: COLORS.blue,
      };

    case 'fully_booked':
      return {
        background: COLORS.orangeSoft,
        color: COLORS.orange,
      };

    case 'closed':
    default:
      return {
        background: COLORS.surfaceSoft,
        color: COLORS.textMuted,
      };
  }
}

export default function CustomerNearbyShopCard({
  shop,
  onPress,
}: {
  shop: CustomerNearbyShop;
  onPress: () => void;
}) {
  const availability =
    availabilityPresentation(
      shop.availability.status,
    );

  const rating =
    shop.rating.average === null
      ? 'New'
      : shop.rating.average.toFixed(1);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Open ${shop.name}, ${formatDistance(shop.distance_km)}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <ShopOwnerAvatar
          shop={shop}
          size={56}
          iconSize={22}
          fallbackIcon={
            shop.type === 'barber_shop'
              ? 'cut-outline'
              : 'sparkles-outline'
          }
          containerStyle={styles.avatar}
          imageStyle={styles.avatarImage}
        />

        <View style={styles.heading}>
          <Text
            numberOfLines={1}
            style={styles.name}
          >
            {shop.name}
          </Text>

          <Text style={styles.type}>
            {shop.type_label}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                availability.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  availability.color,
              },
            ]}
          >
            {shop.availability.status_label}
          </Text>
        </View>
      </View>

      <View style={styles.distanceCard}>
        <View style={styles.distanceIcon}>
          <Ionicons
            name="navigate"
            size={17}
            color={COLORS.blue}
          />
        </View>

        <View style={styles.distanceCopy}>
          <Text style={styles.distanceLabel}>
            Distance from you
          </Text>

          <Text style={styles.distanceText}>
            {formatDistance(
              shop.distance_km,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons
          name="location-outline"
          size={15}
          color={COLORS.textMuted}
        />

        <Text
          numberOfLines={2}
          style={styles.locationText}
        >
          {shop.address}, {shop.city}, {shop.province}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons
            name="star"
            size={13}
            color={COLORS.warning}
          />

          <Text style={styles.metaValue}>
            {rating}
          </Text>

          {shop.rating.review_count > 0 ? (
            <Text style={styles.metaMuted}>
              ({shop.rating.review_count})
            </Text>
          ) : null}
        </View>

        <View style={styles.metaPill}>
          <Ionicons
            name="cut-outline"
            size={13}
            color={COLORS.textMuted}
          />

          <Text style={styles.metaValue}>
            {shop.active_services_count ?? 0}
          </Text>

          <Text style={styles.metaMuted}>
            service
            {(shop.active_services_count ?? 0) === 1
              ? ''
              : 's'}
          </Text>
        </View>

        <View
          style={[
            styles.bookingPill,
            {
              backgroundColor:
                shop.availability.accepts_appointments
                  ? COLORS.greenSoft
                  : COLORS.surfaceSoft,
            },
          ]}
        >
          <Ionicons
            name={
              shop.availability.accepts_appointments
                ? 'calendar-outline'
                : 'calendar-clear-outline'
            }
            size={13}
            color={
              shop.availability.accepts_appointments
                ? COLORS.green
                : COLORS.textMuted
            }
          />

          <Text
            style={[
              styles.bookingText,
              {
                color:
                  shop.availability.accepts_appointments
                    ? COLORS.green
                    : COLORS.textMuted,
              },
            ]}
          >
            {shop.availability.accepts_appointments
              ? 'Bookings available'
              : 'Booking unavailable'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          View services, ratings and shop details
        </Text>

        <View style={styles.footerAction}>
          <Text style={styles.footerActionText}>
            View shop
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
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    borderRadius: 18,
  },

  avatarImage: {
    borderRadius: 18,
  },

  heading: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  type: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  statusBadge: {
    maxWidth: 112,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  statusText: {
    flexShrink: 1,
    fontSize: 8,
    fontWeight: '800',
  },

  distanceCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  distanceIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  distanceCopy: {
    flex: 1,
  },

  distanceLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  distanceText: {
    marginTop: 2,
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  locationRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  locationText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  metaRow: {
    marginTop: 12,
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
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  metaMuted: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  bookingPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  bookingText: {
    fontSize: 9,
    fontWeight: '800',
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

  footerText: {
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