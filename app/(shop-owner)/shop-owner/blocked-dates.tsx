import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
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
  createShopOwnerBlockedDate,
  deleteShopOwnerBlockedDate,
  getShopOwnerBlockedDates,
  updateShopOwnerBlockedDate,
} from '@/src/services/shop-owner-blocked-date-api';
import type {
  ShopOwnerBlockedDate,
} from '@/src/types/shop-owner-blocked-date';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const QUICK_DATE_OPTIONS = [
  {
    label: 'Today',
    days: 0,
  },
  {
    label: 'Tomorrow',
    days: 1,
  },
  {
    label: '+7 days',
    days: 7,
  },
  {
    label: '+30 days',
    days: 30,
  },
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localDateString(date: Date): string {
  return (
    `${date.getFullYear()}-`
    + `${pad(date.getMonth() + 1)}-`
    + `${pad(date.getDate())}`
  );
}

function todayString(): string {
  return localDateString(new Date());
}

function dateFromToday(days: number): string {
  const date = new Date();

  date.setHours(
    12,
    0,
    0,
    0,
  );

  date.setDate(
    date.getDate() + days,
  );

  return localDateString(date);
}

function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] = value.split('-');

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const candidate = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );

  return (
    candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day
  );
}

function calendarDate(value: string): Date | null {
  if (!isValidCalendarDate(value)) {
    return null;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] = value.split('-');

  return new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    12,
    0,
    0,
    0,
  );
}

function formatDisplayDate(value: string): string {
  const date = calendarDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
}

function formatDayNumber(value: string): string {
  const date = calendarDate(value);

  return date
    ? String(date.getDate())
    : '--';
}

function formatMonth(value: string): string {
  const date = calendarDate(value);

  return date
    ? date.toLocaleDateString(
        'en-PH',
        {
          month: 'short',
        },
      ).toUpperCase()
    : 'DATE';
}

function formatWeekday(value: string): string {
  const date = calendarDate(value);

  return date
    ? date.toLocaleDateString(
        'en-PH',
        {
          weekday: 'long',
        },
      )
    : 'Selected date';
}

function isPastDate(value: string): boolean {
  return (
    isValidCalendarDate(value)
    && value < todayString()
  );
}

function isToday(value: string): boolean {
  return value === todayString();
}

function isThisMonth(value: string): boolean {
  if (!isValidCalendarDate(value)) {
    return false;
  }

  const today = todayString();

  return value.slice(0, 7) === today.slice(0, 7);
}

