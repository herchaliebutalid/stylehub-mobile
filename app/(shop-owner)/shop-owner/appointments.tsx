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

import ShopOwnerAppointmentCard from '@/src/components/ShopOwnerAppointmentCard';

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
  getShopOwnerAppointments,
} from '@/src/services/shop-owner-api';

import type {
  ShopOwnerAppointment,
  ShopOwnerAppointmentStatus,
} from '@/src/types/shop-owner';


/* ==========================================================================
   TYPES
   ========================================================================== */

type AppointmentFilter =
  | 'all'
  | ShopOwnerAppointmentStatus;


/* ==========================================================================
   FILTERS
   ========================================================================== */

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


/* ==========================================================================
   SCREEN
   ========================================================================== */

export default function ShopOwnerAppointmentsScreen() {
  const {
    token,
  } = useAuth();


  const [
    appointments,
    setAppointments,
  ] = useState<ShopOwnerAppointment[]>(
    [],
  );


  const [
    filter,
    setFilter,
  ] = useState<AppointmentFilter>(
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


  /*
  |--------------------------------------------------------------------------
  | Prevent full loading screen every time user returns from details
  |--------------------------------------------------------------------------
  */

  const hasLoadedOnce =
    useRef(
      false,
    );


  /* ==========================================================================
     LOAD APPOINTMENTS
     ========================================================================== */

  const loadAppointments =
    useCallback(
      async (
        refreshing = false,
        silent = false,
      ) => {
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
            await getShopOwnerAppointments(
              token,
            );


          setAppointments(
            response
              .data
              .appointments,
          );


          hasLoadedOnce.current =
            true;
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load shop appointments.',
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
     REFRESH WHEN SCREEN GETS FOCUS
     ========================================================================== */

  useFocusEffect(
    useCallback(
      () => {
        void loadAppointments(
          false,
          hasLoadedOnce.current,
        );
      },
      [
        loadAppointments,
      ],
    ),
  );


  /* ==========================================================================
     FILTERED APPOINTMENTS
     ========================================================================== */

  const filteredAppointments =
    useMemo(
      () => {
        if (
          filter ===
          'all'
        ) {
          return appointments;
        }


        return appointments.filter(
          (
            appointment,
          ) =>
            appointment.status ===
            filter,
        );
      },
      [
        appointments,
        filter,
      ],
    );


  /* ==========================================================================
     DASHBOARD COUNTS
     ========================================================================== */

  const pendingCount =
    useMemo(
      () =>
        appointments.filter(
          (
            appointment,
          ) =>
            appointment.status ===
            'pending',
        ).length,
      [
        appointments,
      ],
    );


  const confirmedCount =
    useMemo(
      () =>
        appointments.filter(
          (
            appointment,
          ) =>
            appointment.status ===
            'confirmed',
        ).length,
      [
        appointments,
      ],
    );


  const completedCount =
    useMemo(
      () =>
        appointments.filter(
          (
            appointment,
          ) =>
            appointment.status ===
            'completed',
        ).length,
      [
        appointments,
      ],
    );


  /* ==========================================================================
     CURRENT FILTER LABEL
     ========================================================================== */

  const currentFilterLabel =
    FILTERS.find(
      (
        item,
      ) =>
        item.value ===
        filter,
    )?.label ??
    'Appointments';


  /* ==========================================================================
     BACK
     ========================================================================== */

  function handleBack() {
    router.replace(
      '/(shop-owner)/shop-owner',
    );
  }


  /* ==========================================================================
     OPEN APPOINTMENT
     ========================================================================== */

  function openAppointment(
    appointmentId: number,
  ) {
    router.push({
      pathname:
        '/(shop-owner)/shop-owner-appointment/[appointmentId]',

      params: {
        appointmentId:
          String(
            appointmentId,
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
                void loadAppointments(
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
            TOP NAVIGATION
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
              styles.backButton
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
              Appointments
            </Text>


            <Text
              style={
                styles.topBarCaption
              }
            >
              Manage your bookings
            </Text>
          </View>


          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Refresh appointments"
            onPress={
              () =>
                void loadAppointments(
                  true,
                )
            }
            style={
              styles.refreshButton
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
            PAGE HEADER
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
            BOOKINGS
          </Text>


          <Text
            style={
              styles.title
            }
          >
            Stay on top of every appointment
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            Review customer requests, confirmed schedules, and completed visits in one place.
          </Text>
        </View>


        {/* ================================================================
            OVERVIEW CARD
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
                All appointments
              </Text>


              <Text
                style={
                  styles.overviewValue
                }
              >
                {
                  appointments.length
                }
              </Text>
            </View>


            <View
              style={
                styles.overviewIcon
              }
            >
              <Ionicons
                name="calendar-outline"
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
              label="Pending"
              value={
                pendingCount
              }
            />


            <View
              style={
                styles.overviewDivider
              }
            />


            <OverviewStat
              label="Confirmed"
              value={
                confirmedCount
              }
            />


            <View
              style={
                styles.overviewDivider
              }
            />


            <OverviewStat
              label="Completed"
              value={
                completedCount
              }
            />
          </View>
        </View>


        {/* ================================================================
            FILTER SECTION
            ================================================================ */}

        <View
          style={
            styles.filterSection
          }
        >
          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Filter appointments
              </Text>


              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Choose a booking status
              </Text>
            </View>
          </View>


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
                    style={[
                      styles.filterButton,

                      selected &&
                        styles.filterButtonSelected,
                    ]}
                    onPress={
                      () =>
                        setFilter(
                          item.value,
                        )
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
                  20
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
                Couldn&apos;t refresh appointments
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
            LIST HEADER
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
                ? 'All appointments'
                : currentFilterLabel}
            </Text>


            <Text
              style={
                styles.listSubtitle
              }
            >
              {filteredAppointments.length ===
              1
                ? '1 booking'
                : `${filteredAppointments.length} bookings`}
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
              Loading appointments
            </Text>


            <Text
              style={
                styles.stateText
              }
            >
              Getting the latest bookings for your shop.
            </Text>
          </View>
        ) : filteredAppointments.length ===
          0 ? (

          /* ============================================================== 
             EMPTY STATE
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
                name="calendar-clear-outline"
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
              No appointments here
            </Text>


            <Text
              style={
                styles.emptyText
              }
            >
              {filter ===
              'all'
                ? 'Your customer bookings will appear here when appointments are created.'
                : `There are no ${currentFilterLabel.toLowerCase()} appointments right now.`}
            </Text>
          </View>
        ) : (

          /* ============================================================== 
             APPOINTMENT LIST
             ============================================================== */

          <View
            style={
              styles.appointmentList
            }
          >
            {filteredAppointments.map(
              (
                appointment,
              ) => (
                <ShopOwnerAppointmentCard
                  key={
                    appointment.id
                  }
                  appointment={
                    appointment
                  }
                  onPress={
                    () =>
                      openAppointment(
                        appointment.id,
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
  label,
  value,
}: {
  label: string;
  value: number;
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


    backButton: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        -10,

      borderRadius:
        RADII.pill,
    },


    topBarTitleBlock: {
      flex:
        1,

      marginLeft:
        4,
    },


    topBarTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },


    topBarCaption: {
      marginTop:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,
    },


    refreshButton: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        -8,

      borderRadius:
        RADII.pill,
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
        470,

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
        540,

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
       FILTERS
       ====================================================================== */

    filterSection: {
      marginTop:
        SPACING.xxl,
    },


    sectionHeadingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
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

      justifyContent:
        'center',

      paddingHorizontal:
        15,

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


    appointmentList: {
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
        320,

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
        340,

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