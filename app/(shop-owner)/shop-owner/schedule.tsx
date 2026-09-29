import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
  getShopOwnerSchedule,
  updateShopOwnerAvailability,
  updateShopOwnerSchedule,
} from '@/src/services/shop-owner-api';
import type {
  ShopOwnerAvailabilityStatus,
  ShopOwnerDayOfWeek,
  ShopOwnerScheduleEntry,
  ShopOwnerScheduleUpdateEntry,
} from '@/src/types/shop-owner';

const WEEK_DAYS: {
  value: ShopOwnerDayOfWeek;
  label: string;
  shortLabel: string;
}[] = [
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
  { value: 7, label: 'Sunday', shortLabel: 'Sun' },
];

const AVAILABILITY_OPTIONS: {
  value: ShopOwnerAvailabilityStatus;
  label: string;
  description: string;
  icon:
    | 'checkmark-circle-outline'
    | 'close-circle-outline'
    | 'people-outline'
    | 'walk-outline';
  tone: 'success' | 'danger' | 'warning' | 'blue';
}[] = [
  {
    value: 'open',
    label: 'Open',
    description: 'Customers may submit appointment bookings.',
    icon: 'checkmark-circle-outline',
    tone: 'success',
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'New appointment bookings are temporarily disabled.',
    icon: 'close-circle-outline',
    tone: 'danger',
  },
  {
    value: 'fully_booked',
    label: 'Fully booked',
    description: 'Show customers that no more booking capacity is available.',
    icon: 'people-outline',
    tone: 'warning',
  },
  {
    value: 'accepting_walk_ins',
    label: 'Walk-ins welcome',
    description:
      'Customers may book appointments and your shop also accepts walk-ins.',
    icon: 'walk-outline',
    tone: 'blue',
  },
];

function createEmptySchedule(): ShopOwnerScheduleEntry[] {
  return WEEK_DAYS.map((day) => ({
    day_of_week: day.value,
    day_label: day.label,
    is_open: false,
    opens_at: null,
    closes_at: null,
  }));
}

function normalizeInputTime(value: string | null): string {
  if (!value) {
    return '';
  }

  return value.match(/^(\d{2}:\d{2})/)?.[1] ?? '';
}

function normalizeLoadedSchedule(
  schedule: ShopOwnerScheduleEntry[],
): ShopOwnerScheduleEntry[] {
  return WEEK_DAYS.map((day) => {
    const existing = schedule.find(
      (entry) => entry.day_of_week === day.value,
    );

    if (!existing) {
      return {
        day_of_week: day.value,
        day_label: day.label,
        is_open: false,
        opens_at: null,
        closes_at: null,
      };
    }

    return {
      ...existing,
      day_label: day.label,
      opens_at: existing.is_open
        ? normalizeInputTime(existing.opens_at)
        : null,
      closes_at: existing.is_open
        ? normalizeInputTime(existing.closes_at)
        : null,
    };
  });
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hourText, minuteText] = value.split(':');

  const hour = Number(hourText);
  const minute = Number(minuteText);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function formatTime(value: string | null): string {
  const normalized = normalizeInputTime(value);

  if (!isValidTime(normalized)) {
    return value?.trim() || '--:--';
  }

  const [hourText, minuteText] = normalized.split(':');

  const hour = Number(hourText);

  const period =
    hour >= 12
      ? 'PM'
      : 'AM';

  const displayHour =
    hour % 12 === 0
      ? 12
      : hour % 12;

  return `${displayHour}:${minuteText} ${period}`;
}

