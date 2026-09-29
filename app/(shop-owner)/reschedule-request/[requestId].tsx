import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useEffect,
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
  approveShopOwnerRescheduleRequest,
  getShopOwnerRescheduleRequest,
  rejectShopOwnerRescheduleRequest,
} from '@/src/services/shop-owner-api';
import type {
  ShopOwnerRescheduleRequest,
  ShopOwnerRescheduleRequestStatus,
} from '@/src/types/shop-owner';


type IconName =
  ComponentProps<typeof Ionicons>['name'];

type ConfirmationAction =
  | 'approve'
  | 'reject'
  | null;


/* ==========================================================================
   ROUTE VALUE
   ========================================================================== */

function routeValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return Array.isArray(
    value,
  )
    ? value[0]
    : value;
}


/* ==========================================================================
   FORMAT PRICE
   ========================================================================== */

function formatPrice(
  value:
    | string
    | number,
): string {
  const numeric =
    Number(
      value,
    );

  return Number.isNaN(
    numeric,
  )
    ? String(
        value,
      )
    : `₱${numeric.toFixed(2)}`;
}


/* ==========================================================================
   FORMAT DATE
   ========================================================================== */

function formatDate(
  value: string,
): string {
  const parts =
    value
      .split('-')
      .map(
        Number,
      );

  if (
    parts.length !== 3
    ||
    parts.some(
      (
        part,
      ) =>
        Number.isNaN(
          part,
        ),
    )
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] =
    parts;

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return date.toLocaleDateString(
    'en-PH',
    {
      weekday:
        'short',

      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',
    },
  );
}


/* ==========================================================================
   FORMAT TIME
   ========================================================================== */

function formatTime(
  value: string,
): string {
  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/,
    );

  if (
    !match
  ) {
    return value;
  }

  const hour24 =
    Number(
      match[1],
    );

  const minute =
    match[2];

  if (
    Number.isNaN(
      hour24,
    )
    ||
    hour24 < 0
    ||
    hour24 > 23
  ) {
    return value;
  }

  const suffix =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour12 =
    hour24 % 12
    ||
    12;

  return `${hour12}:${minute} ${suffix}`;
}


/* ==========================================================================
   FORMAT TIMESTAMP
   ========================================================================== */

function formatTimestamp(
  value:
    string
    | null,
): string | null {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value,
    );

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
      dateStyle:
        'medium',

      timeStyle:
        'short',

      timeZone:
        'Asia/Manila',
    },
  ).format(
    date,
  );
}


/* ==========================================================================
   STATUS PRESENTATION
   ========================================================================== */

function statusPresentation(
  status:
    ShopOwnerRescheduleRequestStatus,
): {
  background:
    string;

  text:
    string;

  icon:
    IconName;
} {
  switch (
    status
  ) {
    case 'pending':
      return {
        background:
          COLORS.warningSoft,

        text:
          COLORS.warning,

        icon:
          'time-outline',
      };

    case 'approved':
      return {
        background:
          COLORS.greenSoft,

        text:
          COLORS.green,

        icon:
          'checkmark-circle-outline',
      };

    case 'rejected':
      return {
        background:
          COLORS.dangerSoft,

        text:
          COLORS.danger,

        icon:
          'close-circle-outline',
      };

    case 'withdrawn':
      return {
        background:
          COLORS.surfaceSoft,

        text:
          COLORS.textMuted,

        icon:
          'return-up-back-outline',
      };
  }
}


/* ==========================================================================
   SCREEN
   ========================================================================== */

