import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

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

import NotificationBellButton from '@/src/components/NotificationBellButton';
import ShopOwnerApprovalState from '@/src/components/ShopOwnerApprovalState';

import {
  COLORS,
} from '@/src/constants/colors';

import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';

import {
  useAuth,
} from '@/src/context/AuthContext';

import {
  ApiError,
} from '@/src/services/api';

import {
  getShopOwnerAccount,
  getShopOwnerAppointments,
  getShopOwnerRescheduleRequests,
} from '@/src/services/shop-owner-api';

import type {
  ShopOwnerShop,
} from '@/src/types/shop-owner';

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
  const {
    user,
    token,
  } = useAuth();

  const [
    shop,
    setShop,
  ] = useState<ShopOwnerShop | null>(
    null,
  );

  const [
    pendingAppointmentsCount,
    setPendingAppointmentsCount,
  ] = useState(
    0,
  );

  const [
    pendingRescheduleCount,
    setPendingRescheduleCount,
  ] = useState(
    0,
  );

  const [
    hasLoadedAccount,
    setHasLoadedAccount,
  ] = useState(
    false,
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

  const loadNotificationCounts =
    useCallback(
      async () => {
        if (!token) {
          setPendingAppointmentsCount(
            0,
          );

          setPendingRescheduleCount(
            0,
          );

          return;
        }

        try {
          const [
            appointmentsResponse,
            rescheduleResponse,
          ] =
            await Promise.all([
              getShopOwnerAppointments(
                token,
              ),

              getShopOwnerRescheduleRequests(
                token,
              ),
            ]);

          setPendingAppointmentsCount(
            appointmentsResponse
              .data
              .appointments
              .filter(
                (
                  appointment,
                ) =>
                  appointment.status ===
                  'pending',
              )
              .length,
          );

          setPendingRescheduleCount(
            rescheduleResponse
              .data
              .reschedule_requests
              .filter(
                (
                  request,
                ) =>
                  request.status ===
                  'pending',
              )
              .length,
          );
        } catch {
          /*
          |--------------------------------------------------------------------------
          | Dashboard stays usable
          |--------------------------------------------------------------------------
          |
          | If the small notification-count request fails, we do not block the
          | entire Shop Owner dashboard.
          |
          */
        }
      },
      [
        token,
      ],
    );

  const loadDashboard =
    useCallback(
      async (
        refreshing = false,
      ) => {
        if (!token) {
          setIsLoading(
            false,
          );

          return;
        }

        if (refreshing) {
          setIsRefreshing(
            true,
          );
        } else {
          setIsLoading(
            true,
          );
        }

        setErrorMessage('');

        try {
          const response =
            await getShopOwnerAccount(
              token,
            );

          if (
            response.data.user.role !==
            'shop_owner'
          ) {
            setShop(
              null,
            );

            setHasLoadedAccount(
              false,
            );

            setPendingAppointmentsCount(
              0,
            );

            setPendingRescheduleCount(
              0,
            );

            setErrorMessage(
              'This account is not authorized as a Shop Owner.',
            );

            return;
          }

          const loadedShop =
            response.data.shop;

          setShop(
            loadedShop,
          );

          setHasLoadedAccount(
            true,
          );

          if (
            loadedShop
              ?.approval_status ===
            'approved'
          ) {
            await loadNotificationCounts();
          } else {
            setPendingAppointmentsCount(
              0,
            );

            setPendingRescheduleCount(
              0,
            );
          }
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load your Shop Owner account.',
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
        loadNotificationCounts,
        token,
      ],
    );

  useEffect(
    () => {
      void loadDashboard();
    },
    [
      loadDashboard,
    ],
  );

  const approved =
    shop?.approval_status ===
    'approved';

  useFocusEffect(
    useCallback(
      () => {
        if (
          !token ||
          !approved
        ) {
          return undefined;
        }

        void loadNotificationCounts();

        const interval =
          setInterval(
            () =>
              void loadNotificationCounts(),
            30000,
          );

        return () =>
          clearInterval(
            interval,
          );
      },
      [
        approved,
        loadNotificationCounts,
        token,
      ],
    ),
  );

  const accountName =
    user
      ?.first_name
      ?.trim()
    ||
    user
      ?.full_name
      ?.trim()
    ||
    'Shop Owner';

  const greetingName =
    shop
      ?.name
      ?.trim()
    ||
    accountName;

  const shopTypeLabel =
    shop?.type_label
    ||
    'StyleHub Shop';

  const availabilityLabel =
    shop
      ?.availability_status_label
    ||
    'Unavailable';

  const cityLabel =
    shop
      ?.city
      ?.trim()
    ||
    'Location not set';

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
                void loadDashboard(
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
            HEADER
            ================================================================ */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.brandRow
            }
          >
            <Image
              source={
                require(
                  '../../../assets/images/stylehub-splash.png',
                )
              }
              resizeMode="contain"
              style={
                styles.logo
              }
            />

            <Text
              style={
                styles.brandName
              }
            >
              StyleHub
            </Text>
          </View>

          <View
            style={
              styles.headerActions
            }
          >
            <NotificationBellButton
              onPress={
                () =>
                  router.push(
                    '/(shop-owner)/shop-owner/notifications',
                  )
              }
            />

            <TouchableOpacity
              activeOpacity={
                0.7
              }
              accessibilityRole="button"
              accessibilityLabel="Open shop owner profile"
              style={
                styles.headerIconButton
              }
              onPress={
                () =>
                  router.push(
                    '/(shop-owner)/shop-owner/profile',
                  )
              }
            >
              <Ionicons
                name="person-outline"
                size={
                  22
                }
                color={
                  COLORS.navy
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================================
            GREETING
            ================================================================ */}

        <View
          style={
            styles.greetingSection
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SHOP OWNER
          </Text>

          <Text
            numberOfLines={
              2
            }
            style={
              styles.greeting
            }
          >
            Hi, {greetingName}
          </Text>

          <Text
            style={
              styles.greetingSubtitle
            }
          >
            Manage today&apos;s bookings and keep your shop ready for customers.
          </Text>
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
            <ActivityIndicator
              size="small"
              color={
                COLORS.navy
              }
            />

            <Text
              style={
                styles.stateText
              }
            >
              Loading your shop workspace...
            </Text>
          </View>
        ) : null}

        {/* ================================================================
            ERROR
            ================================================================ */}

        {!isLoading &&
        errorMessage ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={
                20
              }
              color={
                COLORS.danger
              }
            />

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
                Unable to refresh dashboard
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
            APPROVED SHOP
            ================================================================ */}

        {!isLoading &&
        hasLoadedAccount &&
        approved &&
        shop ? (
          <>
            {/* ------------------------------------------------------------
                SHOP SUMMARY
                ------------------------------------------------------------ */}

            <View
              style={
                styles.shopCard
              }
            >
              <View
                style={
                  styles.shopTopRow
                }
              >
                <View
                  style={
                    styles.shopIdentity
                  }
                >
                  <View
                    style={
                      styles.shopIcon
                    }
                  >
                    <Ionicons
                      name={
                        shop.type ===
                        'barber_shop'
                          ? 'cut-outline'
                          : 'sparkles-outline'
                      }
                      size={
                        23
                      }
                      color={
                        COLORS.navy
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.shopNameBlock
                    }
                  >
                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.shopName
                      }
                    >
                      {shop.name}
                    </Text>

                    <Text
                      style={
                        styles.shopType
                      }
                    >
                      {shopTypeLabel}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.approvedBadge
                  }
                >
                  <View
                    style={
                      styles.approvedDot
                    }
                  />

                  <Text
                    style={
                      styles.approvedText
                    }
                  >
                    Approved
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.shopMetaGrid
                }
              >
                <View
                  style={
                    styles.shopMetaItem
                  }
                >
                  <Text
                    style={
                      styles.shopMetaLabel
                    }
                  >
                    Availability
                  </Text>

                  <View
                    style={
                      styles.shopMetaValueRow
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={
                        16
                      }
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.shopMetaValue
                      }
                    >
                      {availabilityLabel}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.shopMetaItem
                  }
                >
                  <Text
                    style={
                      styles.shopMetaLabel
                    }
                  >
                    Location
                  </Text>

                  <View
                    style={
                      styles.shopMetaValueRow
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={
                        16
                      }
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.shopMetaValue
                      }
                    >
                      {cityLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ------------------------------------------------------------
                IMPORTANT COUNTS
                ------------------------------------------------------------ */}

            <View
              style={
                styles.summaryRow
              }
            >
              <SummaryCard
                icon="clipboard-outline"
                value={
                  pendingAppointmentsCount
                }
                label="Pending bookings"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/appointments',
                    )
                }
              />

              <SummaryCard
                icon="time-outline"
                value={
                  pendingRescheduleCount
                }
                label="Reschedule requests"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/reschedule-requests',
                    )
                }
              />
            </View>

            {/* ------------------------------------------------------------
                QUICK MANAGEMENT
                ------------------------------------------------------------ */}

            <SectionHeading
              title="Quick management"
              subtitle="Your most-used shop controls"
            />

            <View
              style={
                styles.primaryToolsGrid
              }
            >
              <ToolCard
                icon="clipboard-outline"
                title="Appointments"
                subtitle="Review and manage bookings"
                badgeCount={
                  pendingAppointmentsCount
                }
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/appointments',
                    )
                }
              />

              <ToolCard
                icon="cut-outline"
                title="Services"
                subtitle="Prices, duration and availability"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/services',
                    )
                }
              />

              <ToolCard
                icon="calendar-outline"
                title="Schedule"
                subtitle="Hours, breaks and blocked dates"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/schedule',
                    )
                }
              />

              <ToolCard
                icon="storefront-outline"
                title="Shop details"
                subtitle="Business information and status"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/shop-information',
                    )
                }
              />
            </View>

            {/* ------------------------------------------------------------
                SECONDARY TOOLS
                ------------------------------------------------------------ */}

            <SectionHeading
              title="More tools"
              subtitle="Grow and manage your StyleHub presence"
            />

            <View
              style={
                styles.moreToolsCard
              }
            >
              <MoreToolRow
                icon="time-outline"
                title="Reschedule requests"
                badgeCount={
                  pendingRescheduleCount
                }
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/reschedule-requests',
                    )
                }
              />

              <MoreToolRow
                icon="pricetag-outline"
                title="Promotions"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/promos',
                    )
                }
              />

              <MoreToolRow
                icon="images-outline"
                title="Shop gallery"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/gallery',
                    )
                }
              />

              <MoreToolRow
                icon="location-outline"
                title="Shop location"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/location',
                    )
                }
              />

              <MoreToolRow
                icon="stats-chart-outline"
                title="Analytics"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/analytics',
                    )
                }
              />

              <MoreToolRow
                icon="options-outline"
                title="Booking rules"
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/booking-rules',
                    )
                }
                last
              />
            </View>
          </>
        ) : null}

        {/* ================================================================
            PENDING / REJECTED SHOP
            ================================================================ */}

        {!isLoading &&
        hasLoadedAccount &&
        !approved ? (
          <ShopOwnerApprovalState
            shop={
              shop
            }
            isRefreshing={
              isRefreshing
            }
            onRefresh={
              () =>
                void loadDashboard(
                  true,
                )
            }
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   SECTION HEADING
   ========================================================================== */

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeading
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>
  );
}