function validateSchedule(
  schedule: ShopOwnerScheduleEntry[],
): string | null {
  if (schedule.length !== 7) {
    return 'The weekly schedule must contain exactly seven days.';
  }

  const uniqueDays = new Set(
    schedule.map((entry) => entry.day_of_week),
  );

  if (uniqueDays.size !== 7) {
    return 'Each weekday must appear exactly once.';
  }

  for (const entry of schedule) {
    if (!entry.is_open) {
      continue;
    }

    const opensAt =
      entry.opens_at?.trim() ??
      '';

    const closesAt =
      entry.closes_at?.trim() ??
      '';

    if (!isValidTime(opensAt)) {
      return `${entry.day_label}: enter the opening time as HH:MM.`;
    }

    if (!isValidTime(closesAt)) {
      return `${entry.day_label}: enter the closing time as HH:MM.`;
    }

    if (closesAt <= opensAt) {
      return `${entry.day_label}: closing time must be later than opening time.`;
    }
  }

  return null;
}

function scheduleFingerprint(
  schedule: ShopOwnerScheduleEntry[],
): string {
  return JSON.stringify(
    schedule.map((entry) => ({
      day_of_week:
        entry.day_of_week,

      is_open:
        entry.is_open,

      opens_at:
        entry.is_open
          ? entry.opens_at?.trim() ?? ''
          : null,

      closes_at:
        entry.is_open
          ? entry.closes_at?.trim() ?? ''
          : null,
    })),
  );
}

function availabilityTone(
  tone:
    | 'success'
    | 'danger'
    | 'warning'
    | 'blue',
): {
  color: string;
  soft: string;
} {
  switch (tone) {
    case 'success':
      return {
        color: COLORS.success,
        soft: COLORS.successSoft,
      };

    case 'danger':
      return {
        color: COLORS.danger,
        soft: COLORS.dangerSoft,
      };

    case 'warning':
      return {
        color: COLORS.warning,
        soft: COLORS.warningSoft,
      };

    case 'blue':
      return {
        color: COLORS.blue,
        soft: COLORS.blueSoft,
      };
  }
}