export default function ShopOwnerRescheduleRequestDetailScreen() {
  const params =
    useLocalSearchParams<{
      requestId?:
        | string
        | string[];
    }>();

  const {
    token,
  } =
    useAuth();

  const requestId =
    Number(
      routeValue(
        params.requestId,
      ),
    );


  /* ==========================================================================
     STATE
     ========================================================================== */

  const [
    request,
    setRequest,
  ] =
    useState<
      ShopOwnerRescheduleRequest
      | null
    >(
      null,
    );

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState('');

  const [
    showRejectSheet,
    setShowRejectSheet,
  ] =
    useState(
      false,
    );

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
    successMessage,
    setSuccessMessage,
  ] =
    useState('');


  /* ==========================================================================
     LOAD REQUEST
     ========================================================================== */

  const loadRequest =
    useCallback(
      async (
        showLoading = true,
      ): Promise<void> => {
        if (
          !token
          ||
          !Number.isInteger(
            requestId,
          )
          ||
          requestId < 1
        ) {
          setIsLoading(
            false,
          );

          setErrorMessage(
            'The selected reschedule request is invalid.',
          );

          return;
        }

        if (
          showLoading
        ) {
          setIsLoading(
            true,
          );
        }

        setErrorMessage('');

        try {
          const response =
            await getShopOwnerRescheduleRequest(
              token,
              requestId,
            );

          setRequest(
            response
              .data
              .reschedule_request,
          );
        } catch (
          error
        ) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load this reschedule request.',
          );
        } finally {
          if (
            showLoading
          ) {
            setIsLoading(
              false,
            );
          }
        }
      },
      [
        requestId,
        token,
      ],
    );


  useEffect(
    () => {
      void loadRequest();
    },
    [
      loadRequest,
    ],
  );


  /* ==========================================================================
     DERIVED DATA
     ========================================================================== */

  const appointment =
    request?.appointment;

  const pending =
    request?.status ===
    'pending';

  const customerName =
    appointment
      ?.customer
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

  const createdAt =
    useMemo(
      () =>
        formatTimestamp(
          request?.created_at
          ??
          null,
        ),
      [
        request?.created_at,
      ],
    );

  const reviewedAt =
    useMemo(
      () =>
        formatTimestamp(
          request?.reviewed_at
          ??
          null,
        ),
      [
        request?.reviewed_at,
      ],
    );


  /* ==========================================================================
     MESSAGE HELPERS
     ========================================================================== */

  function clearMessages(): void {
    setErrorMessage('');
    setSuccessMessage('');
  }


  /* ==========================================================================
     APPROVE
     ========================================================================== */

  function requestApprove(): void {
    if (
      !pending
      ||
      isProcessing
    ) {
      return;
    }

    clearMessages();

    setConfirmationAction(
      'approve',
    );
  }


  async function performApprove(): Promise<void> {
    if (
      !token
      ||
      isProcessing
      ||
      !pending
    ) {
      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await approveShopOwnerRescheduleRequest(
          token,
          requestId,
        );

      setRequest(
        response
          .data
          .reschedule_request,
      );

      setSuccessMessage(
        response.message
        ??
        'The reschedule request was approved successfully.',
      );

      setConfirmationAction(
        null,
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to approve this request.',
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


  /* ==========================================================================
     REJECT
     ========================================================================== */

  function openRejectSheet(): void {
    if (
      !pending
      ||
      isProcessing
    ) {
      return;
    }

    clearMessages();

    setRejectionReason('');

    setShowRejectSheet(
      true,
    );
  }


  function closeRejectSheet(): void {
    if (
      isProcessing
    ) {
      return;
    }

    setShowRejectSheet(
      false,
    );

    setRejectionReason('');

    setErrorMessage('');
  }


  function requestRejectConfirmation(): void {
    if (
      !pending
      ||
      isProcessing
    ) {
      return;
    }

    const cleanReason =
      rejectionReason.trim();

    if (
      cleanReason.length < 5
      ||
      cleanReason.length > 1000
    ) {
      setErrorMessage(
        'Rejection reason must contain between 5 and 1000 characters.',
      );

      return;
    }

    setErrorMessage('');

    setConfirmationAction(
      'reject',
    );
  }


  async function performReject(): Promise<void> {
    if (
      !token
      ||
      isProcessing
      ||
      !pending
    ) {
      return;
    }

    const cleanReason =
      rejectionReason.trim();

    if (
      cleanReason.length < 5
      ||
      cleanReason.length > 1000
    ) {
      setConfirmationAction(
        null,
      );

      setErrorMessage(
        'Rejection reason must contain between 5 and 1000 characters.',
      );

      return;
    }

    setIsProcessing(
      true,
    );

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await rejectShopOwnerRescheduleRequest(
          token,
          requestId,
          cleanReason,
        );

      setRequest(
        response
          .data
          .reschedule_request,
      );

      setRejectionReason('');

      setShowRejectSheet(
        false,
      );

      setConfirmationAction(
        null,
      );

      setSuccessMessage(
        response.message
        ??
        'The reschedule request was rejected successfully.',
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to reject this request.',
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


  /* ==========================================================================
     CONFIRMED ACTION
     ========================================================================== */

  async function performConfirmedAction(): Promise<void> {
    if (
      confirmationAction ===
      'approve'
    ) {
      await performApprove();

      return;
    }

    if (
      confirmationAction ===
      'reject'
    ) {
      await performReject();
    }
  }


  /* ==========================================================================
     LOADING
     ========================================================================== */

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
            Loading reschedule request
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Getting the current appointment and requested schedule.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================================
     UNAVAILABLE
     ========================================================================== */

  if (
    !request
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
            onPress={
              () =>
                router.back()
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
              styles.unavailableContent
            }
          >
            <View
              style={
                styles.unavailableIcon
              }
            >
              <Ionicons
                name="swap-horizontal-outline"
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
              Request unavailable
            </Text>

            <Text
              style={
                styles.unavailableText
              }
            >
              {errorMessage
              ||
              'Unable to display this reschedule request.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================================
     DISPLAY DATA
     ========================================================================== */

  const status =
    statusPresentation(
      request.status,
    );

  const appointmentDate =
    appointment
      ? formatDate(
          appointment.appointment_date,
        )
      : 'Unavailable';

  const appointmentTime =
    appointment
      ? `${formatTime(
          appointment.starts_at,
        )} - ${formatTime(
          appointment.ends_at,
        )}`
      : 'Unavailable';

  const requestedDate =
    formatDate(
      request.requested_date,
    );

  const requestedTime =
    `${formatTime(
      request.requested_starts_at,
    )} - ${formatTime(
      request.requested_ends_at,
    )}`;

  const confirmationIsReject =
    confirmationAction ===
    'reject';


  /* ==========================================================================
     UI
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
        keyboardShouldPersistTaps="handled"
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
            accessibilityLabel="Go back"
            onPress={
              () =>
                router.back()
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
              Reschedule request
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Request #{request.id}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={
              0.7
            }
            accessibilityRole="button"
            accessibilityLabel="Refresh request"
            disabled={
              isProcessing
            }
            onPress={
              () =>
                void loadRequest(
                  false,
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
            SCHEDULE CHANGE
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Compare the appointment before making a decision
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Review the current appointment, the customer&apos;s requested schedule, and the reason for the change.
          </Text>
        </View>


        {/* ================================================================
            HERO
            ================================================================ */}

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
                styles.heroIcon
              }
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={
                  24
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
                  request.status_label
                }
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.heroTitle
            }
          >
            {
              appointment
                ?.service_snapshot
                .name
              ||
              'Appointment reschedule'
            }
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
          >
            Customer requested a different date and time for this booking.
          </Text>

          <View
            style={
              styles.heroMetaRow
            }
          >
            {appointment ? (
              <HeroMeta
                label="Price"
                value={
                  formatPrice(
                    appointment
                      .service_snapshot
                      .price,
                  )
                }
              />
            ) : null}

            {appointment ? (
              <View
                style={
                  styles.heroMetaDivider
                }
              />
            ) : null}

            {appointment ? (
              <HeroMeta
                label="Duration"
                value={
                  `${appointment
                    .service_snapshot
                    .duration_minutes} min`
                }
              />
            ) : null}

            {createdAt ? (
              <>
                <View
                  style={
                    styles.heroMetaDivider
                  }
                />

                <HeroMeta
                  label="Requested"
                  value={
                    createdAt
                  }
                  flexible
                />
              </>
            ) : null}
          </View>
        </View>


        {/* ================================================================
            ERROR
            ================================================================ */}

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Action needs attention"
            message={
              errorMessage
            }
          />
        ) : null}


        {/* ================================================================
            SUCCESS
            ================================================================ */}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Request updated"
            message={
              successMessage
            }
          />
        ) : null}


        {/* ================================================================
            COMPARISON
            ================================================================ */}

        <SectionHeading
          title="Schedule comparison"
          subtitle="Compare the appointment schedule with the customer's requested change."
        />

        <View
          style={
            styles.comparisonCard
          }
        >
          <SchedulePanel
            icon="calendar-outline"
            label="Appointment schedule"
            date={
              appointmentDate
            }
            time={
              appointmentTime
            }
            muted
          />

          <View
            style={
              styles.comparisonArrow
            }
          >
            <View
              style={
                styles.comparisonArrowCircle
              }
            >
              <Ionicons
                name="arrow-forward"
                size={
                  18
                }
                color={
                  COLORS.navy
                }
              />
            </View>
          </View>

          <SchedulePanel
            icon="calendar-clear-outline"
            label="Requested schedule"
            date={
              requestedDate
            }
            time={
              requestedTime
            }
          />
        </View>


        {/* ================================================================
            CUSTOMER
            ================================================================ */}

        {appointment?.customer ? (
          <>
            <SectionHeading
              title="Customer"
              subtitle="Contact details for the customer who requested the change."
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
                      styles.customerType
                    }
                  >
                    StyleHub customer
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.customerDivider
                }
              />

              <ContactRow
                icon="mail-outline"
                label="Email"
                value={
                  appointment
                    .customer
                    .email
                }
              />

              <ContactRow
                icon="call-outline"
                label="Mobile number"
                value={
                  appointment
                    .customer
                    .phone_number
                }
              />
            </View>
          </>
        ) : null}


        {/* ================================================================
            CUSTOMER REASON
            ================================================================ */}

        <SectionHeading
          title="Customer reason"
          subtitle="Why the customer wants to move the appointment."
        />

        <View
          style={
            styles.reasonCard
          }
        >
          <View
            style={
              styles.reasonIcon
            }
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
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
              styles.reasonText
            }
          >
            {
              request
                .customer_reason
                ?.trim()
              ||
              'The customer did not provide a reason.'
            }
          </Text>
        </View>


        {/* ================================================================
            REQUEST HISTORY
            ================================================================ */}

        {!pending ? (
          <>
            <SectionHeading
              title="Request history"
              subtitle="The latest recorded decision information for this request."
            />

            <View
              style={
                styles.historyCard
              }
            >
              <HistoryRow
                icon={
                  status.icon
                }
                title="Current status"
                value={
                  request.status_label
                }
                iconColor={
                  status.text
                }
                iconBackground={
                  status.background
                }
              />

              {request.reviewer ? (
                <>
                  <View
                    style={
                      styles.historyDivider
                    }
                  />

                  <HistoryRow
                    icon="person-outline"
                    title="Reviewed by"
                    value={
                      request
                        .reviewer
                        .full_name
                    }
                    iconColor={
                      COLORS.navy
                    }
                    iconBackground={
                      COLORS.accentSoft
                    }
                  />
                </>
              ) : null}

              {reviewedAt ? (
                <>
                  <View
                    style={
                      styles.historyDivider
                    }
                  />

                  <HistoryRow
                    icon="time-outline"
                    title="Reviewed at"
                    value={
                      reviewedAt
                    }
                    iconColor={
                      COLORS.blue
                    }
                    iconBackground={
                      COLORS.blueSoft
                    }
                  />
                </>
              ) : null}

              {request.rejection_reason ? (
                <>
                  <View
                    style={
                      styles.historyDivider
                    }
                  />

                  <View
                    style={
                      styles.rejectionHistory
                    }
                  >
                    <View
                      style={
                        styles.rejectionHistoryIcon
                      }
                    >
                      <Ionicons
                        name="document-text-outline"
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
                        styles.rejectionHistoryContent
                      }
                    >
                      <Text
                        style={
                          styles.rejectionHistoryTitle
                        }
                      >
                        Rejection reason
                      </Text>

                      <Text
                        style={
                          styles.rejectionHistoryText
                        }
                      >
                        {
                          request.rejection_reason
                        }
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </>
        ) : null}


        {/* ================================================================
            REVIEW REQUEST
            ================================================================ */}

        {pending ? (
          <>
            <SectionHeading
              title="Review request"
              subtitle="Approve only after checking that the requested schedule works for your shop."
            />

            <View
              style={
                styles.actionCard
              }
            >
              <View
                style={
                  styles.actionNotice
                }
              >
                <View
                  style={
                    styles.actionNoticeIcon
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={
                      20
                    }
                    color={
                      COLORS.blue
                    }
                  />
                </View>

                <View
                  style={
                    styles.actionNoticeContent
                  }
                >
                  <Text
                    style={
                      styles.actionNoticeTitle
                    }
                  >
                    Laravel re-checks the schedule
                  </Text>

                  <Text
                    style={
                      styles.actionNoticeText
                    }
                  >
                    Approval uses the existing request. The backend revalidates business hours and appointment conflicts before updating the appointment.
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
                accessibilityRole="button"
                accessibilityLabel="Approve reschedule request"
                onPress={
                  requestApprove
                }
                style={[
                  styles.approveButton,

                  isProcessing
                  &&
                    styles.disabledButton,
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.approveButtonText
                  }
                >
                  Approve requested schedule
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={
                  0.82
                }
                disabled={
                  isProcessing
                }
                accessibilityRole="button"
                accessibilityLabel="Reject reschedule request"
                onPress={
                  openRejectSheet
                }
                style={[
                  styles.rejectButton,

                  isProcessing
                  &&
                    styles.disabledButton,
                ]}
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
                    styles.rejectButtonText
                  }
                >
                  Reject request
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (

          /* ==============================================================
             FINAL STATUS
             ============================================================== */

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
                No decision is required
              </Text>

              <Text
                style={
                  styles.finalStatusText
                }
              >
                This reschedule request is {request.status_label.toLowerCase()} and is no longer awaiting an approval or rejection decision.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>


      {/* ================================================================
          REJECTION REASON BOTTOM SHEET
          ================================================================ */}

      <Modal
        visible={
          showRejectSheet
          &&
          confirmationAction ===
            null
        }
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={
          closeRejectSheet
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
                styles.rejectSheet
              }
            >
              <View
                style={
                  styles.sheetHandle
                }
              />

              <View
                style={
                  styles.rejectSheetHeader
                }
              >
                <View
                  style={
                    styles.rejectSheetIcon
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
                    styles.rejectSheetHeading
                  }
                >
                  <Text
                    style={
                      styles.rejectSheetTitle
                    }
                  >
                    Why are you rejecting this request?
                  </Text>

                  <Text
                    style={
                      styles.rejectSheetSubtitle
                    }
                  >
                    Give the customer a clear reason why the requested schedule cannot be approved.
                  </Text>
                </View>
              </View>

              <TextInput
                value={
                  rejectionReason
                }
                onChangeText={
                  setRejectionReason
                }
                editable={
                  !isProcessing
                }
                multiline
                textAlignVertical="top"
                maxLength={
                  1000
                }
                placeholder="Example: The requested time is no longer available."
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
                  {rejectionReason.length}/1000
                </Text>
              </View>

              {errorMessage ? (
                <Text
                  style={
                    styles.sheetErrorText
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
                onPress={
                  requestRejectConfirmation
                }
                style={[
                  styles.rejectContinueButton,

                  isProcessing
                  &&
                    styles.disabledButton,
                ]}
              >
                <Text
                  style={
                    styles.rejectContinueText
                  }
                >
                  Continue to reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={
                  0.7
                }
                disabled={
                  isProcessing
                }
                onPress={
                  closeRejectSheet
                }
                style={
                  styles.sheetCancelButton
                }
              >
                <Text
                  style={
                    styles.sheetCancelText
                  }
                >
                  Keep request pending
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* ================================================================
          CONFIRMATION MODAL
          ================================================================ */}

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
                    confirmationIsReject
                      ? COLORS.dangerSoft
                      : COLORS.greenSoft,
                },
              ]}
            >
              <Ionicons
                name={
                  confirmationIsReject
                    ? 'close-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={
                  30
                }
                color={
                  confirmationIsReject
                    ? COLORS.danger
                    : COLORS.green
                }
              />
            </View>

            <Text
              style={
                styles.confirmationTitle
              }
            >
              {confirmationIsReject
                ? 'Reject reschedule request?'
                : 'Approve requested schedule?'}
            </Text>

            <Text
              style={
                styles.confirmationDescription
              }
            >
              {confirmationIsReject
                ? 'The customer will see your rejection reason and the requested schedule will not be approved.'
                : 'Laravel will re-check business hours and appointment conflicts before changing the appointment.'}
            </Text>

            {confirmationIsReject ? (
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
                  Rejection reason
                </Text>

                <Text
                  style={
                    styles.reasonPreviewText
                  }
                >
                  {
                    rejectionReason.trim()
                  }
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.approvalPreview
                }
              >
                <Text
                  style={
                    styles.approvalPreviewLabel
                  }
                >
                  Requested schedule
                </Text>

                <Text
                  style={
                    styles.approvalPreviewDate
                  }
                >
                  {requestedDate}
                </Text>

                <Text
                  style={
                    styles.approvalPreviewTime
                  }
                >
                  {requestedTime}
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={
                0.84
              }
              disabled={
                isProcessing
              }
              onPress={
                () =>
                  void performConfirmedAction()
              }
              style={[
                styles.confirmationPrimaryButton,

                confirmationIsReject
                  ? styles.confirmationRejectButton
                  : styles.confirmationApproveButton,

                isProcessing
                &&
                  styles.disabledButton,
              ]}
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
                    styles.confirmationPrimaryText
                  }
                >
                  {confirmationIsReject
                    ? 'Reject request'
                    : 'Approve reschedule'}
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
              onPress={
                () =>
                  setConfirmationAction(
                    null,
                  )
              }
              style={
                styles.confirmationCancelButton
              }
            >
              <Text
                style={
                  styles.confirmationCancelText
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
   HERO META
   ========================================================================== */

function HeroMeta({
  label,
  value,
  flexible = false,
}: {
  label:
    string;

  value:
    string;

  flexible?:
    boolean;
}) {
  return (
    <View
      style={[
        styles.heroMeta,

        flexible
        &&
          styles.heroMetaFlexible,
      ]}
    >
      <Text
        style={
          styles.heroMetaLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.heroMetaValue
        }
        numberOfLines={
          2
        }
      >
        {value}
      </Text>
    </View>
  );
}


/* ==========================================================================
   SCHEDULE PANEL
   ========================================================================== */

function SchedulePanel({
  icon,
  label,
  date,
  time,
  muted = false,
}: {
  icon:
    IconName;

  label:
    string;

  date:
    string;

  time:
    string;

  muted?:
    boolean;
}) {
  return (
    <View
      style={[
        styles.schedulePanel,

        muted
        &&
          styles.schedulePanelMuted,
      ]}
    >
      <View
        style={[
          styles.scheduleIcon,

          muted
            ? styles.scheduleIconMuted
            : styles.scheduleIconRequested,
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
            muted
              ? COLORS.textMuted
              : COLORS.navy
          }
        />
      </View>

      <Text
        style={[
          styles.scheduleLabel,

          !muted
          &&
            styles.scheduleLabelRequested,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.scheduleDate,

          !muted
          &&
            styles.scheduleDateRequested,
        ]}
      >
        {date}
      </Text>

      <Text
        style={
          styles.scheduleTime
        }
      >
        {time}
      </Text>
    </View>
  );
}


/* ==========================================================================
   CONTACT ROW
   ========================================================================== */

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


/* ==========================================================================
   HISTORY ROW
   ========================================================================== */

function HistoryRow({
  icon,
  title,
  value,
  iconColor,
  iconBackground,
}: {
  icon:
    IconName;

  title:
    string;

  value:
    string;

  iconColor:
    string;

  iconBackground:
    string;
}) {
  return (
    <View
      style={
        styles.historyRow
      }
    >
      <View
        style={[
          styles.historyIcon,

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
            19
          }
          color={
            iconColor
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
            styles.historyLabel
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.historyValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


/* ==========================================================================
   MESSAGE BOX
   ========================================================================== */

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
        570,

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
       HERO
       ====================================================================== */

    heroCard: {
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


    heroIcon: {
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


    heroTitle: {
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


    heroSubtitle: {
      marginTop:
        6,

      color:
        '#D4DAE1',

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },


    heroMetaRow: {
      marginTop:
        17,

      paddingTop:
        15,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.navyMuted,
    },


    heroMeta: {
      minWidth:
        70,
    },


    heroMetaFlexible: {
      flex:
        1,

      minWidth:
        0,
    },


    heroMetaLabel: {
      color:
        '#AEB8C5',

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },


    heroMetaValue: {
      marginTop:
        3,

      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        17,

      fontWeight:
        '800',
    },


    heroMetaDivider: {
      width:
        1,

      minHeight:
        34,

      marginHorizontal:
        12,

      backgroundColor:
        COLORS.navyMuted,
    },


    /* ======================================================================
       MESSAGES
       ====================================================================== */

    messageBox: {
      marginTop:
        14,

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


    /* ======================================================================
       SECTIONS
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
       SCHEDULE COMPARISON
       ====================================================================== */

    comparisonCard: {
      flexDirection:
        'row',

      alignItems:
        'stretch',

      padding:
        12,

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


    schedulePanel: {
      flex:
        1,

      minWidth:
        0,

      padding:
        12,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.accentSoft,
    },


    schedulePanelMuted: {
      backgroundColor:
        COLORS.surfaceSoft,
    },


    scheduleIcon: {
      width:
        36,

      height:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,
    },


    scheduleIconMuted: {
      backgroundColor:
        COLORS.surface,
    },


    scheduleIconRequested: {
      backgroundColor:
        COLORS.surface,
    },


    scheduleLabel: {
      marginTop:
        10,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },


    scheduleLabelRequested: {
      color:
        COLORS.navy,
    },


    scheduleDate: {
      marginTop:
        7,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,

      fontWeight:
        '700',
    },


    scheduleDateRequested: {
      color:
        COLORS.navy,

      fontWeight:
        '800',
    },


    scheduleTime: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.micro,

      lineHeight:
        15,

      fontWeight:
        '600',
    },


    comparisonArrow: {
      width:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    comparisonArrowCircle: {
      width:
        34,

      height:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surface,
    },


    /* ======================================================================
       CUSTOMER
       ====================================================================== */

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


    customerType: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,
    },


    customerDivider: {
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


    /* ======================================================================
       CUSTOMER REASON
       ====================================================================== */

    reasonCard: {
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


    reasonIcon: {
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


    reasonText: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        21,
    },


    /* ======================================================================
       HISTORY
       ====================================================================== */

    historyCard: {
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


    historyRow: {
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


    historyIcon: {
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


    historyContent: {
      flex:
        1,

      minWidth:
        0,
    },


    historyLabel: {
      color:
        COLORS.textLight,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '600',
    },


    historyValue: {
      marginTop:
        3,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.body,

      lineHeight:
        20,

      fontWeight:
        '700',
    },


    historyDivider: {
      height:
        1,

      marginLeft:
        65,

      backgroundColor:
        COLORS.border,
    },


    rejectionHistory: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      paddingHorizontal:
        14,

      paddingVertical:
        13,
    },


    rejectionHistoryIcon: {
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
        COLORS.dangerSoft,
    },


    rejectionHistoryContent: {
      flex:
        1,
    },


    rejectionHistoryTitle: {
      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },


    rejectionHistoryText: {
      marginTop:
        4,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },


    /* ======================================================================
       ACTIONS
       ====================================================================== */

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


    actionNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,

      marginBottom:
        16,

      padding:
        13,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.blueSoft,
    },


    actionNoticeIcon: {
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


    actionNoticeContent: {
      flex:
        1,
    },


    actionNoticeTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },


    actionNoticeText: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },


    approveButton: {
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


    approveButtonText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },


    rejectButton: {
      minHeight:
        LAYOUT.buttonHeight,

      marginTop:
        10,

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

      borderWidth:
        1,

      borderColor:
        COLORS.danger,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.dangerSoft,
    },


    rejectButtonText: {
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


    /* ======================================================================
       REJECTION BOTTOM SHEET
       ====================================================================== */

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


    rejectSheet: {
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


    rejectSheetHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        11,
    },


    rejectSheetIcon: {
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


    rejectSheetHeading: {
      flex:
        1,
    },


    rejectSheetTitle: {
      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight:
        '800',
    },


    rejectSheetSubtitle: {
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


    sheetErrorText: {
      marginTop:
        8,

      color:
        COLORS.danger,

      fontSize:
        TYPOGRAPHY.caption,

      lineHeight:
        18,
    },


    rejectContinueButton: {
      minHeight:
        LAYOUT.buttonHeight,

      marginTop:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.danger,
    },


    rejectContinueText: {
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

      marginTop:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    sheetCancelText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',
    },


    /* ======================================================================
       CONFIRMATION MODAL
       ====================================================================== */

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


    approvalPreview: {
      width:
        '100%',

      marginTop:
        17,

      padding:
        13,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.greenSoft,
    },


    approvalPreviewLabel: {
      color:
        COLORS.green,

      fontSize:
        TYPOGRAPHY.micro,

      fontWeight:
        '800',
    },


    approvalPreviewDate: {
      marginTop:
        5,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '800',
    },


    approvalPreviewTime: {
      marginTop:
        3,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.caption,

      fontWeight:
        '600',
    },


    confirmationPrimaryButton: {
      width:
        '100%',

      minHeight:
        LAYOUT.buttonHeight,

      marginTop:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        RADII.md,
    },


    confirmationApproveButton: {
      backgroundColor:
        COLORS.primary,
    },


    confirmationRejectButton: {
      backgroundColor:
        COLORS.danger,
    },


    confirmationPrimaryText: {
      color:
        COLORS.white,

      fontSize:
        TYPOGRAPHY.body,

      fontWeight:
        '800',
    },


    confirmationCancelButton: {
      minHeight:
        44,

      marginTop:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        20,
    },


    confirmationCancelText: {
      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.secondary,

      fontWeight:
        '700',
    },


    /* ======================================================================
       LOADING
       ====================================================================== */

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
       UNAVAILABLE
       ====================================================================== */

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
        320,

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