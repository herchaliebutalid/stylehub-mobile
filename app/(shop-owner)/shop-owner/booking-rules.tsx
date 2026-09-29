import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useMemo,
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
  getShopOwnerBookingRules,
  updateShopOwnerBookingRules,
} from '@/src/services/shop-owner-booking-rules-api';
import type {
  ShopOwnerBookingRules,
  ShopOwnerSlotIntervalMinutes,
} from '@/src/types/shop-owner-booking-rules';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SLOT_INTERVALS: ShopOwnerSlotIntervalMinutes[] = [
  5,
  10,
  15,
  20,
  30,
  60,
];

const LEAD_TIME_PRESETS = [
  {
    value: 0,
    label: 'No extra lead',
  },
  {
    value: 60,
    label: '1 hour',
  },
  {
    value: 120,
    label: '2 hours',
  },
  {
    value: 1440,
    label: '24 hours',
  },
] as const;

const BOOKING_WINDOW_PRESETS = [
  7,
  14,
  30,
  60,
  90,
] as const;

const CUTOFF_PRESETS = [
  {
    value: 0,
    label: 'Until start',
  },
  {
    value: 60,
    label: '1 hour',
  },
  {
    value: 360,
    label: '6 hours',
  },
  {
    value: 1440,
    label: '1 day',
  },
] as const;

interface RuleFormState {
  slotIntervalMinutes: ShopOwnerSlotIntervalMinutes;
  minimumLeadTimeMinutes: string;
  bookingWindowDays: string;
  cancellationCutoffMinutes: string;
  rescheduleCutoffMinutes: string;
}

function formFromRules(
  rules: ShopOwnerBookingRules,
): RuleFormState {
  return {
    slotIntervalMinutes:
      rules.slot_interval_minutes,

    minimumLeadTimeMinutes:
      String(
        rules.minimum_lead_time_minutes,
      ),

    bookingWindowDays:
      String(
        rules.booking_window_days,
      ),

    cancellationCutoffMinutes:
      String(
        rules.cancellation_cutoff_minutes,
      ),

    rescheduleCutoffMinutes:
      String(
        rules.reschedule_cutoff_minutes,
      ),
  };
}

function formFingerprint(
  form: RuleFormState,
): string {
  return [
    form.slotIntervalMinutes,
    form.minimumLeadTimeMinutes.trim(),
    form.bookingWindowDays.trim(),
    form.cancellationCutoffMinutes.trim(),
    form.rescheduleCutoffMinutes.trim(),
  ].join('|');
}

function parseRequiredInteger(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const cleanValue = value.trim();

  if (!/^\d+$/.test(cleanValue)) {
    throw new Error(
      `${label} must be a whole number.`,
    );
  }

  const parsed = Number(cleanValue);

  if (!Number.isSafeInteger(parsed)) {
    throw new Error(
      `${label} must be a valid whole number.`,
    );
  }

  if (
    parsed < minimum
    || parsed > maximum
  ) {
    throw new Error(
      `${label} must be between ${minimum} and ${maximum}.`,
    );
  }

  return parsed;
}

