
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

/* ==========================================================
   STYLEHUB THEME
   ========================================================== */

const THEME = {
  navy: '#08131F',
  navyDark: '#06101A',
  navyLight: '#162635',
  orange: '#D99202',
  orangeDark: '#C78200',
  orangeSoft: '#F8E8CC',
  white: '#FFFFFF',
  background: '#F3F5F7',
  surfaceSoft: '#F7F8FA',
  text: '#152432',
  muted: '#6B7A89',
  mutedLight: '#B7C2CE',
  border: '#E7EBF0',
  iconSoft: '#EDF1F5',
};

type IconName = ComponentProps<typeof Ionicons>['name'];

/* ==========================================================
   HELPERS
   ========================================================== */

function formatBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

function customerDisplayName(
  accountUser: AuthUser | null,
  fallbackUser: AuthUser | null,
): string {
  const fullName =
    accountUser?.full_name?.trim() ||
    fallbackUser?.full_name?.trim();

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
        typeof value === 'string' && value.trim() !== '',
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
    accountUser?.first_name?.trim() ||
    fallbackUser?.first_name?.trim();

  if (explicit) {
    return explicit;
  }

  return (
    customerDisplayName(accountUser, fallbackUser)
      .split(/\s+/)
      .filter(Boolean)[0] || 'Customer'
  );
}

