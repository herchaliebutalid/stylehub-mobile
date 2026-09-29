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
  getCustomerAppointment,
  getCustomerFeedback,
} from '@/src/services/customer-api';
import type {
  AppointmentStatus,
  CustomerAppointment,
  CustomerFeedback,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function formatDate(value: string): string {
  const date = new Date(
    `${value}T12:00:00+08:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

function formatTime(value: string): string {
  const match = value.match(
    /^(\d{1,2}):(\d{2})/,
  );

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

  const suffix =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

function formatDateTime(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-PH',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

function formatPrice(
  value: string | number | null,
): string {
  if (value === null) {
    return 'Price unavailable';
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return `₱${parsed.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function statusPresentation(
  status: AppointmentStatus,
): {
  icon: IconName;
  color: string;
  background: string;
  message: string;
} {
  switch (status) {
    case 'pending':
      return {
        icon: 'time-outline',
        color: COLORS.warning,
        background: COLORS.warningSoft,
        message:
          'Waiting for the shop to confirm this booking.',
      };

    case 'confirmed':
      return {
        icon: 'checkmark-circle-outline',
        color: COLORS.green,
        background: COLORS.greenSoft,
        message:
          'Your appointment has been confirmed by the shop.',
      };

    case 'completed':
      return {
        icon: 'checkmark-done-outline',
        color: COLORS.blue,
        background: COLORS.blueSoft,
        message:
          'This appointment has been completed.',
      };

    case 'cancelled':
      return {
        icon: 'close-circle-outline',
        color: COLORS.danger,
        background: COLORS.dangerSoft,
        message:
          'This appointment was cancelled.',
      };

    case 'declined':
    default:
      return {
        icon: 'remove-circle-outline',
        color: COLORS.danger,
        background: COLORS.dangerSoft,
        message:
          'This booking was declined by the shop.',
      };
  }
}

export default function CustomerAppointmentDetailScreen() {
  const params =
    useLocalSearchParams<{
      appointmentId?:
        | string
        | string[];
    }>();

  const {
    token,
  } = useAuth();

  const appointmentId =
    Number(
      getRouteValue(
        params.appointmentId,
      ),
    );

  const [
    appointment,
    setAppointment,
  ] =
    useState<CustomerAppointment | null>(
      null,
    );

  const [
    existingFeedback,
    setExistingFeedback,
  ] =
    useState<CustomerFeedback | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    isCancelling,
    setIsCancelling,
  ] =
    useState(false);

  const [
    cancelModalVisible,
    setCancelModalVisible,
  ] =
    useState(false);

  const [
    cancellationReason,
    setCancellationReason,
  ] =
    useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('');

  const loadAppointment =
    useCallback(
      async (
        refreshing = false,
      ): Promise<void> => {
        if (
          !token
          ||
          !Number.isInteger(
            appointmentId,
          )
          ||
          appointmentId < 1
        ) {
          setIsLoading(false);
          setIsRefreshing(false);

          setErrorMessage(
            'The selected appointment is invalid.',
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
          const appointmentResponse =
            await getCustomerAppointment(
              token,
              appointmentId,
            );

          const loadedAppointment =
            appointmentResponse
              .data
              .appointment;

          setAppointment(
            loadedAppointment,
          );

          if (
            loadedAppointment.status
            === 'completed'
          ) {
            try {
              const feedbackResponse =
                await getCustomerFeedback(
                  token,
                );

              setExistingFeedback(
                feedbackResponse
                  .data
                  .feedback
                  .find(
                    (item) =>
                      item
                        .appointment
                        ?.id
                      === appointmentId,
                  )
                ?? null,
              );
            } catch {
              setExistingFeedback(
                null,
              );
            }
          } else {
            setExistingFeedback(
              null,
            );
          }
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load this appointment.',
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        appointmentId,
        token,
      ],
    );

  useFocusEffect(
    useCallback(
      () => {
        void loadAppointment();

        return undefined;
      },
      [
        loadAppointment,
      ],
    ),
  );

  const canManageSchedule =
    appointment?.status === 'pending'
    ||
    appointment?.status === 'confirmed';

  const status =
    appointment
      ? statusPresentation(
          appointment.status,
        )
      : null;

  const scheduleLabel =
    useMemo(
      () => {
        if (!appointment) {
          return '';
        }

        return `${formatTime(
          appointment.starts_at,
        )} – ${formatTime(
          appointment.ends_at,
        )}`;
      },
      [
        appointment,
      ],
    );

  function openShop(): void {
    if (
      !appointment
        ?.shop
        ?.id
    ) {
      return;
    }

    router.push({
      pathname:
        '/(customer)/shop/[shopId]',

      params: {
        shopId:
          String(
            appointment.shop.id,
          ),
      },
    });
  }

  function openReschedule(): void {
    if (
      !appointment
      ||
      !canManageSchedule
    ) {
      return;
    }

    router.push({
      pathname:
        '/(customer)/reschedule/[appointmentId]',

      params: {
        appointmentId:
          String(
            appointment.id,
          ),
      },
    });
  }

  function openFeedback(): void {
    if (
      !appointment
      ||
      appointment.status !== 'completed'
    ) {
      return;
    }

    router.push({
      pathname:
        '/(customer)/feedback/[appointmentId]',

      params: {
        appointmentId:
          String(
            appointment.id,
          ),
      },
    });
  }

  function openCancelModal(): void {
    if (
      !appointment
      ||
      !canManageSchedule
      ||
      isCancelling
    ) {
      return;
    }

    setCancellationReason('');
    setErrorMessage('');
    setSuccessMessage('');

    setCancelModalVisible(
      true,
    );
  }

  function closeCancelModal(): void {
    if (isCancelling) {
      return;
    }

    setCancelModalVisible(
      false,
    );

    setCancellationReason('');
  }

  async function cancelAppointment(): Promise<void> {
    if (
      !token
      ||
      !appointment
      ||
      isCancelling
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
    setSuccessMessage('');

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

      setExistingFeedback(
        null,
      );

      setCancelModalVisible(
        false,
      );

      setCancellationReason('');

      setSuccessMessage(
        response.message
        ??
        'Your appointment was cancelled successfully.',
      );
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

  if (
    isLoading
    &&
    !appointment
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
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
            Loading booking details
          </Text>

          <Text
            style={styles.loadingText}
          >
            Getting the latest appointment status and service information.
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
          backgroundColor={COLORS.background}
        />

        <View
          style={styles.unavailableContainer}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.back()
            }
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
                name="calendar-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={styles.unavailableTitle}
            >
              Booking unavailable
            </Text>

            <Text
              style={styles.unavailableText}
            >
              {errorMessage
                ||
                'Unable to display this appointment.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                router.replace(
                  '/(customer)/customer/appointments',
                )
              }
              style={styles.returnButton}
            >
              <Text
                style={styles.returnButtonText}
              >
                Return to bookings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const completedAt =
    formatDateTime(
      appointment.completed_at,
    );

  const cancelledAt =
    formatDateTime(
      appointment.cancelled_at,
    );

  const createdAt =
    formatDateTime(
      appointment.created_at,
    );

  const updatedAt =
    formatDateTime(
      appointment.updated_at,
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.back()
            }
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
              Booking details
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
            accessibilityLabel="Refresh booking details"
            disabled={
              isRefreshing
              ||
              isCancelling
            }
            onPress={() =>
              void loadAppointment(
                true,
              )
            }
            style={[
              styles.topIconButton,

              (
                isRefreshing
                ||
                isCancelling
              )
              &&
                styles.disabledButton,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            APPOINTMENT
          </Text>

          <Text style={styles.title}>
            Everything about this booking in one place
          </Text>

          <Text style={styles.subtitle}>
            Review the service, schedule, shop, notes, status, and any actions currently allowed for this appointment.
          </Text>
        </View>

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Booking needs attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Booking updated"
            message={successMessage}
          />
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons
                name={
                  appointment
                    .shop
                    ?.type
                  === 'barber_shop'
                    ? 'cut-outline'
                    : 'sparkles-outline'
                }
                size={24}
                color={COLORS.white}
              />
            </View>

            {status ? (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      status.background,
                  },
                ]}
              >
                <Ionicons
                  name={status.icon}
                  size={14}
                  color={status.color}
                />

                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        status.color,
                    },
                  ]}
                >
                  {
                    appointment
                      .status_label
                  }
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={styles.heroService}
          >
            {
              appointment
                .service_snapshot
                .name
            }
          </Text>

          <Text
            style={styles.heroShop}
          >
            {
              appointment
                .shop
                ?.name
              ??
              'StyleHub Shop'
            }
          </Text>

          <View
            style={styles.heroScheduleRow}
          >
            <View
              style={styles.heroScheduleItem}
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color="#D4DAE1"
              />

              <Text
                style={styles.heroScheduleText}
              >
                {formatDate(
                  appointment
                    .appointment_date,
                )}
              </Text>
            </View>

            <View
              style={styles.heroScheduleItem}
            >
              <Ionicons
                name="time-outline"
                size={15}
                color="#D4DAE1"
              />

              <Text
                style={styles.heroScheduleText}
              >
                {scheduleLabel}
              </Text>
            </View>
          </View>

          {status ? (
            <View
              style={styles.heroStatusMessage}
            >
              <Ionicons
                name="information-circle-outline"
                size={15}
                color="#D4DAE1"
              />

              <Text
                style={styles.heroStatusMessageText}
              >
                {status.message}
              </Text>
            </View>
          ) : null}
        </View>

        <SectionHeading
          title="Booking summary"
          subtitle="The service snapshot and schedule stored with this appointment."
        />

        <View
          style={styles.detailsCard}
        >
          <DetailRow
            icon="calendar-clear-outline"
            label="Date"
            value={formatDate(
              appointment.appointment_date,
            )}
          />

          <Divider />

          <DetailRow
            icon="time-outline"
            label="Time"
            value={scheduleLabel}
          />

          <Divider />

          <DetailRow
            icon="cash-outline"
            label="Booked price"
            value={formatPrice(
              appointment
                .service_snapshot
                .price,
            )}
          />

          <Divider />

          <DetailRow
            icon="hourglass-outline"
            label="Service duration"
            value={
              appointment
                .service_snapshot
                .duration_minutes
              === null
                ? 'Not available'
                : `${appointment.service_snapshot.duration_minutes} minutes`
            }
          />
        </View>

        <SectionHeading
          title="Shop"
          subtitle="The shop linked to this appointment."
        />

        <View style={styles.shopCard}>
          <View style={styles.shopHeader}>
            <View style={styles.shopIcon}>
              <Ionicons
                name={
                  appointment
                    .shop
                    ?.type
                  === 'barber_shop'
                    ? 'cut-outline'
                    : 'sparkles-outline'
                }
                size={21}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.shopCopy}>
              <Text style={styles.shopName}>
                {
                  appointment
                    .shop
                    ?.name
                  ??
                  'StyleHub Shop'
                }
              </Text>

              <Text style={styles.shopType}>
                {
                  appointment
                    .shop
                    ?.type_label
                  ??
                  'Shop information'
                }
              </Text>
            </View>
          </View>

          {appointment.shop?.id ? (
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open shop profile"
              onPress={openShop}
              style={styles.shopButton}
            >
              <Text
                style={styles.shopButtonText}
              >
                View shop profile
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <SectionHeading
          title="Notes"
          subtitle="Anything you included when the booking was created."
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
            {
              appointment
                .notes
                ?.trim()
              ||
              'No customer notes were added to this appointment.'
            }
          </Text>
        </View>

        {
          appointment.status
            === 'cancelled'
          &&
          appointment
            .cancellation_reason
            ?.trim()
          ? (
              <>
                <SectionHeading
                  title="Cancellation"
                  subtitle="Reason recorded when this appointment was cancelled."
                />

                <View
                  style={styles.cancellationCard}
                >
                  <View
                    style={styles.cancellationIcon}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={20}
                      color={COLORS.danger}
                    />
                  </View>

                  <View
                    style={styles.cancellationCopy}
                  >
                    <Text
                      style={styles.cancellationTitle}
                    >
                      Cancellation reason
                    </Text>

                    <Text
                      style={styles.cancellationText}
                    >
                      {
                        appointment
                          .cancellation_reason
                      }
                    </Text>

                    {cancelledAt ? (
                      <Text
                        style={styles.cancellationDate}
                      >
                        Cancelled {cancelledAt}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </>
            )
          : null
        }

        <SectionHeading
          title="Booking activity"
          subtitle="Key timestamps returned by the appointment API."
        />

        <View style={styles.activityCard}>
          <ActivityRow
            icon="add-circle-outline"
            label="Booking created"
            value={
              createdAt
              ??
              'Not available'
            }
          />

          {completedAt ? (
            <>
              <ActivityDivider />

              <ActivityRow
                icon="checkmark-done-outline"
                label="Completed"
                value={completedAt}
              />
            </>
          ) : null}

          {cancelledAt ? (
            <>
              <ActivityDivider />

              <ActivityRow
                icon="close-circle-outline"
                label="Cancelled"
                value={cancelledAt}
              />
            </>
          ) : null}

          {updatedAt ? (
            <>
              <ActivityDivider />

              <ActivityRow
                icon="refresh-outline"
                label="Last updated"
                value={updatedAt}
              />
            </>
          ) : null}
        </View>

        {canManageSchedule ? (
          <>
            <SectionHeading
              title="Manage booking"
              subtitle="Schedule changes and cancellation remain subject to your shop's Laravel booking rules."
            />

            <View style={styles.actionsCard}>
              <ActionRow
                icon="swap-horizontal-outline"
                iconBackground={COLORS.violetSoft}
                iconColor={COLORS.violet}
                title="Request a new schedule"
                text="Ask the shop to move this appointment. The current booking stays unchanged until the request is approved."
                onPress={openReschedule}
              />

              <View
                style={styles.actionDivider}
              />

              <ActionRow
                icon="close-circle-outline"
                iconBackground={COLORS.dangerSoft}
                iconColor={COLORS.danger}
                title="Cancel appointment"
                text="Provide a reason and let Laravel verify whether cancellation is still allowed."
                danger
                onPress={openCancelModal}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open reschedule requests"
              onPress={() =>
                router.push(
                  '/(customer)/reschedule-requests',
                )
              }
              style={styles.requestsButton}
            >
              <Ionicons
                name="documents-outline"
                size={18}
                color={COLORS.navy}
              />

              <Text
                style={styles.requestsButtonText}
              >
                View all reschedule requests
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </>
        ) : null}

        {
          appointment.status
            === 'completed'
          ? (
              <>
                <SectionHeading
                  title="Your experience"
                  subtitle="Feedback is available only for completed appointments."
                />

                <View
                  style={styles.reviewCard}
                >
                  <View
                    style={[
                      styles.reviewIcon,
                      {
                        backgroundColor:
                          existingFeedback
                            ? COLORS.greenSoft
                            : COLORS.warningSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        existingFeedback
                          ? 'star'
                          : 'star-outline'
                      }
                      size={22}
                      color={
                        existingFeedback
                          ? COLORS.green
                          : COLORS.warning
                      }
                    />
                  </View>

                  <View
                    style={styles.reviewCopy}
                  >
                    <Text
                      style={styles.reviewTitle}
                    >
                      {existingFeedback
                        ? 'Feedback already submitted'
                        : 'Rate this appointment'}
                    </Text>

                    <Text
                      style={styles.reviewText}
                    >
                      {existingFeedback
                        ? `You rated this experience ${existingFeedback.rating}/5. Open it to review what you submitted.`
                        : 'Share a 1–5 star rating and an optional comment about your completed visit.'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      existingFeedback
                        ? 'View submitted feedback'
                        : 'Rate this appointment'
                    }
                    onPress={openFeedback}
                    style={styles.reviewButton}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={COLORS.navy}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )
          : null
        }

        <View style={styles.footerNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={COLORS.green}
          />

          <Text
            style={styles.footerNoteText}
          >
            Appointment status and allowed actions are enforced by Laravel. The mobile screen does not override booking rules or shop decisions.
          </Text>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={cancelModalVisible}
        onRequestClose={closeCancelModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={COLORS.danger}
                />
              </View>

              <View
                style={styles.modalHeaderCopy}
              >
                <Text style={styles.modalTitle}>
                  Cancel appointment?
                </Text>

                <Text style={styles.modalText}>
                  Enter a reason. Laravel will still verify the shop&apos;s cancellation cutoff before accepting the request.
                </Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>
              Cancellation reason
            </Text>

            <TextInput
              value={cancellationReason}
              onChangeText={setCancellationReason}
              editable={!isCancelling}
              multiline
              maxLength={1000}
              placeholder="Explain why you need to cancel..."
              placeholderTextColor={COLORS.textLight}
              selectionColor={COLORS.navy}
              textAlignVertical="top"
              style={styles.modalInput}
            />

            <Text
              style={styles.modalCounter}
            >
              {cancellationReason.length}/1000 · minimum 5 characters
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isCancelling}
                onPress={closeCancelModal}
                style={styles.modalSecondaryButton}
              >
                <Text
                  style={styles.modalSecondaryText}
                >
                  Keep booking
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isCancelling}
                onPress={() =>
                  void cancelAppointment()
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
        </KeyboardAvoidingView>
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider} />
  );
}

function ActivityRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.activityCopy}>
        <Text style={styles.activityLabel}>
          {label}
        </Text>

        <Text style={styles.activityValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActivityDivider() {
  return (
    <View
      style={styles.activityDivider}
    />
  );
}

function ActionRow({
  icon,
  iconBackground,
  iconColor,
  title,
  text,
  danger = false,
  onPress,
}: {
  icon: IconName;
  iconBackground: string;
  iconColor: string;
  title: string;
  text: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.actionRow}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <View style={styles.actionCopy}>
        <Text
          style={[
            styles.actionTitle,
            danger
            && styles.actionTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionText}>
          {text}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
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

  heroCard: {
    marginTop: SPACING.xl,
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

  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
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

  statusBadgeText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  heroService: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  heroShop: {
    marginTop: 4,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  heroScheduleRow: {
    marginTop: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  heroScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  heroScheduleText: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  heroStatusMessage: {
    marginTop: 15,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  heroStatusMessageText: {
    flex: 1,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
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

  detailsCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  detailRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  detailIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  detailCopy: {
    flex: 1,
  },

  detailLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  detailValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: COLORS.border,
  },

  shopCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  shopIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  shopCopy: {
    flex: 1,
  },

  shopName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  shopButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  shopButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
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
    lineHeight: 20,
  },

  cancellationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.dangerSoft,
  },

  cancellationIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  cancellationCopy: {
    flex: 1,
  },

  cancellationTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  cancellationText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  cancellationDate: {
    marginTop: 7,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
  },

  activityCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  activityRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  activityIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  activityCopy: {
    flex: 1,
  },

  activityLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  activityValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  activityDivider: {
    height: 1,
    marginLeft: 60,
    backgroundColor: COLORS.border,
  },

  actionsCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  actionRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
  },

  actionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  actionCopy: {
    flex: 1,
  },

  actionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  actionTitleDanger: {
    color: COLORS.danger,
  },

  actionText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  actionDivider: {
    height: 1,
    marginLeft: 67,
    backgroundColor: COLORS.border,
  },

  requestsButton: {
    minHeight: 50,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  requestsButtonText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  reviewCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  reviewIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  reviewCopy: {
    flex: 1,
  },

  reviewTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  reviewText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  reviewButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
  },

  footerNote: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: RADII.md,
    backgroundColor: COLORS.greenSoft,
  },

  footerNoteText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: 16,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.floating,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  modalIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
  },

  modalHeaderCopy: {
    flex: 1,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  modalText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  modalLabel: {
    marginTop: 16,
    marginBottom: 7,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  modalInput: {
    minHeight: 112,
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

  modalActions: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 8,
  },

  modalSecondaryButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  modalSecondaryText: {
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
    paddingHorizontal: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.danger,
  },

  modalDangerText: {
    color: COLORS.white,
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

  returnButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  returnButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.48,
  },
});