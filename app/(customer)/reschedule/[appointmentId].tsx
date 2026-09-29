import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  cancelCustomerAppointment,
  createCustomerRescheduleRequest,
  getCustomerAppointment,
} from '@/src/services/customer-api';
import type { CustomerAppointment } from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    }).format(date);
  } catch {
    return value;
  }
}

function formatTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hour24 = Number(match[1]);
  const minute = match[2];

  if (
    Number.isNaN(hour24)
    || hour24 < 0
    || hour24 > 23
  ) {
    return value;
  }

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

function appointmentStatusPresentation(
  status: CustomerAppointment['status'],
): {
  icon: IconName;
  color: string;
  background: string;
} {
  switch (status) {
    case 'confirmed':
      return {
        icon: 'checkmark-circle-outline',
        color: COLORS.green,
        background: COLORS.greenSoft,
      };

    case 'pending':
      return {
        icon: 'time-outline',
        color: COLORS.warning,
        background: COLORS.warningSoft,
      };

    case 'completed':
      return {
        icon: 'checkmark-done-outline',
        color: COLORS.blue,
        background: COLORS.blueSoft,
      };

    case 'cancelled':
    case 'declined':
    default:
      return {
        icon: 'close-circle-outline',
        color: COLORS.danger,
        background: COLORS.dangerSoft,
      };
  }
}

function requestedSchedulePreview(
  requestedDate: string,
  requestedStartsAt: string,
): {
  date: string;
  time: string;
} {
  const cleanDate = requestedDate.trim();
  const cleanTime = requestedStartsAt.trim();

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(cleanDate)
      ? formatDate(cleanDate)
      : 'Enter YYYY-MM-DD',

    time: /^\d{2}:\d{2}$/.test(cleanTime)
      ? formatTime(cleanTime)
      : 'Enter HH:MM',
  };
}

