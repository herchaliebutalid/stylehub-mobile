import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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
import { useAuth } from '@/src/context/AuthContext';
import { useInAppNotifications } from '@/src/context/InAppNotificationContext';
import { ApiError } from '@/src/services/api';
import {
    getInAppNotifications,
    markAllInAppNotificationsRead,
    markInAppNotificationRead,
} from '@/src/services/in-app-notification-api';

import type { MobileUserRole } from '@/src/types/auth';

import type {
    InAppNotification,
    InAppNotificationPagination,
    InAppNotificationStatusFilter,
    InAppNotificationTarget,
    InAppNotificationType,
} from '@/src/types/in-app-notification';


/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const PER_PAGE =
  20;

const FILTERS: {
  value: InAppNotificationStatusFilter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'unread',
    label: 'Unread',
  },
  {
    value: 'read',
    label: 'Read',
  },
];


/* ==========================================================================
   PRESENTATION
   ========================================================================== */

interface NotificationTone {
  icon:
    keyof typeof Ionicons.glyphMap;

  backgroundColor:
    string;

  color:
    string;
}


function getNotificationTone(
  type: InAppNotificationType,
): NotificationTone {
  switch (
    type
  ) {
    case 'appointment_confirmed':
    case 'appointment_completed':
    case 'reschedule_approved':
      return {
        icon:
          type ===
          'appointment_confirmed'
            ? 'checkmark-circle-outline'
            : type ===
                'appointment_completed'
              ? 'checkmark-done-circle-outline'
              : 'calendar-number-outline',

        backgroundColor:
          COLORS.greenSoft,

        color:
          COLORS.green,
      };


    case 'appointment_declined':
    case 'appointment_cancelled':
    case 'reschedule_rejected':
      return {
        icon:
          type ===
          'appointment_declined'
            ? 'close-circle-outline'
            : type ===
                'appointment_cancelled'
              ? 'calendar-clear-outline'
              : 'time-outline',

        backgroundColor:
          COLORS.dangerSoft,

        color:
          COLORS.danger,
      };


    case 'review_received':
    case 'promo_available':
      return {
        icon:
          type ===
          'review_received'
            ? 'star-outline'
            : 'pricetag-outline',

        backgroundColor:
          COLORS.orangeSoft,

        color:
          COLORS.orange,
      };


    case 'appointment_reminder':
      return {
        icon:
          'alarm-outline',

        backgroundColor:
          COLORS.blueSoft,

        color:
          COLORS.blue,
      };


    case 'reschedule_requested':
      return {
        icon:
          'time-outline',

        backgroundColor:
          COLORS.blueSoft,

        color:
          COLORS.blue,
      };


    case 'booking_received':
    default:
      return {
        icon:
          'calendar-outline',

        backgroundColor:
          COLORS.blueSoft,

        color:
          COLORS.blue,
      };
  }
}


function formatRelativeTime(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return '';
  }

  const minutes =
    Math.floor(
      Math.max(
        0,
        Date.now() - timestamp,
      )
      /
      60_000,
    );

  if (
    minutes < 1
  ) {
    return 'Just now';
  }

  if (
    minutes < 60
  ) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (
    hours < 24
  ) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (
    days < 7
  ) {
    return `${days}d ago`;
  }

  const date =
    new Date(
      timestamp,
    );

  return date.toLocaleDateString(
    undefined,
    {
      month:
        'short',

      day:
        'numeric',

      year:
        new Date().getFullYear()
        !== date.getFullYear()
          ? 'numeric'
          : undefined,
    },
  );
}


function canOpenTarget(
  target: InAppNotificationTarget | null,
): boolean {
  return (
    target?.kind ===
      'appointment'
    ||
    target?.kind ===
      'reschedule_request'
  );
}


function emptyMessage(
  filter: InAppNotificationStatusFilter,
): string {
  if (
    filter ===
    'unread'
  ) {
    return 'You have no unread notifications right now.';
  }

  if (
    filter ===
    'read'
  ) {
    return 'Notifications you have already read will appear here.';
  }

  return 'Your appointment, reschedule, and review updates will appear here.';
}


