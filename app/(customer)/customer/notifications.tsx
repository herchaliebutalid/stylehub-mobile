
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
  getInAppNotifications,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
} from '@/src/services/in-app-notification-api';
import type {
  InAppNotification,
  InAppNotificationPagination,
  InAppNotificationStatusFilter,
  InAppNotificationTarget,
  InAppNotificationType,
} from '@/src/types/in-app-notification';

type IconName = ComponentProps<typeof Ionicons>['name'];

type NotificationTone = {
  icon: IconName;
  background: string;
  color: string;
};

const PER_PAGE = 20;

const FILTERS: {
  value: InAppNotificationStatusFilter;
  label: string;
  icon: IconName;
}[] = [
  {
    value: 'all',
    label: 'All',
    icon: 'apps-outline',
  },
  {
    value: 'unread',
    label: 'Unread',
    icon: 'ellipse-outline',
  },
  {
    value: 'read',
    label: 'Read',
    icon: 'checkmark-done-outline',
  },
];

/* NOTIFICATION APPEARANCE */

function getNotificationTone(
  type: InAppNotificationType,
): NotificationTone {
  switch (type) {
    case 'appointment_confirmed':
      return {
        icon: 'checkmark-circle-outline',
        background: COLORS.greenSoft,
        color: COLORS.green,
      };

    case 'appointment_completed':
      return {
        icon: 'checkmark-done-outline',
        background: COLORS.greenSoft,
        color: COLORS.green,
      };

    case 'reschedule_approved':
      return {
        icon: 'calendar-number-outline',
        background: COLORS.greenSoft,
        color: COLORS.green,
      };

    case 'appointment_declined':
      return {
        icon: 'close-circle-outline',
        background: COLORS.dangerSoft,
        color: COLORS.danger,
      };

    case 'appointment_cancelled':
      return {
        icon: 'calendar-clear-outline',
        background: COLORS.dangerSoft,
        color: COLORS.danger,
      };

    case 'reschedule_rejected':
      return {
        icon: 'close-circle-outline',
        background: COLORS.dangerSoft,
        color: COLORS.danger,
      };

    case 'review_received':
      return {
        icon: 'star-outline',
        background: COLORS.orangeSoft,
        color: COLORS.orange,
      };

    case 'promo_available':
      return {
        icon: 'pricetag-outline',
        background: COLORS.orangeSoft,
        color: COLORS.orange,
      };

    case 'appointment_reminder':
      return {
        icon: 'alarm-outline',
        background: COLORS.blueSoft,
        color: COLORS.blue,
      };

    case 'reschedule_requested':
      return {
        icon: 'swap-horizontal-outline',
        background: COLORS.violetSoft,
        color: COLORS.violet,
      };

    case 'booking_received':
    default:
      return {
        icon: 'calendar-outline',
        background: COLORS.blueSoft,
        color: COLORS.blue,
      };
  }
}

function canOpenTarget(
  target: InAppNotificationTarget | null,
): boolean {
  return (
    target?.kind === 'appointment' ||
    target?.kind === 'reschedule_request'
  );
}

/* DATE FORMATTING */