function humanizeMinutes(
  value: string | number,
  zeroText = 'No extra cutoff',
): string {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed)
    || parsed < 0
  ) {
    return 'Enter a valid number of minutes';
  }

  if (parsed === 0) {
    return zeroText;
  }

  if (parsed % 1440 === 0) {
    const days = parsed / 1440;

    return `${days} day${days === 1 ? '' : 's'}`;
  }

  if (parsed % 60 === 0) {
    const hours = parsed / 60;

    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${parsed} minutes`;
}

function cutoffHelper(
  minutes: string,
): string {
  const parsed = Number(minutes);

  if (
    !Number.isFinite(parsed)
    || parsed <= 0
  ) {
    return '0 means the customer may act until the appointment starts.';
  }

  return `${humanizeMinutes(parsed)} before the appointment.`;
}

function bookingWindowHelper(
  days: string,
): string {
  const parsed = Number(days);

  if (
    !Number.isFinite(parsed)
    || parsed < 1
  ) {
    return 'Choose how far ahead customers can reserve.';
  }

  if (parsed === 1) {
    return 'Customers can book up to 1 calendar day ahead.';
  }

  if (parsed % 7 === 0) {
    const weeks = parsed / 7;

    return `Customers can book about ${weeks} week${weeks === 1 ? '' : 's'} ahead.`;
  }

  return `Customers can book up to ${parsed} calendar days ahead.`;
}

function leadTimeHelper(
  minutes: string,
): string {
  const parsed = Number(minutes);

  if (
    !Number.isFinite(parsed)
    || parsed < 0
  ) {
    return 'Enter the minimum notice required before a new booking.';
  }

  if (parsed === 0) {
    return 'Customers may choose the next valid future slot.';
  }

  return `Customers must book at least ${humanizeMinutes(parsed)} in advance.`;
}

export default function ShopOwnerBookingRulesScreen() {
  const {
    token,
  } = useAuth();

  const [
    rules,
    setRules,
  ] = useState<ShopOwnerBookingRules | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<RuleFormState | null>(
    null,
  );

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
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const loadRules = useCallback(
    async (
      refreshing = false,
    ): Promise<void> => {
      if (!token) {
        setRules(null);
        setForm(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');
      setSuccessMessage('');

      try {
        const response =
          await getShopOwnerBookingRules(
            token,
          );

        const loadedRules =
          response.data.rules;

        setRules(loadedRules);

        setForm(
          formFromRules(
            loadedRules,
          ),
        );
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load booking rules.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(
      () => {
        void loadRules();
      },
      [loadRules],
    ),
  );

  const savedForm = useMemo(
    () =>
      rules
        ? formFromRules(rules)
        : null,
    [rules],
  );

  const isDirty = useMemo(
    () =>
      Boolean(
        form
        && savedForm
        && formFingerprint(form)
          !== formFingerprint(savedForm),
      ),
    [form, savedForm],
  );

  const canSave = Boolean(
    form
    && rules
    && !isSaving
    && (
      isDirty
      || !rules.is_customized
    ),
  );

  function clearMessages(): void {
    setErrorMessage('');
    setSuccessMessage('');
  }

  function updateField<
    Key extends keyof RuleFormState
  >(
    key: Key,
    value: RuleFormState[Key],
  ): void {
    setForm(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [key]: value,
        };
      },
    );

    clearMessages();
  }

  function restoreSavedRules(): void {
    if (
      !rules
      || isSaving
    ) {
      return;
    }

    setForm(
      formFromRules(
        rules,
      ),
    );

    clearMessages();
  }

  async function saveRules(): Promise<void> {
    if (
      !token
      || !form
      || isSaving
    ) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const minimumLeadTimeMinutes =
        parseRequiredInteger(
          form.minimumLeadTimeMinutes,
          'Minimum lead time',
          0,
          1440,
        );

      const bookingWindowDays =
        parseRequiredInteger(
          form.bookingWindowDays,
          'Booking window',
          1,
          365,
        );

      const cancellationCutoffMinutes =
        parseRequiredInteger(
          form.cancellationCutoffMinutes,
          'Cancellation cutoff',
          0,
          10080,
        );

      const rescheduleCutoffMinutes =
        parseRequiredInteger(
          form.rescheduleCutoffMinutes,
          'Reschedule cutoff',
          0,
          10080,
        );

      setIsSaving(true);

      const response =
        await updateShopOwnerBookingRules(
          token,
          {
            slotIntervalMinutes:
              form.slotIntervalMinutes,

            minimumLeadTimeMinutes,

            bookingWindowDays,

            cancellationCutoffMinutes,

            rescheduleCutoffMinutes,
          },
        );

      const savedRules =
        response.data.rules;

      setRules(savedRules);

      setForm(
        formFromRules(
          savedRules,
        ),
      );

      setSuccessMessage(
        response.message
        ?? 'Your booking rules are now active for customer availability and booking actions.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to update booking rules.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadRules(true)}
              tintColor={COLORS.navy}
              colors={[COLORS.navy]}
            />
          }
          contentContainerStyle={styles.container}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to shop owner home"
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
                Booking rules
              </Text>

              <Text style={styles.topBarCaption}>
                Customer booking controls
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Refresh booking rules"
              disabled={isSaving}
              onPress={() => void loadRules(true)}
              style={[
                styles.topIconButton,
                isSaving && styles.disabledButton,
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              BOOKING CONTROLS
            </Text>

            <Text style={styles.title}>
              Decide when customers can book, cancel, and request changes
            </Text>

            <Text style={styles.subtitle}>
              These settings shape customer availability and appointment actions while your Laravel backend continues to enforce every rule.
            </Text>
          </View>

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Booking rules need attention"
              message={errorMessage}
            />
          ) : null}

          {successMessage ? (
            <MessageBox
              type="success"
              title="Booking rules saved"
              message={successMessage}
            />
          ) : null}

          {isLoading && !form ? (
            <View style={styles.loadingCard}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.loadingTitle}>
                Loading booking rules
              </Text>

              <Text style={styles.loadingText}>
                Getting your appointment grid, booking window, and customer-change cutoffs.
              </Text>
            </View>
          ) : null}

          {form && rules ? (
            <>
              <View style={styles.overviewCard}>
                <View style={styles.overviewTopRow}>
                  <View style={styles.overviewIcon}>
                    <Ionicons
                      name={
                        rules.is_customized
                          ? 'shield-checkmark-outline'
                          : 'options-outline'
                      }
                      size={24}
                      color={COLORS.white}
                    />
                  </View>

                  <View
                    style={[
                      styles.modeBadge,
                      {
                        backgroundColor:
                          rules.is_customized
                            ? COLORS.greenSoft
                            : COLORS.blueSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        rules.is_customized
                          ? 'checkmark-circle-outline'
                          : 'sparkles-outline'
                      }
                      size={14}
                      color={
                        rules.is_customized
                          ? COLORS.green
                          : COLORS.blue
                      }
                    />

                    <Text
                      style={[
                        styles.modeBadgeText,
                        {
                          color:
                            rules.is_customized
                              ? COLORS.green
                              : COLORS.blue,
                        },
                      ]}
                    >
                      {rules.is_customized
                        ? 'Custom rules'
                        : 'StyleHub defaults'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.overviewTitle}>
                  {rules.is_customized
                    ? 'Your shop-specific booking policy is active'
                    : 'This shop is currently using StyleHub default rules'}
                </Text>

                <Text style={styles.overviewText}>
                  {rules.is_customized
                    ? 'Changes saved here are enforced for this shop when customers view slots or manage appointments.'
                    : 'Saving this form creates shop-specific rules, even if you keep the displayed default values.'}
                </Text>

                <View style={styles.overviewStats}>
                  <OverviewItem
                    label="Slot grid"
                    value={`${form.slotIntervalMinutes} min`}
                  />

                  <View style={styles.overviewDivider} />

                  <OverviewItem
                    label="Book ahead"
                    value={`${form.bookingWindowDays} days`}
                  />

                  <View style={styles.overviewDivider} />

                  <OverviewItem
                    label="Lead time"
                    value={humanizeMinutes(
                      form.minimumLeadTimeMinutes,
                      'None',
                    )}
                  />
                </View>
              </View>

              {isDirty ? (
                <View style={styles.unsavedCard}>
                  <View style={styles.unsavedIcon}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={20}
                      color={COLORS.orange}
                    />
                  </View>

                  <View style={styles.unsavedCopy}>
                    <Text style={styles.unsavedTitle}>
                      You have unsaved changes
                    </Text>

                    <Text style={styles.unsavedText}>
                      Customer booking behavior will not change until you save these rules.
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    disabled={isSaving}
                    onPress={restoreSavedRules}
                    style={styles.restoreButton}
                  >
                    <Text style={styles.restoreButtonText}>
                      Restore
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <SectionHeading
                title="Appointment availability"
                subtitle="Control the time grid customers see and how far in advance they can reserve."
              />

              <View style={styles.sectionCard}>
                <SettingHeader
                  icon="grid-outline"
                  title="Slot interval"
                  description="How often a new appointment may start during your opening hours."
                />

                <View style={styles.slotGrid}>
                  {SLOT_INTERVALS.map(
                    (interval) => {
                      const selected =
                        form.slotIntervalMinutes === interval;

                      return (
                        <TouchableOpacity
                          key={interval}
                          activeOpacity={0.8}
                          disabled={isSaving}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected,
                            disabled: isSaving,
                          }}
                          onPress={() =>
                            updateField(
                              'slotIntervalMinutes',
                              interval,
                            )
                          }
                          style={[
                            styles.slotButton,
                            selected && styles.slotButtonSelected,
                            isSaving && styles.disabledButton,
                          ]}
                        >
                          <Text
                            style={[
                              styles.slotButtonValue,
                              selected && styles.slotButtonValueSelected,
                            ]}
                          >
                            {interval}
                          </Text>

                          <Text
                            style={[
                              styles.slotButtonUnit,
                              selected && styles.slotButtonUnitSelected,
                            ]}
                          >
                            min
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                <View style={styles.ruleExplanation}>
                  <Ionicons
                    name="information-circle-outline"
                    size={17}
                    color={COLORS.blue}
                  />

                  <Text style={styles.ruleExplanationText}>
                    A {form.slotIntervalMinutes}-minute interval means possible appointment start times are generated every {form.slotIntervalMinutes} minutes, while service duration and conflicts are still checked separately.
                  </Text>
                </View>

                <View style={styles.sectionDivider} />

                <SettingHeader
                  icon="hourglass-outline"
                  title="Minimum lead time"
                  description="How much notice a customer must give before creating a new appointment."
                />

                <NumericRuleField
                  value={form.minimumLeadTimeMinutes}
                  suffix="minutes"
                  helper={leadTimeHelper(
                    form.minimumLeadTimeMinutes,
                  )}
                  range="Allowed range: 0–1,440 minutes."
                  disabled={isSaving}
                  onChangeText={(value) =>
                    updateField(
                      'minimumLeadTimeMinutes',
                      value,
                    )
                  }
                />

                <PresetRow
                  values={LEAD_TIME_PRESETS}
                  currentValue={form.minimumLeadTimeMinutes}
                  disabled={isSaving}
                  onSelect={(value) =>
                    updateField(
                      'minimumLeadTimeMinutes',
                      String(value),
                    )
                  }
                />

                <View style={styles.sectionDivider} />

                <SettingHeader
                  icon="calendar-number-outline"
                  title="Booking window"
                  description="How many calendar days into the future customers may book."
                />

                <NumericRuleField
                  value={form.bookingWindowDays}
                  suffix="days"
                  helper={bookingWindowHelper(
                    form.bookingWindowDays,
                  )}
                  range="Allowed range: 1–365 days."
                  disabled={isSaving}
                  onChangeText={(value) =>
                    updateField(
                      'bookingWindowDays',
                      value,
                    )
                  }
                />

                <View style={styles.simplePresetRow}>
                  {BOOKING_WINDOW_PRESETS.map(
                    (days) => {
                      const selected =
                        form.bookingWindowDays.trim() === String(days);

                      return (
                        <TouchableOpacity
                          key={days}
                          activeOpacity={0.78}
                          disabled={isSaving}
                          onPress={() =>
                            updateField(
                              'bookingWindowDays',
                              String(days),
                            )
                          }
                          style={[
                            styles.simplePresetButton,
                            selected && styles.simplePresetButtonSelected,
                            isSaving && styles.disabledButton,
                          ]}
                        >
                          <Text
                            style={[
                              styles.simplePresetText,
                              selected && styles.simplePresetTextSelected,
                            ]}
                          >
                            {days}d
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              </View>

              <SectionHeading
                title="Customer changes"
                subtitle="Set how close to the appointment customers can still cancel or request a reschedule."
              />

              <View style={styles.sectionCard}>
                <SettingHeader
                  icon="close-circle-outline"
                  title="Cancellation cutoff"
                  description="Minimum time before an appointment when a customer may still cancel."
                />

                <NumericRuleField
                  value={form.cancellationCutoffMinutes}
                  suffix="minutes"
                  helper={cutoffHelper(
                    form.cancellationCutoffMinutes,
                  )}
                  range="Allowed range: 0–10,080 minutes (7 days)."
                  disabled={isSaving}
                  onChangeText={(value) =>
                    updateField(
                      'cancellationCutoffMinutes',
                      value,
                    )
                  }
                />

                <PresetRow
                  values={CUTOFF_PRESETS}
                  currentValue={form.cancellationCutoffMinutes}
                  disabled={isSaving}
                  onSelect={(value) =>
                    updateField(
                      'cancellationCutoffMinutes',
                      String(value),
                    )
                  }
                />

                <View style={styles.sectionDivider} />

                <SettingHeader
                  icon="swap-horizontal-outline"
                  title="Reschedule cutoff"
                  description="Minimum time before an appointment when a customer may request a new schedule."
                />

                <NumericRuleField
                  value={form.rescheduleCutoffMinutes}
                  suffix="minutes"
                  helper={cutoffHelper(
                    form.rescheduleCutoffMinutes,
                  )}
                  range="Allowed range: 0–10,080 minutes (7 days)."
                  disabled={isSaving}
                  onChangeText={(value) =>
                    updateField(
                      'rescheduleCutoffMinutes',
                      value,
                    )
                  }
                />

                <PresetRow
                  values={CUTOFF_PRESETS}
                  currentValue={form.rescheduleCutoffMinutes}
                  disabled={isSaving}
                  onSelect={(value) =>
                    updateField(
                      'rescheduleCutoffMinutes',
                      String(value),
                    )
                  }
                />
              </View>

              <SectionHeading
                title="Policy preview"
                subtitle="A plain-English summary of what these settings mean before you save."
              />

              <View style={styles.previewCard}>
                <PreviewRow
                  icon="grid-outline"
                  title="Appointment start grid"
                  value={`Every ${form.slotIntervalMinutes} minutes`}
                />

                <View style={styles.previewDivider} />

                <PreviewRow
                  icon="hourglass-outline"
                  title="New booking notice"
                  value={leadTimeHelper(
                    form.minimumLeadTimeMinutes,
                  )}
                />

                <View style={styles.previewDivider} />

                <PreviewRow
                  icon="calendar-outline"
                  title="Advance booking"
                  value={bookingWindowHelper(
                    form.bookingWindowDays,
                  )}
                />

                <View style={styles.previewDivider} />

                <PreviewRow
                  icon="close-circle-outline"
                  title="Customer cancellation"
                  value={cutoffHelper(
                    form.cancellationCutoffMinutes,
                  )}
                />

                <View style={styles.previewDivider} />

                <PreviewRow
                  icon="swap-horizontal-outline"
                  title="Reschedule request"
                  value={cutoffHelper(
                    form.rescheduleCutoffMinutes,
                  )}
                />
              </View>

              <View style={styles.securityCard}>
                <View style={styles.securityIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={21}
                    color={COLORS.green}
                  />
                </View>

                <View style={styles.securityCopy}>
                  <Text style={styles.securityTitle}>
                    Server-enforced rules
                  </Text>

                  <Text style={styles.securityText}>
                    StyleHub rechecks the slot grid, lead time, booking window, and customer-change cutoffs on the Laravel server. Editing the mobile app cannot bypass these booking rules.
                  </Text>
                </View>
              </View>

              <View style={styles.saveCard}>
                <View style={styles.saveHeader}>
                  <View style={styles.saveIcon}>
                    <Ionicons
                      name={
                        isDirty
                          ? 'save-outline'
                          : 'checkmark-circle-outline'
                      }
                      size={20}
                      color={COLORS.navy}
                    />
                  </View>

                  <View style={styles.saveCopy}>
                    <Text style={styles.saveTitle}>
                      {!rules.is_customized
                        ? 'Activate shop-specific rules'
                        : isDirty
                          ? 'Save booking-rule changes'
                          : 'Booking rules are up to date'}
                    </Text>

                    <Text style={styles.saveText}>
                      {!rules.is_customized
                        ? 'Saving creates custom rules for this shop using the values shown above.'
                        : isDirty
                          ? 'The new settings only become active after they are saved successfully.'
                          : 'The form currently matches the rules already stored for this shop.'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={!canSave}
                  accessibilityRole="button"
                  accessibilityLabel="Save booking rules"
                  onPress={() => void saveRules()}
                  style={[
                    styles.primaryButton,
                    !canSave && styles.disabledButton,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Ionicons
                      name="save-outline"
                      size={19}
                      color={COLORS.white}
                    />
                  )}

                  <Text style={styles.primaryButtonText}>
                    {isSaving
                      ? 'Saving booking rules...'
                      : !rules.is_customized
                        ? 'Save as custom rules'
                        : isDirty
                          ? 'Save changes'
                          : 'Rules are up to date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

function OverviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.overviewItem}>
      <Text style={styles.overviewItemLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        style={styles.overviewItemValue}
      >
        {value}
      </Text>
    </View>
  );
}

function SettingHeader({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.settingHeader}>
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function NumericRuleField({
  value,
  suffix,
  helper,
  range,
  disabled,
  onChangeText,
}: {
  value: string;
  suffix: string;
  helper: string;
  range: string;
  disabled: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.numericField}>
      <View style={styles.inputShell}>
        <TextInput
          value={value}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="0"
          placeholderTextColor={COLORS.textLight}
          selectionColor={COLORS.navy}
          onChangeText={(nextValue) =>
            onChangeText(
              nextValue.replace(
                /[^0-9]/g,
                '',
              ),
            )
          }
          style={styles.numericInput}
        />

        <View style={styles.inputSuffix}>
          <Text style={styles.inputSuffixText}>
            {suffix}
          </Text>
        </View>
      </View>

      <View style={styles.helperRow}>
        <Ionicons
          name="information-circle-outline"
          size={15}
          color={COLORS.textLight}
        />

        <Text style={styles.helperText}>
          {helper}
        </Text>
      </View>

      <Text style={styles.rangeText}>
        {range}
      </Text>
    </View>
  );
}

function PresetRow({
  values,
  currentValue,
  disabled,
  onSelect,
}: {
  values: readonly {
    value: number;
    label: string;
  }[];
  currentValue: string;
  disabled: boolean;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.presetRow}>
      {values.map(
        (preset) => {
          const selected =
            currentValue.trim() === String(preset.value);

          return (
            <TouchableOpacity
              key={`${preset.value}-${preset.label}`}
              activeOpacity={0.78}
              disabled={disabled}
              onPress={() => onSelect(preset.value)}
              style={[
                styles.presetButton,
                selected && styles.presetButtonSelected,
                disabled && styles.disabledButton,
              ]}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  selected && styles.presetButtonTextSelected,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        },
      )}
    </View>
  );
}

function PreviewRow({
  icon,
  title,
  value,
}: {
  icon: IconName;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.previewRow}>
      <View style={styles.previewIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>
          {title}
        </Text>

        <Text style={styles.previewValue}>
          {value}
        </Text>
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
  const success = type === 'success';

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
              color:
                success
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
    maxWidth: 580,
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
    maxWidth: 340,
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

  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  overviewIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  modeBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  modeBadgeText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  overviewTitle: {
    marginTop: 17,
    color: COLORS.white,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  overviewText: {
    marginTop: 6,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  overviewStats: {
    marginTop: 17,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  overviewItem: {
    flex: 1,
    minWidth: 0,
  },

  overviewItemLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  overviewItemValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  overviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  unsavedCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  unsavedIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.orangeSoft,
  },

  unsavedCopy: {
    flex: 1,
    minWidth: 0,
  },

  unsavedTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  unsavedText: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  restoreButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  restoreButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
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

  sectionCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  settingCopy: {
    flex: 1,
  },

  settingTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  settingDescription: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  slotGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  slotButton: {
    width: '31%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  slotButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  slotButtonValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  slotButtonValueSelected: {
    color: COLORS.white,
  },

  slotButtonUnit: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  slotButtonUnitSelected: {
    color: '#D4DAE1',
  },

  ruleExplanation: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  ruleExplanationText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  sectionDivider: {
    height: 1,
    marginVertical: 20,
    backgroundColor: COLORS.border,
  },

  numericField: {
    marginTop: 14,
  },

  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  numericInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  inputSuffix: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    backgroundColor: COLORS.accentSoft,
  },

  inputSuffixText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  helperRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  helperText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  rangeText: {
    marginTop: 4,
    marginLeft: 21,
    color: COLORS.textLight,
    fontSize: 9,
  },

  presetRow: {
    marginTop: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  presetButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },

  presetButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  presetButtonText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  presetButtonTextSelected: {
    color: COLORS.white,
  },

  simplePresetRow: {
    marginTop: 11,
    flexDirection: 'row',
    gap: 7,
  },

  simplePresetButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  simplePresetButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  simplePresetText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  simplePresetTextSelected: {
    color: COLORS.white,
  },

  previewCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  previewRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  previewIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  previewCopy: {
    flex: 1,
    minWidth: 0,
  },

  previewTitle: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  previewValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  previewDivider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: COLORS.border,
  },

  securityCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.greenSoft,
  },

  securityIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  securityCopy: {
    flex: 1,
  },

  securityTitle: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  securityText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  saveCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  saveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  saveIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  saveCopy: {
    flex: 1,
  },

  saveTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  saveText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
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
    opacity: 0.48,
  },
});