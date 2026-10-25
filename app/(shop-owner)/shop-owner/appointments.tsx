
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import ShopOwnerAppointmentCard from '@/src/components/ShopOwnerAppointmentCard';
import { COLORS } from '@/src/constants/colors';

import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';

import { useAuth } from '@/src/context/AuthContext';
import { ApiError, apiRequest } from '@/src/services/api';

import type {
  ShopOwnerAppointment,
  ShopOwnerAppointmentStatus,
} from '@/src/types/shop-owner';

/* ==========================================================
   TYPES AND PAGINATION
   ========================================================== */

type AppointmentFilter =
  | 'all'
  | ShopOwnerAppointmentStatus;

const PAGE_SIZE = 20;

type AppointmentSummary =
  Record<ShopOwnerAppointmentStatus, number> & {
    total: number;
  };

type PaginatedAppointmentsResponse = {
  success: boolean;
  data: {
    appointments: ShopOwnerAppointment[];
    summary?: AppointmentSummary;
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      has_more_pages: boolean;
    };
  };
};

const EMPTY_SUMMARY: AppointmentSummary = {
  total: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  no_show: 0,
  cancelled: 0,
  declined: 0,
};

function appointmentsPath(
  filter: AppointmentFilter,
  page: number,
): string {
  const status =
    filter === 'all'
      ? ''
      : `&status=${filter}`;

  return (
    `/shop-owner/appointments?page=${page}` +
    `&per_page=${PAGE_SIZE}${status}`
  );
}

function mergeAppointments(
  current: ShopOwnerAppointment[],
  incoming: ShopOwnerAppointment[],
): ShopOwnerAppointment[] {
  const records =
    new Map<number, ShopOwnerAppointment>();

  current.forEach((item) => {
    records.set(item.id, item);
  });

  incoming.forEach((item) => {
    records.set(item.id, item);
  });

  return [...records.values()];
}

/* ==========================================================
   APPOINTMENT FILTERS
   ========================================================== */

const FILTERS: {
  value: AppointmentFilter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'pending',
    label: 'Pending',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
  },
  {
    value: 'completed',
    label: 'Completed',
  },
  {
    value: 'no_show',
    label: 'No-show',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
  {
    value: 'declined',
    label: 'Declined',
  },
];

/* ==========================================================
   SHOP OWNER APPOINTMENTS SCREEN
   ========================================================== */

