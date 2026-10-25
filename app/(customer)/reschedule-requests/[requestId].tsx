
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  getCustomerRescheduleRequest,
  withdrawCustomerRescheduleRequest,
} from '@/src/services/customer-api';
import type {
  CustomerRescheduleRequest,
  RescheduleRequestStatus,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

type StatusPresentation = {
  icon: IconName;
  color: string;
  background: string;
  title: string;
  message: string;
};

type RequestModal = 'withdraw' | 'withdrawSuccess' | null;

/* ==========================================================
   HELPERS
   ========================================================== */

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusPresentation(
  status: RescheduleRequestStatus,
): StatusPresentation {
  switch (status) {
    case 'approved':
      return {
        icon: 'checkmark-circle-outline',
        color: COLORS.green,
        background: COLORS.greenSoft,
        title: 'Request approved',
        message:
          'The Shop Owner approved this schedule change. The appointment now follows the approved schedule.',
      };

    case 'pending':
      return {
        icon: 'time-outline',
        color: COLORS.warning,
        background: COLORS.warningSoft,
        title: 'Waiting for a decision',
        message:
          'Your existing appointment remains unchanged while this request is pending.',
      };

    case 'withdrawn':
      return {
        icon: 'arrow-undo-outline',
        color: COLORS.textMuted,
        background: COLORS.surfaceSoft,
        title: 'Request withdrawn',
        message:
          'You withdrew this request before it was approved or rejected.',
      };

    case 'rejected':
    default:
      return {
        icon: 'close-circle-outline',
        color: COLORS.danger,
        background: COLORS.dangerSoft,
        title: 'Request rejected',
        message:
          'The Shop Owner did not approve this requested schedule change.',
      };
  }
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'long',
      month: 'long',
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
    Number.isNaN(hour24) ||
    hour24 < 0 ||
    hour24 > 23
  ) {
    return value;
  }

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

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
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    }).format(date);
  } catch {
    return value;
  }
}

/* ==========================================================
   CUSTOMER RESCHEDULE REQUEST DETAILS
   ========================================================== */

