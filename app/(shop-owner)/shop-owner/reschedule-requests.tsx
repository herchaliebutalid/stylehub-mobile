import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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

import ShopOwnerRescheduleRequestCard from '@/src/components/ShopOwnerRescheduleRequestCard';
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
import { getShopOwnerRescheduleRequests } from '@/src/services/shop-owner-api';
import type {
  ShopOwnerRescheduleRequest,
  ShopOwnerRescheduleRequestStatus,
} from '@/src/types/shop-owner';

type RequestFilter =
  | 'all'
  | ShopOwnerRescheduleRequestStatus;

const FILTERS: {
  value: RequestFilter;
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
    value: 'approved',
    label: 'Approved',
  },
  {
    value: 'rejected',
    label: 'Rejected',
  },
  {
    value: 'withdrawn',
    label: 'Withdrawn',
  },
];

export default function ShopOwnerRescheduleRequestsScreen() {
  const {
    token,
  } = useAuth();

  const [
    requests,
    setRequests,
  ] = useState<ShopOwnerRescheduleRequest[]>(
    [],
  );

  const [
    filter,
    setFilter,
  ] = useState<RequestFilter>(
    'all',
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(
    false,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const hasLoadedOnce =
    useRef(
      false,
    );

  /* ==========================================================================
     LOAD REQUESTS
     ========================================================================== */

  const loadRequests =
    useCallback(
      async (
        refreshing = false,
        silent = false,
      ): Promise<void> => {
        if (
          !token
        ) {
          setIsLoading(
            false,
          );

          return;
        }

        if (
          refreshing
        ) {
          setIsRefreshing(
            true,
          );
        } else if (
          !silent
        ) {
          setIsLoading(
            true,
          );
        }

        setErrorMessage('');

        try {
          const response =
            await getShopOwnerRescheduleRequests(
              token,
            );

          setRequests(
            response
              .data
              .reschedule_requests,
          );

          hasLoadedOnce.current =
            true;
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load reschedule requests.',
          );
        } finally {
          setIsLoading(
            false,
          );

          setIsRefreshing(
            false,
          );
        }
      },
      [
        token,
      ],
    );

  /* ==========================================================================
     REFRESH WHEN RETURNING FROM REQUEST DETAILS
     ========================================================================== */

  useFocusEffect(
    useCallback(
      () => {
        void loadRequests(
          false,
          hasLoadedOnce.current,
        );

        return undefined;
      },
      [
        loadRequests,
      ],
    ),
  );

  /* ==========================================================================
     FILTER
     ========================================================================== */

  const filteredRequests =
    useMemo(
      () => {
        if (
          filter ===
          'all'
        ) {
          return requests;
        }

        return requests.filter(
          (
            request,
          ) =>
            request.status ===
            filter,
        );
      },
      [
        filter,
        requests,
      ],
    );

  /* ==========================================================================
     COUNTS
     ========================================================================== */

  const counts =
    useMemo(
      () => ({
        pending:
          requests.filter(
            (
              request,
            ) =>
              request.status ===
              'pending',
          ).length,

        approved:
          requests.filter(
            (
              request,
            ) =>
              request.status ===
              'approved',
          ).length,

        rejected:
          requests.filter(
            (
              request,
            ) =>
              request.status ===
              'rejected',
          ).length,

        withdrawn:
          requests.filter(
            (
              request,
            ) =>
              request.status ===
              'withdrawn',
          ).length,
      }),
      [
        requests,
      ],
    );

  const currentFilterLabel =
    FILTERS.find(
      (
        item,
      ) =>
        item.value ===
        filter,
    )?.label
    ??
    'Requests';

  /* ==========================================================================
     NAVIGATION
     ========================================================================== */

  function handleBack(): void {
    router.replace(
      '/(shop-owner)/shop-owner',
    );
  }

  function openRequest(
    requestId: number,
  ): void {
    router.push({
      pathname:
        '/(shop-owner)/reschedule-request/[requestId]',

      params: {
        requestId:
          String(
            requestId,
          ),
      },
    });
  }

  /* ==========================================================================
     UI
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
                void loadRequests(
                  true,
                )
            }
            tintColor={
              COLORS.navy
            }
            colors={[
              COLORS.navy,
            ]}
          />
        }
        contentContainerStyle={
          styles.container
        }
      >

        {/* ================================================================
            TOP BAR
            ================================================================ */}

        <View
          style={
            styles.topBar
          }
        >
          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Back to shop owner home"
            onPress={
              handleBack
            }
            style={
              styles.topIconButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={
                22
              }
              color={
                COLORS.navy
              }
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
              Review schedule changes
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Refresh reschedule requests"
            onPress={
              () =>
                void loadRequests(
                  true,
                )
            }
            style={
              styles.topIconButton
            }
          >
            <Ionicons
              name="refresh-outline"
              size={
                21
              }
              color={
                COLORS.navy
              }
            />
          </TouchableOpacity>
        </View>


        {/* ================================================================
            HEADER
            ================================================================ */}

        <View
          style={
            styles.header
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SCHEDULE CHANGES
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Review customer requests without losing track of the original booking
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Compare the current appointment with the requested date and time before approving or rejecting a change.
          </Text>
        </View>


        {/* ================================================================
            OVERVIEW
            ================================================================ */}

        <View
          style={
            styles.overviewCard
          }
        >
          <View
            style={
              styles.overviewHeader
            }
          >
            <View>
              <Text
                style={
                  styles.overviewLabel
                }
              >
                Total requests
              </Text>

              <Text
                style={
                  styles.overviewValue
                }
              >
                {
                  requests.length
                }
              </Text>
            </View>

            <View
              style={
                styles.overviewIcon
              }
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={
                  24
                }
                color={
                  COLORS.white
                }
              />
            </View>
          </View>

          <View
            style={
              styles.overviewStats
            }
          >
            <OverviewStat
              value={
                counts.pending
              }
              label="Pending"
            />

            <View
              style={
                styles.overviewDivider
              }
            />

            <OverviewStat
              value={
                counts.approved
              }
              label="Approved"
            />

            <View
              style={
                styles.overviewDivider
              }
            />

            <OverviewStat
              value={
                counts.rejected
              }
              label="Rejected"
            />
          </View>
        </View>


        {/* ================================================================
            PENDING ATTENTION
            ================================================================ */}

        {counts.pending > 0 ? (
          <View
            style={
              styles.attentionCard
            }
          >
            <View
              style={
                styles.attentionIcon
              }
            >
              <Ionicons
                name="time-outline"
                size={
                  20
                }
                color={
                  COLORS.warning
                }
              />
            </View>

            <View
              style={
                styles.attentionContent
              }
            >
              <Text
                style={
                  styles.attentionTitle
                }
              >
                {counts.pending ===
                1
                  ? '1 request needs review'
                  : `${counts.pending} requests need review`}
              </Text>

              <Text
                style={
                  styles.attentionText
                }
              >
                Pending requests are still waiting for your decision. Open a request to compare schedules and respond.
              </Text>
            </View>
          </View>
        ) : null}


        {/* ================================================================
            FILTER
            ================================================================ */}

        <View
          style={
            styles.filterSection
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Request status
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Filter requests by their current decision status.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            {FILTERS.map(
              (
                item,
              ) => {
                const selected =
                  item.value ===
                  filter;

                const count =
                  item.value ===
                  'all'
                    ? requests.length
                    : counts[
                        item.value
                      ];

                return (
                  <TouchableOpacity
                    key={
                      item.value
                    }
                    activeOpacity={
                      0.82
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={
                      () =>
                        setFilter(
                          item.value,
                        )
                    }
                    style={[
                      styles.filterButton,

                      selected
                      &&
                        styles.filterButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,

                        selected
                        &&
                          styles.filterTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>

                    <View
                      style={[
                        styles.filterCount,

                        selected
                        &&
                          styles.filterCountSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterCountText,

                          selected
                          &&
                            styles.filterCountTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
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
            <View
              style={
                styles.errorIcon
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={
                  19
                }
                color={
                  COLORS.danger
                }
              />
            </View>

            <View
              style={
                styles.errorContent
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Couldn&apos;t refresh requests
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}


        {/* ================================================================
            LIST TITLE
            ================================================================ */}

        <View
          style={
            styles.listHeader
          }
        >
          <View>
            <Text
              style={
                styles.listTitle
              }
            >
              {filter ===
              'all'
                ? 'All requests'
                : currentFilterLabel}
            </Text>

            <Text
              style={
                styles.listSubtitle
              }
            >
              {filteredRequests.length ===
              1
                ? '1 reschedule request'
                : `${filteredRequests.length} reschedule requests`}
            </Text>
          </View>
        </View>


        {/* ================================================================
            LOADING
            ================================================================ */}

        {isLoading ? (
          <View
            style={
              styles.stateCard
            }
          >
            <View
              style={
                styles.stateIcon
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  COLORS.navy
                }
              />
            </View>

            <Text
              style={
                styles.stateTitle
              }
            >
              Loading requests
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              Getting the latest customer schedule-change requests.
            </Text>
          </View>
        ) : filteredRequests.length ===
          0 ? (

          /* ==============================================================
             EMPTY
             ============================================================== */

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
                name="swap-horizontal-outline"
                size={
                  28
                }
                color={
                  COLORS.navy
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {filter ===
              'all'
                ? 'No reschedule requests yet'
                : `No ${currentFilterLabel.toLowerCase()} requests`}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {filter ===
              'all'
                ? 'When a customer asks to move an appointment, the request will appear here for review.'
                : `There are no ${currentFilterLabel.toLowerCase()} reschedule requests right now.`}
            </Text>
          </View>
        ) : (

          /* ==============================================================
             REQUEST LIST
             ============================================================== */

          <View
            style={
              styles.requestList
            }
          >
            {filteredRequests.map(
              (
                request,
              ) => (
                <ShopOwnerRescheduleRequestCard
                  key={
                    request.id
                  }
                  request={
                    request
                  }
                  onPress={
                    () =>
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


/* ==========================================================================
   OVERVIEW STAT
   ========================================================================== */

function OverviewStat({
  value,
  label,
}: {
  value:
    number;

  label:
    string;
}) {
  return (
    <View
      style={
        styles.overviewStat
      }
    >
      <Text
        style={
          styles.overviewStatValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.overviewStatLabel
        }
      >
        {label}
      </Text>
    </View>
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
      width:
        '100%',

      maxWidth:
        LAYOUT.contentMaxWidth,

      alignSelf:
        'center',

      paddingHorizontal:
        LAYOUT.screenPadding,

      paddingTop:
        SPACING.sm,

      paddingBottom:
        48,
    },

    /* ======================================================================
       TOP BAR
       ====================================================================== */

    topBar: {
      minHeight:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    topIconButton: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        RADII.pill,
    },

    topBarTitleBlock: {
      flex:
        1,

      marginHorizontal:
        6,
    },

    topBarTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',

      textAlign:
        'center',
    },

    topBarCaption: {
      marginTop:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      textAlign:
        'center',
    },

    /* ======================================================================
       HEADER
       ====================================================================== */

    header: {
      marginTop:
        SPACING.lg,
    },

    eyebrow: {
      color:
        COLORS.accent,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',

      letterSpacing:
        1.2,
    },

    title: {
      maxWidth:
        570,

      marginTop:
        5,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.title,

      lineHeight:
        30,

      fontWeight:
        '800',

      letterSpacing:
        -0.6,
    },

    subtitle: {
      maxWidth:
        610,

      marginTop:
        8,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },

    /* ======================================================================
       OVERVIEW
       ====================================================================== */

    overviewCard: {
      marginTop:
        SPACING.xl,

      padding:
        18,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.primary,

      ...SHADOWS.card,
    },

    overviewHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    overviewLabel: {
      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '600',
    },

    overviewValue: {
      marginTop:
        4,

      color:
        COLORS.white,

      fontSize:
        32,

      lineHeight:
        38,

      fontWeight:
        '800',
    },

    overviewIcon: {
      width:
        48,

      height:
        48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        16,

      backgroundColor:
        COLORS.navyMuted,
    },

    overviewStats: {
      marginTop:
        18,

      paddingTop:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.navyMuted,
    },

    overviewStat: {
      flex:
        1,
    },

    overviewStatValue: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    overviewStatLabel: {
      marginTop:
        3,

      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.micro,
    },

    overviewDivider: {
      width:
        1,

      height:
        34,

      marginHorizontal:
        12,

      backgroundColor:
        COLORS.navyMuted,
    },

    /* ======================================================================
       PENDING ATTENTION
       ====================================================================== */

    attentionCard: {
      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },

    attentionIcon: {
      width:
        40,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        COLORS.warningSoft,
    },

    attentionContent: {
      flex:
        1,
    },

    attentionTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    attentionText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    /* ======================================================================
       FILTERS
       ====================================================================== */

    filterSection: {
      marginTop:
        SPACING.xxl,
    },

    sectionTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',

      letterSpacing:
        -0.3,
    },

    sectionSubtitle: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    filters: {
      gap:
        8,

      paddingTop:
        14,

      paddingRight:
        6,

      paddingBottom:
        2,
    },

    filterButton: {
      minHeight:
        40,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      paddingHorizontal:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surface,
    },

    filterButtonSelected: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primary,
    },

    filterText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '700',
    },

    filterTextSelected: {
      color:
        COLORS.white,
    },

    filterCount: {
      minWidth:
        22,

      height:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        5,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    filterCountSelected: {
      backgroundColor:
        COLORS.navyMuted,
    },

    filterCountText: {
      color:
        COLORS.textMuted,

      fontSize:
        10,

      fontWeight:
        '800',
    },

    filterCountTextSelected: {
      color:
        COLORS.white,
    },

    /* ======================================================================
       ERROR
       ====================================================================== */

    errorBox: {
      marginTop:
        SPACING.lg,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        10,

      padding:
        14,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.dangerSoft,
    },

    errorIcon: {
      width:
        30,

      height:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.surface,
    },

    errorContent: {
      flex:
        1,
    },

    errorTitle: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    errorText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    /* ======================================================================
       LIST
       ====================================================================== */

    listHeader: {
      marginTop:
        SPACING.xxl,

      marginBottom:
        12,
    },

    listTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',

      letterSpacing:
        -0.3,
    },

    listSubtitle: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,
    },

    requestList: {
      gap:
        12,
    },

    /* ======================================================================
       LOADING
       ====================================================================== */

    stateCard: {
      alignItems:
        'center',

      paddingHorizontal:
        24,

      paddingVertical:
        34,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,
    },

    stateIcon: {
      width:
        52,

      height:
        52,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        18,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    stateTitle: {
      marginTop:
        14,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    stateText: {
      maxWidth:
        330,

      marginTop:
        5,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    /* ======================================================================
       EMPTY
       ====================================================================== */

    emptyCard: {
      alignItems:
        'center',

      paddingHorizontal:
        24,

      paddingVertical:
        34,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

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
        19,

      backgroundColor:
        COLORS.accentSoft,
    },

    emptyTitle: {
      marginTop:
        14,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    emptyText: {
      maxWidth:
        350,

      marginTop:
        6,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,

      textAlign:
        'center',
    },
  });