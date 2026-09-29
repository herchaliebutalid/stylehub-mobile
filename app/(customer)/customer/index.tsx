import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ShopOwnerAvatar from '@/src/components/ShopOwnerAvatar';
import { COLORS } from '@/src/constants/colors';
import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { useInAppNotifications } from '@/src/context/InAppNotificationContext';
import { ApiError } from '@/src/services/api';
import {
  getCustomerAppointments,
  getCustomerShops,
} from '@/src/services/customer-api';
import { getCustomerProfile } from '@/src/services/customer-profile-api';
import type { AuthUser } from '@/src/types/auth';
import type {
  AppointmentStatus,
  CustomerAppointment,
  CustomerShop,
  ShopAvailabilityStatus,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

function formatBadgeCount(
  count: number,
): string {
  if (count > 99) {
    return '99+';
  }

  return String(count);
}

function customerDisplayName(
  accountUser: AuthUser | null,
  fallbackUser: AuthUser | null,
): string {
  const fullName =
    accountUser?.full_name?.trim()
    || fallbackUser?.full_name?.trim();

  if (fullName) {
    return fullName;
  }

  const source = accountUser ?? fallbackUser;

  const builtName = [
    source?.first_name,
    source?.middle_name,
    source?.last_name,
  ]
    .filter(
      (value): value is string =>
        typeof value === 'string'
        && value.trim() !== '',
    )
    .join(' ')
    .trim();

  return builtName || 'Customer';
}

function firstNameFromUser(
  accountUser: AuthUser | null,
  fallbackUser: AuthUser | null,
): string {
  const explicit =
    accountUser?.first_name?.trim()
    || fallbackUser?.first_name?.trim();

  if (explicit) {
    return explicit;
  }

  return customerDisplayName(
    accountUser,
    fallbackUser,
  )
    .split(/\s+/)
    .filter(Boolean)[0]
    || 'Customer';
}

function formatDate(
  value: string,
): string {
  const parts = value.split('-').map(Number);

  if (
    parts.length !== 3
    || parts.some((part) => Number.isNaN(part))
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] = parts;

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    },
  ).format(
    new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+08:00`,
    ),
  );
}

function formatTime(
  value: string,
): string {
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

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

function appointmentSortKey(
  appointment: CustomerAppointment,
): string {
  return `${appointment.appointment_date} ${appointment.starts_at}`;
}

function statusPresentation(
  status: AppointmentStatus,
): {
  background: string;
  color: string;
} {
  switch (status) {
    case 'confirmed':
      return {
        background: COLORS.greenSoft,
        color: COLORS.green,
      };

    case 'pending':
      return {
        background: COLORS.warningSoft,
        color: COLORS.warning,
      };

    case 'completed':
      return {
        background: COLORS.blueSoft,
        color: COLORS.blue,
      };

    case 'cancelled':
    case 'declined':
    default:
      return {
        background: COLORS.dangerSoft,
        color: COLORS.danger,
      };
  }
}

function availabilityPresentation(
  status: ShopAvailabilityStatus,
): {
  background: string;
  color: string;
  icon: IconName;
} {
  switch (status) {
    case 'open':
      return {
        background: COLORS.greenSoft,
        color: COLORS.green,
        icon: 'checkmark-circle-outline',
      };

    case 'accepting_walk_ins':
      return {
        background: COLORS.blueSoft,
        color: COLORS.blue,
        icon: 'walk-outline',
      };

    case 'fully_booked':
      return {
        background: COLORS.orangeSoft,
        color: COLORS.orange,
        icon: 'time-outline',
      };

    case 'closed':
    default:
      return {
        background: COLORS.surfaceSoft,
        color: COLORS.textMuted,
        icon: 'moon-outline',
      };
  }
}

export default function CustomerHomeScreen() {
  const {
    user,
    token,
  } = useAuth();

  const {
    unreadCount,
  } = useInAppNotifications();

  const [
    accountUser,
    setAccountUser,
  ] = useState<AuthUser | null>(user);

  const [
    shops,
    setShops,
  ] = useState<CustomerShop[]>([]);

  const [
    appointments,
    setAppointments,
  ] = useState<CustomerAppointment[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const hasLoadedOnce = useRef(false);

  const loadDashboard = useCallback(
    async (
      refreshing = false,
      silent = false,
    ): Promise<void> => {
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const [
          profileResponse,
          shopResponse,
          appointmentResponse,
        ] = await Promise.all([
          getCustomerProfile(token),
          getCustomerShops(
            token,
            {
              perPage: 3,
              page: 1,
            },
          ),
          getCustomerAppointments(token),
        ]);

        if (
          profileResponse.data.user.role === 'customer'
        ) {
          setAccountUser(
            profileResponse.data.user,
          );
        }

        setShops(
          shopResponse.data.shops,
        );

        setAppointments(
          appointmentResponse.data.appointments,
        );

        hasLoadedOnce.current = true;
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your StyleHub home screen.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard(
        false,
        hasLoadedOnce.current,
      );

      return undefined;
    }, [loadDashboard]),
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === 'pending'
            || appointment.status === 'confirmed',
        )
        .sort(
          (first, second) =>
            appointmentSortKey(first).localeCompare(
              appointmentSortKey(second),
            ),
        ),
    [appointments],
  );

  const nextAppointment =
    upcomingAppointments[0] ?? null;

  const firstName = firstNameFromUser(
    accountUser,
    user,
  );

  function openShop(
    shopId: number,
  ): void {
    router.push({
      pathname: '/(customer)/shop/[shopId]',
      params: {
        shopId: String(shopId),
      },
    });
  }

  function openAppointment(
    appointmentId: number,
  ): void {
    router.push({
      pathname: '/(customer)/customer-appointment/[appointmentId]',
      params: {
        appointmentId: String(appointmentId),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoFrame}>
              <Image
                source={require('../../../assets/images/stylehub-splash.png')}
                resizeMode="contain"
                style={styles.brandLogo}
              />
            </View>

            <Text style={styles.brandName}>
              StyleHub
            </Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel="Open saved shops"
              onPress={() => router.push('/(customer)/saved-shops')}
              style={styles.topActionButton}
            >
              <Ionicons
                name="bookmark-outline"
                size={21}
                color={COLORS.navy}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={() => router.push('/(customer)/customer/notifications')}
              style={styles.topActionButton}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={COLORS.navy}
              />

              {unreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {formatBadgeCount(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.welcomeBlock}>
          <Text style={styles.welcomeEyebrow}>
            WELCOME BACK
          </Text>

          <Text style={styles.welcomeTitle}>
            Hi, {firstName}
          </Text>

          <Text style={styles.welcomeText}>
            Find a barber or beauty shop, compare options, and keep your appointments in one place.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="Discover shops"
          onPress={() => router.push('/(customer)/customer/shops')}
          style={styles.discoveryHero}
        >
          <View style={styles.discoveryHeroTopRow}>
            <View style={styles.discoveryHeroIcon}>
              <Ionicons
                name="sparkles-outline"
                size={23}
                color={COLORS.white}
              />
            </View>

            <View style={styles.discoveryHeroArrow}>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={COLORS.white}
              />
            </View>
          </View>

          <Text style={styles.discoveryHeroTitle}>
            Discover your next look
          </Text>

          <Text style={styles.discoveryHeroText}>
            Browse approved shops, services, ratings, availability, and current offers before booking.
          </Text>

          <View style={styles.discoveryHeroFooter}>
            <View style={styles.discoveryHeroFooterItem}>
              <Ionicons
                name="storefront-outline"
                size={15}
                color="#D4DAE1"
              />

              <Text style={styles.discoveryHeroFooterText}>
                Approved shops
              </Text>
            </View>

            <View style={styles.discoveryHeroFooterItem}>
              <Ionicons
                name="star-outline"
                size={15}
                color="#D4DAE1"
              />

              <Text style={styles.discoveryHeroFooterText}>
                Verified ratings
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <QuickAction
            icon="navigate-outline"
            label="Nearby"
            helper="Map view"
            onPress={() => router.push('/(customer)/customer/nearby')}
          />

          <QuickAction
            icon="calendar-outline"
            label="Bookings"
            helper={`${upcomingAppointments.length} upcoming`}
            onPress={() => router.push('/(customer)/customer/appointments')}
          />

          <QuickAction
            icon="bookmark-outline"
            label="Saved"
            helper="Your shops"
            onPress={() => router.push('/(customer)/saved-shops')}
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>
                Home needs attention
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        <SectionHeading
          title="Next booking"
          subtitle="Your nearest pending or confirmed appointment."
          actionLabel="All bookings"
          onAction={() => router.push('/(customer)/customer/appointments')}
        />

        {isLoading ? (
          <LoadingCard message="Loading your next appointment..." />
        ) : nextAppointment ? (
          <NextBookingCard
            appointment={nextAppointment}
            onPress={() => openAppointment(nextAppointment.id)}
          />
        ) : (
          <View style={styles.bookingEmptyCard}>
            <View style={styles.bookingEmptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.bookingEmptyCopy}>
              <Text style={styles.bookingEmptyTitle}>
                No upcoming booking
              </Text>

              <Text style={styles.bookingEmptyText}>
                Discover a shop when you are ready to schedule your next service.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Find a shop"
              onPress={() => router.push('/(customer)/customer/shops')}
              style={styles.bookingEmptyButton}
            >
              <Ionicons
                name="arrow-forward"
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        )}

        <SectionHeading
          title="Discover shops"
          subtitle="A few approved shops you can explore right now."
          actionLabel="See all"
          onAction={() => router.push('/(customer)/customer/shops')}
        />

        {isLoading ? (
          <LoadingCard message="Loading shops..." />
        ) : shops.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="storefront-outline"
                size={26}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No shops available yet
            </Text>

            <Text style={styles.emptyText}>
              Pull down to refresh, or check Discover again later.
            </Text>
          </View>
        ) : (
          <View style={styles.shopList}>
            {shops.map(
              (shop) => (
                <HomeShopCard
                  key={shop.id}
                  shop={shop}
                  onPress={() => openShop(shop.id)}
                />
              ),
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  helper,
  onPress,
}: {
  icon: IconName;
  label: string;
  helper: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.quickAction}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.navy}
        />
      </View>

      <Text style={styles.quickActionLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.quickActionHelper}
      >
        {helper}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeading({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        style={styles.sectionAction}
      >
        <Text style={styles.sectionActionText}>
          {actionLabel}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={15}
          color={COLORS.navy}
        />
      </TouchableOpacity>
    </View>
  );
}

function NextBookingCard({
  appointment,
  onPress,
}: {
  appointment: CustomerAppointment;
  onPress: () => void;
}) {
  const status = statusPresentation(
    appointment.status,
  );

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel="Open next booking"
      onPress={onPress}
      style={styles.nextBookingCard}
    >
      <View style={styles.nextBookingHeader}>
        <View style={styles.nextBookingDateIcon}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={COLORS.white}
          />
        </View>

        <View
          style={[
            styles.bookingStatusBadge,
            {
              backgroundColor: status.background,
            },
          ]}
        >
          <Text
            style={[
              styles.bookingStatusText,
              {
                color: status.color,
              },
            ]}
          >
            {appointment.status_label}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={styles.nextBookingService}
      >
        {appointment.service_snapshot.name}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.nextBookingShop}
      >
        {appointment.shop?.name ?? 'StyleHub shop'}
      </Text>

      <View style={styles.nextBookingSchedule}>
        <View style={styles.nextBookingScheduleItem}>
          <Ionicons
            name="calendar-clear-outline"
            size={15}
            color="#D4DAE1"
          />

          <Text style={styles.nextBookingScheduleText}>
            {formatDate(appointment.appointment_date)}
          </Text>
        </View>

        <View style={styles.nextBookingScheduleItem}>
          <Ionicons
            name="time-outline"
            size={15}
            color="#D4DAE1"
          />

          <Text style={styles.nextBookingScheduleText}>
            {formatTime(appointment.starts_at)}
          </Text>
        </View>
      </View>

      <View style={styles.nextBookingFooter}>
        <Text style={styles.nextBookingFooterText}>
          View booking details
        </Text>

        <Ionicons
          name="arrow-forward"
          size={17}
          color={COLORS.white}
        />
      </View>
    </TouchableOpacity>
  );
}

function HomeShopCard({
  shop,
  onPress,
}: {
  shop: CustomerShop;
  onPress: () => void;
}) {
  const availability = availabilityPresentation(
    shop.availability.status,
  );

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Open ${shop.name}`}
      onPress={onPress}
      style={styles.shopCard}
    >
      <ShopOwnerAvatar
        shop={shop}
        size={54}
        iconSize={22}
        fallbackIcon={
          shop.type === 'barber_shop'
            ? 'cut-outline'
            : 'sparkles-outline'
        }
        containerStyle={styles.shopOwnerAvatar}
        imageStyle={styles.shopOwnerAvatarImage}
      />

      <View style={styles.shopContent}>
        <View style={styles.shopTitleRow}>
          <Text
            numberOfLines={1}
            style={styles.shopName}
          >
            {shop.name}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={17}
            color={COLORS.textLight}
          />
        </View>

        <Text
          numberOfLines={1}
          style={styles.shopType}
        >
          {shop.type_label}
        </Text>

        <View style={styles.shopLocationRow}>
          <Ionicons
            name="location-outline"
            size={13}
            color={COLORS.textMuted}
          />

          <Text
            numberOfLines={1}
            style={styles.shopLocation}
          >
            {shop.city}, {shop.province}
          </Text>
        </View>

        <View style={styles.shopMetaRow}>
          <View style={styles.ratingPill}>
            <Ionicons
              name="star"
              size={12}
              color={COLORS.warning}
            />

            <Text style={styles.ratingText}>
              {shop.rating.average === null
                ? 'New'
                : shop.rating.average.toFixed(1)}
            </Text>

            {shop.rating.review_count > 0 ? (
              <Text style={styles.reviewCountText}>
                ({shop.rating.review_count})
              </Text>
            ) : null}
          </View>

          {typeof shop.active_services_count === 'number' ? (
            <View style={styles.serviceCountPill}>
              <Ionicons
                name="cut-outline"
                size={12}
                color={COLORS.textMuted}
              />

              <Text style={styles.serviceCountText}>
                {shop.active_services_count} service{shop.active_services_count === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.availabilityBadge,
          {
            backgroundColor: availability.background,
          },
        ]}
      >
        <Ionicons
          name={availability.icon}
          size={12}
          color={availability.color}
        />

        <Text
          style={[
            styles.availabilityText,
            {
              color: availability.color,
            },
          ]}
        >
          {shop.availability.status_label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function LoadingCard({
  message,
}: {
  message: string;
}) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator
        size="small"
        color={COLORS.navy}
      />

      <Text style={styles.loadingText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.sm,
    paddingBottom: 110,
  },

  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoFrame: {
    width: 43,
    height: 43,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },

  brandLogo: {
    position: 'absolute',
    width: 67,
    height: 67,
    left: -12,
    top: -12,
  },

  brandName: {
    marginLeft: 9,
    color: COLORS.navy,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  topActionButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },

  notificationBadge: {
    minWidth: 18,
    height: 18,
    position: 'absolute',
    top: 3,
    right: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
  },

  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
  },

  welcomeBlock: {
    marginTop: SPACING.lg,
  },

  welcomeEyebrow: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  welcomeTitle: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  welcomeText: {
    maxWidth: 580,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  discoveryHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  discoveryHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  discoveryHeroIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.navyMuted,
  },

  discoveryHeroArrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.navyMuted,
  },

  discoveryHeroTitle: {
    marginTop: 17,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  discoveryHeroText: {
    maxWidth: 540,
    marginTop: 6,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  discoveryHeroFooter: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  discoveryHeroFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  discoveryHeroFooterText: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  quickActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 9,
  },

  quickAction: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  quickActionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  quickActionLabel: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  quickActionHelper: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  errorBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  errorCopy: {
    flex: 1,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },

  sectionHeadingCopy: {
    flex: 1,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  sectionAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },

  sectionActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  nextBookingCard: {
    padding: 16,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  nextBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  nextBookingDateIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.navyMuted,
  },

  bookingStatusBadge: {
    minHeight: 29,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  bookingStatusText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  nextBookingService: {
    marginTop: 15,
    color: COLORS.white,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },

  nextBookingShop: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  nextBookingSchedule: {
    marginTop: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  nextBookingScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  nextBookingScheduleText: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  nextBookingFooter: {
    marginTop: 15,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  nextBookingFooterText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  bookingEmptyCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  bookingEmptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
  },

  bookingEmptyCopy: {
    flex: 1,
  },

  bookingEmptyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  bookingEmptyText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  bookingEmptyButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },

  shopList: {
    gap: 10,
  },

  shopCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  shopOwnerAvatar: {
    borderRadius: 18,
  },

  shopOwnerAvatarImage: {
    borderRadius: 18,
  },

  shopContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 2,
  },

  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  shopName: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  shopLocationRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  shopLocation: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  shopMetaRow: {
    marginTop: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  ratingPill: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.warningSoft,
  },

  ratingText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  reviewCountText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  serviceCountPill: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceSoft,
  },

  serviceCountText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  availabilityBadge: {
    position: 'absolute',
    top: 10,
    right: 35,
    minHeight: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    borderRadius: RADII.pill,
  },

  availabilityText: {
    fontSize: 8,
    fontWeight: '800',
  },

  loadingCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  loadingText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});