export default function CustomerRescheduleRequestDetailScreen() {
  const params = useLocalSearchParams<{
    requestId?: string | string[];
  }>();

  const { token } = useAuth();

  const requestId = Number(
    getRouteValue(params.requestId),
  );

  const [request, setRequest] =
    useState<CustomerRescheduleRequest | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* ========================================================
     SHARED STYLEHUB MODAL STATE
     ======================================================== */

  const [activeModal, setActiveModal] =
    useState<RequestModal>(null);

  const [withdrawModalError, setWithdrawModalError] =
    useState('');

  /* ========================================================
     LOAD REQUEST FROM LARAVEL
     ======================================================== */

  const loadRequest = useCallback(
    async (refreshing = false): Promise<void> => {
      if (
        !token ||
        !Number.isInteger(requestId) ||
        requestId < 1
      ) {
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorMessage('The selected request is invalid.');
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getCustomerRescheduleRequest(
          token,
          requestId,
        );

        setRequest(response.data.reschedule_request);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load the reschedule request.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [requestId, token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadRequest();
      return undefined;
    }, [loadRequest]),
  );

  /* ========================================================
     OPEN WITHDRAW CONFIRMATION
     ======================================================== */

  function requestWithdrawConfirmation(): void {
    if (
      !request ||
      request.status !== 'pending' ||
      isSubmitting
    ) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setWithdrawModalError('');

    setActiveModal('withdraw');
  }

  /* ========================================================
     CLOSE WITHDRAW MODAL
     ======================================================== */

  function closeWithdrawConfirmation(): void {
    if (isSubmitting) {
      return;
    }

    setActiveModal(null);
    setWithdrawModalError('');
  }

  /* ========================================================
     WITHDRAW REQUEST VIA LARAVEL
     ======================================================== */

  async function performWithdraw(): Promise<void> {
    if (
      !token ||
      !request ||
      request.status !== 'pending' ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    setWithdrawModalError('');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response =
        await withdrawCustomerRescheduleRequest(
          token,
          request.id,
        );

      const updated = response.data.reschedule_request;

      setRequest({
        ...updated,
        appointment:
          updated.appointment ?? request.appointment,
      });

      setSuccessMessage(
        response.message ??
          'Your reschedule request was withdrawn successfully.',
      );

      /* Show the green success modal. */

      setActiveModal('withdrawSuccess');
    } catch (error) {
      /* Keep the error visible inside the red modal. */

      setWithdrawModalError(
        error instanceof ApiError
          ? error.message
          : 'Unable to withdraw the request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ========================================================
     OPEN APPOINTMENT DETAILS
     ======================================================== */

  function openAppointment(): void {
    if (!request?.appointment?.id) {
      return;
    }

    router.push({
      pathname:
        '/(customer)/customer-appointment/[appointmentId]',
      params: {
        appointmentId: String(request.appointment.id),
      },
    });
  }

  /* ========================================================
     LOADING STATE
     ======================================================== */

  if (isLoading && !request) {
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
            Loading request
          </Text>

          <Text style={styles.loadingText}>
            Getting the latest Shop Owner decision
            and schedule details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ========================================================
     UNAVAILABLE STATE
     ======================================================== */

  if (!request) {
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
            onPress={() => router.back()}
            style={styles.topIconButton}
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
                name="swap-horizontal-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.unavailableTitle}>
              Request unavailable
            </Text>

            <Text style={styles.unavailableText}>
              {errorMessage ||
                'Unable to display this reschedule request.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ========================================================
     DISPLAY VALUES
     ======================================================== */

  const status = statusPresentation(request.status);

  const createdAt = formatDateTime(request.created_at);
  const reviewedAt = formatDateTime(request.reviewed_at);
  const updatedAt = formatDateTime(request.updated_at);

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
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* TOP NAVIGATION */}

        <View style={styles.topBar}>
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

          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Request details
            </Text>

            <Text style={styles.topBarCaption}>
              Request #{request.id}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh request details"
            disabled={isSubmitting || isRefreshing}
            onPress={() => void loadRequest(true)}
            style={[
              styles.topIconButton,
              (isSubmitting || isRefreshing) &&
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

        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            RESCHEDULE REQUEST
          </Text>

          <Text style={styles.title}>
            Compare the appointment and the schedule
            you requested
          </Text>

          <Text style={styles.subtitle}>
            This page reflects the current request status
            returned by Laravel, including any Shop Owner
            rejection reason or review timestamp.
          </Text>
        </View>

        {/* PAGE ERRORS AND STATUS MESSAGES */}

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Request needs attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage && activeModal === null ? (
          <MessageBox
            type="success"
            title="Request updated"
            message={successMessage}
          />
        ) : null}

        {/* REQUEST STATUS HERO */}

        <View style={styles.statusHero}>
          <View style={styles.statusHeroTopRow}>
            <View style={styles.statusHeroIcon}>
              <Ionicons
                name="swap-horizontal-outline"
                size={24}
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
                color={status.color}
              />

              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: status.color,
                  },
                ]}
              >
                {request.status_label}
              </Text>
            </View>
          </View>

          <Text style={styles.statusHeroTitle}>
            {status.title}
          </Text>

          <Text style={styles.statusHeroMessage}>
            {status.message}
          </Text>

          <View style={styles.statusHeroFooter}>
            <HeroStat
              label="Request"
              value={`#${request.id}`}
            />

            <View style={styles.heroDivider} />

            <HeroStat
              label="Submitted"
              value={createdAt ?? '—'}
            />
          </View>
        </View>

        {/* SCHEDULE COMPARISON */}

        <SectionHeading
          title="Schedule comparison"
          subtitle="See the appointment record beside the requested schedule."
        />

        <View style={styles.comparisonCard}>
          <ScheduleBlock
            icon="calendar-outline"
            label="Appointment record"
            date={
              request.appointment
                ? formatDate(
                    request.appointment.appointment_date,
                  )
                : 'Appointment details unavailable'
            }
            time={
              request.appointment
                ? `${formatTime(
                    request.appointment.starts_at,
                  )} – ${formatTime(
                    request.appointment.ends_at,
                  )}`
                : '—'
            }
            shop={request.appointment?.shop?.name}
            service={request.appointment?.service_name}
          />

          <View style={styles.comparisonArrow}>
            <Ionicons
              name="arrow-down-outline"
              size={19}
              color={COLORS.violet}
            />
          </View>

          <ScheduleBlock
            icon="swap-horizontal-outline"
            label="Requested schedule"
            date={formatDate(request.requested_date)}
            time={`${formatTime(
              request.requested_starts_at,
            )} – ${formatTime(
              request.requested_ends_at,
            )}`}
            highlighted
          />
        </View>

        {/* CUSTOMER REASON */}

        {request.customer_reason?.trim() ? (
          <>
            <SectionHeading
              title="Your reason"
              subtitle="The explanation submitted with this request."
            />

            <View style={styles.reasonCard}>
              <View style={styles.reasonIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={COLORS.violet}
                />
              </View>

              <Text style={styles.reasonText}>
                {request.customer_reason}
              </Text>
            </View>
          </>
        ) : null}

        {/* SHOP OWNER REJECTION REASON */}

        {request.rejection_reason?.trim() ? (
          <>
            <SectionHeading
              title="Shop Owner response"
              subtitle="Reason provided when the request was rejected."
            />

            <View style={styles.rejectionCard}>
              <View style={styles.rejectionIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.rejectionCopy}>
                <Text style={styles.rejectionTitle}>
                  Rejection reason
                </Text>

                <Text style={styles.rejectionText}>
                  {request.rejection_reason}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {/* REQUEST ACTIVITY */}

        <SectionHeading
          title="Request activity"
          subtitle="Important timestamps returned with this reschedule request."
        />

        <View style={styles.activityCard}>
          <ActivityRow
            icon="send-outline"
            label="Submitted"
            value={createdAt ?? 'Not available'}
          />

          {reviewedAt ? (
            <>
              <ActivityDivider />

              <ActivityRow
                icon="shield-checkmark-outline"
                label="Reviewed"
                value={reviewedAt}
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

        {/* OPEN APPOINTMENT */}

        {request.appointment?.id ? (
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open appointment details"
            onPress={openAppointment}
            style={styles.appointmentButton}
          >
            <View style={styles.appointmentButtonIcon}>
              <Ionicons
                name="calendar-outline"
                size={19}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.appointmentButtonCopy}>
              <Text style={styles.appointmentButtonTitle}>
                Open appointment details
              </Text>

              <Text style={styles.appointmentButtonText}>
                View the booking's current status,
                service, notes, and allowed actions.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        ) : null}

        {/* WITHDRAW PENDING REQUEST */}

        {request.status === 'pending' ? (
          <View style={styles.withdrawCard}>
            <View style={styles.withdrawHeader}>
              <View style={styles.withdrawIcon}>
                <Ionicons
                  name="arrow-undo-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.withdrawCopy}>
                <Text style={styles.withdrawTitle}>
                  Withdraw this request
                </Text>

                <Text style={styles.withdrawText}>
                  Withdrawing removes this pending
                  schedule request. It does not cancel
                  the appointment itself.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Withdraw reschedule request"
              disabled={isSubmitting}
              onPress={requestWithdrawConfirmation}
              style={[
                styles.withdrawButton,
                isSubmitting && styles.disabledButton,
              ]}
            >
              <Ionicons
                name="arrow-undo-outline"
                size={18}
                color={COLORS.danger}
              />

              <Text style={styles.withdrawButtonText}>
                Withdraw request
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* SECURITY NOTICE */}

        <View style={styles.footerNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={COLORS.green}
          />

          <Text style={styles.footerNoteText}>
            The Shop Owner decision and appointment
            update are handled by Laravel. This screen
            only displays the returned request state
            and allows withdrawal while pending.
          </Text>
        </View>
      </ScrollView>

      {/* ==================================================
          SHARED STYLEHUB MODAL

          Danger: Withdrawal confirmation
          Success: Withdrawal completed
          ================================================== */}

      <StyleHubModal
        visible={activeModal !== null}
        onClose={closeWithdrawConfirmation}
        title={
          activeModal === 'withdrawSuccess'
            ? 'Request withdrawn'
            : 'Withdraw request?'
        }
        message={
          activeModal === 'withdrawSuccess'
            ? successMessage
            : 'This removes your pending reschedule request. Your appointment remains active on its current schedule.'
        }
        tone={
          activeModal === 'withdrawSuccess'
            ? 'success'
            : 'danger'
        }
        icon={
          activeModal === 'withdrawSuccess'
            ? 'checkmark-circle-outline'
            : 'arrow-undo-outline'
        }
        dismissOnBackdrop={false}
        actions={
          activeModal === 'withdrawSuccess'
            ? [
                {
                  label: 'Done',
                  variant: 'primary',
                  icon: 'checkmark-outline',
                  onPress: closeWithdrawConfirmation,
                },
              ]
            : activeModal === 'withdraw'
              ? [
                  {
                    label: 'Keep request',
                    variant: 'secondary',
                    onPress: closeWithdrawConfirmation,
                  },
                  {
                    label: 'Withdraw',
                    variant: 'danger',
                    icon: 'arrow-undo-outline',
                    loading: isSubmitting,
                    onPress: () =>
                      void performWithdraw(),
                  },
                ]
              : []
        }
      >
        {/* ERROR INSIDE THE MODAL */}

        {activeModal === 'withdraw' &&
        withdrawModalError ? (
          <View style={styles.withdrawModalError}>
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={COLORS.danger}
            />

            <Text style={styles.withdrawModalErrorText}>
              {withdrawModalError}
            </Text>
          </View>
        ) : null}
      </StyleHubModal>
    </SafeAreaView>
  );
}

/* ==========================================================
   REUSABLE SCREEN COMPONENTS
   ========================================================== */

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

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.heroStatValue}
      >
        {value}
      </Text>
    </View>
  );
}

function ScheduleBlock({
  icon,
  label,
  date,
  time,
  shop,
  service,
  highlighted = false,
}: {
  icon: IconName;
  label: string;
  date: string;
  time: string;
  shop?: string;
  service?: string;
  highlighted?: boolean;
}) {
  return (
    <View
      style={[
        styles.scheduleBlock,
        highlighted && styles.scheduleBlockHighlighted,
      ]}
    >
      <View
        style={[
          styles.scheduleBlockIcon,
          highlighted &&
            styles.scheduleBlockIconHighlighted,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            highlighted
              ? COLORS.violet
              : COLORS.navy
          }
        />
      </View>

      <View style={styles.scheduleBlockCopy}>
        <Text
          style={[
            styles.scheduleBlockLabel,
            highlighted &&
              styles.scheduleBlockLabelHighlighted,
          ]}
        >
          {label}
        </Text>

        <Text style={styles.scheduleBlockDate}>
          {date}
        </Text>

        <Text style={styles.scheduleBlockTime}>
          {time}
        </Text>

        {shop ? (
          <Text style={styles.scheduleBlockMeta}>
            {shop}
          </Text>
        ) : null}

        {service ? (
          <Text style={styles.scheduleBlockMeta}>
            {service}
          </Text>
        ) : null}
      </View>
    </View>
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
  return <View style={styles.activityDivider} />;
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

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* MAIN CONTAINER */

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 48,
  },

  /* TOP NAVIGATION */

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

  /* PAGE HEADER */

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

  /* PAGE MESSAGES */

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

  /* REQUEST STATUS HERO */

  statusHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  statusHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  statusHeroIcon: {
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

  statusHeroTitle: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  statusHeroMessage: {
    marginTop: 6,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  statusHeroFooter: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  heroStat: {
    flex: 1,
    minWidth: 0,
  },

  heroStatLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  heroStatValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '800',
  },

  heroDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  /* SECTION HEADINGS */

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

  /* SCHEDULE COMPARISON */

  comparisonCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  scheduleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  scheduleBlockHighlighted: {
    backgroundColor: COLORS.violetSoft,
  },

  scheduleBlockIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  scheduleBlockIconHighlighted: {
    backgroundColor: COLORS.surface,
  },

  scheduleBlockCopy: {
    flex: 1,
  },

  scheduleBlockLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  scheduleBlockLabelHighlighted: {
    color: COLORS.violet,
  },

  scheduleBlockDate: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 19,
    fontWeight: '800',
  },

  scheduleBlockTime: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  scheduleBlockMeta: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  comparisonArrow: {
    width: 36,
    height: 36,
    marginVertical: 8,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.violetSoft,
  },

  /* CUSTOMER REASON */

  reasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.violetSoft,
  },

  reasonIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  reasonText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  /* SHOP OWNER REJECTION */

  rejectionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.dangerSoft,
  },

  rejectionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  rejectionCopy: {
    flex: 1,
  },

  rejectionTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  rejectionText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* REQUEST ACTIVITY */

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

  /* APPOINTMENT NAVIGATION */

  appointmentButton: {
    minHeight: 78,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  appointmentButtonIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  appointmentButtonCopy: {
    flex: 1,
  },

  appointmentButtonTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  appointmentButtonText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  /* WITHDRAWAL CARD */

  withdrawCard: {
    marginTop: SPACING.xxl,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.dangerSoft,
  },

  withdrawHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  withdrawIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  withdrawCopy: {
    flex: 1,
  },

  withdrawTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  withdrawText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  withdrawButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  withdrawButtonText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  /* SECURITY FOOTER */

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

  /* SHARED MODAL ERROR */

  withdrawModalError: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 10,
    backgroundColor: COLORS.dangerSoft,
  },

  withdrawModalErrorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  /* LOADING STATE */

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

  /* UNAVAILABLE STATE */

  unavailableContainer: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
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
