
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import NotificationBellButton from '@/src/components/NotificationBellButton';
import ShopOwnerApprovalState from '@/src/components/ShopOwnerApprovalState';
import { COLORS } from '@/src/constants/colors';
import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import {
  getShopOwnerAccount,
  getShopOwnerAppointments,
  getShopOwnerRescheduleRequests,
} from '@/src/services/shop-owner-api';
import type { ShopOwnerShop } from '@/src/types/shop-owner';

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

type ToolIcon =
  | 'storefront-outline'
  | 'cut-outline'
  | 'calendar-outline'
  | 'clipboard-outline'
  | 'time-outline'
  | 'pricetag-outline'
  | 'images-outline'
  | 'location-outline'
  | 'stats-chart-outline'
  | 'options-outline';

export default function ShopOwnerHomeScreen() {
  const { user, token } = useAuth();

  const [shop, setShop] = useState<ShopOwnerShop | null>(null);

  const [
    pendingAppointmentsCount,
    setPendingAppointmentsCount,
  ] = useState(0);

  const [
    pendingRescheduleCount,
    setPendingRescheduleCount,
  ] = useState(0);

  const [hasLoadedAccount, setHasLoadedAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /* ========================================================
     LOAD NOTIFICATION COUNTS
     ======================================================== */

  const loadNotificationCounts = useCallback(async () => {
    if (!token) {
      setPendingAppointmentsCount(0);
      setPendingRescheduleCount(0);
      return;
    }

    try {
      const [appointmentsResponse, rescheduleResponse] =
        await Promise.all([
          getShopOwnerAppointments(token),
          getShopOwnerRescheduleRequests(token),
        ]);

      setPendingAppointmentsCount(
        appointmentsResponse.data.appointments.filter(
          (appointment) => appointment.status === 'pending',
        ).length,
      );

      setPendingRescheduleCount(
        rescheduleResponse.data.reschedule_requests.filter(
          (request) => request.status === 'pending',
        ).length,
      );
    } catch {
      // Keep dashboard usable if counts fail.
    }
  }, [token]);

  /* ========================================================
     LOAD DASHBOARD
     ======================================================== */

  const loadDashboard = useCallback(
    async (refreshing = false) => {
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getShopOwnerAccount(token);

        if (response.data.user.role !== 'shop_owner') {
          setShop(null);
          setHasLoadedAccount(false);
          setPendingAppointmentsCount(0);
          setPendingRescheduleCount(0);

          setErrorMessage(
            'This account is not authorized as a Shop Owner.',
          );
          return;
        }

        const loadedShop = response.data.shop;

        setShop(loadedShop);
        setHasLoadedAccount(true);

        if (loadedShop?.approval_status === 'approved') {
          await loadNotificationCounts();
        } else {
          setPendingAppointmentsCount(0);
          setPendingRescheduleCount(0);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your Shop Owner account.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [loadNotificationCounts, token],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* ========================================================
     LIVE NOTIFICATION COUNTS
     ======================================================== */

  const approved = shop?.approval_status === 'approved';

  useFocusEffect(
    useCallback(() => {
      if (!token || !approved) {
        return undefined;
      }

      void loadNotificationCounts();

      const interval = setInterval(
        () => void loadNotificationCounts(),
        30000,
      );

      return () => clearInterval(interval);
    }, [approved, loadNotificationCounts, token]),
  );

  /* ========================================================
     DISPLAY VALUES
     ======================================================== */

  const accountName =
    user?.first_name?.trim() ||
    user?.full_name?.trim() ||
    'Shop Owner';

  const greetingName = shop?.name?.trim() || accountName;
  const shopTypeLabel = shop?.type_label || 'StyleHub Shop';
  const availabilityLabel =
    shop?.availability_status_label || 'Unavailable';
  const cityLabel = shop?.city?.trim() || 'Location not set';

  /* ========================================================
     MAIN SCREEN
     ======================================================== */

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
    >
      {/* WHITE SYSTEM ICONS ON NAVY */}

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
            NAVY HEADER
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
              <View style={styles.notificationShell}>
                <NotificationBellButton
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/notifications',
                    )
                  }
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open shop owner profile"
                style={styles.headerIconButton}
                onPress={() =>
                  router.push(
                    '/(shop-owner)/shop-owner/profile',
                  )
                }
              >
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={THEME.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.topHeaderDivider} />
        </View>

        {/* ==================================================
            LIGHT DASHBOARD
            ================================================== */}

        <View style={styles.container}>
          <View style={styles.greetingSection}>
            <Text style={styles.eyebrow}>SHOP OWNER</Text>

            <Text numberOfLines={2} style={styles.greeting}>
              Hi, {greetingName}
            </Text>

            <Text style={styles.greetingSubtitle}>
              Manage today's bookings and keep your shop ready
              for customers.
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator
                size="small"
                color={THEME.navy}
              />

              <Text style={styles.stateText}>
                Loading your shop workspace...
              </Text>
            </View>
          ) : null}

          {!isLoading && errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={COLORS.danger}
              />

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Unable to refresh dashboard
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}

          {!isLoading &&
          hasLoadedAccount &&
          approved &&
          shop ? (
            <>
              {/* SHOP SUMMARY */}

              <View style={styles.shopCard}>
                <View style={styles.shopTopRow}>
                  <View style={styles.shopIdentity}>
                    <View style={styles.shopIcon}>
                      <Ionicons
                        name={
                          shop.type === 'barber_shop'
                            ? 'cut-outline'
                            : 'sparkles-outline'
                        }
                        size={23}
                        color={THEME.navy}
                      />
                    </View>

                    <View style={styles.shopNameBlock}>
                      <Text
                        numberOfLines={1}
                        style={styles.shopName}
                      >
                        {shop.name}
                      </Text>

                      <Text style={styles.shopType}>
                        {shopTypeLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.approvedBadge}>
                    <View style={styles.approvedDot} />
                    <Text style={styles.approvedText}>
                      Approved
                    </Text>
                  </View>
                </View>

                {/* AVAILABILITY & LOCATION */}

                <View style={styles.shopMetaGrid}>
                  <View style={styles.shopMetaItem}>
                    <Text style={styles.shopMetaLabel}>
                      Availability
                    </Text>

                    <View style={styles.shopMetaValueRow}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={THEME.navy}
                      />

                      <Text
                        numberOfLines={1}
                        style={styles.shopMetaValue}
                      >
                        {availabilityLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.shopMetaItem}>
                    <Text style={styles.shopMetaLabel}>
                      Location
                    </Text>

                    <View style={styles.shopMetaValueRow}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={THEME.navy}
                      />

                      <Text
                        numberOfLines={1}
                        style={styles.shopMetaValue}
                      >
                        {cityLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* PENDING COUNTS */}

              <View style={styles.summaryRow}>
                <SummaryCard
                  icon="clipboard-outline"
                  value={pendingAppointmentsCount}
                  label="Pending bookings"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/appointments',
                    )
                  }
                />

                <SummaryCard
                  icon="time-outline"
                  value={pendingRescheduleCount}
                  label="Reschedule requests"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/reschedule-requests',
                    )
                  }
                />
              </View>

              {/* QUICK MANAGEMENT */}

              <SectionHeading
                title="Quick management"
                subtitle="Your most-used shop controls"
              />

              <View style={styles.primaryToolsGrid}>
                <ToolCard
                  icon="clipboard-outline"
                  title="Appointments"
                  subtitle="Review and manage bookings"
                  badgeCount={pendingAppointmentsCount}
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/appointments',
                    )
                  }
                />

                <ToolCard
                  icon="cut-outline"
                  title="Services"
                  subtitle="Prices, duration and availability"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/services',
                    )
                  }
                />

                <ToolCard
                  icon="calendar-outline"
                  title="Schedule"
                  subtitle="Hours, breaks and blocked dates"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/schedule',
                    )
                  }
                />

                <ToolCard
                  icon="storefront-outline"
                  title="Shop details"
                  subtitle="Business information and status"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/shop-information',
                    )
                  }
                />
              </View>

              {/* MORE TOOLS */}

              <SectionHeading
                title="More tools"
                subtitle="Grow and manage your StyleHub presence"
              />

              <View style={styles.moreToolsCard}>
                <MoreToolRow
                  icon="time-outline"
                  title="Reschedule requests"
                  badgeCount={pendingRescheduleCount}
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/reschedule-requests',
                    )
                  }
                />

                <MoreToolRow
                  icon="pricetag-outline"
                  title="Promotions"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/promos',
                    )
                  }
                />

                <MoreToolRow
                  icon="images-outline"
                  title="Shop gallery"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/gallery',
                    )
                  }
                />

                <MoreToolRow
                  icon="location-outline"
                  title="Shop location"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/location',
                    )
                  }
                />

                <MoreToolRow
                  icon="stats-chart-outline"
                  title="Analytics"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/analytics',
                    )
                  }
                />

                <MoreToolRow
                  icon="options-outline"
                  title="Booking rules"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/booking-rules',
                    )
                  }
                  last
                />
              </View>
            </>
          ) : null}

          {!isLoading && hasLoadedAccount && !approved ? (
            <ShopOwnerApprovalState
              shop={shop}
              isRefreshing={isRefreshing}
              onRefresh={() => void loadDashboard(true)}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================================
   REUSABLE COMPONENTS
   ========================================================== */

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: ToolIcon;
  value: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={styles.summaryCard}
      onPress={onPress}
    >
      <View style={styles.summaryIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={THEME.navy}
        />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToolCard({
  icon,
  title,
  subtitle,
  badgeCount = 0,
  onPress,
}: {
  icon: ToolIcon;
  title: string;
  subtitle: string;
  badgeCount?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.toolCard}
      onPress={onPress}
    >
      <View style={styles.toolTopRow}>
        <View style={styles.toolIcon}>
          <Ionicons
            name={icon}
            size={22}
            color={THEME.navy}
          />
        </View>

        {badgeCount > 0 ? (
          <View style={styles.toolBadge}>
            <Text style={styles.toolBadgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function MoreToolRow({
  icon,
  title,
  badgeCount = 0,
  onPress,
  last = false,
}: {
  icon: ToolIcon;
  title: string;
  badgeCount?: number;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.moreToolRow,
        last && styles.moreToolRowLast,
      ]}
      onPress={onPress}
    >
      <View style={styles.moreToolIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={THEME.navy}
        />
      </View>

      <Text style={styles.moreToolTitle}>{title}</Text>

      {badgeCount > 0 ? (
        <View style={styles.inlineBadge}>
          <Text style={styles.inlineBadgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      ) : null}

      <Ionicons
        name="chevron-forward"
        size={18}
        color={THEME.muted}
      />
    </TouchableOpacity>
  );
}

/* ==========================================================
   STYLES
   ========================================================== */

const styles = StyleSheet.create({
  /* NAVY SAFE AREA BEHIND ANDROID STATUS BAR */

  safeArea: {
    flex: 1,
    backgroundColor: THEME.navy,
  },

  /* LIGHT CONTENT REMAINS UNCHANGED */

  scrollView: {
    flex: 1,
    backgroundColor: THEME.background,
  },

  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: 40,
    backgroundColor: THEME.background,
  },

  /* NAVY HEADER */

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

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 20,
    marginTop: 0,
    backgroundColor: THEME.background,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: THEME.white,
  },

  headerIconButton: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  /* GREETING */

  greetingSection: {
    marginTop: 0,
  },

  eyebrow: {
    color: THEME.orange,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  greeting: {
    marginTop: 5,
    color: THEME.text,
    fontSize: TYPOGRAPHY.display,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  greetingSubtitle: {
    marginTop: 8,
    maxWidth: 460,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  /* LOADING AND ERROR */

  stateCard: {
    minHeight: 96,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
    ...SHADOWS.card,
  },

  stateText: {
    color: THEME.muted,
    fontSize: TYPOGRAPHY.body,
  },

  errorBox: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },

  errorText: {
    marginTop: 2,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* SHOP SUMMARY */

  shopCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.xl,
    backgroundColor: THEME.white,
    ...SHADOWS.card,
  },

  shopTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  shopIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  shopIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: THEME.iconSoft,
  },

  shopNameBlock: {
    flex: 1,
  },

  shopName: {
    color: THEME.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
  },

  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.greenSoft,
  },

  approvedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },

  approvedText: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  shopMetaGrid: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },

  shopMetaItem: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: THEME.surfaceSoft,
  },

  shopMetaLabel: {
    color: THEME.muted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  shopMetaValueRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  shopMetaValue: {
    flex: 1,
    color: THEME.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },

  /* SUMMARY CARDS */

  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },

  summaryCard: {
    flex: 1,
    minHeight: 132,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.iconSoft,
  },

  summaryValue: {
    marginTop: 14,
    color: THEME.navy,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },

  summaryLabel: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  /* SECTION HEADING */

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
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

  /* QUICK MANAGEMENT */

  primaryToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  toolCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 154,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
    ...SHADOWS.card,
  },

  toolTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  toolIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: THEME.iconSoft,
  },

  toolBadge: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.danger,
  },

  toolBadgeText: {
    color: THEME.white,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  toolTitle: {
    marginTop: 15,
    color: THEME.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  toolSubtitle: {
    marginTop: 4,
    color: THEME.muted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  /* MORE TOOLS */

  moreToolsCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADII.lg,
    backgroundColor: THEME.white,
  },

  moreToolRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },

  moreToolRowLast: {
    borderBottomWidth: 0,
  },

  moreToolIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.iconSoft,
  },

  moreToolTitle: {
    flex: 1,
    marginLeft: 12,
    color: THEME.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },

  inlineBadge: {
    minWidth: 24,
    height: 24,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.dangerSoft,
  },

  inlineBadgeText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },
});