export default function CustomerRescheduleScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string | string[];
  }>();

  const { token } = useAuth();

  const appointmentId = Number(
    getRouteValue(params.appointmentId),
  );

  const [
    appointment,
    setAppointment,
  ] = useState<CustomerAppointment | null>(null);

  const [
    requestedDate,
    setRequestedDate,
  ] = useState('');

  const [
    requestedStartsAt,
    setRequestedStartsAt,
  ] = useState('');

  const [
    reason,
    setReason,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isCancelling,
    setIsCancelling,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successVisible,
    setSuccessVisible,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState(
    'Your reschedule request was submitted successfully.',
  );

  const [
    submittedRequestId,
    setSubmittedRequestId,
  ] = useState<number | null>(null);

  const [
    cancelModalVisible,
    setCancelModalVisible,
  ] = useState(false);

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState('');

  const [
    cancelSuccessVisible,
    setCancelSuccessVisible,
  ] = useState(false);

  const [
    cancelSuccessMessage,
    setCancelSuccessMessage,
  ] = useState(
    'Your appointment was cancelled successfully.',
  );

  const loadAppointment = useCallback(
    async (): Promise<void> => {
      if (
        !token
        || !Number.isInteger(appointmentId)
        || appointmentId < 1
      ) {
        setIsLoading(false);
        setErrorMessage(
          'The selected appointment is invalid.',
        );

        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const response =
          await getCustomerAppointment(
            token,
            appointmentId,
          );

        setAppointment(
          response.data.appointment,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load the appointment.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      appointmentId,
      token,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAppointment();

      return undefined;
    }, [loadAppointment]),
  );

  const canRequest =
    appointment?.status === 'pending'
    || appointment?.status === 'confirmed';

  const appointmentStatus =
    appointment
      ? appointmentStatusPresentation(
          appointment.status,
        )
      : null;

  const preview = useMemo(
    () =>
      requestedSchedulePreview(
        requestedDate,
        requestedStartsAt,
      ),
    [
      requestedDate,
      requestedStartsAt,
    ],
  );

  const hasDraft = Boolean(
    requestedDate.trim()
    || requestedStartsAt.trim()
    || reason.trim(),
  );

  function resetForm(): void {
    setRequestedDate('');
    setRequestedStartsAt('');
    setReason('');
    setErrorMessage('');
  }

  async function handleSubmit(): Promise<void> {
    if (
      !token
      || !appointment
      || isSubmitting
      || isCancelling
    ) {
      return;
    }

    setErrorMessage('');

    const cleanRequestedDate =
      requestedDate.trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        cleanRequestedDate,
      )
    ) {
      setErrorMessage(
        'Enter the requested date as YYYY-MM-DD.',
      );

      return;
    }

    const cleanRequestedStartsAt =
      requestedStartsAt.trim();

    if (
      !/^\d{2}:\d{2}$/.test(
        cleanRequestedStartsAt,
      )
    ) {
      setErrorMessage(
        'Enter the requested start time as HH:MM.',
      );

      return;
    }

    const cleanReason =
      reason.trim();

    if (
      cleanReason.length > 1000
    ) {
      setErrorMessage(
        'The reason may not exceed 1000 characters.',
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await createCustomerRescheduleRequest(
          token,
          appointment.id,
          {
            requestedDate:
              cleanRequestedDate,

            requestedStartsAt:
              cleanRequestedStartsAt,

            reason:
              cleanReason,
          },
        );

      const requestId =
        response.data.reschedule_request.id;

      setSubmittedRequestId(
        requestId,
      );

      setSuccessMessage(
        response.message
        ?? 'Your reschedule request was submitted successfully.',
      );

      resetForm();

      setSuccessVisible(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to submit the reschedule request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleViewRequest(): void {
    if (!submittedRequestId) {
      return;
    }

    setSuccessVisible(false);

    router.replace({
      pathname:
        '/(customer)/reschedule-requests/[requestId]',

      params: {
        requestId:
          String(submittedRequestId),
      },
    });
  }

  function handleDone(): void {
    setSuccessVisible(false);

    router.replace({
      pathname:
        '/(customer)/customer-appointment/[appointmentId]',

      params: {
        appointmentId:
          String(appointmentId),
      },
    });
  }

  function openCancelModal(): void {
    if (
      !appointment
      || !canRequest
      || isSubmitting
      || isCancelling
    ) {
      return;
    }

    setErrorMessage('');
    setCancellationReason('');
    setCancelModalVisible(true);
  }

  function closeCancelModal(): void {
    if (isCancelling) {
      return;
    }

    setCancelModalVisible(false);
    setCancellationReason('');
  }

  async function handleCancelAppointment(): Promise<void> {
    if (
      !token
      || !appointment
      || isCancelling
    ) {
      return;
    }

    const cleanReason =
      cancellationReason.trim();

    if (
      cleanReason.length < 5
    ) {
      setErrorMessage(
        'Cancellation reason must contain at least 5 characters.',
      );

      return;
    }

    if (
      cleanReason.length > 1000
    ) {
      setErrorMessage(
        'Cancellation reason may not exceed 1000 characters.',
      );

      return;
    }

    setIsCancelling(true);
    setErrorMessage('');

    try {
      const response =
        await cancelCustomerAppointment(
          token,
          appointment.id,
          cleanReason,
        );

      setAppointment(
        response.data.appointment,
      );

      setCancelModalVisible(false);
      setCancellationReason('');

      setCancelSuccessMessage(
        response.message
        ?? 'Your appointment was cancelled successfully.',
      );

      setCancelSuccessVisible(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to cancel the appointment.',
      );
    } finally {
      setIsCancelling(false);
    }
  }

  function handleViewBookings(): void {
    setCancelSuccessVisible(false);

    router.replace(
      '/(customer)/customer/appointments',
    );
  }

  if (
    isLoading
    && !appointment
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={styles.loadingContainer}
        >
          <View
            style={styles.loadingIcon}
          >
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          </View>

          <Text
            style={styles.loadingTitle}
          >
            Preparing reschedule request
          </Text>

          <Text
            style={styles.loadingText}
          >
            Getting the latest appointment
            schedule and status.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={styles.unavailableContainer}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.topIconButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View
            style={styles.unavailableContent}
          >
            <View
              style={styles.unavailableIcon}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.unavailableTitle}
            >
              Reschedule unavailable
            </Text>

            <Text
              style={styles.unavailableText}
            >
              {errorMessage
                || 'Unable to display this appointment.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.container
          }
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={
                isSubmitting
                || isCancelling
              }
              onPress={() => router.back()}
              style={styles.topIconButton}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.navy}
              />
            </TouchableOpacity>

            <View
              style={styles.topBarTitleBlock}
            >
              <Text
                style={styles.topBarTitle}
              >
                Request reschedule
              </Text>

              <Text
                style={styles.topBarCaption}
              >
                Appointment #{appointment.id}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open reschedule requests"
              disabled={
                isSubmitting
                || isCancelling
              }
              onPress={() =>
                router.push(
                  '/(customer)/reschedule-requests',
                )
              }
              style={styles.topIconButton}
            >
              <Ionicons
                name="documents-outline"
                size={21}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              SCHEDULE CHANGE
            </Text>

            <Text style={styles.title}>
              Ask the shop to move your
              appointment to a new schedule
            </Text>

            <Text style={styles.subtitle}>
              Your current appointment stays
              unchanged until the Shop Owner
              approves this request. Laravel
              still validates the requested
              date, time, conflicts, operating
              hours, and booking rules.
            </Text>
          </View>

          {errorMessage ? (
            <MessageBox
              title="Request needs attention"
              message={errorMessage}
            />
          ) : null}

          <View style={styles.currentCard}>
            <View
              style={styles.currentTopRow}
            >
              <View
                style={styles.currentIcon}
              >
                <Ionicons
                  name={
                    appointment.shop?.type
                    === 'barber_shop'
                      ? 'cut-outline'
                      : 'sparkles-outline'
                  }
                  size={23}
                  color={COLORS.white}
                />
              </View>

              {appointmentStatus ? (
                <View
                  style={[
                    styles.currentStatusBadge,
                    {
                      backgroundColor:
                        appointmentStatus.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      appointmentStatus.icon
                    }
                    size={14}
                    color={
                      appointmentStatus.color
                    }
                  />

                  <Text
                    style={[
                      styles.currentStatusText,
                      {
                        color:
                          appointmentStatus.color,
                      },
                    ]}
                  >
                    {appointment.status_label}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={styles.currentService}
            >
              {
                appointment
                  .service_snapshot
                  .name
              }
            </Text>

            <Text style={styles.currentShop}>
              {
                appointment.shop?.name
                ?? 'StyleHub Shop'
              }
            </Text>

            <View
              style={styles.currentDetails}
            >
              <ScheduleSummary
                label="Current date"
                value={formatDate(
                  appointment.appointment_date,
                )}
              />

              <View
                style={styles.currentDivider}
              />

              <ScheduleSummary
                label="Current time"
                value={`${formatTime(
                  appointment.starts_at,
                )} – ${formatTime(
                  appointment.ends_at,
                )}`}
              />
            </View>
          </View>

          {!canRequest ? (
            <View style={styles.warningCard}>
              <View
                style={styles.warningIcon}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={COLORS.warning}
                />
              </View>

              <View
                style={styles.warningCopy}
              >
                <Text
                  style={styles.warningTitle}
                >
                  Reschedule request unavailable
                </Text>

                <Text
                  style={styles.warningText}
                >
                  Only pending or confirmed
                  appointments can request a new
                  schedule. The backend will also
                  enforce the shop&apos;s
                  reschedule cutoff.
                </Text>
              </View>
            </View>
          ) : null}

          <SectionHeading
            title="Requested schedule"
            subtitle="Enter the date and start time you want the Shop Owner to review."
          />

          <View style={styles.formCard}>
            <FieldHeader
              icon="calendar-outline"
              title="Requested date"
              description="Use the exact YYYY-MM-DD format expected by the existing API."
            />

            <TextInput
              value={requestedDate}
              onChangeText={setRequestedDate}
              editable={
                canRequest
                && !isSubmitting
                && !isCancelling
              }
              maxLength={10}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={
                COLORS.textLight
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              selectionColor={COLORS.navy}
              style={styles.input}
            />

            <View
              style={styles.formDivider}
            />

            <FieldHeader
              icon="time-outline"
              title="Requested start time"
              description="Use 24-hour HH:MM format, such as 14:30 for 2:30 PM."
            />

            <TextInput
              value={requestedStartsAt}
              onChangeText={
                setRequestedStartsAt
              }
              editable={
                canRequest
                && !isSubmitting
                && !isCancelling
              }
              maxLength={5}
              placeholder="HH:MM"
              placeholderTextColor={
                COLORS.textLight
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              selectionColor={COLORS.navy}
              style={styles.input}
            />

            <View
              style={styles.formDivider}
            />

            <FieldHeader
              icon="chatbubble-ellipses-outline"
              title="Reason"
              description="Optional. Give the shop useful context for your requested change."
            />

            <TextInput
              value={reason}
              onChangeText={setReason}
              editable={
                canRequest
                && !isSubmitting
                && !isCancelling
              }
              maxLength={1000}
              multiline
              textAlignVertical="top"
              placeholder="Example: I have a class at the original time and would prefer a later appointment."
              placeholderTextColor={
                COLORS.textLight
              }
              selectionColor={COLORS.navy}
              style={[
                styles.input,
                styles.reasonInput,
              ]}
            />

            <Text
              style={styles.counterText}
            >
              {reason.length}/1000
            </Text>
          </View>

          <SectionHeading
            title="Request preview"
            subtitle="Review what will be sent before submitting."
          />

          <View style={styles.previewCard}>
            <PreviewRow
              icon="calendar-outline"
              label="New date"
              value={preview.date}
            />

            <PreviewDivider />

            <PreviewRow
              icon="time-outline"
              label="New start time"
              value={preview.time}
            />

            <PreviewDivider />

            <PreviewRow
              icon="information-circle-outline"
              label="Current booking"
              value={`${formatDate(
                appointment.appointment_date,
              )} · ${formatTime(
                appointment.starts_at,
              )}`}
            />
          </View>

          <View
            style={styles.pendingNotice}
          >
            <View
              style={styles.pendingNoticeIcon}
            >
              <Ionicons
                name="hourglass-outline"
                size={20}
                color={COLORS.violet}
              />
            </View>

            <View
              style={styles.pendingNoticeCopy}
            >
              <Text
                style={styles.pendingNoticeTitle}
              >
                Approval is required
              </Text>

              <Text
                style={styles.pendingNoticeText}
              >
                Submitting does not immediately
                change your appointment. The
                original schedule remains active
                until the Shop Owner approves the
                request.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            disabled={
              !canRequest
              || isSubmitting
              || isCancelling
            }
            accessibilityRole="button"
            accessibilityLabel="Submit reschedule request"
            onPress={() =>
              void handleSubmit()
            }
            style={[
              styles.primaryButton,
              (
                !canRequest
                || isSubmitting
                || isCancelling
              )
              && styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="send-outline"
                size={18}
                color={COLORS.white}
              />
            )}

            <Text
              style={styles.primaryButtonText}
            >
              {isSubmitting
                ? 'Submitting request...'
                : 'Submit reschedule request'}
            </Text>
          </TouchableOpacity>

          {hasDraft && canRequest ? (
            <TouchableOpacity
              activeOpacity={0.76}
              disabled={
                isSubmitting
                || isCancelling
              }
              onPress={resetForm}
              style={styles.resetButton}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={COLORS.navy}
              />

              <Text
                style={styles.resetButtonText}
              >
                Clear request form
              </Text>
            </TouchableOpacity>
          ) : null}

          {canRequest ? (
            <View style={styles.cancelCard}>
              <View
                style={styles.cancelCardHeader}
              >
                <View
                  style={styles.cancelCardIcon}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                </View>

                <View
                  style={styles.cancelCardCopy}
                >
                  <Text
                    style={styles.cancelCardTitle}
                  >
                    Need to cancel instead?
                  </Text>

                  <Text
                    style={styles.cancelCardText}
                  >
                    You can still cancel this
                    appointment from here. Laravel
                    will verify whether cancellation
                    is allowed by the shop&apos;s
                    cutoff rules.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={
                  isSubmitting
                  || isCancelling
                }
                onPress={openCancelModal}
                style={
                  styles.cancelAppointmentButton
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={COLORS.danger}
                />

                <Text
                  style={
                    styles.cancelAppointmentText
                  }
                >
                  Cancel appointment
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleDone}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIcon}>
              <Ionicons
                name="checkmark"
                size={30}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.modalTitle}>
              Request submitted
            </Text>

            <Text
              style={styles.modalDescription}
            >
              {successMessage}
            </Text>

            <View style={styles.modalNotice}>
              <Ionicons
                name="time-outline"
                size={18}
                color={COLORS.violet}
              />

              <Text
                style={styles.modalNoticeText}
              >
                Your original appointment remains
                unchanged while this request waits
                for the Shop Owner&apos;s decision.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleViewRequest}
              style={styles.modalPrimaryButton}
            >
              <Text
                style={styles.modalPrimaryText}
              >
                View request
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.72}
              onPress={handleDone}
              style={
                styles.modalSecondaryButton
              }
            >
              <Text
                style={styles.modalSecondaryText}
              >
                Back to appointment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCancelModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.cancelIcon}>
                  <Ionicons
                    name="close-circle-outline"
                    size={23}
                    color={COLORS.danger}
                  />
                </View>

                <View
                  style={styles.modalHeaderCopy}
                >
                  <Text
                    style={styles.modalTitle}
                  >
                    Cancel appointment?
                  </Text>

                  <Text
                    style={
                      styles.modalDescriptionLeft
                    }
                  >
                    Tell the shop why you need to
                    cancel. The backend still
                    decides whether the
                    cancellation cutoff allows it.
                  </Text>
                </View>
              </View>

              <Text style={styles.modalLabel}>
                Cancellation reason
              </Text>

              <TextInput
                value={cancellationReason}
                onChangeText={
                  setCancellationReason
                }
                editable={!isCancelling}
                maxLength={1000}
                multiline
                textAlignVertical="top"
                placeholder="Enter your cancellation reason"
                placeholderTextColor={
                  COLORS.textLight
                }
                selectionColor={COLORS.navy}
                style={
                  styles.cancelReasonInput
                }
              />

              <Text
                style={styles.modalCounter}
              >
                {cancellationReason.length}/1000
                {' · '}minimum 5 characters
              </Text>

              {errorMessage ? (
                <View
                  style={styles.modalErrorBox}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={COLORS.danger}
                  />

                  <Text
                    style={
                      styles.modalErrorText
                    }
                  >
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.78}
                  disabled={isCancelling}
                  onPress={closeCancelModal}
                  style={
                    styles.modalKeepButton
                  }
                >
                  <Text
                    style={styles.modalKeepText}
                  >
                    Keep booking
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.82}
                  disabled={isCancelling}
                  onPress={() =>
                    void handleCancelAppointment()
                  }
                  style={[
                    styles.modalDangerButton,
                    isCancelling
                    && styles.disabledButton,
                  ]}
                >
                  {isCancelling ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Ionicons
                      name="close-circle-outline"
                      size={17}
                      color={COLORS.white}
                    />
                  )}

                  <Text
                    style={styles.modalDangerText}
                  >
                    {isCancelling
                      ? 'Cancelling...'
                      : 'Cancel appointment'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={cancelSuccessVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleViewBookings}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={styles.cancelSuccessIcon}
            >
              <Ionicons
                name="checkmark"
                size={30}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.modalTitle}>
              Appointment cancelled
            </Text>

            <Text
              style={styles.modalDescription}
            >
              {cancelSuccessMessage}
            </Text>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleViewBookings}
              style={styles.modalPrimaryButton}
            >
              <Text
                style={styles.modalPrimaryText}
              >
                View bookings
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function ScheduleSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.scheduleSummary}>
      <Text
        style={styles.scheduleSummaryLabel}
      >
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.scheduleSummaryValue}
      >
        {value}
      </Text>
    </View>
  );
}

