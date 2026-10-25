
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  cancelShopOwnerAppointment,
  completeShopOwnerAppointment,
  confirmShopOwnerAppointment,
  declineShopOwnerAppointment,
  getShopOwnerAppointment,
} from '@/src/services/shop-owner-api';
import { markShopOwnerAppointmentNoShow } from '@/src/services/shop-owner-no-show-api';
import type {
  ShopOwnerAppointment,
  ShopOwnerAppointmentStatus,
} from '@/src/types/shop-owner';

type ReasonAction = 'decline' | 'cancel' | null;

type ConfirmationAction =
  | 'confirm'
  | 'complete'
  | 'no_show'
  | 'decline'
  | 'cancel'
  | null;

type IconName = ComponentProps<typeof Ionicons>['name'];

/* ==========================================================
   HELPERS
   ========================================================== */

function routeValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatPrice(value: string | number): string {
  const amount = Number(value);

  return Number.isNaN(amount)
    ? String(value)
    : `₱${amount.toFixed(2)}`;
}

function formatDate(value: string): string {
  const parts = value.split('-').map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => Number.isNaN(part))
  ) {
    return value;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hour24 = Number(match[1]);
  const minute = match[2];

  if (
    Number.isNaN(hour24) ||
    hour24 < 0 ||
    hour24 > 23
  ) {
    return value;
  }

  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute} ${period}`;
}

function formatTimestamp(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
}

function appointmentTimestamp(
  appointment: ShopOwnerAppointment,
  field: 'starts_at' | 'ends_at',
): number | null {
  const match = appointment[field].match(
    /^(\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!match) {
    return null;
  }

  const [, hour, minute, second = '00'] = match;

  const timestamp = Date.parse(
    `${appointment.appointment_date}T${hour}:${minute}:${second}+08:00`,
  );

  return Number.isFinite(timestamp) ? timestamp : null;
}

function appointmentHasStarted(
  appointment: ShopOwnerAppointment,
  nowMs: number,
): boolean {
  const start = appointmentTimestamp(appointment, 'starts_at');

  return start !== null && nowMs >= start;
}

function appointmentHasEnded(
  appointment: ShopOwnerAppointment,
  nowMs: number,
): boolean {
  const end = appointmentTimestamp(appointment, 'ends_at');

  return end !== null && nowMs >= end;
}

function statusPresentation(
  status: ShopOwnerAppointmentStatus,
): {
  background: string;
  text: string;
  icon: IconName;
} {
  switch (status) {
    case 'pending':
      return {
        background: COLORS.warningSoft,
        text: COLORS.warning,
        icon: 'time-outline',
      };

    case 'confirmed':
      return {
        background: COLORS.blueSoft,
        text: COLORS.blue,
        icon: 'checkmark-circle-outline',
      };

    case 'completed':
      return {
        background: COLORS.greenSoft,
        text: COLORS.green,
        icon: 'checkmark-done-outline',
      };

    case 'no_show':
      return {
        background: COLORS.orangeSoft,
        text: COLORS.orange,
        icon: 'person-remove-outline',
      };

    case 'cancelled':
      return {
        background: COLORS.dangerSoft,
        text: COLORS.danger,
        icon: 'close-circle-outline',
      };

    case 'declined':
      return {
        background: COLORS.dangerSoft,
        text: COLORS.danger,
        icon: 'remove-circle-outline',
      };
  }
}

/* ==========================================================
   SHOP OWNER APPOINTMENT DETAIL SCREEN
   ========================================================== */

export default function ShopOwnerAppointmentDetailScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string | string[];
  }>();

  const { token } = useAuth();

  const appointmentId = Number(
    routeValue(params.appointmentId),
  );

  const [appointment, setAppointment] =
    useState<ShopOwnerAppointment | null>(null);

  const [reasonAction, setReasonAction] =
    useState<ReasonAction>(null);

  const [reason, setReason] = useState('');

  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [successModalVisible, setSuccessModalVisible] =
    useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] =
    useState('');

  const [nowMs, setNowMs] = useState(Date.now());

  /* ========================================================
     LOAD APPOINTMENT
     ======================================================== */

  const loadAppointment = useCallback(async () => {
    if (
      !token ||
      !Number.isInteger(appointmentId) ||
      appointmentId < 1
    ) {
      setIsLoading(false);
      setErrorMessage('The selected appointment is invalid.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await getShopOwnerAppointment(
        token,
        appointmentId,
      );

      setAppointment(response.data.appointment);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load this appointment.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, token]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  /* ========================================================
     APPOINTMENT TIME TRACKING
     ======================================================== */

  useEffect(() => {
    setNowMs(Date.now());

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const isPending = appointment?.status === 'pending';
  const isConfirmed = appointment?.status === 'confirmed';

  const canMarkNoShow = useMemo(
    () =>
      Boolean(
        appointment &&
          isConfirmed &&
          appointmentHasStarted(appointment, nowMs),
      ),
    [appointment, isConfirmed, nowMs],
  );

  const canComplete = useMemo(
    () =>
      Boolean(
        appointment &&
          isConfirmed &&
          appointmentHasEnded(appointment, nowMs),
      ),
    [appointment, isConfirmed, nowMs],
  );

  /* ========================================================
     MODAL AND API ACTION HELPERS
     ======================================================== */

  function handleActionError(
    error: unknown,
    fallback: string,
  ) {
    setModalError(
      error instanceof ApiError ? error.message : fallback,
    );
  }

  async function reloadAfterAction(message: string) {
    setReason('');
    setReasonAction(null);
    setConfirmationAction(null);
    setModalError('');

    await loadAppointment();

    setActionSuccessMessage(message);
    setSuccessModalVisible(true);
  }

  function closeAppointmentModal() {
    if (isProcessing) {
      return;
    }

    if (successModalVisible) {
      setSuccessModalVisible(false);
      setActionSuccessMessage('');
      return;
    }

    if (confirmationAction !== null) {
      setConfirmationAction(null);
      setModalError('');
      return;
    }

    setReasonAction(null);
    setReason('');
    setModalError('');
  }

  /* ========================================================
     CONFIRM APPOINTMENT
     ======================================================== */

  function requestConfirmAppointment() {
    if (isProcessing) {
      return;
    }

    setErrorMessage('');
    setModalError('');
    setConfirmationAction('confirm');
  }

  async function performConfirm() {
    if (!token || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await confirmShopOwnerAppointment(
        token,
        appointmentId,
      );

      await reloadAfterAction(
        response.message ??
          'Appointment confirmed successfully.',
      );
    } catch (error) {
      handleActionError(
        error,
        'Unable to confirm the appointment.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /* ========================================================
     COMPLETE APPOINTMENT
     ======================================================== */

  function requestCompleteAppointment() {
    if (
      isProcessing ||
      !appointment ||
      !canComplete
    ) {
      setErrorMessage(
        'This appointment can only be completed at or after its scheduled ending time.',
      );
      return;
    }

    setErrorMessage('');
    setModalError('');
    setConfirmationAction('complete');
  }

  async function performComplete() {
    if (!token || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await completeShopOwnerAppointment(
        token,
        appointmentId,
      );

      await reloadAfterAction(
        response.message ??
          'Appointment completed successfully.',
      );
    } catch (error) {
      handleActionError(
        error,
        'Unable to complete the appointment.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /* ========================================================
     MARK AS NO-SHOW
     ======================================================== */

  function requestNoShowAppointment() {
    if (
      isProcessing ||
      !appointment ||
      appointment.status !== 'confirmed'
    ) {
      return;
    }

    const currentNow = Date.now();
    setNowMs(currentNow);

    if (!appointmentHasStarted(appointment, currentNow)) {
      setErrorMessage(
        'This appointment can only be marked as a no-show at or after its scheduled start time.',
      );
      return;
    }

    setErrorMessage('');
    setModalError('');
    setConfirmationAction('no_show');
  }

  async function performNoShow() {
    if (!token || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await markShopOwnerAppointmentNoShow(
        token,
        appointmentId,
      );

      await reloadAfterAction(
        response.message ??
          'Appointment marked as no-show successfully.',
      );
    } catch (error) {
      handleActionError(
        error,
        'Unable to mark the appointment as no-show.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /* ========================================================
     DECLINE / CANCEL REASONS
     ======================================================== */

  function openReasonAction(
    action: Exclude<ReasonAction, null>,
  ) {
    if (isProcessing) {
      return;
    }

    setReason('');
    setReasonAction(action);
    setErrorMessage('');
    setModalError('');
  }

  function closeReasonAction() {
    if (isProcessing) {
      return;
    }

    setReasonAction(null);
    setReason('');
    setErrorMessage('');
    setModalError('');
  }

  function requestReasonActionConfirmation() {
    if (!reasonAction || isProcessing) {
      return;
    }

    const cleanReason = reason.trim();

    if (
      cleanReason.length < 5 ||
      cleanReason.length > 1000
    ) {
      setModalError(
        'Reason must contain between 5 and 1000 characters.',
      );
      return;
    }

    setModalError('');
    setConfirmationAction(reasonAction);
  }

  /* ========================================================
     DECLINE APPOINTMENT
     ======================================================== */

  async function performDecline() {
    if (!token || isProcessing) {
      return;
    }

    const cleanReason = reason.trim();

    if (
      cleanReason.length < 5 ||
      cleanReason.length > 1000
    ) {
      setConfirmationAction(null);
      setModalError(
        'Reason must contain between 5 and 1000 characters.',
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await declineShopOwnerAppointment(
        token,
        appointmentId,
        cleanReason,
      );

      await reloadAfterAction(
        response.message ??
          'Appointment declined successfully.',
      );
    } catch (error) {
      handleActionError(
        error,
        'Unable to decline the appointment.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /* ========================================================
     CANCEL APPOINTMENT
     ======================================================== */

  async function performCancel() {
    if (!token || isProcessing) {
      return;
    }

    const cleanReason = reason.trim();

    if (
      cleanReason.length < 5 ||
      cleanReason.length > 1000
    ) {
      setConfirmationAction(null);
      setModalError(
        'Reason must contain between 5 and 1000 characters.',
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await cancelShopOwnerAppointment(
        token,
        appointmentId,
        cleanReason,
      );

      await reloadAfterAction(
        response.message ??
          'Appointment cancelled successfully.',
      );
    } catch (error) {
      handleActionError(
        error,
        'Unable to cancel the appointment.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /* ========================================================
     PERFORM CONFIRMED ACTION
     ======================================================== */

  async function performConfirmedAction() {
    switch (confirmationAction) {
      case 'confirm':
        await performConfirm();
        return;

      case 'complete':
        await performComplete();
        return;

      case 'no_show':
        await performNoShow();
        return;

      case 'decline':
        await performDecline();
        return;

      case 'cancel':
        await performCancel();
        return;

      default:
        return;
    }
  }

  /* ========================================================
     CONFIRMATION MODAL CONTENT
     ======================================================== */

  function getConfirmationContent(): {
    icon: IconName;
    title: string;
    description: string;
    buttonText: string;
    destructive: boolean;
  } {
    switch (confirmationAction) {
      case 'confirm':
        return {
          icon: 'checkmark-circle-outline',
          title: 'Confirm appointment?',
          description:
            'This booking will move to Confirmed and the customer can prepare for the scheduled visit.',
          buttonText: 'Confirm appointment',
          destructive: false,
        };

      case 'complete':
        return {
          icon: 'checkmark-done-outline',
          title: 'Complete appointment?',
          description:
            'Use this after the service has finished. This updates the booking to Completed.',
          buttonText: 'Mark as completed',
          destructive: false,
        };

      case 'no_show':
        return {
          icon: 'person-remove-outline',
          title: 'Mark as no-show?',
          description:
            'Use this only when the customer did not arrive. This is a final appointment status.',
          buttonText: 'Mark as no-show',
          destructive: false,
        };

      case 'decline':
        return {
          icon: 'close-circle-outline',
          title: 'Decline request?',
          description:
            'The appointment request will be declined and the customer will see the reason you provided.',
          buttonText: 'Decline appointment',
          destructive: true,
        };

      case 'cancel':
        return {
          icon: 'close-circle-outline',
          title: 'Cancel appointment?',
          description:
            'This confirmed booking will be cancelled and the customer will see your cancellation reason.',
          buttonText: 'Cancel appointment',
          destructive: true,
        };

      default:
        return {
          icon: 'help-circle-outline',
          title: 'Confirm action',
          description: 'Are you sure you want to continue?',
          buttonText: 'Continue',
          destructive: false,
        };
    }
  }

  /* ========================================================
     LOADING STATE
     ======================================================== */

  if (isLoading) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
          translucent={false}
        />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          </View>

          <Text style={styles.loadingTitle}>
            Loading booking
          </Text>

          <Text style={styles.loadingText}>
            Getting the latest appointment details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ========================================================
     UNAVAILABLE APPOINTMENT
     ======================================================== */

  if (!appointment) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
          translucent={false}
        />

        <View style={styles.unavailableContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.topIconButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.unavailableContent}>
            <View style={styles.unavailableIcon}>
              <Ionicons
                name="calendar-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.unavailableTitle}>
              Appointment unavailable
            </Text>

            <Text style={styles.unavailableText}>
              {errorMessage ||
                'Unable to display this appointment.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ========================================================
     DISPLAY DATA
     ======================================================== */

  const status = statusPresentation(appointment.status);
  const confirmation = getConfirmationContent();

  const noShowMarkedAt = formatTimestamp(
    appointment.no_show_at,
  );

  const customerName =
    appointment.customer?.full_name?.trim() || 'Customer';

  const customerInitial = customerName
    .charAt(0)
    .toUpperCase();

  /* ========================================================
     MAIN SCREEN
     ======================================================== */

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        {/* TOP BAR */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.topIconButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Booking details
            </Text>

            <Text style={styles.topBarCaption}>
              Appointment #{appointment.id}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh appointment"
            style={styles.topIconButton}
            onPress={() => void loadAppointment()}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* BOOKING SUMMARY */}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroServiceIcon}>
              <Ionicons
                name="cut-outline"
                size={23}
                color={COLORS.white}
              />
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: status.background,
                },
              ]}
            >
              <Ionicons
                name={status.icon}
                size={14}
                color={status.text}
              />

              <Text
                style={[
                  styles.statusText,
                  { color: status.text },
                ]}
              >
                {appointment.status_label}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceName}>
            {appointment.service_snapshot.name}
          </Text>

          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPrice}>
              {formatPrice(
                appointment.service_snapshot.price,
              )}
            </Text>

            <View style={styles.heroPriceDot} />

            <Text style={styles.heroDuration}>
              {appointment.service_snapshot.duration_minutes}{' '}
              min
            </Text>
          </View>

          <View style={styles.schedulePanel}>
            <ScheduleItem
              icon="calendar-clear-outline"
              label="Date"
              value={formatDate(
                appointment.appointment_date,
              )}
            />

            <View style={styles.scheduleDivider} />

            <ScheduleItem
              icon="time-outline"
              label="Time"
              value={`${formatTime(
                appointment.starts_at,
              )} – ${formatTime(appointment.ends_at)}`}
            />
          </View>
        </View>

        {/* ERROR */}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Action needs attention
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {/* CUSTOMER INFORMATION */}

        <SectionHeader
          title="Customer"
          subtitle="Booking contact information"
        />

        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitial}>
                {customerInitial}
              </Text>
            </View>

            <View style={styles.customerIdentity}>
              <Text
                style={styles.customerName}
                numberOfLines={1}
              >
                {customerName}
              </Text>

              <Text style={styles.customerLabel}>
                StyleHub customer
              </Text>
            </View>
          </View>

          <View style={styles.contactDivider} />

          <ContactRow
            icon="mail-outline"
            label="Email"
            value={
              appointment.customer?.email ?? 'Unavailable'
            }
          />

          <ContactRow
            icon="call-outline"
            label="Mobile number"
            value={
              appointment.customer?.phone_number ??
              'Unavailable'
            }
          />
        </View>

        {/* CUSTOMER NOTES */}

        {appointment.notes ? (
          <>
            <SectionHeader
              title="Customer notes"
              subtitle="Special request added during booking"
            />

            <View style={styles.notesCard}>
              <View style={styles.notesIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.notesText}>
                {appointment.notes}
              </Text>
            </View>
          </>
        ) : null}

        {/* CANCELLATION / DECLINE HISTORY */}

        {appointment.cancellation_reason ? (
          <>
            <SectionHeader
              title="Booking history"
              subtitle="Reason recorded for this appointment"
            />

            <View style={styles.historyDangerCard}>
              <View style={styles.historyDangerIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.historyContent}>
                <Text style={styles.historyDangerTitle}>
                  {appointment.status === 'declined'
                    ? 'Appointment declined'
                    : 'Appointment cancelled'}
                </Text>

                <Text style={styles.historyText}>
                  {appointment.cancellation_reason}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {/* NO-SHOW HISTORY */}

        {appointment.status === 'no_show' ? (
          <>
            <SectionHeader
              title="Booking history"
              subtitle="Final status information"
            />

            <View style={styles.noShowHistoryCard}>
              <View style={styles.noShowHistoryIcon}>
                <Ionicons
                  name="person-remove-outline"
                  size={20}
                  color={COLORS.orange}
                />
              </View>

              <View style={styles.historyContent}>
                <Text style={styles.noShowHistoryTitle}>
                  Customer marked as no-show
                </Text>

                <Text style={styles.historyText}>
                  This booking has reached a final status
                  and no longer blocks the scheduled slot.
                </Text>

                {noShowMarkedAt ? (
                  <Text style={styles.historyTimestamp}>
                    Marked {noShowMarkedAt}
                  </Text>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        {/* PENDING ACTIONS */}

        {isPending ? (
          <>
            <SectionHeader
              title="Manage request"
              subtitle="Review this new customer booking"
            />

            <View style={styles.actionCard}>
              <View style={styles.actionHeader}>
                <View style={styles.actionHeaderIcon}>
                  <Ionicons
                    name="hourglass-outline"
                    size={20}
                    color={COLORS.warning}
                  />
                </View>

                <View style={styles.actionHeaderContent}>
                  <Text style={styles.actionHeaderTitle}>
                    Waiting for your decision
                  </Text>

                  <Text style={styles.actionHeaderText}>
                    Confirm the booking if you can
                    accommodate the customer at this date
                    and time.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={isProcessing}
                style={[
                  styles.primaryButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={requestConfirmAppointment}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={COLORS.white}
                />

                <Text style={styles.primaryButtonText}>
                  Confirm appointment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={isProcessing}
                style={[
                  styles.dangerOutlineButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={() => openReasonAction('decline')}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={19}
                  color={COLORS.danger}
                />

                <Text style={styles.dangerOutlineText}>
                  Decline request
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* CONFIRMED ACTIONS */}

        {isConfirmed ? (
          <>
            <SectionHeader
              title="Manage appointment"
              subtitle="Update the visit as the schedule progresses"
            />

            <View style={styles.actionCard}>
              <ActionRow
                icon="checkmark-done-outline"
                title="Complete service"
                description={
                  canComplete
                    ? 'The scheduled service has ended and can now be completed.'
                    : 'Available at the scheduled ending time.'
                }
                disabled={isProcessing || !canComplete}
                onPress={requestCompleteAppointment}
              />

              <View style={styles.actionRowDivider} />

              <ActionRow
                icon="person-remove-outline"
                title="Mark as no-show"
                description={
                  canMarkNoShow
                    ? 'Use only if the customer did not arrive.'
                    : 'Available at the scheduled start time.'
                }
                tone="orange"
                disabled={isProcessing || !canMarkNoShow}
                onPress={requestNoShowAppointment}
              />

              <View style={styles.actionRowDivider} />

              <ActionRow
                icon="close-circle-outline"
                title="Cancel appointment"
                description="Cancel this confirmed booking and provide a reason."
                tone="danger"
                disabled={isProcessing}
                onPress={() => openReasonAction('cancel')}
              />
            </View>
          </>
        ) : null}

        {/* FINAL STATUS */}

        {!isPending && !isConfirmed ? (
          <View style={styles.finalStatusCard}>
            <Ionicons
              name={status.icon}
              size={22}
              color={status.text}
            />

            <View style={styles.finalStatusContent}>
              <Text style={styles.finalStatusTitle}>
                No further action required
              </Text>

              <Text style={styles.finalStatusText}>
                This appointment is currently{' '}
                {appointment.status_label.toLowerCase()} and
                no longer needs an active booking decision.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* ==================================================
          SHARED COMPACT STYLEHUB MODAL
          ================================================== */}

      <StyleHubModal
        visible={
          reasonAction !== null ||
          confirmationAction !== null ||
          successModalVisible
        }
        onClose={closeAppointmentModal}
        dismissOnBackdrop={false}
        title={
          successModalVisible
            ? 'Appointment updated'
            : confirmationAction !== null
              ? confirmation.title
              : reasonAction === 'decline'
                ? 'Decline appointment?'
                : 'Cancel appointment?'
        }
        message={
          successModalVisible
            ? actionSuccessMessage
            : confirmationAction !== null
              ? confirmation.description
              : 'Please provide a reason. The customer will be able to see it.'
        }
        tone={
          successModalVisible
            ? 'success'
            : confirmationAction === 'no_show'
              ? 'warning'
              : confirmationAction === 'confirm' ||
                  confirmationAction === 'complete'
                ? 'info'
                : 'danger'
        }
        icon={
          successModalVisible
            ? 'checkmark-circle-outline'
            : confirmationAction !== null
              ? confirmation.icon
              : 'document-text-outline'
        }
        actions={
          successModalVisible
            ? [
                {
                  label: 'Done',
                  variant: 'primary',
                  onPress: closeAppointmentModal,
                },
              ]
            : confirmationAction !== null
              ? [
                  {
                    label: reasonAction
                      ? 'Edit reason'
                      : 'Go back',
                    variant: 'secondary',
                    onPress: closeAppointmentModal,
                  },
                  {
                    label: confirmation.buttonText,
                    variant: confirmation.destructive
                      ? 'danger'
                      : 'primary',
                    icon: confirmation.icon,
                    loading: isProcessing,
                    onPress: () =>
                      void performConfirmedAction(),
                  },
                ]
              : reasonAction !== null
                ? [
                    {
                      label: 'Keep booking',
                      variant: 'secondary',
                      onPress: closeReasonAction,
                    },
                    {
                      label: 'Continue',
                      variant: 'danger',
                      icon: 'arrow-forward-outline',
                      disabled: reason.trim().length < 5,
                      onPress: requestReasonActionConfirmation,
                    },
                  ]
                : []
        }
      >
        {/* REASON ENTRY */}

        {reasonAction !== null &&
        confirmationAction === null &&
        !successModalVisible ? (
          <View style={styles.modalReasonForm}>
            <Text style={styles.modalReasonLabel}>
              {reasonAction === 'decline'
                ? 'Reason for declining'
                : 'Reason for cancelling'}{' '}
              <Text style={styles.modalRequired}>
                *
              </Text>
            </Text>

            <TextInput
              value={reason}
              onChangeText={(value) => {
                setReason(value);
                if (modalError) {
                  setModalError('');
                }
              }}
              editable={!isProcessing}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              placeholder={
                reasonAction === 'decline'
                  ? 'Why can’t your shop accept this booking?'
                  : 'Why do you need to cancel?'
              }
              placeholderTextColor={COLORS.textLight}
              selectionColor={COLORS.navy}
              style={styles.modalReasonInput}
              accessibilityLabel="Reason for appointment action"
            />

            <View style={styles.modalReasonMeta}>
              <Text style={styles.modalReasonHint}>
                Minimum 5 characters
              </Text>

              <Text style={styles.modalReasonHint}>
                {reason.length}/1000
              </Text>
            </View>
          </View>
        ) : null}

        {/* FINAL REASON PREVIEW */}

        {!successModalVisible &&
        confirmationAction !== null &&
        (confirmationAction === 'decline' ||
          confirmationAction === 'cancel') ? (
          <View style={styles.modalReasonPreview}>
            <Text style={styles.modalReasonPreviewLabel}>
              Your reason
            </Text>

            <Text style={styles.modalReasonPreviewText}>
              {reason.trim()}
            </Text>
          </View>
        ) : null}

        {/* LARAVEL ERRORS INSIDE THE MODAL */}

        {!successModalVisible && modalError ? (
          <View style={styles.modalErrorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={COLORS.danger}
            />

            <Text style={styles.modalErrorText}>
              {modalError}
            </Text>
          </View>
        ) : null}
      </StyleHubModal>
    </SafeAreaView>
  );
}

/* ==========================================================
   REUSABLE SECTION HEADER
   ========================================================== */

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

/* ==========================================================
   SCHEDULE ITEM
   ========================================================== */

function ScheduleItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.scheduleItem}>
      <View style={styles.scheduleIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.white}
        />
      </View>

      <View style={styles.scheduleTextBlock}>
        <Text style={styles.scheduleLabel}>
          {label}
        </Text>

        <Text
          style={styles.scheduleValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================
   CONTACT ROW
   ========================================================== */

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.contactContent}>
        <Text style={styles.contactLabel}>
          {label}
        </Text>

        <Text
          style={styles.contactValue}
          selectable
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================
   ACTION ROW
   ========================================================== */

function ActionRow({
  icon,
  title,
  description,
  tone = 'default',
  disabled,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  tone?: 'default' | 'orange' | 'danger';
  disabled: boolean;
  onPress: () => void;
}) {
  const iconColor =
    tone === 'danger'
      ? COLORS.danger
      : tone === 'orange'
        ? COLORS.orange
        : COLORS.navy;

  const iconBackground =
    tone === 'danger'
      ? COLORS.dangerSoft
      : tone === 'orange'
        ? COLORS.orangeSoft
        : COLORS.accentSoft;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={disabled}
      style={[
        styles.actionRow,
        disabled && styles.actionRowDisabled,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.actionRowIcon,
          { backgroundColor: iconBackground },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <View style={styles.actionRowContent}>
        <Text
          style={[
            styles.actionRowTitle,
            tone === 'danger' &&
              styles.actionRowTitleDanger,
            tone === 'orange' &&
              styles.actionRowTitleOrange,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionRowDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          disabled ? COLORS.textLight : iconColor
        }
      />
    </TouchableOpacity>
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

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
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

  heroCard: {
    marginTop: SPACING.lg,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  heroServiceIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.navyMuted,
  },

  statusBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  statusText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  serviceName: {
    marginTop: 18,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  heroPriceRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  heroPrice: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  heroPriceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textLight,
  },

  heroDuration: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  schedulePanel: {
    marginTop: 18,
    flexDirection: 'row',
    padding: 13,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.navySoft,
  },

  scheduleItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  scheduleIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.navyMuted,
  },

  scheduleTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  scheduleLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  scheduleValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '700',
  },

  scheduleDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  errorBox: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  sectionHeader: {
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

  customerCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  customerAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary,
  },

  customerInitial: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },

  customerIdentity: {
    flex: 1,
    minWidth: 0,
  },

  customerName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  customerLabel: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  contactDivider: {
    height: 1,
    marginVertical: 15,
    backgroundColor: COLORS.border,
  },

  contactRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  contactIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
  },

  contactContent: {
    flex: 1,
    minWidth: 0,
  },

  contactLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  contactValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    fontWeight: '700',
  },

  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  notesIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  notesText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  historyDangerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.dangerSoft,
  },

  historyDangerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  historyContent: {
    flex: 1,
  },

  historyDangerTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  historyText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  noShowHistoryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.orangeSoft,
  },

  noShowHistoryIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  noShowHistoryTitle: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  historyTimestamp: {
    marginTop: 7,
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  actionCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 16,
  },

  actionHeaderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.warningSoft,
  },

  actionHeaderContent: {
    flex: 1,
  },

  actionHeaderTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  actionHeaderText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  primaryButton: {
    minHeight: LAYOUT.buttonHeight,
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

  dangerOutlineButton: {
    minHeight: LAYOUT.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  dangerOutlineText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.5,
  },

  actionRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  actionRowDisabled: {
    opacity: 0.48,
  },

  actionRowIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  actionRowContent: {
    flex: 1,
  },

  actionRowTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  actionRowTitleDanger: {
    color: COLORS.danger,
  },

  actionRowTitleOrange: {
    color: COLORS.orange,
  },

  actionRowDescription: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  actionRowDivider: {
    height: 1,
    marginLeft: 53,
    backgroundColor: COLORS.border,
  },

  finalStatusCard: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  finalStatusContent: {
    flex: 1,
  },

  finalStatusTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  finalStatusText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* SHARED MODAL CONTENT */

  modalReasonForm: {
    width: '100%',
  },

  modalReasonLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  modalRequired: {
    color: COLORS.danger,
  },

  modalReasonInput: {
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
  },

  modalReasonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  modalReasonHint: {
    color: COLORS.textMuted,
    fontSize: 10,
  },

  modalReasonPreview: {
    width: '100%',
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  modalReasonPreviewLabel: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: '700',
  },

  modalReasonPreviewText: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },

  modalErrorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  modalErrorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },

  loadingTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  loadingText: {
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    textAlign: 'center',
  },

  /* UNAVAILABLE */

  unavailableContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
  },

  unavailableContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 70,
  },

  unavailableIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
  },

  unavailableTitle: {
    marginTop: 15,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },

  unavailableText: {
    maxWidth: 300,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },
});