function formatDate(value: string): string {
  const parts = value.split('-').map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => Number.isNaN(part))
  ) {
    return value;
  }

  const [year, month, day] = parts;

  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(
    new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(
        day,
      ).padStart(2, '0')}T12:00:00+08:00`,
    ),
  );
}

function formatTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hour24 = Number(match[1]);
  const minute = match[2];

  if (
    Number.isNaN(hour24) ||
    hour24 < 0 ||
    hour24 > 23
  ) {
    return value;
  }

  const suffix = hour24 >= 12 ? 'PM' : 'AM';

  return `${hour24 % 12 || 12}:${minute} ${suffix}`;
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

/* ==========================================================
   CUSTOMER DASHBOARD
   ========================================================== */

export default function CustomerHomeScreen() {
  const { user, token } = useAuth();
  const { unreadCount } = useInAppNotifications();

  const [accountUser, setAccountUser] =
    useState<AuthUser | null>(user);

  const [shops, setShops] = useState<CustomerShop[]>([]);

  const [appointments, setAppointments] =
    useState<CustomerAppointment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasLoadedOnce = useRef(false);

  /* ========================================================
     LOAD CUSTOMER DATA
     ======================================================== */

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
          getCustomerShops(token, {
            perPage: 3,
            page: 1,
          }),
          getCustomerAppointments(token),
        ]);

        if (profileResponse.data.user.role === 'customer') {
          setAccountUser(profileResponse.data.user);
        }

        setShops(shopResponse.data.shops);

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

  /* ========================================================
     UPCOMING BOOKINGS
     ======================================================== */

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === 'pending' ||
            appointment.status === 'confirmed',
        )
        .sort((first, second) =>
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

  /* ========================================================
     NAVIGATION
     ======================================================== */

  function openShop(shopId: number): void {
    router.push({
      pathname: '/(customer)/shop/[shopId]',
      params: {
        shopId: String(shopId),
      },
    });
  }

  function openAppointment(appointmentId: number): void {
    router.push({
      pathname:
        '/(customer)/customer-appointment/[appointmentId]',
      params: {
        appointmentId: String(appointmentId),
      },
    });
  }

  /* ========================================================
     MAIN SCREEN
     ======================================================== */

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
    >
      {/* WHITE ANDROID STATUS ICONS */}

      <StatusBar
        barStyle="light-content"
        backgroundColor={THEME.navy}
        translucent={false}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor={THEME.navy}
            colors={[THEME.navy]}
            progressBackgroundColor={THEME.white}
          />
        }
      >
        {/* ==================================================
            DARK NAVY HEADER
            ================================================== */}

        <View style={styles.topHeaderBar}>
          <View style={styles.headerInner}>
            <View style={styles.brandRow}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../assets/images/stylehub-splash.png')}
                  resizeMode="contain"
                  style={styles.logo}
                />
              </View>

              <Text style={styles.brandName}>
                Style
                <Text style={styles.brandAccent}>Hub</Text>
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="Open saved shops"
                onPress={() =>
                  router.push('/(customer)/saved-shops')
                }
                style={styles.notificationShell}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={21}
                  color={THEME.navy}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
                onPress={() =>
                  router.push(
                    '/(customer)/customer/notifications',
                  )
                }
                style={styles.notificationShell}
              >
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color={THEME.navy}
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

          <View style={styles.topHeaderDivider} />
        </View>

        {/* ==================================================
            LIGHT CUSTOMER DASHBOARD
            ================================================== */}

        <View style={styles.container}>
          {/* WELCOME */}

          <View style={styles.welcomeBlock}>
            <Text style={styles.welcomeEyebrow}>
              WELCOME BACK
            </Text>

            <Text style={styles.welcomeTitle}>
              Hi, {firstName}
            </Text>

            <Text style={styles.welcomeText}>
              Find a barber or beauty shop, compare options,
              and keep your appointments in one place.
            </Text>
          </View>

          {/* WHITE DISCOVERY CARD */}

          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="Discover shops"
            onPress={() =>
              router.push('/(customer)/customer/shops')
            }
            style={styles.discoveryHero}
          >
            <View style={styles.discoveryHeroTopRow}>
              <View style={styles.discoveryHeroIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={23}
                  color={THEME.navy}
                />
              </View>

              <View style={styles.discoveryHeroArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={THEME.white}
                />
              </View>
            </View>

            <Text style={styles.discoveryHeroTitle}>
              Discover your next look
            </Text>

            <Text style={styles.discoveryHeroText}>
              Browse approved shops, services, ratings,
              availability, and current offers before booking.
            </Text>

            <View style={styles.discoveryHeroFooter}>
              <View style={styles.discoveryHeroFooterItem}>
                <Ionicons
                  name="storefront-outline"
                  size={15}
                  color={THEME.navy}
                />

                <Text style={styles.discoveryHeroFooterText}>
                  Approved shops
                </Text>
              </View>

              <View style={styles.discoveryHeroFooterItem}>
                <Ionicons
                  name="star-outline"
                  size={15}
                  color={THEME.navy}
                />

                <Text style={styles.discoveryHeroFooterText}>
                  Verified ratings
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* QUICK ACTIONS */}

          <View style={styles.quickActions}>
            <QuickAction
              icon="navigate-outline"
              label="Nearby"
              helper="Map view"
              onPress={() =>
                router.push(
                  '/(customer)/customer/nearby',
                )
              }
            />

            <QuickAction
              icon="calendar-outline"
              label="Bookings"
              helper={`${upcomingAppointments.length} upcoming`}
              onPress={() =>
                router.push(
                  '/(customer)/customer/appointments',
                )
              }
            />

            <QuickAction
              icon="bookmark-outline"
              label="Saved"
              helper="Your shops"
              onPress={() =>
                router.push('/(customer)/saved-shops')
              }
            />
          </View>

          {/* ERROR MESSAGE */}

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

          {/* NEXT BOOKING */}

          <SectionHeading
            title="Next booking"
            subtitle="Your nearest pending or confirmed appointment."
            actionLabel="All bookings"
            onAction={() =>
              router.push(
                '/(customer)/customer/appointments',
              )
            }
          />

          {isLoading ? (
            <LoadingCard
              message="Loading your next appointment..."
            />
          ) : nextAppointment ? (
            <NextBookingCard
              appointment={nextAppointment}
              onPress={() =>
                openAppointment(nextAppointment.id)
              }
            />
          ) : (
            <View style={styles.bookingEmptyCard}>
              <View style={styles.bookingEmptyIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={THEME.navy}
                />
              </View>

              <View style={styles.bookingEmptyCopy}>
                <Text style={styles.bookingEmptyTitle}>
                  No upcoming booking
                </Text>

                <Text style={styles.bookingEmptyText}>
                  Discover a shop when you are ready to
                  schedule your next service.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Find a shop"
                onPress={() =>
                  router.push(
                    '/(customer)/customer/shops',
                  )
                }
                style={styles.bookingEmptyButton}
              >
                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color={THEME.white}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* DISCOVER SHOPS */}

          <SectionHeading
            title="Discover shops"
            subtitle="A few approved shops you can explore right now."
            actionLabel="See all"
            onAction={() =>
              router.push('/(customer)/customer/shops')
            }
          />

          {isLoading ? (
            <LoadingCard message="Loading shops..." />
          ) : shops.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="storefront-outline"
                  size={26}
                  color={THEME.navy}
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
              {shops.map((shop) => (
                <HomeShopCard
                  key={shop.id}
                  shop={shop}
                  onPress={() => openShop(shop.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================================
   QUICK ACTION
   ========================================================== */

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
          color={THEME.navy}
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

/* ==========================================================
   SECTION HEADING
   ========================================================== */

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
          color={THEME.navy}
        />
      </TouchableOpacity>
    </View>
  );
}

/* ==========================================================
   NEXT BOOKING
   ========================================================== */

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
            color={THEME.white}
          />
        </View>

        <View
          style={[
            styles.bookingStatusBadge,
            { backgroundColor: status.background },
          ]}
        >
          <Text
            style={[
              styles.bookingStatusText,
              { color: status.color },
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
          color={THEME.white}
        />
      </View>
    </TouchableOpacity>
  );
}

/* ==========================================================
   SHOP CARD
   ========================================================== */

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

        <Text numberOfLines={1} style={styles.shopType}>
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

          {typeof shop.active_services_count ===
          'number' ? (
            <View style={styles.serviceCountPill}>
              <Ionicons
                name="cut-outline"
                size={12}
                color={THEME.muted}
              />

              <Text style={styles.serviceCountText}>
                {shop.active_services_count} service
                {shop.active_services_count === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.availabilityBadge,
          { backgroundColor: availability.background },
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
            { color: availability.color },
          ]}
        >
          {shop.availability.status_label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ==========================================================
   LOADING CARD
   ========================================================== */

function LoadingCard({
  message,
}: {
  message: string;
}) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator
        size="small"
        color={THEME.navy}
      />

      <Text style={styles.loadingText}>
        {message}
      </Text>
    </View>
  );
}

/* ==========================================================
   STYLES
   ========================================================== */

const styles = StyleSheet.create({
  /* ========================================================
     TOP SAFE AREA

     The top safe area is navy so it matches the header.
     Do not change this to THEME.background.
     ======================================================== */

  safeArea: {
    flex: 1,
    backgroundColor: THEME.navy,
  },

  /* LIGHT DASHBOARD BELOW HEADER */

  scrollView: {
    flex: 1,
    backgroundColor: THEME.background,
  },

  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: 0,
    backgroundColor: THEME.background,
  },

  /* ========================================================
     NAVY HEADER
     ======================================================== */

  topHeaderBar: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: THEME.navy,
    paddingTop: 40,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },

  headerInner: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 30,
    backgroundColor: THEME.navy,
  },

  topHeaderDivider: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  /* BRAND */

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logoContainer: {
    width: 41,
    height: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: THEME.white,
  },

  logo: {
    width: 34,
    height: 34,
  },

  brandName: {
    color: THEME.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  brandAccent: {
    color: THEME.orange,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  notificationShell: {
    width: 43,
    height: 43,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: THEME.white,
  },

  notificationBadge: {
    minWidth: 18,
    height: 18,
    position: 'absolute',
    top: 2,
    right: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: THEME.white,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
  },

  notificationBadgeText: {
    color: THEME.white,
    fontSize: 8,
    fontWeight: '800',
  },

  /* ========================================================
     MAIN DASHBOARD
     ======================================================== */

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 20,
    paddingBottom: 32,
    backgroundColor: THEME.background,
  },

  /* WELCOME */

  welcomeBlock: {
    marginTop: 0,
  },

  welcomeEyebrow: {
    color: THEME.orange,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  welcomeTitle: {
    marginTop: 5,
    color: THEME.text,
    fontSize: TYPOGRAPHY.display,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  welcomeText: {
    maxWidth: 460,
    marginTop: 8,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  /* ========================================================
     WHITE DISCOVERY CARD
     ======================================================== */

  discoveryHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.xl,
    backgroundColor: THEME.white,
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
    backgroundColor: THEME.iconSoft,
  },

  discoveryHeroArrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.navy,
  },

  discoveryHeroTitle: {
    marginTop: 17,
    color: THEME.navy,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  discoveryHeroText: {
    maxWidth: 540,
    marginTop: 6,
    color: THEME.muted,
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
    borderTopColor: THEME.border,
  },

  discoveryHeroFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  discoveryHeroFooterText: {
    color: THEME.muted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  /* ========================================================
     QUICK ACTIONS
     ======================================================== */

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
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
  },

  quickActionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.iconSoft,
  },

  quickActionLabel: {
    marginTop: 10,
    color: THEME.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  quickActionHelper: {
    marginTop: 2,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.micro,
  },

  /* ERROR */

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
    backgroundColor: THEME.white,
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
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* ========================================================
     SECTION HEADING
     ======================================================== */

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
    color: THEME.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: THEME.muted,
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
    color: THEME.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  /* ========================================================
     NEXT BOOKING
     ======================================================== */

  nextBookingCard: {
    padding: 16,
    borderRadius: RADII.xl,
    backgroundColor: THEME.navy,
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
    backgroundColor: THEME.navyLight,
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
    color: THEME.white,
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
    borderTopColor: THEME.navyLight,
  },

  nextBookingFooterText: {
    color: THEME.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  /* EMPTY BOOKING */

  bookingEmptyCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
  },

  bookingEmptyIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: THEME.iconSoft,
  },

  bookingEmptyCopy: {
    flex: 1,
  },

  bookingEmptyTitle: {
    color: THEME.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  bookingEmptyText: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  bookingEmptyButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.navy,
  },

  /* ========================================================
     SHOP LIST
     ======================================================== */

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
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
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
    color: THEME.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 2,
    color: THEME.muted,
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
    color: THEME.muted,
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
    color: THEME.text,
    fontSize: 10,
    fontWeight: '800',
  },

  reviewCountText: {
    color: THEME.muted,
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
    backgroundColor: THEME.surfaceSoft,
  },

  serviceCountText: {
    color: THEME.muted,
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

  /* ========================================================
     LOADING
     ======================================================== */

  loadingCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
  },

  loadingText: {
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
  },

  /* ========================================================
     EMPTY SHOPS
     ======================================================== */

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.xl,
    backgroundColor: THEME.white,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: THEME.iconSoft,
  },

  emptyTitle: {
    marginTop: 12,
    color: THEME.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 5,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
