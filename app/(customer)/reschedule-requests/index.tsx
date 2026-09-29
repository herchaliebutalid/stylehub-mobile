import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  getCustomerRescheduleRequests,
} from '@/src/services/customer-api';
import type {
  CustomerRescheduleRequest,
  RescheduleRequestStatus,
} from '@/src/types/customer';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

type RequestFilter =
  | 'all'
  | RescheduleRequestStatus;

type StatusPresentation = {
  icon: IconName;
  color: string;
  background: string;
};

const FILTERS: {
  value: RequestFilter;
  label: string;
  icon: IconName;
}[] = [
  {
    value: 'all',
    label: 'All',
    icon: 'apps-outline',
  },
  {
    value: 'pending',
    label: 'Pending',
    icon: 'time-outline',
  },
  {
    value: 'approved',
    label: 'Approved',
    icon: 'checkmark-circle-outline',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    icon: 'close-circle-outline',
  },
  {
    value: 'withdrawn',
    label: 'Withdrawn',
    icon: 'arrow-undo-outline',
  },
];

function statusPresentation(
  status: RescheduleRequestStatus,
): StatusPresentation {
  switch (status) {
    case 'approved':
      return {
        icon:
          'checkmark-circle-outline',

        color:
          COLORS.green,

        background:
          COLORS.greenSoft,
      };

    case 'pending':
      return {
        icon:
          'time-outline',

        color:
          COLORS.warning,

        background:
          COLORS.warningSoft,
      };

    case 'withdrawn':
      return {
        icon:
          'arrow-undo-outline',

        color:
          COLORS.textMuted,

        background:
          COLORS.surfaceSoft,
      };

    case 'rejected':
    default:
      return {
        icon:
          'close-circle-outline',

        color:
          COLORS.danger,

        background:
          COLORS.dangerSoft,
      };
  }
}