function formatRelativeTime(value: string | null): string {
  if (!value) return '';

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) return '';

  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  const date = new Date(timestamp);

  try {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year:
        new Date().getFullYear() !== date.getFullYear()
          ? 'numeric'
          : undefined,
      timeZone: 'Asia/Manila',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function filterDescription(
  filter: InAppNotificationStatusFilter,
): string {
  switch (filter) {
    case 'unread':
      return 'Updates that still need your attention.';

    case 'read':
      return 'Notifications you have already opened or marked as read.';

    case 'all':
    default:
      return 'Booking, appointment, reschedule, promotion, and review updates.';
  }
}

function emptyState(
  filter: InAppNotificationStatusFilter,
): {
  icon: IconName;
  title: string;
  message: string;
} {
  switch (filter) {
    case 'unread':
      return {
        icon: 'checkmark-done-outline',
        title: 'You are all caught up',
        message:
          'There are no unread StyleHub notifications right now.',
      };

    case 'read':
      return {
        icon: 'checkmark-circle-outline',
        title: 'No read notifications',
        message:
          'Notifications you have already read will appear here.',
      };

    case 'all':
    default:
      return {
        icon: 'notifications-outline',
        title: 'No notifications yet',
        message:
          'Your booking, reschedule, review, and promotion updates will appear here.',
      };
  }
}

/* CUSTOMER NOTIFICATIONS SCREEN */

export default function CustomerNotificationsScreen() {
  const { token, user } = useAuth();

  const {
    unreadCount,
    refreshUnreadCount,
    syncUnreadCount,
    acknowledgeOneRead,
    acknowledgeAllRead,
  } = useInAppNotifications();

  const [notifications, setNotifications] =
    useState<InAppNotification[]>([]);

  const [pagination, setPagination] =
    useState<InAppNotificationPagination | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<InAppNotificationStatusFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const [activeNotificationId, setActiveNotificationId] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const requestSequence = useRef(0);
  const hasLoadedOnce = useRef(false);

  /* LOAD NOTIFICATIONS */

  const loadNotifications = useCallback(
    async ({
      page,
      replace,
      refreshing = false,
      silent = false,
    }: {
      page: number;
      replace: boolean;
      refreshing?: boolean;
      silent?: boolean;
    }): Promise<void> => {
      if (!token || !user || user.role !== 'customer') {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        return;
      }

      const sequence = ++requestSequence.current;

      if (refreshing) {
        setIsRefreshing(true);
      } else if (page > 1) {
        setIsLoadingMore(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      setErrorMessage('');
      setSuccessMessage('');

      try {
        const response = await getInAppNotifications(
          token,
          {
            status: statusFilter,
            page,
            perPage: PER_PAGE,
          },
        );

        if (sequence !== requestSequence.current) {
          return;
        }

        const incoming = response.data.notifications;

        if (replace) {
          setNotifications(incoming);
        } else {
          setNotifications((current) => {
            const existingIds = new Set(
              current.map((notification) => notification.id),
            );

            return [
              ...current,
              ...incoming.filter(
                (notification) =>
                  !existingIds.has(notification.id),
              ),
            ];
          });
        }

        setPagination(response.data.pagination);
        syncUnreadCount(response.data.unread_count);
        hasLoadedOnce.current = true;
      } catch (error) {
        if (sequence !== requestSequence.current) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load notifications. Please try again.',
        );
      } finally {
        if (sequence === requestSequence.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [statusFilter, syncUnreadCount, token, user],
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications({
        page: 1,
        replace: true,
        silent: hasLoadedOnce.current,
      });

      void refreshUnreadCount();

      return () => {
        requestSequence.current += 1;
      };
    }, [loadNotifications, refreshUnreadCount]),
  );

  const loadedUnreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.is_read,
      ).length,
    [notifications],
  );

  const empty = emptyState(statusFilter);

  /* OPEN NOTIFICATION DESTINATION */

  function openTarget(
    target: InAppNotificationTarget,
  ): void {
    if (target.kind === 'appointment') {
      router.push({
        pathname:
          '/(customer)/customer-appointment/[appointmentId]',
        params: {
          appointmentId: String(target.id),
        },
      });

      return;
    }

    if (target.kind === 'reschedule_request') {
      router.push({
        pathname:
          '/(customer)/reschedule-requests/[requestId]',
        params: {
          requestId: String(target.id),
        },
      });
    }
  }

  /* MARK INDIVIDUAL NOTIFICATION READ */

  async function handleNotificationPress(
    notification: InAppNotification,
  ): Promise<void> {
    if (activeNotificationId !== null) {
      return;
    }

    const opensDetail = canOpenTarget(notification.target);

    if (notification.is_read) {
      if (opensDetail && notification.target) {
        openTarget(notification.target);
      }

      return;
    }

    if (!token) return;

    setActiveNotificationId(notification.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await markInAppNotificationRead(
        token,
        notification.id,
      );

      const updatedNotification =
        response.data.notification;

      if (statusFilter === 'unread') {
        setNotifications((current) =>
          current.filter(
            (item) => item.id !== notification.id,
          ),
        );

        setPagination((current) =>
          current
            ? {
                ...current,
                total: Math.max(0, current.total - 1),
              }
            : current,
        );
      } else {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? updatedNotification
              : item,
          ),
        );
      }

      acknowledgeOneRead();

      if (opensDetail && updatedNotification.target) {
        openTarget(updatedNotification.target);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update this notification. Please try again.',
      );
    } finally {
      setActiveNotificationId(null);
    }
  }

  /* MARK ALL AS READ */

  async function handleMarkAllRead(): Promise<void> {
    if (
      !token ||
      unreadCount === 0 ||
      isMarkingAllRead
    ) {
      return;
    }

    setIsMarkingAllRead(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await markAllInAppNotificationsRead(
        token,
      );

      syncUnreadCount(response.data.unread_count);
      acknowledgeAllRead();

      if (statusFilter === 'unread') {
        setNotifications([]);

        setPagination((current) =>
          current
            ? {
                ...current,
                total: 0,
                current_page: 1,
                last_page: 1,
                has_more_pages: false,
              }
            : current,
        );
      } else {
        const localReadAt = new Date().toISOString();

        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            is_read: true,
            read_at:
              notification.read_at ?? localReadAt,
          })),
        );
      }

      setSuccessMessage(
        response.message ??
          (response.data.marked_read_count > 0
            ? `${response.data.marked_read_count} notification${
                response.data.marked_read_count === 1
                  ? ''
                  : 's'
              } marked as read.`
            : 'Your notifications are already up to date.'),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to mark notifications as read. Please try again.',
      );
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  /* FILTERING */

  function selectFilter(
    filter: InAppNotificationStatusFilter,
  ): void {
    if (
      filter === statusFilter ||
      isLoading ||
      isRefreshing ||
      isLoadingMore ||
      activeNotificationId !== null
    ) {
      return;
    }

    setNotifications([]);
    setPagination(null);
    setErrorMessage('');
    setSuccessMessage('');
    setStatusFilter(filter);
  }

  /* PAGINATION */

  function loadMore(): void {
    if (
      !pagination?.has_more_pages ||
      isLoadingMore ||
      isRefreshing ||
      activeNotificationId !== null
    ) {
      return;
    }

    void loadNotifications({
      page: pagination.current_page + 1,
      replace: false,
    });
  }

  /* UNAUTHORIZED USER STATE */

  if (user && user.role !== 'customer') {
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

        <View style={styles.unavailableContainer}>
          <View style={styles.unavailableIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={30}
              color={COLORS.danger}
            />
          </View>

          <Text style={styles.unavailableTitle}>
            Notifications unavailable
          </Text>

          <Text style={styles.unavailableText}>
            This notification center is only available
            to Customer accounts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* MAIN SCREEN */

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
              void loadNotifications({
                page: 1,
                replace: true,
                refreshing: true,
              })
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
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.topIconButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Notifications
            </Text>

            <Text style={styles.topBarCaption}>
              Booking &amp; account updates
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh notifications"
            disabled={
              isRefreshing ||
              isLoading ||
              isLoadingMore
            }
            onPress={() =>
              void loadNotifications({
                page: 1,
                replace: true,
                refreshing: true,
              })
            }
            style={[
              styles.topIconButton,
              (isRefreshing ||
                isLoading ||
                isLoadingMore) &&
                styles.disabledButton,
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

        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            NOTIFICATION CENTER
          </Text>

          <Text style={styles.title}>
            Stay updated without leaving your booking flow
          </Text>

          <Text style={styles.subtitle}>
            Appointment changes, reschedule decisions,
            reminders, promotions, and other StyleHub
            updates are collected here.
          </Text>
        </View>

        {/* MESSAGES */}

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Notifications need attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Notifications updated"
            message={successMessage}
          />
        ) : null}

        {/* UNREAD SUMMARY */}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>
                Unread notifications
              </Text>

              <Text style={styles.heroValue}>
                {unreadCount}
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="notifications-outline"
                size={25}
                color={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.heroStats}>
            <SummaryItem
              label="Current filter"
              value={
                statusFilter === 'all'
                  ? 'All'
                  : statusFilter === 'unread'
                    ? 'Unread'
                    : 'Read'
              }
            />

            <View style={styles.heroDivider} />

            <SummaryItem
              label="Matching"
              value={String(
                pagination?.total ??
                  notifications.length,
              )}
            />

            <View style={styles.heroDivider} />

            <SummaryItem
              label="Unread loaded"
              value={String(loadedUnreadCount)}
            />
          </View>
        </View>

        {/* MARK ALL AS READ */}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={
              unreadCount === 0 ||
              isMarkingAllRead
            }
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            onPress={() => void handleMarkAllRead()}
            style={[
              styles.markAllButton,
              (unreadCount === 0 ||
                isMarkingAllRead) &&
                styles.markAllButtonDisabled,
            ]}
          >
            {isMarkingAllRead ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={COLORS.white}
              />
            )}

            <Text style={styles.markAllButtonText}>
              {isMarkingAllRead
                ? 'Updating...'
                : 'Mark all read'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionInfo}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={COLORS.textMuted}
            />

            <Text style={styles.actionInfoText}>
              Tapping an unread item marks it as read first.
            </Text>
          </View>
        </View>

        {/* YOUR UPDATES */}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            Your updates
          </Text>

          <Text style={styles.sectionSubtitle}>
            {filterDescription(statusFilter)}
          </Text>
        </View>

        {/* FILTER CHIPS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const selected =
              statusFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={
                  isLoading ||
                  isRefreshing ||
                  isLoadingMore ||
                  activeNotificationId !== null
                }
                onPress={() =>
                  selectFilter(filter.value)
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
                  {filter.label}
                </Text>

                {filter.value === 'unread' &&
                unreadCount > 0 ? (
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
                      {unreadCount > 99
                        ? '99+'
                        : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* NOTIFICATION CONTENT */}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.loadingTitle}>
              Loading notifications
            </Text>

            <Text style={styles.loadingText}>
              Getting the latest StyleHub updates
              for your customer account.
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={empty.icon}
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {empty.title}
            </Text>

            <Text style={styles.emptyText}>
              {empty.message}
            </Text>

            {statusFilter !== 'all' ? (
              <TouchableOpacity
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Show all notifications"
                onPress={() => selectFilter('all')}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>
                  Show all notifications
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                updating={
                  activeNotificationId === notification.id
                }
                disabled={activeNotificationId !== null}
                onPress={() =>
                  void handleNotificationPress(notification)
                }
              />
            ))}

            {pagination?.has_more_pages ? (
              <TouchableOpacity
                activeOpacity={0.78}
                disabled={isLoadingMore}
                accessibilityRole="button"
                accessibilityLabel="Load more notifications"
                onPress={loadMore}
                style={[
                  styles.loadMoreButton,
                  isLoadingMore && styles.disabledButton,
                ]}
              >
                {isLoadingMore ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.navy}
                  />
                ) : (
                  <Ionicons
                    name="chevron-down-outline"
                    size={17}
                    color={COLORS.navy}
                  />
                )}

                <Text style={styles.loadMoreText}>
                  {isLoadingMore
                    ? 'Loading more...'
                    : `Load more · page ${pagination.current_page} of ${pagination.last_page}`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* SECURITY NOTICE */}

        <View style={styles.footerNotice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={COLORS.green}
          />

          <Text style={styles.footerNoticeText}>
            Notification content, read status, and available
            destinations come from the existing StyleHub
            notification API. This screen does not change
            booking or reschedule status itself.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* SUMMARY ITEM */

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

      <Text
        numberOfLines={2}
        style={styles.summaryValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* NOTIFICATION CARD */

function NotificationCard({
  notification,
  updating,
  disabled,
  onPress,
}: {
  notification: InAppNotification;
  updating: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const tone = getNotificationTone(notification.type);
  const opensDetail = canOpenTarget(notification.target);

  const canPress =
    !disabled &&
    (!notification.is_read || opensDetail);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      accessibilityState={{ disabled: !canPress }}
      disabled={!canPress}
      onPress={onPress}
      style={[
        styles.notificationCard,
        !notification.is_read &&
          styles.notificationCardUnread,
        !canPress &&
          notification.is_read &&
          styles.notificationCardStatic,
      ]}
    >
      {!notification.is_read ? (
        <View style={styles.unreadBar} />
      ) : null}

      <View style={styles.notificationTopRow}>
        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor: tone.background,
            },
          ]}
        >
          <Ionicons
            name={tone.icon}
            size={20}
            color={tone.color}
          />
        </View>

        <View style={styles.notificationHeading}>
          <View style={styles.notificationTitleRow}>
            <Text
              numberOfLines={2}
              style={[
                styles.notificationTitle,
                !notification.is_read &&
                  styles.notificationTitleUnread,
              ]}
            >
              {notification.title}
            </Text>

            {!notification.is_read ? (
              <View style={styles.unreadDot} />
            ) : null}
          </View>

          <Text style={styles.notificationTime}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>
      </View>

      <Text style={styles.notificationMessage}>
        {notification.message}
      </Text>

      <View style={styles.notificationFooter}>
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: tone.background,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.typeBadgeText,
              {
                color: tone.color,
              },
            ]}
          >
            {notification.type_label}
          </Text>
        </View>

        <View style={styles.notificationAction}>
          {updating ? (
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          ) : (
            <>
              <Text style={styles.notificationActionText}>
                {opensDetail
                  ? notification.is_read
                    ? 'View details'
                    : 'Read &amp; view'
                  : notification.is_read
                    ? 'Read'
                    : 'Mark read'}
              </Text>

              {opensDetail ? (
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={COLORS.navy}
                />
              ) : null}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* STATUS MESSAGE */

function MessageBox({
  type,
  title,
  message,
}: {
  type: 'success' | 'error';
  title: string;
  message: string;
}) {
  const success = type === 'success';

  return (
    <View
      style={[
        styles.messageBox,
        {
          backgroundColor: success
            ? COLORS.successSoft
            : COLORS.dangerSoft,
        },
      ]}
    >
      <View style={styles.messageIcon}>
        <Ionicons
          name={
            success
              ? 'checkmark-circle-outline'
              : 'alert-circle-outline'
          }
          size={20}
          color={
            success
              ? COLORS.success
              : COLORS.danger
          }
        />
      </View>

      <View style={styles.messageContent}>
        <Text
          style={[
            styles.messageTitle,
            {
              color: success
                ? COLORS.success
                : COLORS.danger,
            },
          ]}
        >
          {title}
        </Text>

        <Text style={styles.messageText}>
          {message}
        </Text>
      </View>
    </View>
  );
}

/* STYLES */

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
    paddingTop: 40,
    paddingBottom: 110,
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

  messageBox: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
  },

  messageIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  messageContent: {
    flex: 1,
  },

  messageTitle: {
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  messageText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  heroCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  heroValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  heroStats: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
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
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '800',
  },

  heroDivider: {
    width: 1,
    marginHorizontal: 10,
    backgroundColor: COLORS.navyMuted,
  },

  actionsRow: {
    marginTop: 12,
    gap: 9,
  },

  markAllButton: {
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  markAllButtonDisabled: {
    opacity: 0.48,
  },

  markAllButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  actionInfo: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  actionInfoText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
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

  filterRow: {
    gap: 7,
    paddingRight: 4,
    paddingBottom: 4,
  },

  filterChip: {
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
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
    backgroundColor: COLORS.dangerSoft,
  },

  filterCountSelected: {
    backgroundColor: COLORS.navyMuted,
  },

  filterCountText: {
    color: COLORS.danger,
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
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  emptyButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  list: {
    marginTop: 14,
    gap: 10,
  },

  notificationCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  notificationCardUnread: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FCFDFE',
  },

  notificationCardStatic: {
    shadowOpacity: 0,
    elevation: 0,
  },

  unreadBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: COLORS.blue,
  },

  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  notificationIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  notificationHeading: {
    flex: 1,
    minWidth: 0,
  },

  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  notificationTitle: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 19,
    fontWeight: '700',
  },

  notificationTitleUnread: {
    fontWeight: '800',
  },

  unreadDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: COLORS.blue,
  },

  notificationTime: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  notificationMessage: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  notificationFooter: {
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  typeBadge: {
    flexShrink: 1,
    minHeight: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  typeBadgeText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '800',
  },

  notificationAction: {
    marginLeft: 'auto',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },

  notificationActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  loadMoreButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  loadMoreText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  footerNotice: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: RADII.md,
    backgroundColor: COLORS.greenSoft,
  },

  footerNoticeText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  unavailableIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.dangerSoft,
  },

  unavailableTitle: {
    marginTop: 15,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },

  unavailableText: {
    maxWidth: 340,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.48,
  },
});