export default function ShopOwnerScheduleScreen() {
  const {
    token,
  } = useAuth();

  const [
    schedule,
    setSchedule,
  ] = useState<ShopOwnerScheduleEntry[]>(
    createEmptySchedule(),
  );

  const [
    savedSchedule,
    setSavedSchedule,
  ] = useState<ShopOwnerScheduleEntry[]>(
    createEmptySchedule(),
  );

  const [
    availability,
    setAvailability,
  ] = useState<ShopOwnerAvailabilityStatus>(
    'closed',
  );

  const [
    savedAvailability,
    setSavedAvailability,
  ] = useState<ShopOwnerAvailabilityStatus>(
    'closed',
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
    isSavingSchedule,
    setIsSavingSchedule,
  ] = useState(
    false,
  );

  const [
    isSavingAvailability,
    setIsSavingAvailability,
  ] = useState(
    false,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const loadSchedule =
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
            await getShopOwnerSchedule(
              token,
            );

          const normalizedSchedule =
            normalizeLoadedSchedule(
              response
                .data
                .schedule,
            );

          setSchedule(
            normalizedSchedule,
          );

          setSavedSchedule(
            normalizedSchedule,
          );

          setAvailability(
            response
              .data
              .availability
              .status,
          );

          setSavedAvailability(
            response
              .data
              .availability
              .status,
          );
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load your shop schedule.',
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

  useEffect(
    () => {
      void loadSchedule();
    },
    [
      loadSchedule,
    ],
  );

  const openDays =
    useMemo(
      () =>
        schedule.filter(
          (entry) =>
            entry.is_open,
        ).length,
      [
        schedule,
      ],
    );

  const closedDays =
    7 -
    openDays;

  const availabilityChanged =
    availability !==
    savedAvailability;

  const scheduleChanged =
    useMemo(
      () =>
        scheduleFingerprint(
          schedule,
        ) !==
        scheduleFingerprint(
          savedSchedule,
        ),
      [
        savedSchedule,
        schedule,
      ],
    );

  const currentAvailability =
    AVAILABILITY_OPTIONS.find(
      (option) =>
        option.value ===
        availability,
    )
    ??
    AVAILABILITY_OPTIONS[1];

  const currentAvailabilityTone =
    availabilityTone(
      currentAvailability.tone,
    );

  function handleBack() {
    router.replace(
      '/(shop-owner)/shop-owner',
    );
  }

  function updateScheduleDay(
    day: ShopOwnerDayOfWeek,
    updates: Partial<ShopOwnerScheduleEntry>,
  ) {
    setSuccessMessage('');
    setErrorMessage('');

    setSchedule(
      (current) =>
        current.map(
          (entry) =>
            entry.day_of_week ===
            day
              ? {
                  ...entry,
                  ...updates,
                }
              : entry,
        ),
    );
  }

  function toggleDay(
    day: ShopOwnerDayOfWeek,
    isOpen: boolean,
  ) {
    updateScheduleDay(
      day,
      {
        is_open:
          isOpen,

        opens_at:
          isOpen
            ? ''
            : null,

        closes_at:
          isOpen
            ? ''
            : null,
      },
    );
  }

  async function saveSchedule() {
    if (
      !token
      ||
      isSavingSchedule
    ) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const validationError =
      validateSchedule(
        schedule,
      );

    if (validationError) {
      setErrorMessage(
        validationError,
      );

      return;
    }

    const payload:
      ShopOwnerScheduleUpdateEntry[] =
      schedule.map(
        (entry) => ({
          day_of_week:
            entry.day_of_week,

          is_open:
            entry.is_open,

          opens_at:
            entry.is_open
              ? entry
                  .opens_at
                  ?.trim()
                ||
                null
              : null,

          closes_at:
            entry.is_open
              ? entry
                  .closes_at
                  ?.trim()
                ||
                null
              : null,
        }),
      );

    setIsSavingSchedule(
      true,
    );

    try {
      const response =
        await updateShopOwnerSchedule(
          token,
          payload,
        );

      const normalizedSchedule =
        normalizeLoadedSchedule(
          response
            .data
            .schedule,
        );

      setSchedule(
        normalizedSchedule,
      );

      setSavedSchedule(
        normalizedSchedule,
      );

      setSuccessMessage(
        response.message
        ??
        'Weekly business hours saved successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update the weekly schedule.',
      );
    } finally {
      setIsSavingSchedule(
        false,
      );
    }
  }

  async function saveAvailability() {
    if (
      !token
      ||
      isSavingAvailability
    ) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    setIsSavingAvailability(
      true,
    );

    try {
      const response =
        await updateShopOwnerAvailability(
          token,
          availability,
        );

      const savedStatus =
        response
          .data
          .availability
          .status;

      setAvailability(
        savedStatus,
      );

      setSavedAvailability(
        savedStatus,
      );

      setSuccessMessage(
        response.message
        ??
        'Shop availability updated successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update shop availability.',
      );
    } finally {
      setIsSavingAvailability(
        false,
      );
    }
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={
              () =>
                void loadSchedule(
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
              Schedule
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Business hours & availability
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Refresh schedule"
            onPress={
              () =>
                void loadSchedule(
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
            SHOP SCHEDULE
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Set when customers can book your shop
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Manage your weekly business hours, current booking availability,
            breaks, and special closed dates.
          </Text>
        </View>


        {/* ================================================================
            MESSAGES
            ================================================================ */}

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Schedule needs attention"
            message={
              errorMessage
            }
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Saved successfully"
            message={
              successMessage
            }
          />
        ) : null}


        {/* ================================================================
            LOADING
            ================================================================ */}

        {isLoading ? (
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
              Loading shop schedule
            </Text>

            <Text
              style={
                styles.loadingText
              }
            >
              Getting your current business hours and booking availability.
            </Text>
          </View>
        ) : (
          <>

            {/* ============================================================
                OVERVIEW
                ============================================================ */}

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
                    Weekly schedule
                  </Text>

                  <Text
                    style={
                      styles.overviewValue
                    }
                  >
                    {openDays} open {openDays === 1
                      ? 'day'
                      : 'days'}
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
                  value={
                    openDays
                  }
                  label="Open"
                />

                <View
                  style={
                    styles.overviewDivider
                  }
                />

                <OverviewStat
                  value={
                    closedDays
                  }
                  label="Closed"
                />

                <View
                  style={
                    styles.overviewDivider
                  }
                />

                <View
                  style={
                    styles.overviewAvailability
                  }
                >
                  <Text
                    style={
                      styles.overviewAvailabilityLabel
                    }
                  >
                    Booking status
                  </Text>

                  <View
                    style={
                      styles.overviewAvailabilityRow
                    }
                  >
                    <View
                      style={[
                        styles.overviewAvailabilityDot,

                        {
                          backgroundColor:
                            currentAvailabilityTone.color,
                        },
                      ]}
                    />

                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.overviewAvailabilityValue
                      }
                    >
                      {
                        currentAvailability.label
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>


            {/* ============================================================
                SCHEDULE TOOLS
                ============================================================ */}

            <SectionHeading
              title="Schedule tools"
              subtitle="Handle appointments, breaks, and special closures from one place."
            />

            <View
              style={
                styles.toolsCard
              }
            >
              <ScheduleToolRow
                icon="calendar-outline"
                title="Calendar"
                description="View bookings and daily schedule activity."
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/calendar',
                    )
                }
              />

              <ScheduleToolRow
                icon="cafe-outline"
                title="Break periods"
                description="Block lunch, rest, or recurring unavailable time."
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/break-periods',
                    )
                }
              />

              <ScheduleToolRow
                icon="calendar-clear-outline"
                title="Blocked dates"
                description="Close the shop for holidays, leave, or special dates."
                onPress={
                  () =>
                    router.push(
                      '/(shop-owner)/shop-owner/blocked-dates',
                    )
                }
                last
              />
            </View>


            {/* ============================================================
                AVAILABILITY
                ============================================================ */}

            <SectionHeading
              title="Current availability"
              subtitle="This status controls whether customers can submit new bookings right now."
            />

            <View
              style={
                styles.availabilityGrid
              }
            >
              {AVAILABILITY_OPTIONS.map(
                (
                  option,
                ) => {
                  const selected =
                    availability ===
                    option.value;

                  const tone =
                    availabilityTone(
                      option.tone,
                    );

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      activeOpacity={
                        0.82
                      }
                      disabled={
                        isSavingAvailability
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected,

                        disabled:
                          isSavingAvailability,
                      }}
                      onPress={
                        () => {
                          setSuccessMessage('');

                          setErrorMessage('');

                          setAvailability(
                            option.value,
                          );
                        }
                      }
                      style={[
                        styles.availabilityCard,

                        selected
                        &&
                          styles.availabilityCardSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.availabilityIcon,

                          {
                            backgroundColor:
                              tone.soft,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            option.icon
                          }
                          size={
                            20
                          }
                          color={
                            tone.color
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.availabilityContent
                        }
                      >
                        <View
                          style={
                            styles.availabilityTitleRow
                          }
                        >
                          <Text
                            style={
                              styles.availabilityTitle
                            }
                          >
                            {option.label}
                          </Text>

                          {selected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={
                                18
                              }
                              color={
                                COLORS.navy
                              }
                            />
                          ) : null}
                        </View>

                        <Text
                          style={
                            styles.availabilityDescription
                          }
                        >
                          {
                            option.description
                          }
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <TouchableOpacity
              activeOpacity={
                0.84
              }
              disabled={
                isSavingAvailability
                ||
                !availabilityChanged
              }
              onPress={
                () =>
                  void saveAvailability()
              }
              style={[
                styles.primaryButton,

                (
                  isSavingAvailability
                  ||
                  !availabilityChanged
                )
                &&
                  styles.disabledButton,
              ]}
            >
              {isSavingAvailability ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.white
                  }
                />
              ) : (
                <Ionicons
                  name="storefront-outline"
                  size={
                    19
                  }
                  color={
                    COLORS.white
                  }
                />
              )}

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {isSavingAvailability
                  ? 'Updating availability...'
                  : availabilityChanged
                    ? 'Update availability'
                    : 'Availability is up to date'}
              </Text>
            </TouchableOpacity>


            {/* ============================================================
                WEEKLY BUSINESS HOURS
                ============================================================ */}

            <SectionHeading
              title="Weekly business hours"
              subtitle="Turn each business day on or off, then enter opening and closing time in 24-hour HH:MM format."
            />

            <View
              style={
                styles.scheduleList
              }
            >
              {schedule.map(
                (
                  entry,
                ) => {
                  const weekDay =
                    WEEK_DAYS.find(
                      (
                        day,
                      ) =>
                        day.value ===
                        entry.day_of_week,
                    );

                  return (
                    <View
                      key={
                        entry.day_of_week
                      }
                      style={[
                        styles.dayCard,

                        entry.is_open
                        &&
                          styles.dayCardOpen,
                      ]}
                    >
                      <View
                        style={
                          styles.dayHeader
                        }
                      >
                        <View
                          style={
                            styles.dayIdentity
                          }
                        >
                          <View
                            style={[
                              styles.dayBadge,

                              entry.is_open
                              &&
                                styles.dayBadgeOpen,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayBadgeText,

                                entry.is_open
                                &&
                                  styles.dayBadgeTextOpen,
                              ]}
                            >
                              {weekDay?.shortLabel
                              ??
                              entry
                                .day_label
                                .slice(
                                  0,
                                  3,
                                )}
                            </Text>
                          </View>

                          <View>
                            <Text
                              style={
                                styles.dayName
                              }
                            >
                              {
                                entry.day_label
                              }
                            </Text>

                            <Text
                              style={[
                                styles.dayStatus,

                                entry.is_open
                                  ? styles.dayStatusOpen
                                  : styles.dayStatusClosed,
                              ]}
                            >
                              {entry.is_open
                                ? `${formatTime(
                                    entry.opens_at,
                                  )} – ${formatTime(
                                    entry.closes_at,
                                  )}`
                                : 'Closed for bookings'}
                            </Text>
                          </View>
                        </View>

                        <Switch
                          value={
                            entry.is_open
                          }
                          disabled={
                            isSavingSchedule
                          }
                          onValueChange={
                            (
                              value,
                            ) =>
                              toggleDay(
                                entry.day_of_week,
                                value,
                              )
                          }
                          trackColor={{
                            false:
                              COLORS.border,

                            true:
                              COLORS.green,
                          }}
                          thumbColor={
                            COLORS.white
                          }
                          ios_backgroundColor={
                            COLORS.border
                          }
                        />
                      </View>

                      {entry.is_open ? (
                        <View
                          style={
                            styles.timePanel
                          }
                        >
                          <TimeField
                            icon="sunny-outline"
                            label="Opening time"
                            value={
                              entry.opens_at
                              ??
                              ''
                            }
                            placeholder="09:00"
                            disabled={
                              isSavingSchedule
                            }
                            onChange={
                              (
                                value,
                              ) =>
                                updateScheduleDay(
                                  entry.day_of_week,
                                  {
                                    opens_at:
                                      value,
                                  },
                                )
                            }
                          />

                          <View
                            style={
                              styles.timeArrow
                            }
                          >
                            <Ionicons
                              name="arrow-forward"
                              size={
                                17
                              }
                              color={
                                COLORS.textLight
                              }
                            />
                          </View>

                          <TimeField
                            icon="moon-outline"
                            label="Closing time"
                            value={
                              entry.closes_at
                              ??
                              ''
                            }
                            placeholder="18:00"
                            disabled={
                              isSavingSchedule
                            }
                            onChange={
                              (
                                value,
                              ) =>
                                updateScheduleDay(
                                  entry.day_of_week,
                                  {
                                    closes_at:
                                      value,
                                  },
                                )
                            }
                          />
                        </View>
                      ) : (
                        <View
                          style={
                            styles.closedNotice
                          }
                        >
                          <Ionicons
                            name="moon-outline"
                            size={
                              17
                            }
                            color={
                              COLORS.textMuted
                            }
                          />

                          <Text
                            style={
                              styles.closedNoticeText
                            }
                          >
                            Customers will not receive available appointment
                            times for this day.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                },
              )}
            </View>


            {/* ============================================================
                SAVE WEEKLY HOURS
                ============================================================ */}

            <View
              style={
                styles.saveCard
              }
            >
              <View
                style={
                  styles.saveHeader
                }
              >
                <View
                  style={
                    styles.saveIcon
                  }
                >
                  <Ionicons
                    name="save-outline"
                    size={
                      20
                    }
                    color={
                      COLORS.navy
                    }
                  />
                </View>

                <View
                  style={
                    styles.saveCopy
                  }
                >
                  <Text
                    style={
                      styles.saveTitle
                    }
                  >
                    Save weekly hours
                  </Text>

                  <Text
                    style={
                      styles.saveText
                    }
                  >
                    Customers will use these hours when StyleHub calculates
                    available booking dates and times.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={
                  0.84
                }
                disabled={
                  isSavingSchedule
                  ||
                  !scheduleChanged
                }
                accessibilityRole="button"
                accessibilityLabel="Save weekly schedule"
                onPress={
                  () =>
                    void saveSchedule()
                }
                style={[
                  styles.primaryButton,

                  (
                    isSavingSchedule
                    ||
                    !scheduleChanged
                  )
                  &&
                    styles.disabledButton,
                ]}
              >
                {isSavingSchedule ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={
                      19
                    }
                    color={
                      COLORS.white
                    }
                  />
                )}

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {isSavingSchedule
                    ? 'Saving weekly hours...'
                    : scheduleChanged
                      ? 'Save weekly hours'
                      : 'Weekly hours are up to date'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


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


function OverviewStat({
  value,
  label,
}: {
  value: number;
  label: string;
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


function ScheduleToolRow({
  icon,
  title,
  description,
  onPress,
  last = false,
}: {
  icon:
    | 'calendar-outline'
    | 'cafe-outline'
    | 'calendar-clear-outline';

  title:
    string;

  description:
    string;

  onPress:
    () => void;

  last?:
    boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.78
      }
      accessibilityRole="button"
      onPress={
        onPress
      }
      style={[
        styles.toolRow,

        last
        &&
          styles.toolRowLast,
      ]}
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
            20
          }
          color={
            COLORS.navy
          }
        />
      </View>

      <View
        style={
          styles.toolContent
        }
      >
        <Text
          style={
            styles.toolTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.toolDescription
          }
        >
          {description}
        </Text>
      </View>

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


function TimeField({
  icon,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  icon:
    | 'sunny-outline'
    | 'moon-outline';

  label:
    string;

  value:
    string;

  placeholder:
    string;

  disabled:
    boolean;

  onChange:
    (value: string) => void;
}) {
  return (
    <View
      style={
        styles.timeField
      }
    >
      <Text
        style={
          styles.timeLabel
        }
      >
        {label}
      </Text>

      <View
        style={
          styles.timeInputShell
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            17
          }
          color={
            COLORS.textMuted
          }
        />

        <TextInput
          value={
            value
          }
          editable={
            !disabled
          }
          placeholder={
            placeholder
          }
          placeholderTextColor={
            COLORS.textLight
          }
          maxLength={
            5
          }
          autoCapitalize="none"
          autoCorrect={
            false
          }
          keyboardType="numbers-and-punctuation"
          style={
            styles.timeInput
          }
          onChangeText={
            onChange
          }
        />
      </View>
    </View>
  );
}


function MessageBox({
  type,
  title,
  message,
}: {
  type:
    | 'success'
    | 'error';

  title:
    string;

  message:
    string;
}) {
  const success =
    type ===
    'success';

  return (
    <View
      style={[
        styles.messageBox,

        {
          backgroundColor:
            success
              ? COLORS.successSoft
              : COLORS.dangerSoft,
        },
      ]}
    >
      <View
        style={
          styles.messageIcon
        }
      >
        <Ionicons
          name={
            success
              ? 'checkmark-circle-outline'
              : 'alert-circle-outline'
          }
          size={
            20
          }
          color={
            success
              ? COLORS.success
              : COLORS.danger
          }
        />
      </View>

      <View
        style={
          styles.messageContent
        }
      >
        <Text
          style={[
            styles.messageTitle,

            {
              color:
                success
                  ? COLORS.success
                  : COLORS.danger,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={
            styles.messageText
          }
        >
          {message}
        </Text>
      </View>
    </View>
  );
}


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
        520,

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
        590,

      marginTop:
        8,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },

    messageBox: {
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
    },

    messageIcon: {
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

    messageContent: {
      flex:
        1,
    },

    messageTitle: {
      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    messageText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

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
        27,

      lineHeight:
        33,

      fontWeight:
        '800',

      letterSpacing:
        -0.5,
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
      minWidth:
        58,
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
        14,

      backgroundColor:
        COLORS.navyMuted,
    },

    overviewAvailability: {
      flex:
        1,

      minWidth:
        0,
    },

    overviewAvailabilityLabel: {
      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.micro,
    },

    overviewAvailabilityRow: {
      marginTop:
        5,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    overviewAvailabilityDot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,
    },

    overviewAvailabilityValue: {
      flex:
        1,

      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '800',
    },

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

    toolsCard: {
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

    toolRow: {
      minHeight:
        72,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,

      paddingHorizontal:
        14,

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    toolRowLast: {
      borderBottomWidth:
        0,
    },

    toolIcon: {
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
        COLORS.accentSoft,
    },

    toolContent: {
      flex:
        1,

      minWidth:
        0,
    },

    toolTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    toolDescription: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        16,
    },

    availabilityGrid: {
      gap:
        10,
    },

    availabilityCard: {
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

    availabilityCardSelected: {
      borderColor:
        COLORS.navy,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    availabilityIcon: {
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
    },

    availabilityContent: {
      flex:
        1,

      minWidth:
        0,
    },

    availabilityTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        8,
    },

    availabilityTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    availabilityDescription: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    primaryButton: {
      minHeight:
        LAYOUT.buttonHeight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        8,

      marginTop:
        12,

      paddingHorizontal:
        16,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.primary,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    disabledButton: {
      opacity:
        0.46,
    },

    scheduleList: {
      gap:
        10,
    },

    dayCard: {
      padding:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },

    dayCardOpen: {
      ...SHADOWS.card,
    },

    dayHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        12,
    },

    dayIdentity: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    dayBadge: {
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
        COLORS.surfaceSoft,
    },

    dayBadgeOpen: {
      backgroundColor:
        COLORS.greenSoft,
    },

    dayBadgeText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    dayBadgeTextOpen: {
      color:
        COLORS.green,
    },

    dayName: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    dayStatus: {
      maxWidth:
        210,

      marginTop:
        3,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        15,

      fontWeight:
        '600',
    },

    dayStatusOpen: {
      color:
        COLORS.green,
    },

    dayStatusClosed: {
      color:
        COLORS.textMuted,
    },

    timePanel: {
      marginTop:
        14,

      flexDirection:
        'row',

      alignItems:
        'flex-end',

      padding:
        12,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    timeField: {
      flex:
        1,

      minWidth:
        0,
    },

    timeLabel: {
      marginBottom:
        6,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '700',
    },

    timeInputShell: {
      minHeight:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,

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

    timeInput: {
      flex:
        1,

      minWidth:
        0,

      minHeight:
        46,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',

      textAlign:
        'center',
    },

    timeArrow: {
      width:
        32,

      height:
        48,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    closedNotice: {
      marginTop:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      padding:
        11,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    closedNoticeText: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    saveCard: {
      marginTop:
        14,

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

    saveHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,
    },

    saveIcon: {
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
        COLORS.accentSoft,
    },

    saveCopy: {
      flex:
        1,
    },

    saveTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    saveText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },
  });