
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
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

import CustomerAppointmentCard from '@/src/components/CustomerAppointmentCard';
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
  AppointmentStatus,
  CustomerAppointment,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];
type AppointmentFilter = 'all' | AppointmentStatus | 'no_show';

const PAGE_SIZE = 20;

type AppointmentSummary = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  no_show: number;
  cancelled: number;
  declined: number;
};

type PaginatedAppointmentsResponse = {
  success: boolean;
  data: {
    appointments: CustomerAppointment[];
    summary?: AppointmentSummary;
    pagination?: {
      current_page: number;
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

function buildAppointmentsPath(
  filter: AppointmentFilter,
  page: number,
): string {
  const status = filter === 'all' ? '' : `&status=${filter}`;
  return `/customer/appointments?page=${page}&per_page=${PAGE_SIZE}${status}`;
}

function mergeAppointments(
  current: CustomerAppointment[],
  incoming: CustomerAppointment[],
): CustomerAppointment[] {
  const byId = new Map<number, CustomerAppointment>();

  current.forEach((item) => byId.set(item.id, item));
  incoming.forEach((item) => byId.set(item.id, item));

  return [...byId.values()];
}

type FilterDefinition = {
  value: AppointmentFilter;
  label: string;
  shortLabel: string;
  icon: IconName;
};

const FILTERS: FilterDefinition[] = [
  {
    value: 'all',
    label: 'All bookings',
    shortLabel: 'All',
    icon: 'apps-outline',
  },
  {
    value: 'pending',
    label: 'Pending',
    shortLabel: 'Pending',
    icon: 'time-outline',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
    shortLabel: 'Confirmed',
    icon: 'checkmark-circle-outline',
  },
  {
    value: 'completed',
    label: 'Completed',
    shortLabel: 'Completed',
    icon: 'checkmark-done-outline',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    icon: 'close-circle-outline',
  },
  {
    value: 'declined',
    label: 'Declined',
    shortLabel: 'Declined',
    icon: 'remove-circle-outline',
  },
  {
    value: 'no_show',
    label: 'No-show',
    shortLabel: 'No-show',
    icon: 'person-remove-outline',
  },
];

function appointmentSortKey(
  appointment: CustomerAppointment,
): string {
  return `${appointment.appointment_date} ${appointment.starts_at}`;
}

export default function CustomerAppointmentsScreen() {
  const { token } = useAuth();

  const [appointments, setAppointments] =
    useState<CustomerAppointment[]>([]);

  const [selectedFilter, setSelectedFilter] =
    useState<AppointmentFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [summary, setSummary] =
    useState<AppointmentSummary>(EMPTY_SUMMARY);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasLoadedOnce = useRef(false);
  const lastLoadedKey = useRef('');
  const requestVersion = useRef(0);
  const loadingMore = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);

  // Load page 1 whenever the screen, filter, or token changes.
  const loadAppointments = useCallback(
    async (
      refreshing = false,
      silent = false,
    ): Promise<void> => {
      const version = ++requestVersion.current;

      loadingMore.current = false;
      setIsLoadingMore(false);
      pageRef.current = 1;
      hasMoreRef.current = false;

      if (!token) {
        setAppointments([]);
        setSummary(EMPTY_SUMMARY);
        setHasMore(false);
        setPage(1);
        setIsLoading(false);
        setIsRefreshing(false);
        hasLoadedOnce.current = false;
        lastLoadedKey.current = '';
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
            buildAppointmentsPath(selectedFilter, 1),
            { token },
          );

        if (requestVersion.current !== version) return;

        setAppointments(response.data.appointments);

        const nextSummary = response.data.summary ?? {
          ...EMPTY_SUMMARY,
          total: response.data.appointments.length,
        };

        setSummary(nextSummary);
        setPage(1);

        const more =
          response.data.pagination?.has_more_pages ?? false;

        setHasMore(more);
        hasMoreRef.current = more;
        hasLoadedOnce.current = true;
        lastLoadedKey.current = `${token}:${selectedFilter}`;
      } catch (error) {
        if (requestVersion.current !== version) return;

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your appointments.',
        );
      } finally {
        if (requestVersion.current === version) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [token, selectedFilter],
  );

  // Load the next page without replacing previously loaded bookings.
  const loadMoreAppointments = useCallback(
    async (): Promise<void> => {
      if (
        !token ||
        loadingMore.current ||
        !hasMoreRef.current ||
        isLoading ||
        isRefreshing
      ) {
        return;
      }

      const version = requestVersion.current;
      const nextPage = pageRef.current + 1;

      loadingMore.current = true;
      setIsLoadingMore(true);
      setErrorMessage('');

      try {
        const response =
          await apiRequest<PaginatedAppointmentsResponse>(
            buildAppointmentsPath(selectedFilter, nextPage),
            { token },
          );

        if (requestVersion.current !== version) return;

        setAppointments((previous) =>
          mergeAppointments(
            previous,
            response.data.appointments,
          ),
        );

        pageRef.current = nextPage;
        setPage(nextPage);

        const more =
          response.data.pagination?.has_more_pages ?? false;

        hasMoreRef.current = more;
        setHasMore(more);

        if (response.data.summary) {
          setSummary(response.data.summary);
        }
      } catch (error) {
        if (requestVersion.current !== version) return;

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load more appointments.',
        );
      } finally {
        if (requestVersion.current === version) {
          loadingMore.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [token, selectedFilter, isLoading, isRefreshing],
  );

  useFocusEffect(
    useCallback(() => {
      const key = `${token}:${selectedFilter}`;

      void loadAppointments(
        false,
        hasLoadedOnce.current &&
          lastLoadedKey.current === key,
      );

      return () => {
        requestVersion.current += 1;
        loadingMore.current = false;
      };
    }, [token, selectedFilter, loadAppointments]),
  );

  // Accurate totals from Laravel, not only the loaded page.
  const statusCounts = summary;

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

  const historyAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === 'completed' ||
            appointment.status === 'cancelled' ||
            appointment.status === 'declined' ||
            String(appointment.status) === 'no_show',
        )
        .sort((first, second) =>
          appointmentSortKey(second).localeCompare(
            appointmentSortKey(first),
          ),
        ),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    if (selectedFilter === 'all') {
      return appointments;
    }

    return appointments.filter(
      (appointment) =>
        appointment.status === selectedFilter,
    );
  }, [appointments, selectedFilter]);

  const filteredSortedAppointments = useMemo(() => {
    if (
      selectedFilter === 'pending' ||
      selectedFilter === 'confirmed'
    ) {
      return [...filteredAppointments].sort(
        (first, second) =>
          appointmentSortKey(first).localeCompare(
            appointmentSortKey(second),
          ),
      );
    }

    return [...filteredAppointments].sort(
      (first, second) =>
        appointmentSortKey(second).localeCompare(
          appointmentSortKey(first),
        ),
    );
  }, [filteredAppointments, selectedFilter]);

  const upcomingCount = summary.pending + summary.confirmed;

  const historyCount =
    summary.completed +
    summary.cancelled +
    summary.declined +
    summary.no_show;

  function openAppointment(appointmentId: number): void {
    router.push({
      pathname:
        '/(customer)/customer-appointment/[appointmentId]',
      params: {
        appointmentId: String(appointmentId),
      },
    });
  }

  function filterCount(filter: AppointmentFilter): number {
    if (filter === 'all') {
      return summary.total;
    }

    return statusCounts[filter];
  }

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
            onRefresh={() => void loadAppointments(true)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Bookings
            </Text>

            <Text style={styles.topBarCaption}>
              Appointments &amp; booking history
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Open reschedule requests"
            onPress={() =>
              router.push('/(customer)/reschedule-requests')
            }
            style={styles.topActionButton}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            MY APPOINTMENTS
          </Text>

          <Text style={styles.title}>
            Keep track of upcoming visits and past bookings
          </Text>

          <Text style={styles.subtitle}>
            Open any appointment to view its full details and
            the actions currently allowed by your StyleHub
            booking rules.
          </Text>
        </View>

        {/* OVERVIEW */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTopRow}>
            <View>
              <Text style={styles.overviewLabel}>
                Upcoming bookings
              </Text>

              <Text style={styles.overviewValue}>
                {upcomingCount}
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
            <SummaryItem
              label="Pending"
              value={String(statusCounts.pending)}
            />

            <View style={styles.overviewDivider} />

            <SummaryItem
              label="Confirmed"
              value={String(statusCounts.confirmed)}
            />

            <View style={styles.overviewDivider} />

            <SummaryItem
              label="History"
              value={String(historyCount)}
            />
          </View>
        </View>

        {/* RESCHEDULE REQUESTS */}
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Open reschedule requests"
          onPress={() =>
            router.push('/(customer)/reschedule-requests')
          }
          style={styles.rescheduleCard}
        >
          <View style={styles.rescheduleIcon}>
            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color={COLORS.violet}
            />
          </View>

          <View style={styles.rescheduleCopy}>
            <Text style={styles.rescheduleTitle}>
              Reschedule requests
            </Text>

            <Text style={styles.rescheduleText}>
              Track pending, approved, rejected, and withdrawn
              schedule requests.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.textLight}
          />
        </TouchableOpacity>

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
                Bookings need attention
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {/* FILTER HEADING */}
        <View style={styles.filterHeading}>
          <View style={styles.filterHeadingCopy}>
            <Text style={styles.sectionTitle}>
              Your bookings
            </Text>

            <Text style={styles.sectionSubtitle}>
              Filter by the appointment status returned by Laravel.
            </Text>
          </View>

          {!isLoading ? (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {summary.total}
              </Text>
            </View>
          ) : null}
        </View>

        {/* STATUS FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const selected =
              selectedFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() =>
                  setSelectedFilter(filter.value)
                }
                style={[
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                ]}
              >
                <Ionicons
                  name={filter.icon}
                  size={14}
                  color={
                    selected
                      ? COLORS.white
                      : COLORS.textMuted
                  }
                />

                <Text
                  style={[
                    styles.filterChipText,
                    selected &&
                      styles.filterChipTextSelected,
                  ]}
                >
                  {filter.shortLabel}
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    selected &&
                      styles.filterCountSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      selected &&
                        styles.filterCountTextSelected,
                    ]}
                  >
                    {filterCount(filter.value)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* BOOKING CONTENT */}
        {isLoading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.loadingTitle}>
              Loading your bookings
            </Text>

            <Text style={styles.loadingText}>
              Getting your appointment history and current
              booking statuses.
            </Text>
          </View>
        ) : summary.total === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No bookings yet
            </Text>

            <Text style={styles.emptyText}>
              When you book a service from an approved
              StyleHub shop, your appointment will appear here.
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Discover shops"
              onPress={() =>
                router.push('/(customer)/customer/shops')
              }
              style={styles.emptyButton}
            >
              <Ionicons
                name="storefront-outline"
                size={17}
                color={COLORS.white}
              />

              <Text style={styles.emptyButtonText}>
                Discover shops
              </Text>
            </TouchableOpacity>
          </View>
        ) : selectedFilter === 'all' ? (
          <>
            <BookingSection
              title="Upcoming"
              subtitle="Pending and confirmed appointments, ordered by schedule."
              icon="calendar-outline"
              count={upcomingCount}
              appointments={upcomingAppointments}
              emptyTitle="No upcoming bookings"
              emptyText="You do not have any pending or confirmed appointments right now."
              onOpenAppointment={openAppointment}
            />

            <BookingSection
              title="Booking history"
              subtitle="Completed, cancelled, and declined appointments."
              icon="time-outline"
              count={historyCount}
              appointments={historyAppointments}
              emptyTitle="No booking history yet"
              emptyText="Completed or closed appointments will appear here."
              onOpenAppointment={openAppointment}
            />
          </>
        ) : filteredSortedAppointments.length === 0 ? (
          <View style={styles.filteredEmptyCard}>
            <View style={styles.filteredEmptyIcon}>
              <Ionicons
                name={
                  FILTERS.find(
                    (filter) =>
                      filter.value === selectedFilter,
                  )?.icon ?? 'calendar-outline'
                }
                size={23}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.filteredEmptyTitle}>
              No{' '}
              {FILTERS.find(
                (filter) =>
                  filter.value === selectedFilter,
              )?.label.toLowerCase() ?? 'matching bookings'}
            </Text>

            <Text style={styles.filteredEmptyText}>
              There are no appointments with this status in
              your current booking history.
            </Text>

            <TouchableOpacity
              activeOpacity={0.76}
              onPress={() => setSelectedFilter('all')}
              style={styles.showAllButton}
            >
              <Text style={styles.showAllButtonText}>
                Show all bookings
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.filteredListSection}>
            <View style={styles.filteredListHeader}>
              <Text style={styles.filteredListTitle}>
                {FILTERS.find(
                  (filter) =>
                    filter.value === selectedFilter,
                )?.label ?? 'Bookings'}
              </Text>

              <Text style={styles.filteredListCount}>
                {filterCount(selectedFilter)}{' '}
                appointment
                {filterCount(selectedFilter) === 1
                  ? ''
                  : 's'}
              </Text>
            </View>

            <View style={styles.list}>
              {filteredSortedAppointments.map(
                (appointment) => (
                  <CustomerAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onPress={() =>
                      openAppointment(appointment.id)
                    }
                  />
                ),
              )}
            </View>
          </View>
        )}

        {/* PAGINATION */}
        {!isLoading && hasMore ? (
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Load more appointments"
            disabled={isLoadingMore}
            onPress={() => void loadMoreAppointments()}
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
            {selectedFilter !== 'all'
              ? ` in ${selectedFilter.replace('_', '-')}`
              : ''}
            {hasMore ? ` (page ${page})` : ''}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function BookingSection({
  title,
  subtitle,
  icon,
  count,
  appointments,
  emptyTitle,
  emptyText,
  onOpenAppointment,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  count: number;
  appointments: CustomerAppointment[];
  emptyTitle: string;
  emptyText: string;
  onOpenAppointment: (appointmentId: number) => void;
}) {
  return (
    <View style={styles.bookingSection}>
      <View style={styles.bookingSectionHeader}>
        <View style={styles.bookingSectionIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.bookingSectionCopy}>
          <Text style={styles.bookingSectionTitle}>
            {title}
          </Text>

          <Text style={styles.bookingSectionText}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.bookingSectionCount}>
          <Text style={styles.bookingSectionCountText}>
            {count}
          </Text>
        </View>
      </View>

      {appointments.length === 0 ? (
        <View style={styles.sectionEmptyCard}>
          <Text style={styles.sectionEmptyTitle}>
            {count > 0 ? 'More bookings to load' : emptyTitle}
          </Text>

          <Text style={styles.sectionEmptyText}>
            {count > 0
              ? 'Load more appointments below to see these bookings.'
              : emptyText}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {appointments.map((appointment) => (
            <CustomerAppointmentCard
              key={appointment.id}
              appointment={appointment}
              onPress={() =>
                onOpenAppointment(appointment.id)
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

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
    fontWeight: '800',
    fontSize: TYPOGRAPHY.body,
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
    paddingBottom: 110,
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitleBlock: {
    flex: 1,
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
  topActionButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
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
    maxWidth: 590,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    maxWidth: 620,
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
  overviewTopRow: {
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
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },
  summaryItem: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },
  overviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },
  rescheduleCard: {
    marginTop: 12,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  rescheduleIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.violetSoft,
  },
  rescheduleCopy: {
    flex: 1,
  },
  rescheduleTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },
  rescheduleText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },
  errorBox: {
    marginTop: 12,
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
  filterHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  filterHeadingCopy: {
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
  totalBadge: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },
  totalBadgeText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },
  filterRow: {
    gap: 7,
    paddingRight: 4,
    paddingBottom: 3,
  },
  filterChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },
  filterChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },
  filterChipTextSelected: {
    color: COLORS.white,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },
  filterCountSelected: {
    backgroundColor: COLORS.navyMuted,
  },
  filterCountText: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '800',
  },
  filterCountTextSelected: {
    color: COLORS.white,
  },
  loadingCard: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },
  loadingIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
  },
  loadingTitle: {
    marginTop: 13,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },
  loadingText: {
    maxWidth: 350,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyCard: {
    marginTop: 14,
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
    maxWidth: 370,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },
  bookingSection: {
    marginTop: SPACING.xxl,
  },
  bookingSectionHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookingSectionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },
  bookingSectionCopy: {
    flex: 1,
  },
  bookingSectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },
  bookingSectionText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },
  bookingSectionCount: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },
  bookingSectionCountText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },
  sectionEmptyCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },
  sectionEmptyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },
  sectionEmptyText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  filteredListSection: {
    marginTop: SPACING.xxl,
  },
  filteredListHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  filteredListTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },
  filteredListCount: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },
  filteredEmptyCard: {
    marginTop: 14,
    alignItems: 'center',
    padding: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },
  filteredEmptyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: COLORS.accentSoft,
  },
  filteredEmptyTitle: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    textAlign: 'center',
  },
  filteredEmptyText: {
    maxWidth: 350,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  showAllButton: {
    minHeight: 40,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },
  showAllButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },
});