/* ==========================================================================
   SUMMARY CARD
   ========================================================================== */

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
      activeOpacity={
        0.82
      }
      style={
        styles.summaryCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            20
          }
          color={
            COLORS.navy
          }
        />
      </View>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


/* ==========================================================================
   PRIMARY TOOL CARD
   ========================================================================== */

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
      activeOpacity={
        0.82
      }
      style={
        styles.toolCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.toolTopRow
        }
      >
        <View
          style={
            styles.toolIcon
          }
        >
          <Ionicons
            name={
              icon
            }
            size={
              22
            }
            color={
              COLORS.navy
            }
          />
        </View>

        {badgeCount > 0 ? (
          <View
            style={
              styles.toolBadge
            }
          >
            <Text
              style={
                styles.toolBadgeText
              }
            >
              {badgeCount > 99
                ? '99+'
                : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={
          styles.toolTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.toolSubtitle
        }
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}


/* ==========================================================================
   SECONDARY TOOL ROW
   ========================================================================== */

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
      activeOpacity={
        0.76
      }
      style={[
        styles.moreToolRow,

        last &&
          styles.moreToolRowLast,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.moreToolIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            20
          }
          color={
            COLORS.navy
          }
        />
      </View>

      <Text
        style={
          styles.moreToolTitle
        }
      >
        {title}
      </Text>

      {badgeCount > 0 ? (
        <View
          style={
            styles.inlineBadge
          }
        >
          <Text
            style={
              styles.inlineBadgeText
            }
          >
            {badgeCount > 99
              ? '99+'
              : badgeCount}
          </Text>
        </View>
      ) : null}

      <Ionicons
        name="chevron-forward"
        size={
          18
        }
        color={
          COLORS.textLight
        }
      />
    </TouchableOpacity>
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
        12,

      paddingBottom:
        40,
    },

    /* ----------------------------------------------------------------------
       Header
       ---------------------------------------------------------------------- */

    header: {
      minHeight:
        52,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    brandRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,
    },

    logo: {
      width:
        34,

      height:
        34,
    },

    brandName: {
      color:
        COLORS.text,

      fontSize:
        20,

      fontWeight:
        '800',

      letterSpacing:
        -0.4,
    },

    headerActions: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    headerIconButton: {
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

    /* ----------------------------------------------------------------------
       Greeting
       ---------------------------------------------------------------------- */

    greetingSection: {
      marginTop:
        20,
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

    greeting: {
      marginTop:
        5,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.display,

      lineHeight:
        36,

      fontWeight:
        '800',

      letterSpacing:
        -0.8,
    },

    greetingSubtitle: {
      marginTop:
        8,

      maxWidth:
        460,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },

    /* ----------------------------------------------------------------------
       State / error
       ---------------------------------------------------------------------- */

    stateCard: {
      minHeight:
        96,

      marginTop:
        22,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },

    stateText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,
    },

    errorBox: {
      marginTop:
        22,

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
        '700',
    },

    errorText: {
      marginTop:
        2,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    /* ----------------------------------------------------------------------
       Shop summary
       ---------------------------------------------------------------------- */

    shopCard: {
      marginTop:
        SPACING.xl,

      padding:
        18,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,

      ...SHADOWS.card,
    },

    shopTopRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        12,
    },

    shopIdentity: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    shopIcon: {
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
        COLORS.accentSoft,
    },

    shopNameBlock: {
      flex:
        1,
    },

    shopName: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    shopType: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,
    },

    approvedBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.greenSoft,
    },

    approvedDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,

      backgroundColor:
        COLORS.green,
    },

    approvedText: {
      color:
        COLORS.green,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '700',
    },

    shopMetaGrid: {
      marginTop:
        18,

      flexDirection:
        'row',

      gap:
        12,
    },

    shopMetaItem: {
      flex:
        1,

      minWidth:
        0,

      padding:
        12,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    shopMetaLabel: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    shopMetaValueRow: {
      marginTop:
        6,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    shopMetaValue: {
      flex:
        1,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',
    },

    /* ----------------------------------------------------------------------
       Summary
       ---------------------------------------------------------------------- */

    summaryRow: {
      marginTop:
        12,

      flexDirection:
        'row',

      gap:
        12,
    },

    summaryCard: {
      flex:
        1,

      minHeight:
        132,

      padding:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },

    summaryIcon: {
      width:
        36,

      height:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        COLORS.accentSoft,
    },

    summaryValue: {
      marginTop:
        14,

      color:
        COLORS.text,

      fontSize:
        26,

      lineHeight:
        30,

      fontWeight:
        '800',
    },

    summaryLabel: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    /* ----------------------------------------------------------------------
       Section heading
       ---------------------------------------------------------------------- */

    sectionHeading: {
      marginTop:
        SPACING.xxl,

      marginBottom:
        12,
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

    /* ----------------------------------------------------------------------
       Main tools
       ---------------------------------------------------------------------- */

    primaryToolsGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        12,
    },

    toolCard: {
      width:
        '48%',

      flexGrow:
        1,

      minHeight:
        154,

      padding:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,

      ...SHADOWS.card,
    },

    toolTopRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    toolIcon: {
      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        COLORS.accentSoft,
    },

    toolBadge: {
      minWidth:
        24,

      height:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        6,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.danger,
    },

    toolBadgeText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    toolTitle: {
      marginTop:
        15,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    toolSubtitle: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    /* ----------------------------------------------------------------------
       More tools
       ---------------------------------------------------------------------- */

    moreToolsCard: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },

    moreToolRow: {
      minHeight:
        62,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        14,

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    moreToolRowLast: {
      borderBottomWidth:
        0,
    },

    moreToolIcon: {
      width:
        38,

      height:
        38,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        COLORS.accentSoft,
    },

    moreToolTitle: {
      flex:
        1,

      marginLeft:
        12,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '700',
    },

    inlineBadge: {
      minWidth:
        24,

      height:
        24,

      marginRight:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        6,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.dangerSoft,
    },

    inlineBadgeText: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },
  });