import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
    parts.length !== 3
    || parts.some((part) => Number.isNaN(part))
  ) {
    return value;
  }

  const [year, month, day] = parts;

  const date = new Date(
    year,
    month - 1,
    day,
  );

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

function formatTime(value: string): string {
  const match = value.match(
    /^(\d{1,2}):(\d{2})/,
  );

  if (!match) {
    return value;
  }

  const hour24 = Number(
    match[1],
  );

  const minute = match[2];

  if (
    Number.isNaN(hour24)
    || hour24 < 0
    || hour24 > 23
  ) {
    return value;
  }

  const period =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 % 12
    || 12;

  return `${hour12}:${minute} ${period}`;
}

function formatTimestamp(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    },
  ).format(date);
}

function appointmentTimestamp(
  appointment: ShopOwnerAppointment,
  field: 'starts_at' | 'ends_at',
): number | null {
  const match =
    appointment[field].match(
      /^(\d{2}):(\d{2})(?::(\d{2}))?/,
    );

  if (!match) {
    return null;
  }

  const [
    ,
    hour,
    minute,
    second = '00',
  ] = match;

  const timestamp =
    Date.parse(
      `${appointment.appointment_date}T${hour}:${minute}:${second}+08:00`,
    );

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : null;
}

function appointmentHasStarted(
  appointment: ShopOwnerAppointment,
  nowMs: number,
): boolean {
  const start =
    appointmentTimestamp(
      appointment,
      'starts_at',
    );

  return start !== null
    && nowMs >= start;
}

function appointmentHasEnded(
  appointment: ShopOwnerAppointment,
  nowMs: number,
): boolean {
  const end =
    appointmentTimestamp(
      appointment,
      'ends_at',
    );

  return end !== null
    && nowMs >= end;
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
        background:
          COLORS.warningSoft,

        text:
          COLORS.warning,

        icon:
          'time-outline',
      };

    case 'confirmed':
      return {
        background:
          COLORS.blueSoft,

        text:
          COLORS.blue,

        icon:
          'checkmark-circle-outline',
      };

    case 'completed':
      return {
        background:
          COLORS.greenSoft,

        text:
          COLORS.green,

        icon:
          'checkmark-done-outline',
      };

    case 'no_show':
      return {
        background:
          COLORS.orangeSoft,

        text:
          COLORS.orange,

        icon:
          'person-remove-outline',
      };

    case 'cancelled':
      return {
        background:
          COLORS.dangerSoft,

        text:
          COLORS.danger,

        icon:
          'close-circle-outline',
      };

    case 'declined':
      return {
        background:
          COLORS.dangerSoft,

        text:
          COLORS.danger,

        icon:
          'remove-circle-outline',
      };
  }
}