function FieldHeader({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.fieldHeader}>
      <View style={styles.fieldIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.fieldCopy}>
        <Text style={styles.fieldTitle}>
          {title}
        </Text>

        <Text
          style={styles.fieldDescription}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function PreviewRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
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
        <Text style={styles.previewLabel}>
          {label}
        </Text>

        <Text style={styles.previewValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function PreviewDivider() {
  return (
    <View style={styles.previewDivider} />
  );
}

function MessageBox({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={styles.errorBox}>
      <View style={styles.errorIcon}>
        <Ionicons
          name="alert-circle-outline"
          size={20}
          color={COLORS.danger}
        />
      </View>

      <View style={styles.errorCopy}>
        <Text style={styles.errorTitle}>
          {title}
        </Text>

        <Text style={styles.errorText}>
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
    maxWidth: 590,
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

  errorBox: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  errorCopy: {
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

  currentCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  currentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  currentIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  currentStatusBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  currentStatusText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  currentService: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  currentShop: {
    marginTop: 4,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  currentDetails: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  scheduleSummary: {
    flex: 1,
    minWidth: 0,
  },

  scheduleSummaryLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  scheduleSummaryValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '800',
  },

  currentDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  warningCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.warningSoft,
  },

  warningIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  warningCopy: {
    flex: 1,
  },

  warningTitle: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  warningText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
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

  formCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  fieldIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  fieldCopy: {
    flex: 1,
  },

  fieldTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  fieldDescription: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  input: {
    minHeight: 50,
    marginTop: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  reasonInput: {
    minHeight: 118,
    paddingTop: 12,
    paddingBottom: 12,
    lineHeight: 20,
  },

  counterText: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: 9,
    textAlign: 'right',
  },

  formDivider: {
    height: 1,
    marginVertical: 19,
    backgroundColor: COLORS.border,
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
  },

  previewLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  previewValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '800',
  },

  previewDivider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: COLORS.border,
  },

  pendingNotice: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.violetSoft,
  },

  pendingNoticeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  pendingNoticeCopy: {
    flex: 1,
  },

  pendingNoticeTitle: {
    color: COLORS.violet,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  pendingNoticeText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  primaryButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  resetButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  resetButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  cancelCard: {
    marginTop: SPACING.xxl,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  cancelCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  cancelCardIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.dangerSoft,
  },

  cancelCardCopy: {
    flex: 1,
  },

  cancelCardTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  cancelCardText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  cancelAppointmentButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  cancelAppointmentText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  modalKeyboardView: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor:
      'rgba(0, 0, 0, 0.42)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 520,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.floating,
  },

  successIcon: {
    width: 58,
    height: 58,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: COLORS.green,
  },

  cancelSuccessIcon: {
    width: 58,
    height: 58,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: COLORS.danger,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  modalHeaderCopy: {
    flex: 1,
  },

  cancelIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
  },

  modalTitle: {
    marginTop: 13,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    textAlign: 'center',
  },

  modalDescription: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  modalDescriptionLeft: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  modalNotice: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.violetSoft,
  },

  modalNoticeText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  modalLabel: {
    marginTop: 15,
    marginBottom: 7,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  cancelReasonInput: {
    minHeight: 110,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  modalCounter: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: 9,
    textAlign: 'right',
  },

  modalErrorBox: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  modalErrorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  modalActions: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 8,
  },

  modalKeepButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  modalKeepText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  modalDangerButton: {
    flex: 1.3,
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADII.md,
    backgroundColor: COLORS.danger,
  },

  modalDangerText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  modalPrimaryButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  modalPrimaryText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  modalSecondaryButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSecondaryText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

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
    maxWidth: 350,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  unavailableContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.sm,
  },

  unavailableContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
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
    maxWidth: 340,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.48,
  },
});