function formatDate(
  value: string,
): string {
  const date =
    new Date(
      `${value}T12:00:00+08:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

function formatTime(
  value: string,
): string {
  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/,
    );

  if (!match) {
    return value;
  }

  const hour24 =
    Number(match[1]);

  const minute =
    match[2];

  if (
    Number.isNaN(hour24)
    || hour24 < 0
    || hour24 > 23
  ) {
    return value;
  }

  const suffix =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

function formatCreatedAt(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

export default function CustomerRescheduleRequestsScreen() {
  const { token } = useAuth();

  const [
    requests,
    setRequests,
  ] =
    useState<CustomerRescheduleRequest[]>(
      [],
    );

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<RequestFilter>(
      'all',
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const hasLoadedOnce =
    useRef(false);

  const loadRequests =
    useCallback(
      async (
        refreshing = false,
        silent = false,
      ): Promise<void> => {
        if (!token) {
          setRequests([]);
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
          const response =
            await getCustomerRescheduleRequests(
              token,
            );

          setRequests(
            response
              .data
              .reschedule_requests,
          );

          hasLoadedOnce.current =
            true;
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load reschedule requests.',
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
      void loadRequests(
        false,
        hasLoadedOnce.current,
      );

      return undefined;
    }, [loadRequests]),
  );

  const counts =
    useMemo(
      () => ({
        pending:
          requests.filter(
            (request) =>
              request.status
              === 'pending',
          ).length,

        approved:
          requests.filter(
            (request) =>
              request.status
              === 'approved',
          ).length,

        rejected:
          requests.filter(
            (request) =>
              request.status
              === 'rejected',
          ).length,

        withdrawn:
          requests.filter(
            (request) =>
              request.status
              === 'withdrawn',
          ).length,
      }),
      [requests],
    );

  const filteredRequests =
    useMemo(
      () =>
        selectedFilter === 'all'
          ? requests
          : requests.filter(
              (request) =>
                request.status
                === selectedFilter,
            ),
      [
        requests,
        selectedFilter,
      ],
    );

  function filterCount(
    filter: RequestFilter,
  ): number {
    if (filter === 'all') {
      return requests.length;
    }

    return counts[filter];
  }

  function openRequest(
    requestId: number,
  ): void {
    router.push({
      pathname:
        '/(customer)/reschedule-requests/[requestId]',

      params: {
        requestId:
          String(requestId),
      },
    });
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() =>
              void loadRequests(true)
            }
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.back()
            }
            style={styles.topIconButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View
            style={
              styles.topBarTitleBlock
            }
          >
            <Text
              style={
                styles.topBarTitle
              }
            >
              Reschedule requests
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Track schedule-change decisions
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh reschedule requests"
            disabled={
              isLoading
              || isRefreshing
            }
            onPress={() =>
              void loadRequests(true)
            }
            style={[
              styles.topIconButton,

              (
                isLoading
                || isRefreshing
              )
              && styles.disabledButton,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            SCHEDULE REQUESTS
          </Text>

          <Text style={styles.title}>
            Follow every request from
            submission to the Shop Owner&apos;s
            decision
          </Text>

          <Text style={styles.subtitle}>
            Pending requests can still be
            withdrawn. Approved, rejected, and
            withdrawn requests remain available
            here as your request history.
          </Text>
        </View>

        <View
          style={styles.overviewCard}
        >
          <View
            style={styles.overviewTopRow}
          >
            <View>
              <Text
                style={
                  styles.overviewLabel
                }
              >
                Pending decisions
              </Text>

              <Text
                style={
                  styles.overviewValue
                }
              >
                {counts.pending}
              </Text>
            </View>

            <View
              style={styles.overviewIcon}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View
            style={styles.overviewStats}
          >
            <SummaryItem
              label="Approved"
              value={
                String(
                  counts.approved,
                )
              }
            />

            <View
              style={
                styles.overviewDivider
              }
            />

            <SummaryItem
              label="Rejected"
              value={
                String(
                  counts.rejected,
                )
              }
            />

            <View
              style={
                styles.overviewDivider
              }
            />

            <SummaryItem
              label="Withdrawn"
              value={
                String(
                  counts.withdrawn,
                )
              }
            />
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <View
              style={styles.errorIcon}
            >
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <View
              style={styles.errorCopy}
            >
              <Text
                style={styles.errorTitle}
              >
                Requests need attention
              </Text>

              <Text
                style={styles.errorText}
              >
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={styles.sectionHeading}
        >
          <View
            style={
              styles.sectionHeadingCopy
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Request history
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Filter by the status returned by
              Laravel.
            </Text>
          </View>

          {!isLoading ? (
            <View
              style={styles.totalBadge}
            >
              <Text
                style={
                  styles.totalBadgeText
                }
              >
                {requests.length}
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          {FILTERS.map(
            (filter) => {
              const selected =
                selectedFilter
                === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected,
                  }}
                  onPress={() =>
                    setSelectedFilter(
                      filter.value,
                    )
                  }
                  style={[
                    styles.filterChip,

                    selected
                    && styles.filterChipSelected,
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

                      selected
                      && styles.filterChipTextSelected,
                    ]}
                  >
                    {filter.label}
                  </Text>

                  <View
                    style={[
                      styles.filterCount,

                      selected
                      && styles.filterCountSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,

                        selected
                        && styles.filterCountTextSelected,
                      ]}
                    >
                      {filterCount(
                        filter.value,
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>

        {isLoading ? (
          <View
            style={styles.loadingCard}
          >
            <View
              style={styles.loadingIcon}
            >
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.loadingTitle}
            >
              Loading requests
            </Text>

            <Text
              style={styles.loadingText}
            >
              Getting your pending and past
              schedule-change requests.
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={27}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No reschedule requests yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              Requests you submit from an
              eligible appointment will appear
              here.
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                router.push(
                  '/(customer)/customer/appointments',
                )
              }
              style={styles.emptyButton}
            >
              <Ionicons
                name="calendar-outline"
                size={17}
                color={COLORS.white}
              />

              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Open bookings
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredRequests.length
          === 0 ? (
          <View
            style={
              styles.filteredEmptyCard
            }
          >
            <View
              style={
                styles.filteredEmptyIcon
              }
            >
              <Ionicons
                name="filter-outline"
                size={22}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={
                styles.filteredEmptyTitle
              }
            >
              No requests with this status
            </Text>

            <Text
              style={
                styles.filteredEmptyText
              }
            >
              Choose another filter to view the
              rest of your request history.
            </Text>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                setSelectedFilter('all')
              }
              style={styles.showAllButton}
            >
              <Text
                style={
                  styles.showAllButtonText
                }
              >
                Show all requests
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredRequests.map(
              (request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onPress={() =>
                    openRequest(
                      request.id,
                    )
                  }
                />
              ),
            )}
          </View>
        )}
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

function RequestCard({
  request,
  onPress,
}: {
  request: CustomerRescheduleRequest;
  onPress: () => void;
}) {
  const status =
    statusPresentation(
      request.status,
    );

  const createdAt =
    formatCreatedAt(
      request.created_at,
    );

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Open reschedule request ${request.id}`}
      onPress={onPress}
      style={styles.requestCard}
    >
      <View
        style={[
          styles.requestAccent,
          {
            backgroundColor:
              status.color,
          },
        ]}
      />

      <View
        style={styles.requestHeader}
      >
        <View
          style={styles.requestIcon}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={20}
            color={COLORS.navy}
          />
        </View>

        <View
          style={styles.requestHeading}
        >
          <Text
            numberOfLines={1}
            style={styles.requestShop}
          >
            {
              request
                .appointment
                ?.shop
                .name
              ?? 'StyleHub Shop'
            }
          </Text>

          <Text
            numberOfLines={1}
            style={styles.requestService}
          >
            {
              request
                .appointment
                ?.service_name
              ?? 'Appointment'
            }
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <Ionicons
            name={status.icon}
            size={12}
            color={status.color}
          />

          <Text
            style={[
              styles.statusText,
              {
                color:
                  status.color,
              },
            ]}
          >
            {request.status_label}
          </Text>
        </View>
      </View>

      <View
        style={styles.scheduleCard}
      >
        <View
          style={styles.scheduleIcon}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={COLORS.navy}
          />
        </View>

        <View
          style={styles.scheduleCopy}
        >
          <Text
            style={styles.scheduleLabel}
          >
            Requested schedule
          </Text>

          <Text
            style={styles.scheduleDate}
          >
            {formatDate(
              request.requested_date,
            )}
          </Text>

          <Text
            style={styles.scheduleTime}
          >
            {formatTime(
              request.requested_starts_at,
            )}{' '}
            –{' '}
            {formatTime(
              request.requested_ends_at,
            )}
          </Text>
        </View>
      </View>

      {request.customer_reason?.trim()
        ? (
          <View
            style={styles.reasonPreview}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={15}
              color={COLORS.textMuted}
            />

            <Text
              numberOfLines={2}
              style={
                styles.reasonPreviewText
              }
            >
              {request.customer_reason}
            </Text>
          </View>
        )
        : null}

      <View
        style={styles.requestFooter}
      >
        <Text
          style={styles.requestFooterText}
        >
          {createdAt
            ? `Submitted ${createdAt}`
            : `Request #${request.id}`}
        </Text>

        <View
          style={
            styles.requestFooterAction
          }
        >
          <Text
            style={
              styles.requestFooterActionText
            }
          >
            View request
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
    paddingBottom: 48,
  },

  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },

  topIconButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
  },

  topBarTitleBlock: {
    flex: 1,
    marginHorizontal: 6,
  },

  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    textAlign: 'center',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    textAlign: 'center',
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

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
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

  list: {
    marginTop: 14,
    gap: 10,
  },

  requestCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  requestAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },

  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 2,
  },

  requestIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  requestHeading: {
    flex: 1,
    minWidth: 0,
  },

  requestShop: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  requestService: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  statusBadge: {
    maxWidth: 112,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  statusText: {
    flexShrink: 1,
    fontSize: 8,
    fontWeight: '800',
  },

  scheduleCard: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  scheduleIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  scheduleCopy: {
    flex: 1,
  },

  scheduleLabel: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  scheduleDate: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  scheduleTime: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  reasonPreview: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  reasonPreviewText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  requestFooter: {
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  requestFooterText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
  },

  requestFooterAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  requestFooterActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.48,
  },
});