/* ==========================================================================
   NOTIFICATION CENTER
   ========================================================================== */

export default function InAppNotificationCenterScreen({
  role,
}: {
  role:
    MobileUserRole;
}) {
  const {
    token,
    user,
  } =
    useAuth();

  const {
    unreadCount,
    refreshUnreadCount,
    syncUnreadCount,
    acknowledgeOneRead,
    acknowledgeAllRead,
  } =
    useInAppNotifications();


  /* ==========================================================================
     DATA
     ========================================================================== */

  const [
    notifications,
    setNotifications,
  ] =
    useState<InAppNotification[]>(
      [],
    );

  const [
    pagination,
    setPagination,
  ] =
    useState<InAppNotificationPagination | null>(
      null,
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<InAppNotificationStatusFilter>(
      'all',
    );


  /* ==========================================================================
     SCREEN STATE
     ========================================================================== */

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false,
    );

  const [
    isLoadingMore,
    setIsLoadingMore,
  ] =
    useState(
      false,
    );

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] =
    useState(
      false,
    );

  const [
    activeNotificationId,
    setActiveNotificationId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      '',
    );

  const requestSequence =
    useRef(
      0,
    );


  /* ==========================================================================
     LOAD
     ========================================================================== */

  const loadNotifications =
    useCallback(
      async ({
        page,
        replace,
        refreshing = false,
      }: {
        page:
          number;

        replace:
          boolean;

        refreshing?:
          boolean;
      }): Promise<void> => {
        if (
          !token
          ||
          !user
          ||
          user.role !==
            role
        ) {
          setIsLoading(
            false,
          );

          return;
        }

        const sequence =
          ++requestSequence.current;


        if (
          refreshing
        ) {
          setIsRefreshing(
            true,
          );
        } else if (
          page > 1
        ) {
          setIsLoadingMore(
            true,
          );
        } else {
          setIsLoading(
            true,
          );
        }


        setErrorMessage(
          '',
        );


        try {
          const response =
            await getInAppNotifications(
              token,
              {
                status:
                  statusFilter,

                page,

                perPage:
                  PER_PAGE,
              },
            );


          if (
            sequence !==
            requestSequence.current
          ) {
            return;
          }


          const incoming =
            response
              .data
              .notifications;


          if (
            replace
          ) {
            setNotifications(
              incoming,
            );
          } else {
            setNotifications(
              (
                current,
              ) => {
                const existingIds =
                  new Set(
                    current.map(
                      (
                        notification,
                      ) =>
                        notification.id,
                    ),
                  );

                return [
                  ...current,

                  ...incoming.filter(
                    (
                      notification,
                    ) =>
                      !existingIds.has(
                        notification.id,
                      ),
                  ),
                ];
              },
            );
          }


          setPagination(
            response
              .data
              .pagination,
          );


          syncUnreadCount(
            response
              .data
              .unread_count,
          );
        } catch (
          error
        ) {
          if (
            sequence !==
            requestSequence.current
          ) {
            return;
          }

          setErrorMessage(
            error instanceof
              ApiError
              ?
                error.message
              :
                'Unable to load notifications. Please try again.',
          );
        } finally {
          if (
            sequence ===
            requestSequence.current
          ) {
            setIsLoading(
              false,
            );

            setIsRefreshing(
              false,
            );

            setIsLoadingMore(
              false,
            );
          }
        }
      },
      [
        role,
        statusFilter,
        syncUnreadCount,
        token,
        user,
      ],
    );


  /* ==========================================================================
     FOCUS REFRESH
     ========================================================================== */

  useFocusEffect(
    useCallback(
      () => {
        void loadNotifications({
          page:
            1,

          replace:
            true,
        });

        void refreshUnreadCount();


        return () => {
          requestSequence.current +=
            1;
        };
      },
      [
        loadNotifications,
        refreshUnreadCount,
      ],
    ),
  );


  /* ==========================================================================
     NAVIGATION
     ========================================================================== */

  function openTarget(
    target: InAppNotificationTarget,
  ): void {
    if (
      target.kind ===
      'appointment'
    ) {
      if (
        role ===
        'customer'
      ) {
        router.push({
          pathname:
            '/(customer)/customer-appointment/[appointmentId]',

          params: {
            appointmentId:
              String(
                target.id,
              ),
          },
        });
      } else {
        router.push({
          pathname:
            '/(shop-owner)/shop-owner-appointment/[appointmentId]',

          params: {
            appointmentId:
              String(
                target.id,
              ),
          },
        });
      }

      return;
    }


    if (
      target.kind ===
      'reschedule_request'
    ) {
      if (
        role ===
        'customer'
      ) {
        router.push({
          pathname:
            '/(customer)/reschedule-requests/[requestId]',

          params: {
            requestId:
              String(
                target.id,
              ),
          },
        });
      } else {
        router.push({
          pathname:
            '/(shop-owner)/reschedule-request/[requestId]',

          params: {
            requestId:
              String(
                target.id,
              ),
          },
        });
      }
    }
  }


  /* ==========================================================================
     ONE NOTIFICATION
     ========================================================================== */

  async function handleNotificationPress(
    notification: InAppNotification,
  ): Promise<void> {
    if (
      activeNotificationId !==
      null
    ) {
      return;
    }


    const opensDetail =
      canOpenTarget(
        notification.target,
      );


    if (
      notification.is_read
    ) {
      if (
        opensDetail
        &&
        notification.target
      ) {
        openTarget(
          notification.target,
        );
      }

      return;
    }


    if (!token) {
      return;
    }


    setActiveNotificationId(
      notification.id,
    );

    setErrorMessage(
      '',
    );


    try {
      const response =
        await markInAppNotificationRead(
          token,
          notification.id,
        );

      const updatedNotification =
        response
          .data
          .notification;


      if (
        statusFilter ===
        'unread'
      ) {
        setNotifications(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.id !==
                notification.id,
            ),
        );
      } else {
        setNotifications(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                notification.id
                  ?
                    updatedNotification
                  :
                    item,
            ),
        );
      }


      acknowledgeOneRead();


      if (
        opensDetail
        &&
        updatedNotification.target
      ) {
        openTarget(
          updatedNotification.target,
        );
      }
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
          ApiError
          ?
            error.message
          :
            'Unable to update this notification. Please try again.',
      );
    } finally {
      setActiveNotificationId(
        null,
      );
    }
  }


  /* ==========================================================================
     READ ALL
     ========================================================================== */

  async function handleMarkAllRead(): Promise<void> {
    if (
      !token
      ||
      unreadCount ===
        0
      ||
      isMarkingAllRead
    ) {
      return;
    }


    setIsMarkingAllRead(
      true,
    );

    setErrorMessage(
      '',
    );


    try {
      const response =
        await markAllInAppNotificationsRead(
          token,
        );


      syncUnreadCount(
        response
          .data
          .unread_count,
      );

      acknowledgeAllRead();


      if (
        statusFilter ===
        'unread'
      ) {
        setNotifications(
          [],
        );
      } else {
        const localReadAt =
          new Date()
            .toISOString();

        setNotifications(
          (
            current,
          ) =>
            current.map(
              (
                notification,
              ) => ({
                ...notification,

                is_read:
                  true,

                read_at:
                  notification.read_at
                  ??
                  localReadAt,
              }),
            ),
        );
      }
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
          ApiError
          ?
            error.message
          :
            'Unable to mark notifications as read. Please try again.',
      );
    } finally {
      setIsMarkingAllRead(
        false,
      );
    }
  }


  /* ==========================================================================
     PAGINATION
     ========================================================================== */

  function loadMore(): void {
    if (
      !pagination
        ?.has_more_pages
      ||
      isLoadingMore
    ) {
      return;
    }

    void loadNotifications({
      page:
        pagination
          .current_page
        +
        1,

      replace:
        false,
    });
  }


  /* ==========================================================================
     ROLE SAFETY
     ========================================================================== */

  if (
    user
    &&
    user.role !==
      role
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerState
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={30}
            color={
              COLORS.danger
            }
          />

          <Text
            style={
              styles.emptyTitle
            }
          >
            Notifications unavailable
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
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
            onRefresh={
              () =>
                void loadNotifications({
                  page:
                    1,

                  replace:
                    true,

                  refreshing:
                    true,
                })
            }
            tintColor={
              COLORS.navy
            }
            colors={[
              COLORS.navy,
            ]}
          />
        }
        contentContainerStyle={[
          styles.container,

          role ===
          'customer'
            ?
              styles.customerBottomSpacing
            :
              styles.ownerBottomSpacing,
        ]}
      >
        {/* ================================================================
            HEADER
            ================================================================ */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerTitleRow
            }
          >
            {role ===
            'shop_owner' ? (
              <TouchableOpacity
                activeOpacity={
                  0.7
                }
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={
                  8
                }
                onPress={
                  () =>
                    router.back()
                }
                style={
                  styles.backButton
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={
                    COLORS.navy
                  }
                />
              </TouchableOpacity>
            ) : (
              <View
                style={
                  styles.headerIcon
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={
                    COLORS.blue
                  }
                />
              </View>
            )}


            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Notifications
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                {unreadCount > 0
                  ?
                    `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                  :
                    'You are all caught up'}
              </Text>
            </View>
          </View>


          <TouchableOpacity
            activeOpacity={
              0.72
            }
            disabled={
              unreadCount ===
                0
              ||
              isMarkingAllRead
            }
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            onPress={
              () =>
                void handleMarkAllRead()
            }
            style={[
              styles.markAllButton,

              (
                unreadCount ===
                  0
                ||
                isMarkingAllRead
              )
              &&
              styles.markAllButtonDisabled,
            ]}
          >
            {isMarkingAllRead ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.navy
                }
              />
            ) : (
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={
                  COLORS.navy
                }
              />
            )}

            <Text
              style={
                styles.markAllText
              }
            >
              Read all
            </Text>
          </TouchableOpacity>
        </View>


        {/* ================================================================
            FILTERS
            ================================================================ */}

        <View
          style={
            styles.filterRow
          }
        >
          {FILTERS.map(
            (
              filter,
            ) => {
              const active =
                statusFilter ===
                filter.value;

              return (
                <TouchableOpacity
                  key={
                    filter.value
                  }
                  activeOpacity={
                    0.72
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      active,
                  }}
                  onPress={
                    () => {
                      if (
                        !active
                      ) {
                        setStatusFilter(
                          filter.value,
                        );
                      }
                    }
                  }
                  style={[
                    styles.filterChip,

                    active
                    &&
                    styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,

                      active
                      &&
                      styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>


        {/* ================================================================
            ERROR
            ================================================================ */}

        {errorMessage ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={
                COLORS.danger
              }
            />

            <Text
              style={
                styles.errorText
              }
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}


        {/* ================================================================
            LOADING
            ================================================================ */}

        {isLoading ? (
          <View
            style={
              styles.centerState
            }
          >
            <ActivityIndicator
              size="large"
              color={
                COLORS.navy
              }
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading notifications...
            </Text>
          </View>
        ) : null}


        {/* ================================================================
            EMPTY
            ================================================================ */}

        {!isLoading
        &&
        notifications.length ===
          0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name={
                  statusFilter ===
                  'unread'
                    ?
                      'checkmark-done-outline'
                    :
                      'notifications-outline'
                }
                size={28}
                color={
                  COLORS.accent
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {statusFilter ===
              'unread'
                ?
                  'All caught up'
                :
                  'No notifications'}
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              {
                emptyMessage(
                  statusFilter,
                )
              }
            </Text>
          </View>
        ) : null}


        {/* ================================================================
            NOTIFICATION LIST
            ================================================================ */}

        {!isLoading
        &&
        notifications.length >
          0 ? (
          <View
            style={
              styles.list
            }
          >
            {notifications.map(
              (
                notification,
              ) => {
                const tone =
                  getNotificationTone(
                    notification.type,
                  );

                const opensDetail =
                  canOpenTarget(
                    notification.target,
                  );

                const isUpdating =
                  activeNotificationId ===
                  notification.id;


                return (
                  <TouchableOpacity
                    key={
                      notification.id
                    }
                    activeOpacity={
                      0.8
                    }
                    disabled={
                      activeNotificationId !==
                        null
                      ||
                      (
                        notification.is_read
                        &&
                        !opensDetail
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${notification.title}. ${notification.message}`}
                    onPress={
                      () =>
                        void handleNotificationPress(
                          notification,
                        )
                    }
                    style={[
                      styles.notificationCard,

                      !notification.is_read
                      &&
                      styles.notificationCardUnread,
                    ]}
                  >
                    {!notification.is_read ? (
                      <View
                        style={
                          styles.unreadIndicator
                        }
                      />
                    ) : null}


                    <View
                      style={[
                        styles.notificationIcon,

                        {
                          backgroundColor:
                            tone.backgroundColor,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          tone.icon
                        }
                        size={20}
                        color={
                          tone.color
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.notificationContent
                      }
                    >
                      <View
                        style={
                          styles.notificationTopRow
                        }
                      >
                        <Text
                          numberOfLines={
                            2
                          }
                          style={[
                            styles.notificationTitle,

                            !notification.is_read
                            &&
                            styles.notificationTitleUnread,
                          ]}
                        >
                          {notification.title}
                        </Text>

                        <Text
                          style={
                            styles.notificationTime
                          }
                        >
                          {
                            formatRelativeTime(
                              notification.created_at,
                            )
                          }
                        </Text>
                      </View>


                      <Text
                        style={
                          styles.notificationMessage
                        }
                      >
                        {notification.message}
                      </Text>


                      <View
                        style={
                          styles.notificationFooter
                        }
                      >
                        <Text
                          numberOfLines={
                            1
                          }
                          style={
                            styles.notificationType
                          }
                        >
                          {notification.type_label}
                        </Text>


                        <View
                          style={
                            styles.notificationAction
                          }
                        >
                          {isUpdating ? (
                            <ActivityIndicator
                              size="small"
                              color={
                                COLORS.accent
                              }
                            />
                          ) : (
                            <>
                              <Text
                                style={
                                  styles.notificationActionText
                                }
                              >
                                {opensDetail
                                  ?
                                    notification.is_read
                                      ?
                                        'View details'
                                      :
                                        'Read & view'
                                  :
                                    notification.is_read
                                      ?
                                        'Read'
                                      :
                                        'Mark read'}
                              </Text>

                              {opensDetail ? (
                                <Ionicons
                                  name="chevron-forward"
                                  size={15}
                                  color={
                                    COLORS.accent
                                  }
                                />
                              ) : null}
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}


            {/* ============================================================
                LOAD MORE
                ============================================================ */}

            {pagination
              ?.has_more_pages ? (
              <TouchableOpacity
                activeOpacity={
                  0.75
                }
                disabled={
                  isLoadingMore
                }
                accessibilityRole="button"
                accessibilityLabel="Load more notifications"
                onPress={
                  loadMore
                }
                style={
                  styles.loadMoreButton
                }
              >
                {isLoadingMore ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.navy
                    }
                  />
                ) : (
                  <Ionicons
                    name="chevron-down-outline"
                    size={17}
                    color={
                      COLORS.navy
                    }
                  />
                )}

                <Text
                  style={
                    styles.loadMoreText
                  }
                >
                  {isLoadingMore
                    ?
                      'Loading...'
                    :
                      'Load more'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.background,
    },


    container: {
      paddingHorizontal:
        18,

      paddingTop:
        44,

      backgroundColor:
        COLORS.background,
    },


    customerBottomSpacing: {
      paddingBottom:
        110,
    },


    ownerBottomSpacing: {
      paddingBottom:
        42,
    },


    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        12,
    },


    headerTitleRow: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,
    },


    headerText: {
      flex:
        1,

      minWidth:
        0,
    },


    headerIcon: {
      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        COLORS.blueSoft,
    },


    backButton: {
      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        13,

      backgroundColor:
        COLORS.surface,
    },


    title: {
      color:
        COLORS.navy,

      fontSize:
        22,

      lineHeight:
        28,

      fontWeight:
        '800',

      letterSpacing:
        -0.4,
    },


    subtitle: {
      marginTop:
        2,

      color:
        COLORS.textMuted,

      fontSize:
        8.5,

      lineHeight:
        12,
    },


    markAllButton: {
      minHeight:
        38,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      paddingHorizontal:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        12,

      backgroundColor:
        COLORS.surface,
    },


    markAllButtonDisabled: {
      opacity:
        0.45,
    },


    markAllText: {
      color:
        COLORS.navy,

      fontSize:
        8,

      fontWeight:
        '700',
    },


    filterRow: {
      flexDirection:
        'row',

      gap:
        8,

      marginTop:
        22,

      marginBottom:
        14,
    },


    filterChip: {
      minHeight:
        35,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        999,

      backgroundColor:
        COLORS.surface,
    },


    filterChipActive: {
      borderColor:
        COLORS.navy,

      backgroundColor:
        COLORS.navy,
    },


    filterText: {
      color:
        COLORS.textMuted,

      fontSize:
        9,

      fontWeight:
        '700',
    },


    filterTextActive: {
      color:
        COLORS.white,
    },


    errorBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      marginBottom:
        13,

      padding:
        12,

      borderRadius:
        13,

      backgroundColor:
        COLORS.dangerSoft,
    },


    errorText: {
      flex:
        1,

      color:
        COLORS.danger,

      fontSize:
        9,

      lineHeight:
        14,
    },


    centerState: {
      minHeight:
        270,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },


    loadingText: {
      marginTop:
        12,

      color:
        COLORS.textMuted,

      fontSize:
        9,
    },


    emptyCard: {
      minHeight:
        280,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        28,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        19,

      backgroundColor:
        COLORS.surface,
    },


    emptyIcon: {
      width:
        58,

      height:
        58,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        18,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    emptyTitle: {
      marginTop:
        14,

      color:
        COLORS.navy,

      fontSize:
        15,

      fontWeight:
        '800',

      textAlign:
        'center',
    },


    emptyDescription: {
      maxWidth:
        285,

      marginTop:
        7,

      color:
        COLORS.textMuted,

      fontSize:
        9,

      lineHeight:
        15,

      textAlign:
        'center',
    },


    list: {
      gap:
        10,
    },


    notificationCard: {
      position:
        'relative',

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      overflow:
        'hidden',

      padding:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        17,

      backgroundColor:
        COLORS.surface,
    },


    notificationCardUnread: {
      borderColor:
        '#CFD9EA',

      backgroundColor:
        '#F8FAFF',
    },


    unreadIndicator: {
      width:
        4,

      position:
        'absolute',

      top:
        0,

      bottom:
        0,

      left:
        0,

      backgroundColor:
        COLORS.blue,
    },


    notificationIcon: {
      width:
        42,

      height:
        42,

      flexShrink:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,
    },


    notificationContent: {
      flex:
        1,

      minWidth:
        0,
    },


    notificationTopRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        8,
    },


    notificationTitle: {
      flex:
        1,

      minWidth:
        0,

      color:
        COLORS.navy,

      fontSize:
        11,

      lineHeight:
        15,

      fontWeight:
        '600',
    },


    notificationTitleUnread: {
      fontWeight:
        '800',
    },


    notificationTime: {
      flexShrink:
        0,

      color:
        COLORS.textLight,

      fontSize:
        7.5,

      lineHeight:
        11,
    },


    notificationMessage: {
      marginTop:
        5,

      color:
        COLORS.textMuted,

      fontSize:
        9,

      lineHeight:
        14,
    },


    notificationFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        8,

      marginTop:
        10,
    },


    notificationType: {
      flex:
        1,

      color:
        COLORS.textLight,

      fontSize:
        7.5,

      fontWeight:
        '600',
    },


    notificationAction: {
      minHeight:
        18,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        2,
    },


    notificationActionText: {
      color:
        COLORS.accent,

      fontSize:
        7.5,

      fontWeight:
        '700',
    },


    loadMoreButton: {
      minHeight:
        46,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      marginTop:
        4,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        14,

      backgroundColor:
        COLORS.surface,
    },


    loadMoreText: {
      color:
        COLORS.navy,

      fontSize:
        9,

      fontWeight:
        '700',
    },
  });