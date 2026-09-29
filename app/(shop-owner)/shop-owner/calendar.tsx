import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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
import { ApiError } from '@/src/services/api';
import {
  getShopOwnerCalendarMonth,
  getShopOwnerDayAgenda,
} from '@/src/services/shop-owner-calendar-api';
import type {
  ShopOwnerCalendarDay,
  ShopOwnerCalendarMonthData,
  ShopOwnerDayAgendaData,
} from '@/src/types/shop-owner-calendar';

type IconName = ComponentProps<typeof Ionicons>['name'];

const WEEKDAY_LABELS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

function normalizeTime(value: string): string {
  const match = value.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? value;
}

function formatDisplayTime(value: string | null): string {
  if (!value) {
    return '--';
  }

  const normalized = normalizeTime(value);
  const match = normalized.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return value;
  }

  const hour = Number(match[1]);
  const minute = match[2];

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return value;
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function shiftMonth(month: string, amount: number): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return month;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const date = new Date(year, monthIndex + amount, 1);

  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
  ].join('-');
}

function formatMonthYear(month: string): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return month;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    1,
  );

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ShopOwnerCalendarScreen() {
  const { token } = useAuth();

  const [monthData, setMonthData] =
    useState<ShopOwnerCalendarMonthData | null>(null);

  const [selectedDate, setSelectedDate] = useState('');

  const [agenda, setAgenda] =
    useState<ShopOwnerDayAgendaData | null>(null);

  const [isLoadingMonth, setIsLoadingMonth] = useState(true);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const monthRequestSequence = useRef(0);
  const agendaRequestSequence = useRef(0);
  const selectedDateRef = useRef('');
  const currentMonthRef = useRef('');

  const selectedDay = useMemo(
    () =>
      monthData?.days.find((day) => day.date === selectedDate)
      ?? null,
    [monthData, selectedDate],
  );

  const monthSummary = useMemo(() => {
    if (!monthData) {
      return {
        appointments: 0,
        active: 0,
        blockedDays: 0,
        breakDays: 0,
      };
    }

    return monthData.days.reduce(
      (summary, day) => ({
        appointments:
          summary.appointments + day.appointment_count,

        active:
          summary.active + day.active_appointment_count,

        blockedDays:
          summary.blockedDays + (day.is_blocked ? 1 : 0),

        breakDays:
          summary.breakDays + (day.has_break_periods ? 1 : 0),
      }),
      {
        appointments: 0,
        active: 0,
        blockedDays: 0,
        breakDays: 0,
      },
    );
  }, [monthData]);

  const calendarCells = useMemo(() => {
    if (!monthData || monthData.days.length === 0) {
      return [] as (ShopOwnerCalendarDay | null)[];
    }

    const leadingBlankCount =
      monthData.days[0].day_of_week - 1;

    const cells: (ShopOwnerCalendarDay | null)[] = [
      ...Array.from(
        {
          length: leadingBlankCount,
        },
        () => null,
      ),

      ...monthData.days,
    ];

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [monthData]);

  const calendarRows = useMemo(() => {
    const rows: (ShopOwnerCalendarDay | null)[][] = [];

    for (
      let index = 0;
      index < calendarCells.length;
      index += 7
    ) {
      rows.push(
        calendarCells.slice(
          index,
          index + 7,
        ),
      );
    }

    return rows;
  }, [calendarCells]);

  const loadAgenda = useCallback(
    async (
      date: string,
    ): Promise<void> => {
      if (!token || date.trim() === '') {
        setAgenda(null);
        setIsLoadingAgenda(false);

        return;
      }

      const requestId =
        agendaRequestSequence.current + 1;

      agendaRequestSequence.current =
        requestId;

      setIsLoadingAgenda(true);

      try {
        const response =
          await getShopOwnerDayAgenda(
            token,
            date,
          );

        if (
          requestId !==
          agendaRequestSequence.current
        ) {
          return;
        }

        setAgenda(
          response.data,
        );
      } catch (error) {
        if (
          requestId !==
          agendaRequestSequence.current
        ) {
          return;
        }

        setAgenda(null);

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load the selected day agenda.',
        );
      } finally {
        if (
          requestId ===
          agendaRequestSequence.current
        ) {
          setIsLoadingAgenda(false);
        }
      }
    },
    [
      token,
    ],
  );

  const loadMonth = useCallback(
    async (
      month?: string,
      refreshing = false,
    ): Promise<void> => {
      if (!token) {
        setIsLoadingMonth(false);

        setErrorMessage(
          'You must be signed in as a Shop Owner.',
        );

        return;
      }

      const requestId =
        monthRequestSequence.current + 1;

      monthRequestSequence.current =
        requestId;

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoadingMonth(true);
      }

      setErrorMessage('');

      try {
        const response =
          await getShopOwnerCalendarMonth(
            token,
            month,
          );

        if (
          requestId !==
          monthRequestSequence.current
        ) {
          return;
        }

        const nextMonthData =
          response.data;

        setMonthData(
          nextMonthData,
        );

        currentMonthRef.current =
          nextMonthData.month;

        const currentSelection =
          selectedDateRef.current;

        const selectionStillExists =
          currentSelection !== ''
          &&
          nextMonthData.days.some(
            (day) =>
              day.date ===
              currentSelection,
          );

        const nextSelection =
          selectionStillExists
            ? currentSelection
            : nextMonthData.days.find(
                (day) =>
                  day.is_today,
              )?.date
              ??
              nextMonthData.days[0]?.date
              ??
              '';

        selectedDateRef.current =
          nextSelection;

        setSelectedDate(
          nextSelection,
        );

        if (nextSelection !== '') {
          await loadAgenda(
            nextSelection,
          );
        } else {
          setAgenda(null);
        }
      } catch (error) {
        if (
          requestId !==
          monthRequestSequence.current
        ) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load the shop calendar.',
        );
      } finally {
        if (
          requestId ===
          monthRequestSequence.current
        ) {
          setIsLoadingMonth(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      loadAgenda,
      token,
    ],
  );

  useFocusEffect(
    useCallback(
      () => {
        void loadMonth(
          currentMonthRef.current
          ||
          undefined,
        );
      },
      [
        loadMonth,
      ],
    ),
  );

  function handleBack(): void {
    router.replace(
      '/(shop-owner)/shop-owner/schedule',
    );
  }

  function changeMonth(
    amount: number,
  ): void {
    if (
      !monthData
      ||
      isLoadingMonth
      ||
      isRefreshing
    ) {
      return;
    }

    agendaRequestSequence.current += 1;

    selectedDateRef.current =
      '';

    setSelectedDate('');

    setAgenda(null);

    void loadMonth(
      shiftMonth(
        monthData.month,
        amount,
      ),
    );
  }

  function goToToday(): void {
    if (
      isLoadingMonth
      ||
      isRefreshing
    ) {
      return;
    }

    const todayInCurrentMonth =
      monthData?.days.find(
        (day) =>
          day.is_today,
      );

    if (todayInCurrentMonth) {
      selectDay(
        todayInCurrentMonth,
      );

      return;
    }

    void loadMonth();
  }

  function selectDay(
    day: ShopOwnerCalendarDay,
  ): void {
    if (
      day.date === selectedDate
      &&
      agenda?.date.value ===
        day.date
    ) {
      return;
    }

    selectedDateRef.current =
      day.date;

    setSelectedDate(
      day.date,
    );

    setErrorMessage('');

    void loadAgenda(
      day.date,
    );
  }

  function openAppointment(
    appointmentId: number,
  ): void {
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

  async function refreshCalendar(): Promise<void> {
    await loadMonth(
      currentMonthRef.current
      ||
      undefined,

      true,
    );
  }

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
                void refreshCalendar()
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
            accessibilityLabel="Back to schedule"
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
              Calendar
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Appointments and availability
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.78
            }
            accessibilityRole="button"
            accessibilityLabel="Go to today"
            disabled={
              isLoadingMonth
              ||
              isRefreshing
            }
            onPress={
              goToToday
            }
            style={[
              styles.todayButton,

              (
                isLoadingMonth
                ||
                isRefreshing
              )
              &&
                styles.disabledButton,
            ]}
          >
            <Ionicons
              name="today-outline"
              size={
                17
              }
              color={
                COLORS.navy
              }
            />

            <Text
              style={
                styles.todayButtonText
              }
            >
              Today
            </Text>
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
            SHOP CALENDAR
          </Text>

          <Text
            style={
              styles.title
            }
          >
            See your bookings and shop availability at a glance
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Choose any day to review appointments, business hours, breaks,
            and blocked-date information.
          </Text>
        </View>


        {/* ================================================================
            ERROR
            ================================================================ */}

        {errorMessage ? (
          <MessageBox
            title="Calendar needs attention"
            message={
              errorMessage
            }
          />
        ) : null}


        {/* ================================================================
            FIRST LOAD
            ================================================================ */}

        {isLoadingMonth &&
        !monthData ? (
          <View
            style={
              styles.loadingCard
            }
          >
            <View
              style={
                styles.loadingIcon
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
                styles.loadingTitle
              }
            >
              Loading calendar
            </Text>

            <Text
              style={
                styles.loadingText
              }
            >
              Getting your appointments and availability for this month.
            </Text>
          </View>
        ) : (
          <>

            {/* ============================================================
                MONTH OVERVIEW
                ============================================================ */}

            <View
              style={
                styles.monthOverviewCard
              }
            >
              <View
                style={
                  styles.monthOverviewHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.monthOverviewLabel
                    }
                  >
                    {monthData?.month_label
                    ??
                    (
                      monthData?.month
                        ? formatMonthYear(
                            monthData.month,
                          )
                        : 'Current month'
                    )}
                  </Text>

                  <Text
                    style={
                      styles.monthOverviewValue
                    }
                  >
                    {
                      monthSummary.appointments
                    } bookings
                  </Text>
                </View>

                <View
                  style={
                    styles.monthOverviewIcon
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
                  styles.monthOverviewStats
                }
              >
                <OverviewStat
                  value={
                    monthSummary.active
                  }
                  label="Active"
                />

                <View
                  style={
                    styles.monthOverviewDivider
                  }
                />

                <OverviewStat
                  value={
                    monthSummary.blockedDays
                  }
                  label="Blocked days"
                />

                <View
                  style={
                    styles.monthOverviewDivider
                  }
                />

                <OverviewStat
                  value={
                    monthSummary.breakDays
                  }
                  label="Break days"
                />
              </View>
            </View>


            {/* ============================================================
                MONTH CALENDAR
                ============================================================ */}

            <View
              style={
                styles.calendarCard
              }
            >
              <View
                style={
                  styles.monthHeader
                }
              >
                <TouchableOpacity
                  activeOpacity={
                    0.7
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  disabled={
                    isLoadingMonth
                    ||
                    isRefreshing
                  }
                  onPress={
                    () =>
                      changeMonth(
                        -1,
                      )
                  }
                  style={
                    styles.monthArrowButton
                  }
                >
                  <Ionicons
                    name="chevron-back"
                    size={
                      20
                    }
                    color={
                      COLORS.navy
                    }
                  />
                </TouchableOpacity>

                <View
                  style={
                    styles.monthTitleContainer
                  }
                >
                  <Text
                    style={
                      styles.monthTitle
                    }
                  >
                    {monthData?.month_label
                    ??
                    (
                      monthData?.month
                        ? formatMonthYear(
                            monthData.month,
                          )
                        : 'Calendar'
                    )}
                  </Text>

                  <Text
                    style={
                      styles.monthTimezone
                    }
                  >
                    {monthData?.timezone
                    ??
                    'Asia/Manila'}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={
                    0.7
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  disabled={
                    isLoadingMonth
                    ||
                    isRefreshing
                  }
                  onPress={
                    () =>
                      changeMonth(
                        1,
                      )
                  }
                  style={
                    styles.monthArrowButton
                  }
                >
                  <Ionicons
                    name="chevron-forward"
                    size={
                      20
                    }
                    color={
                      COLORS.navy
                    }
                  />
                </TouchableOpacity>
              </View>

              {isLoadingMonth ? (
                <View
                  style={
                    styles.calendarLoading
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
                      styles.calendarLoadingText
                    }
                  >
                    Loading month...
                  </Text>
                </View>
              ) : (
                <>

                  {/* WEEKDAYS */}

                  <View
                    style={
                      styles.weekdayRow
                    }
                  >
                    {WEEKDAY_LABELS.map(
                      (
                        label,
                      ) => (
                        <View
                          key={
                            label
                          }
                          style={
                            styles.weekdayCell
                          }
                        >
                          <Text
                            style={
                              styles.weekdayText
                            }
                          >
                            {label}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>


                  {/* CALENDAR GRID */}

                  <View
                    style={
                      styles.calendarGrid
                    }
                  >
                    {calendarRows.map(
                      (
                        row,
                        rowIndex,
                      ) => (
                        <View
                          key={
                            `row-${rowIndex}`
                          }
                          style={
                            styles.calendarRow
                          }
                        >
                          {row.map(
                            (
                              day,
                              columnIndex,
                            ) =>
                              day ? (
                                <CalendarDayCell
                                  key={
                                    day.date
                                  }
                                  day={
                                    day
                                  }
                                  selected={
                                    day.date ===
                                    selectedDate
                                  }
                                  onPress={
                                    () =>
                                      selectDay(
                                        day,
                                      )
                                  }
                                />
                              ) : (
                                <View
                                  key={
                                    `blank-${rowIndex}-${columnIndex}`
                                  }
                                  style={
                                    styles.calendarDayWrapper
                                  }
                                />
                              ),
                          )}
                        </View>
                      ),
                    )}
                  </View>


                  {/* LEGEND */}

                  <View
                    style={
                      styles.legend
                    }
                  >
                    <LegendItem
                      color={
                        COLORS.navy
                      }
                      label="Bookings"
                    />

                    <LegendItem
                      color={
                        COLORS.violet
                      }
                      label="Break"
                    />

                    <LegendItem
                      color={
                        COLORS.danger
                      }
                      label="Blocked"
                    />
                  </View>
                </>
              )}
            </View>


            {/* ============================================================
                SELECTED DAY
                ============================================================ */}

            {selectedDay ? (
              <>

                <SectionHeading
                  title="Selected day"
                  subtitle="Daily activity and availability details"
                />

                <View
                  style={
                    styles.selectedDayCard
                  }
                >
                  <View
                    style={
                      styles.selectedDayTopRow
                    }
                  >
                    <View
                      style={
                        styles.selectedDateBadge
                      }
                    >
                      <Text
                        style={
                          styles.selectedDateMonth
                        }
                      >
                        {
                          selectedDay
                            .short_day_label
                            .toUpperCase()
                        }
                      </Text>

                      <Text
                        style={
                          styles.selectedDateNumber
                        }
                      >
                        {
                          selectedDay
                            .day_number
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.selectedDayIdentity
                      }
                    >
                      <Text
                        style={
                          styles.selectedDayTitle
                        }
                      >
                        {agenda?.date.long_label
                        ??
                        `${selectedDay.day_label}, ${selectedDay.date}`}
                      </Text>

                      <View
                        style={
                          styles.selectedDayStatusRow
                        }
                      >
                        <View
                          style={[
                            styles.statusDot,

                            {
                              backgroundColor:
                                selectedDay.is_blocked
                                  ? COLORS.danger
                                  : selectedDay.schedule.is_open
                                    ? COLORS.green
                                    : COLORS.textMuted,
                            },
                          ]}
                        />

                        <Text
                          style={
                            styles.selectedDayStatusText
                          }
                        >
                          {selectedDay.is_blocked
                            ? 'Blocked for new bookings'
                            : selectedDay.schedule.is_open
                              ? `${formatDisplayTime(
                                  selectedDay
                                    .schedule
                                    .opens_at,
                                )} - ${formatDisplayTime(
                                  selectedDay
                                    .schedule
                                    .closes_at,
                                )}`
                              : 'Closed by weekly schedule'}
                        </Text>
                      </View>
                    </View>

                    {selectedDay.is_today ? (
                      <View
                        style={
                          styles.todayBadge
                        }
                      >
                        <Text
                          style={
                            styles.todayBadgeText
                          }
                        >
                          Today
                        </Text>
                      </View>
                    ) : null}
                  </View>


                  {/* DAY SUMMARY */}

                  <View
                    style={
                      styles.daySummaryRow
                    }
                  >
                    <DaySummaryItem
                      value={
                        agenda
                          ?.summary
                          .appointment_count
                        ??
                        selectedDay
                          .appointment_count
                      }
                      label="Bookings"
                    />

                    <View
                      style={
                        styles.daySummaryDivider
                      }
                    />

                    <DaySummaryItem
                      value={
                        agenda
                          ?.summary
                          .status_counts
                          .pending
                        ??
                        selectedDay
                          .status_counts
                          .pending
                      }
                      label="Pending"
                    />

                    <View
                      style={
                        styles.daySummaryDivider
                      }
                    />

                    <DaySummaryItem
                      value={
                        agenda
                          ?.summary
                          .status_counts
                          .confirmed
                        ??
                        selectedDay
                          .status_counts
                          .confirmed
                      }
                      label="Confirmed"
                    />
                  </View>
                </View>


                {/* DAY LOADING */}

                {isLoadingAgenda ? (
                  <View
                    style={
                      styles.agendaLoadingCard
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
                        styles.agendaLoadingText
                      }
                    >
                      Loading day agenda...
                    </Text>
                  </View>
                ) : agenda ? (
                  <>

                    {/* AVAILABILITY DETAILS */}

                    <SectionHeading
                      title="Availability details"
                      subtitle="Business hours, breaks, and closures for this date"
                    />

                    <DayContextCard
                      agenda={
                        agenda
                      }
                    />


                    {/* APPOINTMENTS */}

                    <SectionHeading
                      title="Appointments"
                      subtitle={
                        agenda
                          .appointments
                          .length ===
                        1
                          ? '1 booking scheduled for this day'
                          : `${agenda.appointments.length} bookings scheduled for this day`
                      }
                    />

                    {agenda
                      .appointments
                      .length ===
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
                            name="calendar-outline"
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
                          No appointments scheduled
                        </Text>

                        <Text
                          style={
                            styles.emptyText
                          }
                        >
                          Customer bookings for this date will appear here.
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={
                          styles.appointmentList
                        }
                      >
                        {agenda
                          .appointments
                          .map(
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
                  </>
                ) : (
                  <View
                    style={
                      styles.agendaLoadingCard
                    }
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={
                        20
                      }
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.agendaLoadingText
                      }
                    >
                      Select the day again or pull down to reload its agenda.
                    </Text>
                  </View>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   CALENDAR DAY
   ========================================================================== */

function CalendarDayCell({
  day,
  selected,
  onPress,
}: {
  day:
    ShopOwnerCalendarDay;

  selected:
    boolean;

  onPress:
    () => void;
}) {
  const hasAppointments =
    day.appointment_count >
    0;

  return (
    <View
      style={
        styles.calendarDayWrapper
      }
    >
      <TouchableOpacity
        activeOpacity={
          0.74
        }
        accessibilityRole="button"
        accessibilityLabel={
          `${day.day_label} ${day.day_number}, ${day.appointment_count} appointments${day.is_blocked ? ', blocked' : ''}${day.has_break_periods ? ', has breaks' : ''}`
        }
        onPress={
          onPress
        }
        style={[
          styles.calendarDay,

          !day.schedule.is_open
          &&
            styles.calendarDayClosed,

          day.is_today
          &&
            styles.calendarDayToday,

          selected
          &&
            styles.calendarDaySelected,
        ]}
      >
        <View
          style={
            styles.dayNumberRow
          }
        >
          <Text
            style={[
              styles.dayNumber,

              !day.schedule.is_open
              &&
                styles.dayNumberClosed,

              day.is_today
              &&
                styles.dayNumberToday,

              selected
              &&
                styles.dayNumberSelected,
            ]}
          >
            {
              day.day_number
            }
          </Text>

          {hasAppointments ? (
            <View
              style={[
                styles.appointmentBadge,

                selected
                &&
                  styles.appointmentBadgeSelected,
              ]}
            >
              <Text
                style={[
                  styles.appointmentBadgeText,

                  selected
                  &&
                    styles.appointmentBadgeTextSelected,
                ]}
              >
                {day.appointment_count >
                9
                  ? '9+'
                  : day.appointment_count}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={
            styles.dayIndicators
          }
        >
          {day.has_break_periods ? (
            <View
              style={[
                styles.indicatorDot,
                styles.breakDot,

                selected
                &&
                  styles.selectedIndicatorDot,
              ]}
            />
          ) : null}

          {day.is_blocked ? (
            <View
              style={[
                styles.indicatorDot,
                styles.blockedDot,

                selected
                &&
                  styles.selectedIndicatorDot,
              ]}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}


/* ==========================================================================
   LEGEND
   ========================================================================== */

function LegendItem({
  color,
  label,
}: {
  color:
    string;

  label:
    string;
}) {
  return (
    <View
      style={
        styles.legendItem
      }
    >
      <View
        style={[
          styles.legendDot,

          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={
          styles.legendText
        }
      >
        {label}
      </Text>
    </View>
  );
}


/* ==========================================================================
   MONTH OVERVIEW
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
        styles.monthOverviewStat
      }
    >
      <Text
        style={
          styles.monthOverviewStatValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.monthOverviewStatLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}


/* ==========================================================================
   DAY SUMMARY
   ========================================================================== */

function DaySummaryItem({
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
        styles.daySummaryItem
      }
    >
      <Text
        style={
          styles.daySummaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.daySummaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}


/* ==========================================================================
   SECTION HEADING
   ========================================================================== */

function SectionHeading({
  title,
  subtitle,
}: {
  title:
    string;

  subtitle:
    string;
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
   CONTEXT ROW
   ========================================================================== */

function ContextRow({
  icon,
  title,
  value,
  color,
  softColor,
}: {
  icon:
    IconName;

  title:
    string;

  value:
    string;

  color:
    string;

  softColor:
    string;
}) {
  return (
    <View
      style={
        styles.contextRow
      }
    >
      <View
        style={[
          styles.contextIcon,

          {
            backgroundColor:
              softColor,
          },
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={
            19
          }
          color={
            color
          }
        />
      </View>

      <View
        style={
          styles.contextCopy
        }
      >
        <Text
          style={
            styles.contextTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.contextText
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


/* ==========================================================================
   DAY CONTEXT
   ========================================================================== */

function DayContextCard({
  agenda,
}: {
  agenda:
    ShopOwnerDayAgendaData;
}) {
  const hasExtraRules =
    Boolean(
      agenda.blocked_date,
    )
    ||
    agenda.break_periods.length >
      0;

  return (
    <View
      style={
        styles.contextCard
      }
    >

      {/* BUSINESS HOURS */}

      <ContextRow
        icon={
          agenda.schedule.is_open
            ? 'time-outline'
            : 'moon-outline'
        }
        title={
          agenda.schedule.is_open
            ? 'Business hours'
            : 'Shop closed'
        }
        value={
          agenda.schedule.is_open
            ? `${formatDisplayTime(
                agenda
                  .schedule
                  .opens_at,
              )} - ${formatDisplayTime(
                agenda
                  .schedule
                  .closes_at,
              )}`
            : 'No regular operating hours are configured for this weekday.'
        }
        color={
          agenda.schedule.is_open
            ? COLORS.green
            : COLORS.textMuted
        }
        softColor={
          agenda.schedule.is_open
            ? COLORS.greenSoft
            : COLORS.surfaceSoft
        }
      />


      {/* BLOCKED DATE */}

      {agenda.blocked_date ? (
        <>
          <View
            style={
              styles.contextDivider
            }
          />

          <ContextRow
            icon="calendar-clear-outline"
            title="Blocked date"
            value={
              agenda
                .blocked_date
                .reason
              ??
              'No reason provided.'
            }
            color={
              COLORS.danger
            }
            softColor={
              COLORS.dangerSoft
            }
          />
        </>
      ) : null}


      {/* BREAK PERIODS */}

      {agenda
        .break_periods
        .map(
          (
            breakPeriod,
          ) => (
            <View
              key={
                breakPeriod.id
              }
            >
              <View
                style={
                  styles.contextDivider
                }
              />

              <ContextRow
                icon="cafe-outline"
                title={
                  breakPeriod.label
                  ??
                  'Break period'
                }
                value={
                  `${formatDisplayTime(
                    breakPeriod
                      .starts_at,
                  )} - ${formatDisplayTime(
                    breakPeriod
                      .ends_at,
                  )}`
                }
                color={
                  COLORS.violet
                }
                softColor={
                  COLORS.violetSoft
                }
              />
            </View>
          ),
        )}


      {/* NO EXTRA RULES */}

      {!hasExtraRules ? (
        <View
          style={
            styles.contextHint
          }
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={
              17
            }
            color={
              COLORS.green
            }
          />

          <Text
            style={
              styles.contextHintText
            }
          >
            No blocked date or break period applies to this day.
          </Text>
        </View>
      ) : null}
    </View>
  );
}


/* ==========================================================================
   ERROR MESSAGE
   ========================================================================== */

function MessageBox({
  title,
  message,
}: {
  title:
    string;

  message:
    string;
}) {
  return (
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
          styles.errorCopy
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {message}
        </Text>
      </View>
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

    todayButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      paddingHorizontal:
        11,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surface,
    },

    todayButtonText: {
      color:
        COLORS.navy,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    disabledButton: {
      opacity:
        0.46,
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
        560,

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
        31,

      height:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.surface,
    },

    errorCopy: {
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
       LOADING
       ====================================================================== */

    loadingCard: {
      marginTop:
        SPACING.xl,

      alignItems:
        'center',

      paddingHorizontal:
        24,

      paddingVertical:
        36,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,
    },

    loadingIcon: {
      width:
        54,

      height:
        54,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        18,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    loadingTitle: {
      marginTop:
        14,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    loadingText: {
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
       MONTH OVERVIEW
       ====================================================================== */

    monthOverviewCard: {
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

    monthOverviewHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        12,
    },

    monthOverviewLabel: {
      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '600',
    },

    monthOverviewValue: {
      marginTop:
        4,

      color:
        COLORS.white,

      fontSize:
        27,

      lineHeight:
        33,

      fontWeight:
        '800',

      letterSpacing:
        -0.5,
    },

    monthOverviewIcon: {
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

    monthOverviewStats: {
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

    monthOverviewStat: {
      flex:
        1,

      minWidth:
        0,
    },

    monthOverviewStatValue: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    monthOverviewStatLabel: {
      marginTop:
        3,

      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.micro,
    },

    monthOverviewDivider: {
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
       CALENDAR
       ====================================================================== */

    calendarCard: {
      marginTop:
        12,

      padding:
        14,

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

    monthHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        14,
    },

    monthArrowButton: {
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
        COLORS.surfaceSoft,
    },

    monthTitleContainer: {
      flex:
        1,

      alignItems:
        'center',

      paddingHorizontal:
        8,
    },

    monthTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    monthTimezone: {
      marginTop:
        2,

      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    calendarLoading: {
      minHeight:
        270,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        9,
    },

    calendarLoadingText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,
    },

    weekdayRow: {
      flexDirection:
        'row',

      marginBottom:
        5,
    },

    weekdayCell: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        6,
    },

    weekdayText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    calendarGrid: {
      gap:
        3,
    },

    calendarRow: {
      flexDirection:
        'row',
    },

    calendarDayWrapper: {
      flex:
        1,

      minWidth:
        0,

      padding:
        2,
    },

    calendarDay: {
      minHeight:
        56,

      paddingHorizontal:
        5,

      paddingVertical:
        7,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        12,

      backgroundColor:
        COLORS.surface,
    },

    calendarDayClosed: {
      backgroundColor:
        COLORS.surfaceSoft,
    },

    calendarDayToday: {
      borderColor:
        COLORS.navy,

      borderWidth:
        1.5,
    },

    calendarDaySelected: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primary,
    },

    dayNumberRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        2,
    },

    dayNumber: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '800',
    },

    dayNumberClosed: {
      color:
        COLORS.textLight,
    },

    dayNumberToday: {
      color:
        COLORS.navy,
    },

    dayNumberSelected: {
      color:
        COLORS.white,
    },

    appointmentBadge: {
      minWidth:
        20,

      height:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        4,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.accentSoft,
    },

    appointmentBadgeSelected: {
      backgroundColor:
        COLORS.navyMuted,
    },

    appointmentBadgeText: {
      color:
        COLORS.navy,

      fontSize:
        9,

      fontWeight:
        '800',
    },

    appointmentBadgeTextSelected: {
      color:
        COLORS.white,
    },

    dayIndicators: {
      minHeight:
        10,

      marginTop:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    indicatorDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
    },

    breakDot: {
      backgroundColor:
        COLORS.violet,
    },

    blockedDot: {
      backgroundColor:
        COLORS.danger,
    },

    selectedIndicatorDot: {
      borderWidth:
        1,

      borderColor:
        COLORS.white,
    },

    legend: {
      marginTop:
        14,

      paddingTop:
        12,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        14,

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,
    },

    legendItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    legendDot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,
    },

    legendText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    /* ======================================================================
       SECTION
       ====================================================================== */

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

    /* ======================================================================
       SELECTED DAY
       ====================================================================== */

    selectedDayCard: {
      padding:
        16,

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

    selectedDayTopRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    selectedDateBadge: {
      width:
        54,

      overflow:
        'hidden',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        13,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    selectedDateMonth: {
      width:
        '100%',

      paddingVertical:
        4,

      color:
        COLORS.white,

      backgroundColor:
        COLORS.primary,

      fontSize:
        9,

      fontWeight:
        '800',

      letterSpacing:
        0.7,

      textAlign:
        'center',
    },

    selectedDateNumber: {
      paddingVertical:
        6,

      color:
        COLORS.text,

      fontSize:
        21,

      lineHeight:
        24,

      fontWeight:
        '800',
    },

    selectedDayIdentity: {
      flex:
        1,

      minWidth:
        0,
    },

    selectedDayTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    selectedDayStatusRow: {
      marginTop:
        5,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    statusDot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,
    },

    selectedDayStatusText: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        15,

      fontWeight:
        '600',
    },

    todayBadge: {
      minHeight:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        9,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.blueSoft,
    },

    todayBadgeText: {
      color:
        COLORS.blue,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    daySummaryRow: {
      marginTop:
        15,

      paddingTop:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,
    },

    daySummaryItem: {
      flex:
        1,
    },

    daySummaryValue: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    daySummaryLabel: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,
    },

    daySummaryDivider: {
      width:
        1,

      height:
        32,

      marginHorizontal:
        12,

      backgroundColor:
        COLORS.border,
    },

    /* ======================================================================
       AGENDA LOADING
       ====================================================================== */

    agendaLoadingCard: {
      marginTop:
        12,

      minHeight:
        76,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        9,

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

    agendaLoadingText: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    /* ======================================================================
       DAY CONTEXT
       ====================================================================== */

    contextCard: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,
    },

    contextRow: {
      minHeight:
        66,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,

      paddingHorizontal:
        14,

      paddingVertical:
        12,
    },

    contextIcon: {
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
    },

    contextCopy: {
      flex:
        1,

      minWidth:
        0,
    },

    contextTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    contextText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    contextDivider: {
      height:
        1,

      marginLeft:
        65,

      backgroundColor:
        COLORS.border,
    },

    contextHint: {
      marginHorizontal:
        14,

      marginBottom:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,

      padding:
        11,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.greenSoft,
    },

    contextHintText: {
      flex:
        1,

      color:
        COLORS.green,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        16,

      fontWeight:
        '700',
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

    appointmentList: {
      gap:
        12,
    },
  });