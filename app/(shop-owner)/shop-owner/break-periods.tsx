
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

import StyleHubModal from '@/src/components/StyleHubModal';
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
  createShopOwnerBreakPeriod,
  deleteShopOwnerBreakPeriod,
  getShopOwnerBreakPeriods,
  updateShopOwnerBreakPeriod,
} from '@/src/services/shop-owner-break-period-api';
import type {
  ShopOwnerDayOfWeek,
} from '@/src/types/shop-owner';
import type {
  ShopOwnerBreakPeriod,
} from '@/src/types/shop-owner-break-period';

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

const TIME_PATTERN = /^\d{2}:\d{2}$/;

/* ==========================================================
   TIME HELPERS
   ========================================================== */

function isValidTime(value: string): boolean {
  if (!TIME_PATTERN.test(value)) {
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

function formatDisplayTime(value: string): string {
  if (!isValidTime(value)) {
    return value;
  }

  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function minutesFromTime(value: string): number | null {
  if (!isValidTime(value)) {
    return null;
  }

  const [hourText, minuteText] = value.split(':');

  return Number(hourText) * 60 + Number(minuteText);
}

function durationMinutes(
  startsAt: string,
  endsAt: string,
): number | null {
  const start = minutesFromTime(startsAt);
  const end = minutesFromTime(endsAt);

  if (
    start === null ||
    end === null ||
    end <= start
  ) {
    return null;
  }

  return end - start;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) {
    return 'Duration unavailable';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/* ==========================================================
   SHOP OWNER BREAK PERIODS
   ========================================================== */

export default function ShopOwnerBreakPeriodsScreen() {
  const { token } = useAuth();

  const [breakPeriods, setBreakPeriods] =
    useState<ShopOwnerBreakPeriod[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [dayOfWeek, setDayOfWeek] =
    useState<ShopOwnerDayOfWeek>(1);

  const [startsAt, setStartsAt] = useState('12:00');
  const [endsAt, setEndsAt] = useState('13:00');
  const [label, setLabel] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* ========================================================
     SHARED STYLEHUB MODAL STATE
     ======================================================== */

  const [deleteTarget, setDeleteTarget] =
    useState<ShopOwnerBreakPeriod | null>(null);

  const [deleteSuccessVisible, setDeleteSuccessVisible] =
    useState(false);

  const [deleteModalError, setDeleteModalError] =
    useState('');

  const deleteInFlightRef = useRef(false);

  /* ========================================================
     DERIVED BREAK PERIOD DATA
     ======================================================== */

  const editingRecord = useMemo(
    () =>
      breakPeriods.find(
        (item) => item.id === selectedId,
      ) ?? null,
    [breakPeriods, selectedId],
  );

  const daysWithBreaks = useMemo(
    () =>
      new Set(
        breakPeriods.map((item) => item.day_of_week),
      ).size,
    [breakPeriods],
  );

  const totalWeeklyBreakMinutes = useMemo(
    () =>
      breakPeriods.reduce(
        (total, item) =>
          total +
          (durationMinutes(
            item.starts_at,
            item.ends_at,
          ) ?? 0),
        0,
      ),
    [breakPeriods],
  );

  const sortedBreakPeriods = useMemo(
    () =>
      [...breakPeriods].sort((first, second) => {
        if (first.day_of_week !== second.day_of_week) {
          return first.day_of_week - second.day_of_week;
        }

        return first.starts_at.localeCompare(
          second.starts_at,
        );
      }),
    [breakPeriods],
  );

  const formDuration = useMemo(
    () =>
      durationMinutes(
        startsAt.trim(),
        endsAt.trim(),
      ),
    [endsAt, startsAt],
  );

  const selectedDayLabel =
    WEEK_DAYS.find(
      (day) => day.value === dayOfWeek,
    )?.label ?? 'Selected day';

  /* ========================================================
     LOAD BREAK PERIODS FROM LARAVEL
     ======================================================== */

  const loadBreakPeriods = useCallback(
    async (refreshing = false): Promise<void> => {
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
          await getShopOwnerBreakPeriods(token);

        setBreakPeriods(response.data.break_periods);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load break periods.',
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
      void loadBreakPeriods();
    }, [loadBreakPeriods]),
  );

  /* ========================================================
     FORM HELPERS
     ======================================================== */

  function clearMessages(): void {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function resetForm(): void {
    setSelectedId(null);
    setDayOfWeek(1);
    setStartsAt('12:00');
    setEndsAt('13:00');
    setLabel('');
  }

  function beginEdit(item: ShopOwnerBreakPeriod): void {
    if (isSaving || deletingId !== null) {
      return;
    }

    clearMessages();

    setSelectedId(item.id);
    setDayOfWeek(item.day_of_week);
    setStartsAt(item.starts_at);
    setEndsAt(item.ends_at);
    setLabel(item.label ?? '');
  }

  function cancelEdit(): void {
    if (isSaving) {
      return;
    }

    clearMessages();
    resetForm();
  }

  /* ========================================================
     FORM VALIDATION
     ======================================================== */

  function validateForm(): string | null {
    const cleanStart = startsAt.trim();
    const cleanEnd = endsAt.trim();

    if (!isValidTime(cleanStart)) {
      return 'Enter the break start time using HH:MM.';
    }

    if (!isValidTime(cleanEnd)) {
      return 'Enter the break end time using HH:MM.';
    }

    if (cleanEnd <= cleanStart) {
      return 'The break end time must be later than the start time.';
    }

    if (label.trim().length > 120) {
      return 'Label must not exceed 120 characters.';
    }

    return null;
  }

  /* ========================================================
     CREATE / UPDATE BREAK PERIOD
     ======================================================== */

  async function handleSave(): Promise<void> {
    if (
      !token ||
      isSaving ||
      deletingId !== null
    ) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setSuccessMessage('');
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    clearMessages();

    try {
      const payload = {
        dayOfWeek,
        startsAt: startsAt.trim(),
        endsAt: endsAt.trim(),
        label,
      };

      const response =
        selectedId === null
          ? await createShopOwnerBreakPeriod(
              token,
              payload,
            )
          : await updateShopOwnerBreakPeriod(
              token,
              selectedId,
              payload,
            );

      setSuccessMessage(
        response.message ??
          (selectedId === null
            ? 'Break period added successfully.'
            : 'Break period updated successfully.'),
      );

      resetForm();
      await loadBreakPeriods();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to save the break period.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* ========================================================
     OPEN REMOVE CONFIRMATION
     ======================================================== */

  function confirmDelete(item: ShopOwnerBreakPeriod): void {
    if (
      isSaving ||
      deletingId !== null ||
      deleteInFlightRef.current
    ) {
      return;
    }

    clearMessages();

    setDeleteSuccessVisible(false);
    setDeleteModalError('');
    setDeleteTarget(item);
  }

  /* ========================================================
     CLOSE REMOVE MODAL
     ======================================================== */

  function closeDeleteModal(): void {
    if (
      deletingId !== null ||
      deleteInFlightRef.current
    ) {
      return;
    }

    setDeleteTarget(null);
    setDeleteSuccessVisible(false);
    setDeleteModalError('');
  }

  /* ========================================================
     DELETE BREAK PERIOD VIA LARAVEL
     ======================================================== */

  async function handleDelete(): Promise<void> {
    const item = deleteTarget;

    if (
      !token ||
      !item ||
      deletingId !== null ||
      isSaving ||
      deleteInFlightRef.current
    ) {
      return;
    }

    deleteInFlightRef.current = true;
    setDeletingId(item.id);
    setDeleteModalError('');
    clearMessages();

    try {
      const response =
        await deleteShopOwnerBreakPeriod(
          token,
          item.id,
        );

      if (selectedId === item.id) {
        resetForm();
      }

      setSuccessMessage(
        response.message ??
          'Break period removed successfully.',
      );

      await loadBreakPeriods();

      // Switch red confirmation to green success.
      setDeleteTarget(null);
      setDeleteSuccessVisible(true);
    } catch (error) {
      // Keep the modal open and display Laravel error.
      setDeleteModalError(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove the break period.',
      );
    } finally {
      deleteInFlightRef.current = false;
      setDeletingId(null);
    }
  }

  /* ========================================================
     MAIN SCREEN
     ======================================================== */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadBreakPeriods(true)}
              tintColor={COLORS.navy}
              colors={[COLORS.navy]}
            />
          }
          contentContainerStyle={styles.container}
        >
          {/* TOP BAR */}

          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to schedule"
              onPress={() =>
                router.replace(
                  '/(shop-owner)/shop-owner/schedule',
                )
              }
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
                Break periods
              </Text>

              <Text style={styles.topBarCaption}>
                Recurring unavailable time
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Refresh break periods"
              onPress={() =>
                void loadBreakPeriods(true)
              }
              style={styles.topIconButton}
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          {/* HEADER */}

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              WEEKLY BREAKS
            </Text>

            <Text style={styles.title}>
              Protect time for lunch, rest, and shop routines
            </Text>

            <Text style={styles.subtitle}>
              Break periods repeat every week and remove
              overlapping appointment times from customer
              availability.
            </Text>
          </View>

          {/* STATUS MESSAGES */}

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Break periods need attention"
              message={errorMessage}
            />
          ) : null}

          {successMessage ? (
            <MessageBox
              type="success"
              title="Saved successfully"
              message={successMessage}
            />
          ) : null}

          {/* LOADING */}

          {isLoading ? (
            <View style={styles.loadingCard}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.loadingTitle}>
                Loading break periods
              </Text>

              <Text style={styles.loadingText}>
                Getting your recurring unavailable times.
              </Text>
            </View>
          ) : (
            <>
              {/* OVERVIEW */}

              <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <View>
                    <Text style={styles.overviewLabel}>
                      Weekly breaks
                    </Text>

                    <Text style={styles.overviewValue}>
                      {breakPeriods.length}
                    </Text>
                  </View>

                  <View style={styles.overviewIcon}>
                    <Ionicons
                      name="cafe-outline"
                      size={24}
                      color={COLORS.white}
                    />
                  </View>
                </View>

                <View style={styles.overviewStats}>
                  <OverviewStat
                    value={breakPeriods.length}
                    label="Breaks"
                  />

                  <View style={styles.overviewDivider} />

                  <OverviewStat
                    value={daysWithBreaks}
                    label="Days affected"
                  />

                  <View style={styles.overviewDivider} />

                  <View style={styles.overviewDuration}>
                    <Text style={styles.overviewDurationValue}>
                      {formatDuration(
                        totalWeeklyBreakMinutes,
                      )}
                    </Text>

                    <Text style={styles.overviewStatLabel}>
                      Weekly blocked
                    </Text>
                  </View>
                </View>
              </View>

              {/* IMPORTANT INFORMATION */}

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={COLORS.blue}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>
                    Breaks affect new availability
                  </Text>

                  <Text style={styles.infoText}>
                    Existing appointments are not cancelled
                    automatically. These periods prevent new
                    customer slots from overlapping the break.
                  </Text>
                </View>
              </View>

              {/* ADD / EDIT FORM */}

              <SectionHeading
                title={
                  editingRecord
                    ? 'Edit break period'
                    : 'Add break period'
                }
                subtitle={
                  editingRecord
                    ? 'Update the recurring day and time, then save your changes.'
                    : 'Choose a weekday and the recurring time your shop should be unavailable.'
                }
                actionLabel={
                  editingRecord ? 'Cancel edit' : undefined
                }
                onAction={
                  editingRecord ? cancelEdit : undefined
                }
              />

              <View style={styles.formCard}>
                {/* LIVE PREVIEW */}

                <View style={styles.formPreview}>
                  <View style={styles.formPreviewIcon}>
                    <Ionicons
                      name="cafe-outline"
                      size={20}
                      color={COLORS.navy}
                    />
                  </View>

                  <View style={styles.formPreviewContent}>
                    <Text style={styles.formPreviewTitle}>
                      {label.trim() || 'Break period'}
                    </Text>

                    <Text style={styles.formPreviewText}>
                      {selectedDayLabel} ·{' '}
                      {formatDisplayTime(startsAt.trim())}
                      {' – '}
                      {formatDisplayTime(endsAt.trim())}
                    </Text>
                  </View>

                  <View style={styles.formDurationBadge}>
                    <Text style={styles.formDurationText}>
                      {formatDuration(formDuration)}
                    </Text>
                  </View>
                </View>

                {/* WEEKDAY SELECTION */}

                <Text style={styles.fieldLabel}>
                  Repeat every
                </Text>

                <View style={styles.dayGrid}>
                  {WEEK_DAYS.map((day) => {
                    const selected =
                      dayOfWeek === day.value;

                    return (
                      <TouchableOpacity
                        key={day.value}
                        activeOpacity={0.78}
                        disabled={
                          isSaving || deletingId !== null
                        }
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                          disabled:
                            isSaving || deletingId !== null,
                        }}
                        onPress={() => {
                          setDayOfWeek(day.value);
                          clearMessages();
                        }}
                        style={[
                          styles.dayButton,
                          selected &&
                            styles.dayButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            selected &&
                              styles.dayButtonTextSelected,
                          ]}
                        >
                          {day.shortLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* START AND END TIME */}

                <View style={styles.timeRow}>
                  <TimeField
                    icon="time-outline"
                    label="Starts"
                    value={startsAt}
                    placeholder="12:00"
                    disabled={
                      isSaving || deletingId !== null
                    }
                    onChange={(value) => {
                      setStartsAt(value);
                      clearMessages();
                    }}
                  />

                  <View style={styles.timeArrow}>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={COLORS.textLight}
                    />
                  </View>

                  <TimeField
                    icon="time-outline"
                    label="Ends"
                    value={endsAt}
                    placeholder="13:00"
                    disabled={
                      isSaving || deletingId !== null
                    }
                    onChange={(value) => {
                      setEndsAt(value);
                      clearMessages();
                    }}
                  />
                </View>

                <Text style={styles.timeHelp}>
                  Use 24-hour HH:MM format. Example:
                  12:00 to 13:00 means 12:00 PM to 1:00 PM.
                </Text>

                {/* OPTIONAL LABEL */}

                <View style={styles.labelHeader}>
                  <Text style={styles.fieldLabel}>
                    Label
                  </Text>

                  <Text style={styles.optionalText}>
                    Optional · {label.length}/120
                  </Text>
                </View>

                <TextInput
                  value={label}
                  onChangeText={(value) => {
                    if (value.length <= 120) {
                      setLabel(value);
                      clearMessages();
                    }
                  }}
                  editable={
                    !isSaving && deletingId === null
                  }
                  autoCapitalize="sentences"
                  placeholder="Example: Lunch break"
                  placeholderTextColor={COLORS.textLight}
                  selectionColor={COLORS.navy}
                  style={styles.labelInput}
                />

                {/* SAVE */}

                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={
                    isSaving || deletingId !== null
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingRecord
                      ? 'Update break period'
                      : 'Add break period'
                  }
                  onPress={() => void handleSave()}
                  style={[
                    styles.primaryButton,
                    (isSaving || deletingId !== null) &&
                      styles.disabledButton,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Ionicons
                      name={
                        editingRecord
                          ? 'save-outline'
                          : 'add-circle-outline'
                      }
                      size={19}
                      color={COLORS.white}
                    />
                  )}

                  <Text style={styles.primaryButtonText}>
                    {isSaving
                      ? 'Saving break period...'
                      : editingRecord
                        ? 'Save changes'
                        : 'Add break period'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SAVED BREAKS */}

              <SectionHeading
                title="Recurring breaks"
                subtitle={
                  breakPeriods.length === 0
                    ? 'Your saved weekly break periods will appear here.'
                    : `${breakPeriods.length} ${
                        breakPeriods.length === 1
                          ? 'break'
                          : 'breaks'
                      } currently block customer availability each week.`
                }
              />

              {sortedBreakPeriods.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="cafe-outline"
                      size={28}
                      color={COLORS.navy}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>
                    No recurring breaks yet
                  </Text>

                  <Text style={styles.emptyText}>
                    Add lunch, cleaning, rest, or staff
                    breaks so StyleHub does not offer
                    overlapping appointment times.
                  </Text>
                </View>
              ) : (
                <View style={styles.breakList}>
                  {sortedBreakPeriods.map((item) => {
                    const isDeleting =
                      deletingId === item.id;

                    const isEditing =
                      selectedId === item.id;

                    return (
                      <BreakPeriodCard
                        key={item.id}
                        item={item}
                        isDeleting={isDeleting}
                        isEditing={isEditing}
                        disabled={
                          isSaving ||
                          (deletingId !== null &&
                            !isDeleting)
                        }
                        onEdit={() => beginEdit(item)}
                        onDelete={() =>
                          confirmDelete(item)
                        }
                      />
                    );
                  })}
                </View>
              )}

              {/* BLOCKED DATES SHORTCUT */}

              <View style={styles.relatedCard}>
                <View style={styles.relatedHeader}>
                  <View style={styles.relatedIcon}>
                    <Ionicons
                      name="calendar-clear-outline"
                      size={20}
                      color={COLORS.navy}
                    />
                  </View>

                  <View style={styles.relatedContent}>
                    <Text style={styles.relatedTitle}>
                      Need to close an entire date?
                    </Text>

                    <Text style={styles.relatedText}>
                      Use Blocked Dates for holidays,
                      leave, maintenance, or one-time
                      shop closures.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      '/(shop-owner)/shop-owner/blocked-dates',
                    )
                  }
                  style={styles.relatedButton}
                >
                  <Text style={styles.relatedButtonText}>
                    Open blocked dates
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={COLORS.navy}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ==================================================
          SHARED STYLEHUB REMOVE MODAL

          Red: Remove break period
          Green: Successful removal
          ================================================== */}

      <StyleHubModal
        visible={
          deleteTarget !== null || deleteSuccessVisible
        }
        onClose={closeDeleteModal}
        title={
          deleteSuccessVisible
            ? 'Break period removed'
            : 'Remove break period?'
        }
        message={
          deleteSuccessVisible
            ? successMessage
            : deleteTarget
              ? `${deleteTarget.day_label}, ${formatDisplayTime(
                  deleteTarget.starts_at,
                )} – ${formatDisplayTime(
                  deleteTarget.ends_at,
                )} will become available again unless another booking rule blocks it.`
              : 'This weekly break will be removed.'
        }
        tone={
          deleteSuccessVisible ? 'success' : 'danger'
        }
        icon={
          deleteSuccessVisible
            ? 'checkmark-circle-outline'
            : 'trash-outline'
        }
        dismissOnBackdrop={false}
        actions={
          deleteSuccessVisible
            ? [
                {
                  label: 'Done',
                  variant: 'primary',
                  icon: 'checkmark-outline',
                  onPress: closeDeleteModal,
                },
              ]
            : [
                {
                  label: 'Keep break',
                  variant: 'secondary',
                  onPress: closeDeleteModal,
                },
                {
                  label: 'Remove break',
                  variant: 'danger',
                  icon: 'trash-outline',
                  loading: deletingId !== null,
                  onPress: () => void handleDelete(),
                },
              ]
        }
      >
        {/* LARAVEL ERROR INSIDE THE RED MODAL */}

        {!deleteSuccessVisible && deleteModalError ? (
          <View style={styles.deleteModalError}>
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={COLORS.danger}
            />

            <Text style={styles.deleteModalErrorText}>
              {deleteModalError}
            </Text>
          </View>
        ) : null}
      </StyleHubModal>
    </SafeAreaView>
  );
}

/* ==========================================================
   SECTION HEADING
   ========================================================== */

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
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.72}
          accessibilityRole="button"
          onPress={onAction}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ==========================================================
   OVERVIEW STAT
   ========================================================== */

function OverviewStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.overviewStat}>
      <Text style={styles.overviewStatValue}>
        {value}
      </Text>

      <Text style={styles.overviewStatLabel}>
        {label}
      </Text>
    </View>
  );
}

/* ==========================================================
   TIME INPUT FIELD
   ========================================================== */

function TimeField({
  icon,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  icon: 'time-outline';
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.timeField}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View style={styles.timeInputShell}>
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.textMuted}
        />

        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          selectionColor={COLORS.navy}
          style={styles.timeInput}
        />
      </View>
    </View>
  );
}

/* ==========================================================
   BREAK PERIOD CARD
   ========================================================== */

function BreakPeriodCard({
  item,
  isDeleting,
  isEditing,
  disabled,
  onEdit,
  onDelete,
}: {
  item: ShopOwnerBreakPeriod;
  isDeleting: boolean;
  isEditing: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const shortDay =
    WEEK_DAYS.find(
      (day) => day.value === item.day_of_week,
    )?.shortLabel ?? item.day_label.slice(0, 3);

  const duration = durationMinutes(
    item.starts_at,
    item.ends_at,
  );

  return (
    <View
      style={[
        styles.breakCard,
        isEditing && styles.breakCardEditing,
      ]}
    >
      <View style={styles.breakTopRow}>
        <View style={styles.breakIdentity}>
          <View style={styles.breakDayBadge}>
            <Text style={styles.breakDayText}>
              {shortDay}
            </Text>
          </View>

          <View style={styles.breakTitleBlock}>
            <Text
              style={styles.breakTitle}
              numberOfLines={1}
            >
              {item.label?.trim() || 'Break period'}
            </Text>

            <Text style={styles.breakDayLabel}>
              {item.day_label}
            </Text>
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editingBadge}>
            <Text style={styles.editingBadgeText}>
              Editing
            </Text>
          </View>
        ) : null}
      </View>

      {/* SCHEDULE SUMMARY */}

      <View style={styles.breakSchedulePanel}>
        <View style={styles.breakScheduleItem}>
          <Ionicons
            name="time-outline"
            size={17}
            color={COLORS.textMuted}
          />

          <View style={styles.breakScheduleCopy}>
            <Text style={styles.breakScheduleLabel}>
              Unavailable time
            </Text>

            <Text style={styles.breakScheduleValue}>
              {formatDisplayTime(item.starts_at)}
              {' – '}
              {formatDisplayTime(item.ends_at)}
            </Text>
          </View>
        </View>

        <View style={styles.breakScheduleDivider} />

        <View style={styles.breakScheduleDuration}>
          <Text style={styles.breakScheduleLabel}>
            Duration
          </Text>

          <Text style={styles.breakDurationValue}>
            {formatDuration(duration)}
          </Text>
        </View>
      </View>

      {/* ACTION BUTTONS */}

      <View style={styles.breakActions}>
        <TouchableOpacity
          activeOpacity={0.78}
          disabled={disabled || isDeleting}
          accessibilityRole="button"
          onPress={onEdit}
          style={[
            styles.editButton,
            (disabled || isDeleting) &&
              styles.disabledButton,
          ]}
        >
          <Ionicons
            name="create-outline"
            size={17}
            color={COLORS.navy}
          />

          <Text style={styles.editButtonText}>
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.78}
          disabled={disabled || isDeleting}
          accessibilityRole="button"
          onPress={onDelete}
          style={[
            styles.deleteButton,
            (disabled || isDeleting) &&
              styles.disabledButton,
          ]}
        >
          {isDeleting ? (
            <ActivityIndicator
              size="small"
              color={COLORS.danger}
            />
          ) : (
            <Ionicons
              name="trash-outline"
              size={17}
              color={COLORS.danger}
            />
          )}

          <Text style={styles.deleteButtonText}>
            {isDeleting ? 'Removing...' : 'Remove'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ==========================================================
   STATUS MESSAGE
   ========================================================== */

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
            success ? COLORS.success : COLORS.danger
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

/* ==========================================================
   COMPLETE SCREEN STYLES
   ========================================================== */

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
    maxWidth: 550,
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

  /* OVERVIEW */

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
    minWidth: 58,
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
    marginHorizontal: 14,
    backgroundColor: COLORS.navyMuted,
  },

  overviewDuration: {
    flex: 1,
    minWidth: 0,
  },

  overviewDurationValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  /* INFORMATION CARD */

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

  /* SECTION HEADINGS */

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

  /* ADD / EDIT FORM */

  formCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  formPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceSoft,
  },

  formPreviewIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  formPreviewContent: {
    flex: 1,
    minWidth: 0,
  },

  formPreviewTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  formPreviewText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  formDurationBadge: {
    minHeight: 29,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.greenSoft,
  },

  formDurationText: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  /* WEEKDAY SELECTION */

  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  dayButton: {
    minWidth: 44,
    minHeight: 40,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  dayButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  dayButtonText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  dayButtonTextSelected: {
    color: COLORS.white,
  },

  /* TIME INPUTS */

  timeRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  timeField: {
    flex: 1,
    minWidth: 0,
  },

  timeInputShell: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  timeInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
    textAlign: 'center',
  },

  timeArrow: {
    width: 32,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeHelp: {
    marginTop: 8,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  /* OPTIONAL LABEL */

  labelHeader: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  optionalText: {
    marginTop: 18,
    marginBottom: 8,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  labelInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSoft,
    fontSize: TYPOGRAPHY.body,
  },

  /* SAVE BUTTON */

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

  /* EMPTY STATE */

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

  /* BREAK PERIOD LIST */

  breakList: {
    gap: 12,
  },

  breakCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  breakCardEditing: {
    borderColor: COLORS.navy,
  },

  breakTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  breakIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  breakDayBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.orangeSoft,
  },

  breakDayText: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  breakTitleBlock: {
    flex: 1,
    minWidth: 0,
  },

  breakTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  breakDayLabel: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
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

  /* BREAK SCHEDULE CARD */

  breakSchedulePanel: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  breakScheduleItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  breakScheduleCopy: {
    flex: 1,
    minWidth: 0,
  },

  breakScheduleLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  breakScheduleValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '700',
  },

  breakScheduleDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.border,
  },

  breakScheduleDuration: {
    width: 90,
    justifyContent: 'center',
  },

  breakDurationValue: {
    marginTop: 3,
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  /* EDIT AND REMOVE BUTTONS */

  breakActions: {
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

  deleteButton: {
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

  deleteButtonText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  /* SHARED MODAL ERROR */

  deleteModalError: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  deleteModalErrorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* BLOCKED DATES SHORTCUT */

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