export default function ShopOwnerAppointmentDetailScreen() {
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
      routeValue(
        params.appointmentId,
      ),
    );

  const [
    appointment,
    setAppointment,
  ] =
    useState<ShopOwnerAppointment | null>(
      null,
    );

  const [
    reasonAction,
    setReasonAction,
  ] =
    useState<ReasonAction>(
      null,
    );

  const [
    reason,
    setReason,
  ] =
    useState('');

  const [
    confirmationAction,
    setConfirmationAction,
  ] =
    useState<ConfirmationAction>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isProcessing,
    setIsProcessing,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    nowMs,
    setNowMs,
  ] =
    useState(
      Date.now(),
    );

  const loadAppointment =
    useCallback(
      async () => {
        if (
          !token
          ||
          !Number.isInteger(
            appointmentId,
          )
          ||
          appointmentId < 1
        ) {
          setIsLoading(
            false,
          );

          setErrorMessage(
            'The selected appointment is invalid.',
          );

          return;
        }

        setIsLoading(
          true,
        );

        setErrorMessage('');

        try {
          const response =
            await getShopOwnerAppointment(
              token,
              appointmentId,
            );

          setAppointment(
            response
              .data
              .appointment,
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load this appointment.',
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        appointmentId,
        token,
      ],
    );

  useEffect(
    () => {
      void loadAppointment();
    },
    [
      loadAppointment,
    ],
  );

  useEffect(
    () => {
      setNowMs(
        Date.now(),
      );

      const interval =
        setInterval(
          () => {
            setNowMs(
              Date.now(),
            );
          },
          30000,
        );

      return () =>
        clearInterval(
          interval,
        );
    },
    [],
  );

  const isPending =
    appointment?.status ===
    'pending';

  const isConfirmed =
    appointment?.status ===
    'confirmed';

  const canMarkNoShow =
    useMemo(
      () =>
        Boolean(
          appointment
          &&
          isConfirmed
          &&
          appointmentHasStarted(
            appointment,
            nowMs,
          ),
        ),
      [
        appointment,
        isConfirmed,
        nowMs,
      ],
    );

  const canComplete =
    useMemo(
      () =>
        Boolean(
          appointment
          &&
          isConfirmed
          &&
          appointmentHasEnded(
            appointment,
            nowMs,
          ),
        ),
      [
        appointment,
        isConfirmed,
        nowMs,
      ],
    );

  function handleActionError(
    error: unknown,
    fallback: string,
  ) {
    setErrorMessage(
      error instanceof ApiError
        ? error.message
        : fallback,
    );
  }

  async function reloadAfterAction(
    message: string,
  ) {
    setReason('');

    setReasonAction(
      null,
    );

    setConfirmationAction(
      null,
    );

    await loadAppointment();

    Alert.alert(
      'Appointment Updated',
      message,
    );
  }

  function requestConfirmAppointment() {
    if (
      isProcessing
    ) {
      return;
    }

    setErrorMessage('');

    setConfirmationAction(
      'confirm',
    );
  }

  function requestCompleteAppointment() {
    if (
      isProcessing
      ||
      !appointment
      ||
      !canComplete
    ) {
      setErrorMessage(
        'This appointment can only be completed at or after its scheduled ending time.',
      );

      return;
    }

    setErrorMessage('');

    setConfirmationAction(
      'complete',
    );
  }

  function requestNoShowAppointment() {
    if (
      isProcessing
      ||
      !appointment
      ||
      appointment.status !==
        'confirmed'
    ) {
      return;
    }

    const currentNow =
      Date.now();

    setNowMs(
      currentNow,
    );

    if (
      !appointmentHasStarted(
        appointment,
        currentNow,
      )
    ) {
      setErrorMessage(
        'This appointment can only be marked as a no-show at or after its scheduled start time.',
      );

      return;
    }

    setErrorMessage('');

    setConfirmationAction(
      'no_show',
    );
  }

  function openReasonAction(
    action:
      Exclude<
        ReasonAction,
        null
      >,
  ) {
    if (
      isProcessing
    ) {
      return;
    }

    setReason('');

    setReasonAction(
      action,
    );

    setErrorMessage('');
  }

  function closeReasonAction() {
    if (
      isProcessing
    ) {
      return;
    }

    setReasonAction(
      null,
    );

    setReason('');

    setErrorMessage('');
  }

  function requestReasonActionConfirmation() {
    if (
      !reasonAction
      ||
      isProcessing
    ) {
      return;
    }

    const cleanReason =
      reason.trim();

    if (
      cleanReason.length < 5
      ||
      cleanReason.length > 1000
    ) {
      setErrorMessage(
        'Reason must contain between 5 and 1000 characters.',
      );

      return;
    }

    setErrorMessage('');

    setConfirmationAction(
      reasonAction,
    );
  }

  async function performConfirm() {
    if (
      !token
      ||
      isProcessing
    ) {
      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');

    try {
      const response =
        await confirmShopOwnerAppointment(
          token,
          appointmentId,
        );

      await reloadAfterAction(
        response.message
        ??
        'Appointment confirmed successfully.',
      );
    } catch (
      error
    ) {
      handleActionError(
        error,
        'Unable to confirm the appointment.',
      );

      setConfirmationAction(
        null,
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function performComplete() {
    if (
      !token
      ||
      isProcessing
    ) {
      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');

    try {
      const response =
        await completeShopOwnerAppointment(
          token,
          appointmentId,
        );

      await reloadAfterAction(
        response.message
        ??
        'Appointment completed successfully.',
      );
    } catch (
      error
    ) {
      handleActionError(
        error,
        'Unable to complete the appointment.',
      );

      setConfirmationAction(
        null,
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function performNoShow() {
    if (
      !token
      ||
      isProcessing
    ) {
      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');

    try {
      const response =
        await markShopOwnerAppointmentNoShow(
          token,
          appointmentId,
        );

      await reloadAfterAction(
        response.message
        ??
        'Appointment marked as no-show successfully.',
      );
    } catch (
      error
    ) {
      handleActionError(
        error,
        'Unable to mark the appointment as no-show.',
      );

      setConfirmationAction(
        null,
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function performDecline() {
    if (
      !token
      ||
      isProcessing
    ) {
      return;
    }

    const cleanReason =
      reason.trim();

    if (
      cleanReason.length < 5
      ||
      cleanReason.length > 1000
    ) {
      setConfirmationAction(
        null,
      );

      setErrorMessage(
        'Reason must contain between 5 and 1000 characters.',
      );

      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');

    try {
      const response =
        await declineShopOwnerAppointment(
          token,
          appointmentId,
          cleanReason,
        );

      await reloadAfterAction(
        response.message
        ??
        'Appointment declined successfully.',
      );
    } catch (
      error
    ) {
      handleActionError(
        error,
        'Unable to decline the appointment.',
      );

      setConfirmationAction(
        null,
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function performCancel() {
    if (
      !token
      ||
      isProcessing
    ) {
      return;
    }

    const cleanReason =
      reason.trim();

    if (
      cleanReason.length < 5
      ||
      cleanReason.length > 1000
    ) {
      setConfirmationAction(
        null,
      );

      setErrorMessage(
        'Reason must contain between 5 and 1000 characters.',
      );

      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');

    try {
      const response =
        await cancelShopOwnerAppointment(
          token,
          appointmentId,
          cleanReason,
        );

      await reloadAfterAction(
        response.message
        ??
        'Appointment cancelled successfully.',
      );
    } catch (
      error
    ) {
      handleActionError(
        error,
        'Unable to cancel the appointment.',
      );

      setConfirmationAction(
        null,
      );
    } finally {
      setIsProcessing(
        false,
      );
    }
  }

  async function performConfirmedAction() {
    switch (
      confirmationAction
    ) {
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

  function getConfirmationContent(): {
    icon:
      IconName;

    title:
      string;

    description:
      string;

    buttonText:
      string;

    destructive:
      boolean;

    accent?:
      'orange';
  } {
    switch (
      confirmationAction
    ) {
      case 'confirm':
        return {
          icon:
            'checkmark-circle-outline',

          title:
            'Confirm appointment?',

          description:
            'This booking will move to Confirmed and the customer can prepare for the scheduled visit.',

          buttonText:
            'Confirm appointment',

          destructive:
            false,
        };

      case 'complete':
        return {
          icon:
            'checkmark-done-outline',

          title:
            'Complete appointment?',

          description:
            'Use this after the service has finished. This updates the booking to Completed.',

          buttonText:
            'Mark as completed',

          destructive:
            false,
        };

      case 'no_show':
        return {
          icon:
            'person-remove-outline',

          title:
            'Mark as no-show?',

          description:
            'Use this only when the customer did not arrive. This is a final appointment status.',

          buttonText:
            'Mark as no-show',

          destructive:
            false,

          accent:
            'orange',
        };

      case 'decline':
        return {
          icon:
            'close-circle-outline',

          title:
            'Decline request?',

          description:
            'The appointment request will be declined and the customer will see the reason you provided.',

          buttonText:
            'Decline appointment',

          destructive:
            true,
        };

      case 'cancel':
        return {
          icon:
            'close-circle-outline',

          title:
            'Cancel appointment?',

          description:
            'This confirmed booking will be cancelled and the customer will see your cancellation reason.',

          buttonText:
            'Cancel appointment',

          destructive:
            true,
        };

      default:
        return {
          icon:
            'help-circle-outline',

          title:
            'Confirm action',

          description:
            'Are you sure you want to continue?',

          buttonText:
            'Continue',

          destructive:
            false,
        };
    }
  }

  if (
    isLoading
  ) {
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

        <View
          style={
            styles.loadingContainer
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
            Loading booking
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Getting the latest appointment details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    !appointment
  ) {
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

        <View
          style={
            styles.unavailableContainer
          }
        >
          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={
              styles.topIconButton
            }
            onPress={
              () =>
                router.back()
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
              styles.unavailableContent
            }
          >
            <View
              style={
                styles.unavailableIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={
                  30
                }
                color={
                  COLORS.navy
                }
              />
            </View>

            <Text
              style={
                styles.unavailableTitle
              }
            >
              Appointment unavailable
            </Text>

            <Text
              style={
                styles.unavailableText
              }
            >
              {errorMessage
              ||
              'Unable to display this appointment.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const status =
    statusPresentation(
      appointment.status,
    );

  const confirmation =
    getConfirmationContent();

  const noShowMarkedAt =
    formatTimestamp(
      appointment.no_show_at,
    );

  const customerName =
    appointment
      .customer
      ?.full_name
      ?.trim()
    ||
    'Customer';

  const customerInitial =
    customerName
      .charAt(
        0,
      )
      .toUpperCase();

  const confirmationIconBackground =
    confirmation.destructive
      ? COLORS.dangerSoft
      : confirmation.accent ===
          'orange'
        ? COLORS.orangeSoft
        : COLORS.accentSoft;

  const confirmationIconColor =
    confirmation.destructive
      ? COLORS.danger
      : confirmation.accent ===
          'orange'
        ? COLORS.orange
        : COLORS.navy;

  const confirmationButtonStyle =
    confirmation.destructive
      ? styles.modalDangerButton
      : confirmation.accent ===
          'orange'
        ? styles.modalNoShowButton
        : styles.modalConfirmButton;

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
        contentContainerStyle={
          styles.container
        }
      >

        {/* TOP BAR */}

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
            accessibilityLabel="Go back"
            style={
              styles.topIconButton
            }
            onPress={
              () =>
                router.back()
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
              Booking details
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Appointment #{appointment.id}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Refresh appointment"
            style={
              styles.topIconButton
            }
            onPress={
              () =>
                void loadAppointment()
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


        {/* BOOKING SUMMARY */}

        <View
          style={
            styles.heroCard
          }
        >
          <View
            style={
              styles.heroTopRow
            }
          >
            <View
              style={
                styles.heroServiceIcon
              }
            >
              <Ionicons
                name="cut-outline"
                size={
                  23
                }
                color={
                  COLORS.white
                }
              />
            </View>

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
                name={
                  status.icon
                }
                size={
                  14
                }
                color={
                  status.text
                }
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      status.text,
                  },
                ]}
              >
                {
                  appointment
                    .status_label
                }
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.serviceName
            }
          >
            {
              appointment
                .service_snapshot
                .name
            }
          </Text>

          <View
            style={
              styles.heroPriceRow
            }
          >
            <Text
              style={
                styles.heroPrice
              }
            >
              {formatPrice(
                appointment
                  .service_snapshot
                  .price,
              )}
            </Text>

            <View
              style={
                styles.heroPriceDot
              }
            />

            <Text
              style={
                styles.heroDuration
              }
            >
              {
                appointment
                  .service_snapshot
                  .duration_minutes
              } min
            </Text>
          </View>

          <View
            style={
              styles.schedulePanel
            }
          >
            <ScheduleItem
              icon="calendar-clear-outline"
              label="Date"
              value={
                formatDate(
                  appointment
                    .appointment_date,
                )
              }
            />

            <View
              style={
                styles.scheduleDivider
              }
            />

            <ScheduleItem
              icon="time-outline"
              label="Time"
              value={`${formatTime(
                appointment.starts_at,
              )} – ${formatTime(
                appointment.ends_at,
              )}`}
            />
          </View>
        </View>


        {/* ERROR */}

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
                Action needs attention
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


        {/* CUSTOMER */}

        <SectionHeader
          title="Customer"
          subtitle="Booking contact information"
        />

        <View
          style={
            styles.customerCard
          }
        >
          <View
            style={
              styles.customerHeader
            }
          >
            <View
              style={
                styles.customerAvatar
              }
            >
              <Text
                style={
                  styles.customerInitial
                }
              >
                {customerInitial}
              </Text>
            </View>

            <View
              style={
                styles.customerIdentity
              }
            >
              <Text
                style={
                  styles.customerName
                }
                numberOfLines={
                  1
                }
              >
                {customerName}
              </Text>

              <Text
                style={
                  styles.customerLabel
                }
              >
                StyleHub customer
              </Text>
            </View>
          </View>

          <View
            style={
              styles.contactDivider
            }
          />

          <ContactRow
            icon="mail-outline"
            label="Email"
            value={
              appointment
                .customer
                ?.email
              ??
              'Unavailable'
            }
          />

          <ContactRow
            icon="call-outline"
            label="Mobile number"
            value={
              appointment
                .customer
                ?.phone_number
              ??
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

            <View
              style={
                styles.notesCard
              }
            >
              <View
                style={
                  styles.notesIcon
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.navy
                  }
                />
              </View>

              <Text
                style={
                  styles.notesText
                }
              >
                {
                  appointment
                    .notes
                }
              </Text>
            </View>
          </>
        ) : null}


        {/* CANCELLATION / DECLINE */}

        {appointment.cancellation_reason ? (
          <>
            <SectionHeader
              title="Booking history"
              subtitle="Reason recorded for this appointment"
            />

            <View
              style={
                styles.historyDangerCard
              }
            >
              <View
                style={
                  styles.historyDangerIcon
                }
              >
                <Ionicons
                  name="information-circle-outline"
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
                  styles.historyContent
                }
              >
                <Text
                  style={
                    styles.historyDangerTitle
                  }
                >
                  {appointment.status ===
                  'declined'
                    ? 'Appointment declined'
                    : 'Appointment cancelled'}
                </Text>

                <Text
                  style={
                    styles.historyText
                  }
                >
                  {
                    appointment
                      .cancellation_reason
                  }
                </Text>
              </View>
            </View>
          </>
        ) : null}


        {/* NO SHOW HISTORY */}

        {appointment.status ===
        'no_show' ? (
          <>
            <SectionHeader
              title="Booking history"
              subtitle="Final status information"
            />

            <View
              style={
                styles.noShowHistoryCard
              }
            >
              <View
                style={
                  styles.noShowHistoryIcon
                }
              >
                <Ionicons
                  name="person-remove-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.orange
                  }
                />
              </View>

              <View
                style={
                  styles.historyContent
                }
              >
                <Text
                  style={
                    styles.noShowHistoryTitle
                  }
                >
                  Customer marked as no-show
                </Text>

                <Text
                  style={
                    styles.historyText
                  }
                >
                  This booking has reached a final status and no longer blocks the scheduled slot.
                </Text>

                {noShowMarkedAt ? (
                  <Text
                    style={
                      styles.historyTimestamp
                    }
                  >
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

            <View
              style={
                styles.actionCard
              }
            >
              <View
                style={
                  styles.actionHeader
                }
              >
                <View
                  style={
                    styles.actionHeaderIcon
                  }
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={
                      20
                    }
                    color={
                      COLORS.warning
                    }
                  />
                </View>

                <View
                  style={
                    styles.actionHeaderContent
                  }
                >
                  <Text
                    style={
                      styles.actionHeaderTitle
                    }
                  >
                    Waiting for your decision
                  </Text>

                  <Text
                    style={
                      styles.actionHeaderText
                    }
                  >
                    Confirm the booking if you can accommodate the customer at this date and time.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={
                  0.84
                }
                disabled={
                  isProcessing
                }
                style={[
                  styles.primaryButton,

                  isProcessing
                  &&
                  styles.disabledButton,
                ]}
                onPress={
                  requestConfirmAppointment
                }
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={
                    19
                  }
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Confirm appointment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={
                  0.84
                }
                disabled={
                  isProcessing
                }
                style={[
                  styles.dangerOutlineButton,

                  isProcessing
                  &&
                  styles.disabledButton,
                ]}
                onPress={
                  () =>
                    openReasonAction(
                      'decline',
                    )
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={
                    19
                  }
                  color={
                    COLORS.danger
                  }
                />

                <Text
                  style={
                    styles.dangerOutlineText
                  }
                >
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

            <View
              style={
                styles.actionCard
              }
            >
              <ActionRow
                icon="checkmark-done-outline"
                title="Complete service"
                description={
                  canComplete
                    ? 'The scheduled service has ended and can now be completed.'
                    : 'Available at the scheduled ending time.'
                }
                disabled={
                  isProcessing
                  ||
                  !canComplete
                }
                onPress={
                  requestCompleteAppointment
                }
              />

              <View
                style={
                  styles.actionRowDivider
                }
              />

              <ActionRow
                icon="person-remove-outline"
                title="Mark as no-show"
                description={
                  canMarkNoShow
                    ? 'Use only if the customer did not arrive.'
                    : 'Available at the scheduled start time.'
                }
                tone="orange"
                disabled={
                  isProcessing
                  ||
                  !canMarkNoShow
                }
                onPress={
                  requestNoShowAppointment
                }
              />

              <View
                style={
                  styles.actionRowDivider
                }
              />

              <ActionRow
                icon="close-circle-outline"
                title="Cancel appointment"
                description="Cancel this confirmed booking and provide a reason."
                tone="danger"
                disabled={
                  isProcessing
                }
                onPress={
                  () =>
                    openReasonAction(
                      'cancel',
                    )
                }
              />
            </View>
          </>
        ) : null}


        {/* FINAL STATUS */}

        {!isPending &&
        !isConfirmed ? (
          <View
            style={
              styles.finalStatusCard
            }
          >
            <Ionicons
              name={
                status.icon
              }
              size={
                22
              }
              color={
                status.text
              }
            />

            <View
              style={
                styles.finalStatusContent
              }
            >
              <Text
                style={
                  styles.finalStatusTitle
                }
              >
                No further action required
              </Text>

              <Text
                style={
                  styles.finalStatusText
                }
              >
                This appointment is currently {appointment.status_label.toLowerCase()} and no longer needs an active booking decision.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>


      {/* REASON MODAL */}

      <Modal
        visible={
          reasonAction !==
            null
          &&
          confirmationAction ===
            null
        }
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={
          closeReasonAction
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalKeyboardView
          }
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={
              styles.sheetOverlay
            }
          >
            <View
              style={
                styles.reasonSheet
              }
            >
              <View
                style={
                  styles.sheetHandle
                }
              />

              <View
                style={
                  styles.reasonSheetHeader
                }
              >
                <View
                  style={
                    styles.reasonSheetIcon
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={
                      22
                    }
                    color={
                      COLORS.danger
                    }
                  />
                </View>

                <View
                  style={
                    styles.reasonSheetHeading
                  }
                >
                  <Text
                    style={
                      styles.reasonSheetTitle
                    }
                  >
                    {reasonAction ===
                    'decline'
                      ? 'Why are you declining?'
                      : 'Why are you cancelling?'}
                  </Text>

                  <Text
                    style={
                      styles.reasonSheetSubtitle
                    }
                  >
                    The customer will be able to see this reason.
                  </Text>
                </View>
              </View>

              <TextInput
                value={
                  reason
                }
                onChangeText={
                  setReason
                }
                editable={
                  !isProcessing
                }
                multiline
                textAlignVertical="top"
                maxLength={
                  1000
                }
                placeholder={
                  reasonAction ===
                  'decline'
                    ? 'Example: The selected time is no longer available.'
                    : 'Example: The shop will be unavailable at this time.'
                }
                placeholderTextColor={
                  COLORS.textLight
                }
                style={
                  styles.reasonInput
                }
              />

              <View
                style={
                  styles.reasonMetaRow
                }
              >
                <Text
                  style={
                    styles.reasonRequirement
                  }
                >
                  Minimum 5 characters
                </Text>

                <Text
                  style={
                    styles.reasonCounter
                  }
                >
                  {reason.length}/1000
                </Text>
              </View>

              {errorMessage ? (
                <Text
                  style={
                    styles.reasonErrorText
                  }
                >
                  {errorMessage}
                </Text>
              ) : null}

              <TouchableOpacity
                activeOpacity={
                  0.84
                }
                disabled={
                  isProcessing
                }
                style={[
                  styles.reasonContinueButton,

                  isProcessing
                  &&
                  styles.disabledButton,
                ]}
                onPress={
                  requestReasonActionConfirmation
                }
              >
                <Text
                  style={
                    styles.reasonContinueText
                  }
                >
                  {reasonAction ===
                  'decline'
                    ? 'Continue to decline'
                    : 'Continue to cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={
                  0.7
                }
                disabled={
                  isProcessing
                }
                style={
                  styles.sheetCancelButton
                }
                onPress={
                  closeReasonAction
                }
              >
                <Text
                  style={
                    styles.sheetCancelText
                  }
                >
                  Keep appointment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* CONFIRMATION MODAL */}

      <Modal
        visible={
          confirmationAction !==
          null
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          () => {
            if (
              !isProcessing
            ) {
              setConfirmationAction(
                null,
              );
            }
          }
        }
      >
        <View
          style={
            styles.confirmationOverlay
          }
        >
          <View
            style={
              styles.confirmationModal
            }
          >
            <View
              style={[
                styles.confirmationIcon,

                {
                  backgroundColor:
                    confirmationIconBackground,
                },
              ]}
            >
              <Ionicons
                name={
                  confirmation.icon
                }
                size={
                  30
                }
                color={
                  confirmationIconColor
                }
              />
            </View>

            <Text
              style={
                styles.confirmationTitle
              }
            >
              {confirmation.title}
            </Text>

            <Text
              style={
                styles.confirmationDescription
              }
            >
              {confirmation.description}
            </Text>

            {confirmationAction ===
              'decline'
            ||
            confirmationAction ===
              'cancel' ? (
              <View
                style={
                  styles.reasonPreview
                }
              >
                <Text
                  style={
                    styles.reasonPreviewLabel
                  }
                >
                  Reason
                </Text>

                <Text
                  style={
                    styles.reasonPreviewText
                  }
                >
                  {reason.trim()}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={
                0.84
              }
              disabled={
                isProcessing
              }
              style={[
                styles.modalPrimaryButton,

                confirmationButtonStyle,

                isProcessing
                &&
                styles.disabledButton,
              ]}
              onPress={
                () =>
                  void performConfirmedAction()
              }
            >
              {isProcessing ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.white
                  }
                />
              ) : (
                <Text
                  style={
                    styles.modalPrimaryButtonText
                  }
                >
                  {confirmation.buttonText}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={
                0.7
              }
              disabled={
                isProcessing
              }
              style={
                styles.modalCancelButton
              }
              onPress={
                () =>
                  setConfirmationAction(
                    null,
                  )
              }
            >
              <Text
                style={
                  styles.modalCancelText
                }
              >
                Go back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


function SectionHeader({
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
        styles.sectionHeader
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


function ScheduleItem({
  icon,
  label,
  value,
}: {
  icon:
    IconName;

  label:
    string;

  value:
    string;
}) {
  return (
    <View
      style={
        styles.scheduleItem
      }
    >
      <View
        style={
          styles.scheduleIcon
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
            COLORS.white
          }
        />
      </View>

      <View
        style={
          styles.scheduleTextBlock
        }
      >
        <Text
          style={
            styles.scheduleLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.scheduleValue
          }
          numberOfLines={
            2
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


function ContactRow({
  icon,
  label,
  value,
}: {
  icon:
    IconName;

  label:
    string;

  value:
    string;
}) {
  return (
    <View
      style={
        styles.contactRow
      }
    >
      <View
        style={
          styles.contactIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            18
          }
          color={
            COLORS.navy
          }
        />
      </View>

      <View
        style={
          styles.contactContent
        }
      >
        <Text
          style={
            styles.contactLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.contactValue
          }
          selectable
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


function ActionRow({
  icon,
  title,
  description,
  tone = 'default',
  disabled,
  onPress,
}: {
  icon:
    IconName;

  title:
    string;

  description:
    string;

  tone?:
    | 'default'
    | 'orange'
    | 'danger';

  disabled:
    boolean;

  onPress:
    () => void;
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
      activeOpacity={
        0.78
      }
      disabled={
        disabled
      }
      style={[
        styles.actionRow,

        disabled &&
          styles.actionRowDisabled,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={[
          styles.actionRowIcon,

          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={
            20
          }
          color={
            iconColor
          }
        />
      </View>

      <View
        style={
          styles.actionRowContent
        }
      >
        <Text
          style={[
            styles.actionRowTitle,

            tone ===
              'danger'
            &&
              styles.actionRowTitleDanger,

            tone ===
              'orange'
            &&
              styles.actionRowTitleOrange,
          ]}
        >
          {title}
        </Text>

        <Text
          style={
            styles.actionRowDescription
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
          disabled
            ? COLORS.textLight
            : iconColor
        }
      />
    </TouchableOpacity>
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

    heroCard: {
      marginTop:
        SPACING.lg,

      padding:
        18,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.primary,

      ...SHADOWS.card,
    },

    heroTopRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        12,
    },

    heroServiceIcon: {
      width:
        46,

      height:
        46,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        15,

      backgroundColor:
        COLORS.navyMuted,
    },

    statusBadge: {
      minHeight:
        31,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      paddingHorizontal:
        10,

      borderRadius:
        RADII.pill,
    },

    statusText: {
      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },

    serviceName: {
      marginTop:
        18,

      color:
        COLORS.white,

      fontSize:
        23,

      lineHeight:
        29,

      fontWeight:
        '800',

      letterSpacing:
        -0.5,
    },

    heroPriceRow: {
      marginTop:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,
    },

    heroPrice: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    heroPriceDot: {
      width:
        4,

      height:
        4,

      borderRadius:
        2,

      backgroundColor:
        COLORS.textLight,
    },

    heroDuration: {
      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '600',
    },

    schedulePanel: {
      marginTop:
        18,

      flexDirection:
        'row',

      padding:
        13,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.navySoft,
    },

    scheduleItem: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    scheduleIcon: {
      width:
        34,

      height:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        11,

      backgroundColor:
        COLORS.navyMuted,
    },

    scheduleTextBlock: {
      flex:
        1,

      minWidth:
        0,
    },

    scheduleLabel: {
      color:
        '#AEB8C5',

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    scheduleValue: {
      marginTop:
        3,

      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,

      fontWeight:
        '700',
    },

    scheduleDivider: {
      width:
        1,

      marginHorizontal:
        12,

      backgroundColor:
        COLORS.navyMuted,
    },

    errorBox: {
      marginTop:
        SPACING.md,

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

    sectionHeader: {
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

    customerCard: {
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

    customerHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    customerAvatar: {
      width:
        48,

      height:
        48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.primary,
    },

    customerInitial: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',
    },

    customerIdentity: {
      flex:
        1,

      minWidth:
        0,
    },

    customerName: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.cardTitle,

      fontWeight:
        '800',
    },

    customerLabel: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,
    },

    contactDivider: {
      height:
        1,

      marginVertical:
        15,

      backgroundColor:
        COLORS.border,
    },

    contactRow: {
      minHeight:
        54,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    contactIcon: {
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
        COLORS.surfaceSoft,
    },

    contactContent: {
      flex:
        1,

      minWidth:
        0,
    },

    contactLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    contactValue: {
      marginTop:
        2,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,

      fontWeight:
        '700',
    },

    notesCard: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        12,

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

    notesIcon: {
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

    notesText: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },

    historyDangerCard: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.danger,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.dangerSoft,
    },

    historyDangerIcon: {
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
        COLORS.surface,
    },

    historyContent: {
      flex:
        1,
    },

    historyDangerTitle: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    historyText: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    noShowHistoryCard: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.orange,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.orangeSoft,
    },

    noShowHistoryIcon: {
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
        COLORS.surface,
    },

    noShowHistoryTitle: {
      color:
        COLORS.orange,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    historyTimestamp: {
      marginTop:
        7,

      color:
        COLORS.orange,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '700',
    },

    actionCard: {
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

    actionHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      marginBottom:
        16,
    },

    actionHeaderIcon: {
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
        COLORS.warningSoft,
    },

    actionHeaderContent: {
      flex:
        1,
    },

    actionHeaderTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    actionHeaderText: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
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

    dangerOutlineButton: {
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
        10,

      paddingHorizontal:
        16,

      borderWidth:
        1,

      borderColor:
        COLORS.danger,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.dangerSoft,
    },

    dangerOutlineText: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    disabledButton: {
      opacity:
        0.5,
    },

    actionRow: {
      minHeight:
        70,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    actionRowDisabled: {
      opacity:
        0.48,
    },

    actionRowIcon: {
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

    actionRowContent: {
      flex:
        1,
    },

    actionRowTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    actionRowTitleDanger: {
      color:
        COLORS.danger,
    },

    actionRowTitleOrange: {
      color:
        COLORS.orange,
    },

    actionRowDescription: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    actionRowDivider: {
      height:
        1,

      marginLeft:
        53,

      backgroundColor:
        COLORS.border,
    },

    finalStatusCard: {
      marginTop:
        SPACING.xxl,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

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

    finalStatusContent: {
      flex:
        1,
    },

    finalStatusTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },

    finalStatusText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    modalKeyboardView: {
      flex:
        1,
    },

    sheetOverlay: {
      flex:
        1,

      justifyContent:
        'flex-end',

      backgroundColor:
        'rgba(10, 18, 27, 0.48)',
    },

    reasonSheet: {
      width:
        '100%',

      maxWidth:
        LAYOUT.contentMaxWidth,

      alignSelf:
        'center',

      paddingHorizontal:
        LAYOUT.screenPadding,

      paddingTop:
        10,

      paddingBottom:
        22,

      borderTopLeftRadius:
        26,

      borderTopRightRadius:
        26,

      backgroundColor:
        COLORS.surface,
    },

    sheetHandle: {
      width:
        42,

      height:
        4,

      alignSelf:
        'center',

      marginBottom:
        18,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.border,
    },

    reasonSheetHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,
    },

    reasonSheetIcon: {
      width:
        44,

      height:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        COLORS.dangerSoft,
    },

    reasonSheetHeading: {
      flex:
        1,
    },

    reasonSheetTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',
    },

    reasonSheetSubtitle: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,
    },

    reasonInput: {
      minHeight:
        125,

      marginTop:
        18,

      paddingHorizontal:
        14,

      paddingVertical:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      color:
        COLORS.text,

      backgroundColor:
        COLORS.surfaceSoft,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,
    },

    reasonMetaRow: {
      marginTop:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    reasonRequirement: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,
    },

    reasonCounter: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },

    reasonErrorText: {
      marginTop:
        8,

      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },

    reasonContinueButton: {
      minHeight:
        LAYOUT.buttonHeight,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        16,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.danger,
    },

    reasonContinueText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    sheetCancelButton: {
      minHeight:
        46,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        4,
    },

    sheetCancelText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',
    },

    confirmationOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,

      backgroundColor:
        'rgba(10, 18, 27, 0.52)',
    },

    confirmationModal: {
      width:
        '100%',

      maxWidth:
        380,

      alignItems:
        'center',

      paddingHorizontal:
        22,

      paddingTop:
        26,

      paddingBottom:
        18,

      borderRadius:
        24,

      backgroundColor:
        COLORS.surface,

      ...SHADOWS.floating,
    },

    confirmationIcon: {
      width:
        62,

      height:
        62,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        31,
    },

    confirmationTitle: {
      marginTop:
        16,

      color:
        COLORS.text,

      fontSize:
        20,

      lineHeight:
        25,

      fontWeight:
        '800',

      textAlign:
        'center',
    },

    confirmationDescription: {
      marginTop:
        8,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,

      textAlign:
        'center',
    },

    reasonPreview: {
      width:
        '100%',

      marginTop:
        17,

      padding:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    reasonPreviewLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '700',
    },

    reasonPreviewText: {
      marginTop:
        5,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,

      fontWeight:
        '600',
    },

    modalPrimaryButton: {
      width:
        '100%',

      minHeight:
        LAYOUT.buttonHeight,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        20,

      borderRadius:
        RADII.md,
    },

    modalConfirmButton: {
      backgroundColor:
        COLORS.primary,
    },

    modalNoShowButton: {
      backgroundColor:
        COLORS.orange,
    },

    modalDangerButton: {
      backgroundColor:
        COLORS.danger,
    },

    modalPrimaryButtonText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },

    modalCancelButton: {
      minHeight:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        4,

      paddingHorizontal:
        20,
    },

    modalCancelText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',
    },

    loadingContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,
    },

    loadingIcon: {
      width:
        56,

      height:
        56,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        18,

      backgroundColor:
        COLORS.surface,
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
      marginTop:
        5,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      textAlign:
        'center',
    },

    unavailableContainer: {
      flex:
        1,

      paddingHorizontal:
        LAYOUT.screenPadding,

      paddingTop:
        SPACING.sm,
    },

    unavailableContent: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingBottom:
        70,
    },

    unavailableIcon: {
      width:
        64,

      height:
        64,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        20,

      backgroundColor:
        COLORS.accentSoft,
    },

    unavailableTitle: {
      marginTop:
        15,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',
    },

    unavailableText: {
      maxWidth:
        300,

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