export default function ShopOwnerAppointmentsScreen() {
  const { token } = useAuth();

  const [
    appointments,
    setAppointments,
  ] = useState<ShopOwnerAppointment[]>([]);

  const [
    filter,
    setFilter,
  ] = useState<AppointmentFilter>('all');

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

  const [
    summary,
    setSummary,
  ] = useState<AppointmentSummary>(EMPTY_SUMMARY);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    hasMore,
    setHasMore,
  ] = useState(false);

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] = useState(false);

  const hasLoadedOnce = useRef(false);
  const loadedKey = useRef('');
  const requestVersion = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

  /* ========================================================
     LOAD FIRST PAGE
     ======================================================== */

  const loadAppointments = useCallback(
    async (
      refreshing = false,
      silent = false,
    ): Promise<void> => {
      const version =
        ++requestVersion.current;

      pageRef.current = 1;
      hasMoreRef.current = false;
      loadingMoreRef.current = false;

      setIsLoadingMore(false);

      if (!token) {
        setAppointments([]);
        setSummary(EMPTY_SUMMARY);
        setPage(1);
        setHasMore(false);
        setIsLoading(false);
        setIsRefreshing(false);

        hasLoadedOnce.current = false;
        loadedKey.current = '';

        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response =
          await apiRequest<PaginatedAppointmentsResponse>(
            appointmentsPath(filter, 1),
            { token },
          );

        if (
          requestVersion.current !== version
        ) {
          return;
        }

        setAppointments(
          response.data.appointments,
        );

        setSummary(
          response.data.summary ?? {
            ...EMPTY_SUMMARY,
            total:
              response.data.appointments.length,
          },
        );

        setPage(1);

        const more =
          response.data.pagination
            ?.has_more_pages ?? false;

        hasMoreRef.current = more;
        setHasMore(more);

        hasLoadedOnce.current = true;
        loadedKey.current =
          `${token}:${filter}`;

      } catch (error) {
        if (
          requestVersion.current !== version
        ) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load shop appointments.',
        );
      } finally {
        if (
          requestVersion.current === version
        ) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [token, filter],
  );

  /* ========================================================
     LOAD MORE APPOINTMENTS
     ======================================================== */

  const loadMoreAppointments = useCallback(
    async (): Promise<void> => {
      if (
        !token ||
        loadingMoreRef.current ||
        !hasMoreRef.current ||
        isLoading ||
        isRefreshing
      ) {
        return;
      }

      const version =
        requestVersion.current;

      const nextPage =
        pageRef.current + 1;

      loadingMoreRef.current = true;
      setIsLoadingMore(true);
      setErrorMessage('');

      try {
        const response =
          await apiRequest<PaginatedAppointmentsResponse>(
            appointmentsPath(filter, nextPage),
            { token },
          );

        if (
          requestVersion.current !== version
        ) {
          return;
        }

        setAppointments((previous) =>
          mergeAppointments(
            previous,
            response.data.appointments,
          ),
        );

        pageRef.current = nextPage;
        setPage(nextPage);

        const more =
          response.data.pagination
            ?.has_more_pages ?? false;

        hasMoreRef.current = more;
        setHasMore(more);

        if (response.data.summary) {
          setSummary(response.data.summary);
        }

      } catch (error) {
        if (
          requestVersion.current !== version
        ) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load more appointments.',
        );
      } finally {
        if (
          requestVersion.current === version
        ) {
          loadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [
      token,
      filter,
      isLoading,
      isRefreshing,
    ],
  );

  /* ========================================================
     REFRESH WHEN SCREEN IS OPENED
     ======================================================== */

  useFocusEffect(
    useCallback(() => {
      void loadAppointments(
        false,
        hasLoadedOnce.current &&
          loadedKey.current ===
            `${token}:${filter}`,
      );

      return () => {
        requestVersion.current += 1;
        loadingMoreRef.current = false;
      };
    }, [
      token,
      filter,
      loadAppointments,
    ]),
  );

  /* ========================================================
     APPOINTMENT COUNTS
     ======================================================== */

  const filteredAppointments = appointments;

  const pendingCount = summary.pending;
  const confirmedCount = summary.confirmed;
  const completedCount = summary.completed;

  const currentFilterLabel =
    FILTERS.find(
      (item) => item.value === filter,
    )?.label ?? 'Appointments';

  const displayedTotal =
    filter === 'all'
      ? summary.total
      : summary[filter];

  /* ========================================================
     NAVIGATION
     ======================================================== */

  function handleBack() {
    router.replace(
      '/(shop-owner)/shop-owner',
    );
  }

  function openAppointment(
    appointmentId: number,
  ) {
    router.push({
      pathname:
        '/(shop-owner)/shop-owner-appointment/[appointmentId]',
      params: {
        appointmentId:
          String(appointmentId),
      },
    });
  }

  /* ========================================================
     SCREEN
     ======================================================== */

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              void loadAppointments(true)
            }
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >

        {/* TOP NAVIGATION */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to shop owner home"
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Appointments
            </Text>

            <Text style={styles.topBarCaption}>
              Manage your bookings
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh appointments"
            onPress={() =>
              void loadAppointments(true)
            }
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            BOOKINGS
          </Text>

          <Text style={styles.title}>
            Stay on top of every appointment
          </Text>

          <Text style={styles.subtitle}>
            Review customer requests, confirmed schedules,
            and completed visits in one place.
          </Text>
        </View>

        {/* OVERVIEW CARD */}

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewLabel}>
                All appointments
              </Text>

              <Text style={styles.overviewValue}>
                {summary.total}
              </Text>
            </View>

            <View style={styles.overviewIcon}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.overviewStats}>
            <OverviewStat
              label="Pending"
              value={pendingCount}
            />

            <View style={styles.overviewDivider} />

            <OverviewStat
              label="Confirmed"
              value={confirmedCount}
            />

            <View style={styles.overviewDivider} />

            <OverviewStat
              label="Completed"
              value={completedCount}
            />
          </View>
        </View>

        {/* FILTER SECTION */}

        <View style={styles.filterSection}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Filter appointments
              </Text>

              <Text style={styles.sectionSubtitle}>
                Choose a booking status
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((item) => {
              const selected =
                item.value === filter;

              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                  }}
                  style={[
                    styles.filterButton,
                    selected &&
                      styles.filterButtonSelected,
                  ]}
                  onPress={() =>
                    setFilter(item.value)
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected &&
                        styles.filterTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ERROR MESSAGE */}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Couldn&apos;t refresh appointments
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {/* LIST HEADER */}

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>
              {filter === 'all'
                ? 'All appointments'
                : currentFilterLabel}
            </Text>

            <Text style={styles.listSubtitle}>
              {displayedTotal} booking
              {displayedTotal === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        {/* LOADING STATE */}

        {isLoading ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.stateTitle}>
              Loading appointments
            </Text>

            <Text style={styles.stateText}>
              Getting the latest bookings for your shop.
            </Text>
          </View>
        ) : filteredAppointments.length === 0 ? (

          /* EMPTY STATE */

          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No appointments here
            </Text>

            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Your customer bookings will appear here when appointments are created.'
                : `There are no ${currentFilterLabel.toLowerCase()} appointments right now.`}
            </Text>
          </View>
        ) : (

          /* APPOINTMENT LIST */

          <View style={styles.appointmentList}>
            {filteredAppointments.map(
              (appointment) => (
                <ShopOwnerAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onPress={() =>
                    openAppointment(appointment.id)
                  }
                />
              ),
            )}
          </View>
        )}

        {/* LOAD MORE APPOINTMENTS */}

        {!isLoading && hasMore ? (
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Load more appointments"
            disabled={isLoadingMore}
            onPress={() =>
              void loadMoreAppointments()
            }
            style={styles.loadMoreButton}
          >
            {isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Text style={styles.loadMoreText}>
                Load more appointments
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        {!isLoading && summary.total > 0 ? (
          <Text style={styles.paginationCaption}>
            Showing {appointments.length} loaded bookings
            {hasMore ? ` (page ${page})` : ''}
          </Text>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================================
   OVERVIEW STAT COMPONENT
   ========================================================== */

function OverviewStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.overviewStat}>
      <Text style={styles.overviewStatValue}>
        {value}
      </Text>

      <Text style={styles.overviewStatLabel}>
        {label}
      </Text>
    </View>
  );
}

/* ==========================================================
   STYLES
   ========================================================== */

const styles = StyleSheet.create({
  loadMoreButton: {
    marginTop: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: RADII.lg,
    backgroundColor: COLORS.primary,
  },

  loadMoreText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  paginationCaption: {
    marginTop: 10,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 48,
  },

  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    borderRadius: RADII.pill,
  },

  topBarTitleBlock: {
    flex: 1,
    marginLeft: 4,
  },

  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  refreshButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
    borderRadius: RADII.pill,
  },

  header: {
    marginTop: SPACING.lg,
  },

  eyebrow: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  title: {
    maxWidth: 470,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 540,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  overviewCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overviewLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  overviewValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  overviewIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  overviewStats: {
    marginTop: 18,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  overviewStat: {
    flex: 1,
  },

  overviewStatValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  overviewStatLabel: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
  },

  overviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  filterSection: {
    marginTop: SPACING.xxl,
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },

  filters: {
    gap: 8,
    paddingTop: 14,
    paddingRight: 6,
    paddingBottom: 2,
  },

  filterButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },

  filterButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  filterText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  filterTextSelected: {
    color: COLORS.white,
  },

  errorBox: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  errorContent: {
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

  listHeader: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
  },

  listTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  listSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  appointmentList: {
    gap: 12,
  },

  stateCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  stateIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
  },

  stateTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  stateText: {
    maxWidth: 320,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 340,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },
});