export default function ShopOwnerBlockedDatesScreen() {
  const {
    token,
  } = useAuth();

  const [
    blockedDates,
    setBlockedDates,
  ] = useState<ShopOwnerBlockedDate[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<number | null>(null);

  const [
    blockedDate,
    setBlockedDate,
  ] = useState(
    dateFromToday(1),
  );

  const [
    reason,
    setReason,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<number | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const editingRecord = useMemo(
    () =>
      blockedDates.find(
        (item) => item.id === selectedId,
      ) ?? null,
    [
      blockedDates,
      selectedId,
    ],
  );

  const upcomingBlockedDates = useMemo(
    () =>
      blockedDates
        .filter(
          (item) => !isPastDate(item.blocked_date),
        )
        .sort(
          (first, second) =>
            first.blocked_date.localeCompare(
              second.blocked_date,
            ),
        ),
    [
      blockedDates,
    ],
  );

  const pastBlockedDates = useMemo(
    () =>
      blockedDates
        .filter(
          (item) => isPastDate(item.blocked_date),
        )
        .sort(
          (first, second) =>
            second.blocked_date.localeCompare(
              first.blocked_date,
            ),
        ),
    [
      blockedDates,
    ],
  );

  const thisMonthCount = useMemo(
    () =>
      upcomingBlockedDates.filter(
        (item) => isThisMonth(item.blocked_date),
      ).length,
    [
      upcomingBlockedDates,
    ],
  );

  const selectedDateValid =
    isValidCalendarDate(
      blockedDate.trim(),
    );

  const selectedDatePast =
    selectedDateValid
    && isPastDate(
      blockedDate.trim(),
    );

  const selectedDateLabel =
    selectedDateValid
      ? formatDisplayDate(
          blockedDate.trim(),
        )
      : 'Enter a valid YYYY-MM-DD date';

  const selectedWeekday =
    selectedDateValid
      ? formatWeekday(
          blockedDate.trim(),
        )
      : 'Date not ready';

  const loadBlockedDates = useCallback(
    async (
      refreshing = false,
    ): Promise<void> => {
      if (!token) {
        setIsLoading(false);

        setErrorMessage(
          'You must be signed in as a Shop Owner.',
        );

        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response =
          await getShopOwnerBlockedDates(
            token,
          );

        setBlockedDates(
          response.data.blocked_dates,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load blocked dates.',
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

  useFocusEffect(
    useCallback(
      () => {
        void loadBlockedDates();
      },
      [
        loadBlockedDates,
      ],
    ),
  );

  function clearMessages(): void {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function resetForm(): void {
    setSelectedId(null);

    setBlockedDate(
      dateFromToday(1),
    );

    setReason('');
  }

  function chooseQuickDate(days: number): void {
    if (
      isSaving
      || deletingId !== null
    ) {
      return;
    }

    setBlockedDate(
      dateFromToday(days),
    );

    clearMessages();
  }

  function beginEdit(
    item: ShopOwnerBlockedDate,
  ): void {
    if (
      isSaving
      || deletingId !== null
      || isPastDate(item.blocked_date)
    ) {
      return;
    }

    clearMessages();

    setSelectedId(
      item.id,
    );

    setBlockedDate(
      item.blocked_date,
    );

    setReason(
      item.reason ?? '',
    );
  }

  function cancelEdit(): void {
    if (isSaving) {
      return;
    }

    clearMessages();
    resetForm();
  }

  function validateForm(): string | null {
    const cleanDate =
      blockedDate.trim();

    if (!isValidCalendarDate(cleanDate)) {
      return 'Enter a valid date using YYYY-MM-DD.';
    }

    if (cleanDate < todayString()) {
      return 'The blocked date cannot be in the past.';
    }

    if (reason.trim().length > 255) {
      return 'Reason must not exceed 255 characters.';
    }

    return null;
  }

  async function handleSave(): Promise<void> {
    if (
      !token
      || isSaving
      || deletingId !== null
    ) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      setSuccessMessage('');

      setErrorMessage(
        validationError,
      );

      return;
    }

    setIsSaving(true);
    clearMessages();

    try {
      const payload = {
        blockedDate:
          blockedDate.trim(),

        reason,
      };

      const response =
        selectedId === null
          ? await createShopOwnerBlockedDate(
              token,
              payload,
            )
          : await updateShopOwnerBlockedDate(
              token,
              selectedId,
              payload,
            );

      setSuccessMessage(
        response.message
        ?? (
          selectedId === null
            ? 'Blocked date added successfully.'
            : 'Blocked date updated successfully.'
        ),
      );

      resetForm();

      await loadBlockedDates();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to save the blocked date.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(
    item: ShopOwnerBlockedDate,
  ): void {
    if (
      isSaving
      || deletingId !== null
    ) {
      return;
    }

    Alert.alert(
      'Remove blocked date?',
      `${formatDisplayDate(
        item.blocked_date,
      )} will become available again unless another booking rule prevents it.`,
      [
        {
          text: 'Keep Date',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void handleDelete(item);
          },
        },
      ],
    );
  }

  async function handleDelete(
    item: ShopOwnerBlockedDate,
  ): Promise<void> {
    if (
      !token
      || deletingId !== null
      || isSaving
    ) {
      return;
    }

    setDeletingId(
      item.id,
    );

    clearMessages();

    try {
      const response =
        await deleteShopOwnerBlockedDate(
          token,
          item.id,
        );

      if (selectedId === item.id) {
        resetForm();
      }

      setSuccessMessage(
        response.message
        ?? 'Blocked date removed successfully.',
      );

      await loadBlockedDates();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove the blocked date.',
      );
    } finally {
      setDeletingId(null);
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

      <KeyboardAvoidingView
        style={
          styles.flex
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
                  void loadBlockedDates(true)
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
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to schedule"
              onPress={
                () =>
                  router.replace(
                    '/(shop-owner)/shop-owner/schedule',
                  )
              }
              style={
                styles.topIconButton
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
                Blocked dates
              </Text>

              <Text
                style={
                  styles.topBarCaption
                }
              >
                Full-day shop closures
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Refresh blocked dates"
              onPress={
                () =>
                  void loadBlockedDates(true)
              }
              style={
                styles.topIconButton
              }
            >
              <Ionicons
                name="refresh-outline"
                size={21}
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
              SPECIAL CLOSURES
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Close your shop for holidays, leave, or special dates
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              A blocked date removes new customer availability for the full day while keeping your weekly schedule unchanged.
            </Text>
          </View>


          {/* ================================================================
              MESSAGES
              ================================================================ */}

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Blocked dates need attention"
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
                Loading blocked dates
              </Text>

              <Text
                style={
                  styles.loadingText
                }
              >
                Getting your upcoming full-day shop closures.
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
                      Upcoming closures
                    </Text>

                    <Text
                      style={
                        styles.overviewValue
                      }
                    >
                      {upcomingBlockedDates.length}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.overviewIcon
                    }
                  >
                    <Ionicons
                      name="calendar-clear-outline"
                      size={24}
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
                      upcomingBlockedDates.length
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
                      thisMonthCount
                    }
                    label="This month"
                  />

                  <View
                    style={
                      styles.overviewDivider
                    }
                  />

                  <OverviewStat
                    value={
                      pastBlockedDates.length
                    }
                    label="Past"
                  />
                </View>
              </View>


              {/* ============================================================
                  INFO
                  ============================================================ */}

              <View
                style={
                  styles.infoCard
                }
              >
                <View
                  style={
                    styles.infoIcon
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={
                      COLORS.blue
                    }
                  />
                </View>

                <View
                  style={
                    styles.infoContent
                  }
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    Existing appointments stay recorded
                  </Text>

                  <Text
                    style={
                      styles.infoText
                    }
                  >
                    Blocking a date prevents new availability on that day. It does not automatically delete appointments that were already created.
                  </Text>
                </View>
              </View>


              {/* ============================================================
                  ADD / EDIT
                  ============================================================ */}

              <SectionHeading
                title={
                  editingRecord
                    ? 'Edit blocked date'
                    : 'Add blocked date'
                }
                subtitle={
                  editingRecord
                    ? 'Update this special closure, then save the changes.'
                    : 'Choose one calendar date when customers should not be able to book your shop.'
                }
                actionLabel={
                  editingRecord
                    ? 'Cancel edit'
                    : undefined
                }
                onAction={
                  editingRecord
                    ? cancelEdit
                    : undefined
                }
              />

              <View
                style={
                  styles.formCard
                }
              >

                {/* DATE PREVIEW */}

                <View
                  style={
                    styles.datePreview
                  }
                >
                  <View
                    style={
                      styles.datePreviewCalendar
                    }
                  >
                    <Text
                      style={
                        styles.datePreviewMonth
                      }
                    >
                      {selectedDateValid
                        ? formatMonth(blockedDate.trim())
                        : 'DATE'}
                    </Text>

                    <Text
                      style={
                        styles.datePreviewDay
                      }
                    >
                      {selectedDateValid
                        ? formatDayNumber(blockedDate.trim())
                        : '--'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.datePreviewContent
                    }
                  >
                    <Text
                      style={
                        styles.datePreviewTitle
                      }
                    >
                      {selectedDatePast
                        ? 'Past date'
                        : selectedWeekday}
                    </Text>

                    <Text
                      style={
                        styles.datePreviewText
                      }
                    >
                      {selectedDateLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.dateStatusBadge,

                      selectedDatePast
                        ? styles.dateStatusPast
                        : styles.dateStatusUpcoming,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateStatusText,

                        selectedDatePast
                          ? styles.dateStatusTextPast
                          : styles.dateStatusTextUpcoming,
                      ]}
                    >
                      {selectedDatePast
                        ? 'Past'
                        : isToday(blockedDate.trim())
                          ? 'Today'
                          : 'Full day'}
                    </Text>
                  </View>
                </View>


                {/* DATE */}

                <View
                  style={
                    styles.fieldHeader
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Closure date
                  </Text>

                  <Text
                    style={
                      styles.fieldHint
                    }
                  >
                    YYYY-MM-DD
                  </Text>
                </View>

                <View
                  style={
                    styles.dateInputShell
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={
                      COLORS.textMuted
                    }
                  />

                  <TextInput
                    value={
                      blockedDate
                    }
                    onChangeText={
                      (value) => {
                        setBlockedDate(value);
                        clearMessages();
                      }
                    }
                    editable={
                      !isSaving
                      && deletingId === null
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    placeholder="2026-12-25"
                    placeholderTextColor={
                      COLORS.textLight
                    }
                    selectionColor={
                      COLORS.navy
                    }
                    style={
                      styles.dateInput
                    }
                  />
                </View>


                {/* QUICK DATES */}

                <Text
                  style={
                    styles.quickLabel
                  }
                >
                  Quick dates
                </Text>

                <View
                  style={
                    styles.quickDates
                  }
                >
                  {QUICK_DATE_OPTIONS.map(
                    (option) => {
                      const optionDate =
                        dateFromToday(option.days);

                      const selected =
                        blockedDate.trim() === optionDate;

                      return (
                        <TouchableOpacity
                          key={
                            option.label
                          }
                          activeOpacity={0.78}
                          disabled={
                            isSaving
                            || deletingId !== null
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            selected,

                            disabled:
                              isSaving
                              || deletingId !== null,
                          }}
                          onPress={
                            () =>
                              chooseQuickDate(option.days)
                          }
                          style={[
                            styles.quickDateButton,

                            selected
                            && styles.quickDateButtonSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickDateText,

                              selected
                              && styles.quickDateTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>


                {/* REASON */}

                <View
                  style={
                    styles.reasonHeader
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Reason
                  </Text>

                  <Text
                    style={
                      styles.optionalText
                    }
                  >
                    Optional · {reason.length}/255
                  </Text>
                </View>

                <TextInput
                  value={
                    reason
                  }
                  onChangeText={
                    (value) => {
                      if (value.length <= 255) {
                        setReason(value);
                        clearMessages();
                      }
                    }
                  }
                  editable={
                    !isSaving
                    && deletingId === null
                  }
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  placeholder="Example: Christmas Day, staff leave, maintenance, or shop event"
                  placeholderTextColor={
                    COLORS.textLight
                  }
                  selectionColor={
                    COLORS.navy
                  }
                  style={
                    styles.reasonInput
                  }
                />


                {/* SAVE */}

                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={
                    isSaving
                    || deletingId !== null
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingRecord
                      ? 'Save blocked date changes'
                      : 'Add blocked date'
                  }
                  onPress={
                    () =>
                      void handleSave()
                  }
                  style={[
                    styles.primaryButton,

                    (
                      isSaving
                      || deletingId !== null
                    )
                    && styles.disabledButton,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <Ionicons
                      name={
                        editingRecord
                          ? 'save-outline'
                          : 'add-circle-outline'
                      }
                      size={19}
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
                    {isSaving
                      ? 'Saving blocked date...'
                      : editingRecord
                        ? 'Save changes'
                        : 'Block this date'}
                  </Text>
                </TouchableOpacity>
              </View>


              {/* ============================================================
                  UPCOMING DATES
                  ============================================================ */}

              <SectionHeading
                title="Upcoming closures"
                subtitle={
                  upcomingBlockedDates.length === 0
                    ? 'Future full-day closures will appear here.'
                    : `${upcomingBlockedDates.length} ${
                        upcomingBlockedDates.length === 1
                          ? 'date is'
                          : 'dates are'
                      } currently blocked.`
                }
              />

              {upcomingBlockedDates.length === 0 ? (
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
                      size={28}
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
                    No upcoming closures
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Your weekly business hours remain available unless another booking rule or break period blocks them.
                  </Text>
                </View>
              ) : (
                <View
                  style={
                    styles.dateList
                  }
                >
                  {upcomingBlockedDates.map(
                    (item) => (
                      <BlockedDateCard
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        past={false}
                        isEditing={
                          selectedId === item.id
                        }
                        isDeleting={
                          deletingId === item.id
                        }
                        disabled={
                          isSaving
                          || (
                            deletingId !== null
                            && deletingId !== item.id
                          )
                        }
                        onEdit={
                          () =>
                            beginEdit(item)
                        }
                        onDelete={
                          () =>
                            confirmDelete(item)
                        }
                      />
                    ),
                  )}
                </View>
              )}


              {/* ============================================================
                  PAST DATES
                  ============================================================ */}

              {pastBlockedDates.length > 0 ? (
                <>
                  <SectionHeading
                    title="Past closures"
                    subtitle="Past dates are kept for reference. They can be removed, but they can no longer be edited into another past date."
                  />

                  <View
                    style={
                      styles.dateList
                    }
                  >
                    {pastBlockedDates.map(
                      (item) => (
                        <BlockedDateCard
                          key={
                            item.id
                          }
                          item={
                            item
                          }
                          past
                          isEditing={false}
                          isDeleting={
                            deletingId === item.id
                          }
                          disabled={
                            isSaving
                            || (
                              deletingId !== null
                              && deletingId !== item.id
                            )
                          }
                          onDelete={
                            () =>
                              confirmDelete(item)
                          }
                        />
                      ),
                    )}
                  </View>
                </>
              ) : null}


              {/* ============================================================
                  RELATED TOOL
                  ============================================================ */}

              <View
                style={
                  styles.relatedCard
                }
              >
                <View
                  style={
                    styles.relatedHeader
                  }
                >
                  <View
                    style={
                      styles.relatedIcon
                    }
                  >
                    <Ionicons
                      name="cafe-outline"
                      size={20}
                      color={
                        COLORS.navy
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.relatedContent
                    }
                  >
                    <Text
                      style={
                        styles.relatedTitle
                      }
                    >
                      Only unavailable for part of the day?
                    </Text>

                    <Text
                      style={
                        styles.relatedText
                      }
                    >
                      Use Break Periods for recurring lunch, cleaning, rest, or other unavailable time instead of closing the whole date.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  onPress={
                    () =>
                      router.push(
                        '/(shop-owner)/shop-owner/break-periods',
                      )
                  }
                  style={
                    styles.relatedButton
                  }
                >
                  <Text
                    style={
                      styles.relatedButtonText
                    }
                  >
                    Open break periods
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={
                      COLORS.navy
                    }
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


function SectionHeading({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={
        styles.sectionHeading
      }
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

      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityRole="button"
          onPress={
            onAction
          }
          style={
            styles.sectionAction
          }
        >
          <Text
            style={
              styles.sectionActionText
            }
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
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


function BlockedDateCard({
  item,
  past,
  isEditing,
  isDeleting,
  disabled,
  onEdit,
  onDelete,
}: {
  item: ShopOwnerBlockedDate;
  past: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  disabled: boolean;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      style={[
        styles.dateCard,

        past
        && styles.dateCardPast,

        isEditing
        && styles.dateCardEditing,
      ]}
    >
      <View
        style={
          styles.dateCardTopRow
        }
      >
        <View
          style={
            styles.calendarBadge
          }
        >
          <Text
            style={
              styles.calendarMonth
            }
          >
            {formatMonth(
              item.blocked_date,
            )}
          </Text>

          <Text
            style={
              styles.calendarDay
            }
          >
            {formatDayNumber(
              item.blocked_date,
            )}
          </Text>
        </View>

        <View
          style={
            styles.dateCardIdentity
          }
        >
          <View
            style={
              styles.dateCardTitleRow
            }
          >
            <Text
              style={
                styles.dateCardTitle
              }
              numberOfLines={1}
            >
              {item.reason?.trim()
              || 'Shop closed'}
            </Text>

            {isEditing ? (
              <View
                style={
                  styles.editingBadge
                }
              >
                <Text
                  style={
                    styles.editingBadgeText
                  }
                >
                  Editing
                </Text>
              </View>
            ) : past ? (
              <View
                style={
                  styles.pastBadge
                }
              >
                <Text
                  style={
                    styles.pastBadgeText
                  }
                >
                  Past
                </Text>
              </View>
            ) : isToday(item.blocked_date) ? (
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

          <Text
            style={
              styles.dateCardDate
            }
          >
            {formatDisplayDate(
              item.blocked_date,
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.dateImpactPanel
        }
      >
        <View
          style={
            styles.dateImpactIcon
          }
        >
          <Ionicons
            name="ban-outline"
            size={18}
            color={
              past
                ? COLORS.textMuted
                : COLORS.orange
            }
          />
        </View>

        <View
          style={
            styles.dateImpactContent
          }
        >
          <Text
            style={
              styles.dateImpactTitle
            }
          >
            Full-day closure
          </Text>

          <Text
            style={
              styles.dateImpactText
            }
          >
            {past
              ? 'This date has already passed.'
              : 'New customer time slots are unavailable for the entire date.'}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.dateActions
        }
      >
        {!past && onEdit ? (
          <TouchableOpacity
            activeOpacity={0.78}
            disabled={
              disabled
              || isDeleting
            }
            accessibilityRole="button"
            onPress={
              onEdit
            }
            style={[
              styles.editButton,

              (
                disabled
                || isDeleting
              )
              && styles.disabledButton,
            ]}
          >
            <Ionicons
              name="create-outline"
              size={17}
              color={
                COLORS.navy
              }
            />

            <Text
              style={
                styles.editButtonText
              }
            >
              Edit
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.78}
          disabled={
            disabled
            || isDeleting
          }
          accessibilityRole="button"
          onPress={
            onDelete
          }
          style={[
            styles.removeButton,

            past
            && styles.removeButtonFull,

            (
              disabled
              || isDeleting
            )
            && styles.disabledButton,
          ]}
        >
          {isDeleting ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.danger
              }
            />
          ) : (
            <Ionicons
              name="trash-outline"
              size={17}
              color={
                COLORS.danger
              }
            />
          )}

          <Text
            style={
              styles.removeButtonText
            }
          >
            {isDeleting
              ? 'Removing...'
              : 'Remove'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


function MessageBox({
  type,
  title,
  message,
}: {
  type: 'success' | 'error';
  title: string;
  message: string;
}) {
  const success =
    type === 'success';

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
          size={20}
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


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
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
    maxWidth: 560,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 600,
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

  loadingCard: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
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
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  loadingText: {
    maxWidth: 320,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  overviewCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  overviewHeader: {
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
    marginTop: 18,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  overviewStat: {
    flex: 1,
  },

  overviewStatValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  overviewStatLabel: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
  },

  overviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  infoCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  infoIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.blueSoft,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  infoText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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

  sectionAction: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  sectionActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  formCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  datePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceSoft,
  },

  datePreviewCalendar: {
    width: 54,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  datePreviewMonth: {
    width: '100%',
    paddingVertical: 4,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    textAlign: 'center',
  },

  datePreviewDay: {
    paddingVertical: 6,
    color: COLORS.text,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '800',
  },

  datePreviewContent: {
    flex: 1,
    minWidth: 0,
  },

  datePreviewTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  datePreviewText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  dateStatusBadge: {
    minHeight: 29,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
  },

  dateStatusUpcoming: {
    backgroundColor: COLORS.orangeSoft,
  },

  dateStatusPast: {
    backgroundColor: COLORS.surface,
  },

  dateStatusText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  dateStatusTextUpcoming: {
    color: COLORS.orange,
  },

  dateStatusTextPast: {
    color: COLORS.textMuted,
  },

  fieldHeader: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  fieldLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  fieldHint: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  dateInputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  dateInput: {
    flex: 1,
    minHeight: 50,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },

  quickLabel: {
    marginTop: 13,
    marginBottom: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  quickDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  quickDateButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },

  quickDateButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  quickDateText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  quickDateTextSelected: {
    color: COLORS.white,
  },

  reasonHeader: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  optionalText: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  reasonInput: {
    minHeight: 105,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSoft,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  primaryButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.5,
  },

  emptyCard: {
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
    maxWidth: 350,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  dateList: {
    gap: 12,
  },

  dateCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  dateCardPast: {
    backgroundColor: COLORS.surfaceSoft,
    shadowOpacity: 0,
    elevation: 0,
  },

  dateCardEditing: {
    borderColor: COLORS.navy,
  },

  dateCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  calendarBadge: {
    width: 54,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  calendarMonth: {
    width: '100%',
    paddingVertical: 4,
    color: COLORS.white,
    backgroundColor: COLORS.orange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    textAlign: 'center',
  },

  calendarDay: {
    paddingVertical: 6,
    color: COLORS.text,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '800',
  },

  dateCardIdentity: {
    flex: 1,
    minWidth: 0,
  },

  dateCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  dateCardTitle: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  dateCardDate: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  editingBadge: {
    minHeight: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.blueSoft,
  },

  editingBadgeText: {
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  pastBadge: {
    minHeight: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.border,
  },

  pastBadgeText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  todayBadge: {
    minHeight: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.warningSoft,
  },

  todayBadgeText: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  dateImpactPanel: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  dateImpactIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  dateImpactContent: {
    flex: 1,
  },

  dateImpactTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  dateImpactText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  dateActions: {
    marginTop: 14,
    paddingTop: 13,
    flexDirection: 'row',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  editButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  editButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  removeButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  removeButtonFull: {
    flex: 1,
  },

  removeButtonText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  relatedCard: {
    marginTop: SPACING.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  relatedIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  relatedContent: {
    flex: 1,
  },

  relatedTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  relatedText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  relatedButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  relatedButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },
});