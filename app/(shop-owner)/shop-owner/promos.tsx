import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
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

import ShopOwnerPromoCard from '@/src/components/ShopOwnerPromoCard';
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
import { getShopOwnerPromos } from '@/src/services/shop-owner-api';
import type { ShopOwnerPromo } from '@/src/types/shop-owner';

type PromoFilter =
  | 'all'
  | 'live'
  | 'upcoming'
  | 'ended'
  | 'disabled';

const FILTERS: {
  value: PromoFilter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'live',
    label: 'Live',
  },
  {
    value: 'upcoming',
    label: 'Upcoming',
  },
  {
    value: 'ended',
    label: 'Ended',
  },
  {
    value: 'disabled',
    label: 'Disabled',
  },
];

export default function ShopOwnerPromosScreen() {
  const {
    token,
  } = useAuth();

  const [
    promos,
    setPromos,
  ] = useState<ShopOwnerPromo[]>([]);

  const [
    filter,
    setFilter,
  ] = useState<PromoFilter>('all');

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

  const hasLoadedOnce =
    useRef(false);

  /* ==========================================================================
     LOAD PROMOTIONS
     ========================================================================== */

  const loadPromos =
    useCallback(
      async (
        refreshing = false,
        silent = false,
      ): Promise<void> => {
        if (!token) {
          setIsLoading(false);

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
            await getShopOwnerPromos(
              token,
            );

          setPromos(
            response.data.promos,
          );

          hasLoadedOnce.current =
            true;
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load promotions.',
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        token,
      ],
    );

  /* ==========================================================================
     REFRESH WHEN RETURNING FROM CREATE / EDIT
     ========================================================================== */

  useFocusEffect(
    useCallback(
      () => {
        void loadPromos(
          false,
          hasLoadedOnce.current,
        );

        return undefined;
      },
      [
        loadPromos,
      ],
    ),
  );

  /* ==========================================================================
     PROMOTION COUNTS
     ========================================================================== */

  const counts =
    useMemo(
      () => ({
        live:
          promos.filter(
            (
              promo,
            ) =>
              promo.is_active
              &&
              promo.is_currently_active,
          ).length,

        upcoming:
          promos.filter(
            (
              promo,
            ) =>
              promo.is_active
              &&
              promo.is_upcoming,
          ).length,

        ended:
          promos.filter(
            (
              promo,
            ) =>
              promo.has_ended,
          ).length,

        disabled:
          promos.filter(
            (
              promo,
            ) =>
              !promo.is_active,
          ).length,
      }),
      [
        promos,
      ],
    );

  /* ==========================================================================
     FILTER
     ========================================================================== */

  const filteredPromos =
    useMemo(
      () => {
        switch (filter) {
          case 'live':
            return promos.filter(
              (
                promo,
              ) =>
                promo.is_active
                &&
                promo.is_currently_active,
            );

          case 'upcoming':
            return promos.filter(
              (
                promo,
              ) =>
                promo.is_active
                &&
                promo.is_upcoming,
            );

          case 'ended':
            return promos.filter(
              (
                promo,
              ) =>
                promo.has_ended,
            );

          case 'disabled':
            return promos.filter(
              (
                promo,
              ) =>
                !promo.is_active,
            );

          default:
            return promos;
        }
      },
      [
        filter,
        promos,
      ],
    );

  const currentFilterLabel =
    FILTERS.find(
      (
        item,
      ) =>
        item.value === filter,
    )?.label
    ??
    'Promotions';

  /* ==========================================================================
     NAVIGATION
     ========================================================================== */

  function handleBack(): void {
    router.replace(
      '/(shop-owner)/shop-owner',
    );
  }

  function createPromo(): void {
    router.push(
      '/(shop-owner)/promo/create',
    );
  }

  function openPromo(
    promoId: number,
  ): void {
    router.push({
      pathname:
        '/(shop-owner)/promo/[promoId]',

      params: {
        promoId:
          String(
            promoId,
          ),
      },
    });
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
                void loadPromos(
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
              Promotions
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Discounts & campaigns
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.8
            }
            accessibilityRole="button"
            accessibilityLabel="Create promotion"
            onPress={
              createPromo
            }
            style={
              styles.topAddButton
            }
          >
            <Ionicons
              name="add"
              size={
                22
              }
              color={
                COLORS.white
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
            PROMOTIONS
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Create offers customers can understand quickly
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Manage shop-wide or service-specific discounts, validity dates,
            and customer visibility from one place.
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
                Total promotions
              </Text>

              <Text
                style={
                  styles.overviewValue
                }
              >
                {promos.length}
              </Text>
            </View>

            <View
              style={
                styles.overviewIcon
              }
            >
              <Ionicons
                name="pricetags-outline"
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
                counts.live
              }
              label="Live"
            />

            <View
              style={
                styles.overviewDivider
              }
            />

            <OverviewStat
              value={
                counts.upcoming
              }
              label="Upcoming"
            />

            <View
              style={
                styles.overviewDivider
              }
            />

            <OverviewStat
              value={
                counts.ended
              }
              label="Ended"
            />
          </View>
        </View>

        {/* ================================================================
            CREATE SHORTCUT
            ================================================================ */}

        <View
          style={
            styles.createCard
          }
        >
          <View
            style={
              styles.createIcon
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={
                21
              }
              color={
                COLORS.navy
              }
            />
          </View>

          <View
            style={
              styles.createContent
            }
          >
            <Text
              style={
                styles.createTitle
              }
            >
              Create a new promotion
            </Text>

            <Text
              style={
                styles.createText
              }
            >
              Offer a percentage or fixed discount for your whole shop or one
              service.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.8
            }
            accessibilityRole="button"
            accessibilityLabel="Create new promotion"
            onPress={
              createPromo
            }
            style={
              styles.createButton
            }
          >
            <Ionicons
              name="arrow-forward"
              size={
                18
              }
              color={
                COLORS.white
              }
            />
          </TouchableOpacity>
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
                Couldn&apos;t refresh promotions
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
            FILTERS
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
            Promotion status
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Filter campaigns by whether they are live, scheduled, ended, or
            disabled.
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
                  item.value === filter;

                const count =
                  item.value === 'all'
                    ? promos.length
                    : counts[item.value];

                return (
                  <TouchableOpacity
                    key={
                      item.value
                    }
                    activeOpacity={
                      0.8
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
            LIST TITLE
            ================================================================ */}

        <View
          style={
            styles.listHeader
          }
        >
          <Text
            style={
              styles.listTitle
            }
          >
            {filter === 'all'
              ? 'Your promotions'
              : currentFilterLabel}
          </Text>

          <Text
            style={
              styles.listSubtitle
            }
          >
            {filteredPromos.length === 1
              ? '1 promotion'
              : `${filteredPromos.length} promotions`}
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
              Loading promotions
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              Getting your latest promotion campaigns and schedules.
            </Text>
          </View>
        ) : filteredPromos.length === 0 ? (

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
                name="pricetag-outline"
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
              {filter === 'all'
                ? 'No promotions yet'
                : `No ${currentFilterLabel.toLowerCase()} promotions`}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {filter === 'all'
                ? 'Create your first promotion to offer customers a shop-wide or service-specific discount.'
                : `You do not have any ${currentFilterLabel.toLowerCase()} promotions right now.`}
            </Text>

            {filter === 'all' ? (
              <TouchableOpacity
                activeOpacity={
                  0.82
                }
                onPress={
                  createPromo
                }
                style={
                  styles.emptyButton
                }
              >
                <Ionicons
                  name="add"
                  size={
                    18
                  }
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.emptyButtonText
                  }
                >
                  Create promotion
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={
                  0.8
                }
                onPress={
                  () =>
                    setFilter(
                      'all',
                    )
                }
                style={
                  styles.showAllButton
                }
              >
                <Text
                  style={
                    styles.showAllButtonText
                  }
                >
                  Show all promotions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (

          /* ==============================================================
             PROMOTIONS
             ============================================================== */

          <View
            style={
              styles.promoList
            }
          >
            {filteredPromos.map(
              (
                promo,
              ) => (
                <ShopOwnerPromoCard
                  key={
                    promo.id
                  }
                  promo={
                    promo
                  }
                  onPress={
                    () =>
                      openPromo(
                        promo.id,
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

    topAddButton: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        COLORS.primary,
    },

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
        540,

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
        600,

      marginTop:
        8,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },

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

    createCard: {
      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,

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

    createIcon: {
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

    createContent: {
      flex:
        1,

      minWidth:
        0,
    },

    createTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    createText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        16,
    },

    createButton: {
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
        COLORS.primary,
    },

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

    emptyButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      marginTop:
        18,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      paddingHorizontal:
        16,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.primary,
    },

    emptyButtonText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    showAllButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      marginTop:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        18,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    showAllButtonText: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    promoList: {
      gap:
        12,
    },
  });