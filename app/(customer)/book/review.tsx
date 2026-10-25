
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  createCustomerAppointment,
  getCustomerShop,
} from '@/src/services/customer-api';
import { getCustomerAvailableSlots } from '@/src/services/customer-appointment-availability-api';
import type { CustomerAvailableSlot } from '@/src/types/appointment-availability';
import type {
  CustomerService,
  CustomerShopDetail,
} from '@/src/types/customer';

const MAX_NOTES_LENGTH = 1000;

type IconName = ComponentProps<typeof Ionicons>['name'];

/* ==========================================================
   HELPERS
   ========================================================== */

function getRouteValue(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value)
    ? value[0] ?? ''
    : value ?? '';
}

function parsePositiveId(
  value: string | string[] | undefined,
): number | null {
  const parsed = Number(getRouteValue(value));

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function formatPrice(value: string | number): string {
  const numericValue = Number(value);

  return Number.isNaN(numericValue)
    ? String(value)
    : `₱${numericValue.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}

function formatAppointmentDate(value: string): string {
  const parts = value.split('-').map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return value;
  }

  const [year, month, day] = parts;

  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

/* ==========================================================
   CUSTOMER BOOKING REVIEW SCREEN
   ========================================================== */

export default function CustomerBookingReviewScreen() {
  const params = useLocalSearchParams<{
    shopId?: string | string[];
    serviceId?: string | string[];
    appointmentDate?: string | string[];
    startsAt?: string | string[];
    notes?: string | string[];
  }>();

  const { token } = useAuth();

  const shopId = parsePositiveId(params.shopId);
  const serviceId = parsePositiveId(params.serviceId);

  const appointmentDate = getRouteValue(
    params.appointmentDate,
  ).trim();

  const startsAt = getRouteValue(
    params.startsAt,
  ).trim();

  const notes = getRouteValue(params.notes).trim();

  const [shop, setShop] =
    useState<CustomerShopDetail | null>(null);

  const [selectedSlot, setSelectedSlot] =
    useState<CustomerAvailableSlot | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSlotUnavailable, setIsSlotUnavailable] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [successVisible, setSuccessVisible] =
    useState(false);

  /*
   * Prevent duplicate booking submissions.
   * These refs are kept separate from UI loading state.
   */

  const confirmationInFlightRef = useRef(false);
  const bookingCreatedRef = useRef(false);

  /* ========================================================
     SELECTED SERVICE
     ======================================================== */

  const selectedService = useMemo<CustomerService | null>(
    () => {
      if (!shop || !serviceId) {
        return null;
      }

      return (
        shop.services?.find(
          (service) => service.id === serviceId,
        ) ?? null
      );
    },
    [shop, serviceId],
  );

  /* ========================================================
     RECHECK SELECTED SLOT
     ======================================================== */

  const loadCurrentSelectedSlot = useCallback(
    async (): Promise<CustomerAvailableSlot | null> => {
      if (
        !token ||
        !shopId ||
        !serviceId ||
        appointmentDate === '' ||
        startsAt === ''
      ) {
        return null;
      }

      const response = await getCustomerAvailableSlots(
        token,
        shopId,
        serviceId,
        appointmentDate,
      );

      return (
        response.data.slots.find(
          (slot) => slot.starts_at === startsAt,
        ) ?? null
      );
    },
    [
      appointmentDate,
      serviceId,
      shopId,
      startsAt,
      token,
    ],
  );

  /* ========================================================
     LOAD BOOKING REVIEW
     ======================================================== */

  const loadReviewData = useCallback(
    async (): Promise<void> => {
      setErrorMessage('');
      setIsSlotUnavailable(false);

      if (!token) {
        setErrorMessage(
          'You must be signed in to review this booking.',
        );
        setIsLoading(false);
        return;
      }

      if (
        !shopId ||
        !serviceId ||
        appointmentDate === '' ||
        startsAt === ''
      ) {
        setErrorMessage(
          'The booking information is incomplete. Please go back and choose your appointment again.',
        );
        setIsLoading(false);
        return;
      }

      if (notes.length > MAX_NOTES_LENGTH) {
        setErrorMessage(
          `Booking notes may not exceed ${MAX_NOTES_LENGTH} characters.`,
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const shopResponse = await getCustomerShop(
          token,
          shopId,
        );

        const loadedShop = shopResponse.data.shop;
        setShop(loadedShop);

        if (!loadedShop.availability.accepts_appointments) {
          setSelectedSlot(null);
          setErrorMessage(
            'This shop is no longer accepting appointment bookings.',
          );
          return;
        }

        const service = loadedShop.services?.find(
          (item) => item.id === serviceId,
        );

        if (!service) {
          setSelectedSlot(null);
          setErrorMessage(
            'The selected service is no longer available.',
          );
          return;
        }

        const slot = await loadCurrentSelectedSlot();
        setSelectedSlot(slot);

        if (!slot) {
          setIsSlotUnavailable(true);
          setErrorMessage(
            'The selected appointment time is no longer available. Please choose another time.',
          );
        }
      } catch (error) {
        setSelectedSlot(null);
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to prepare your booking review right now.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      appointmentDate,
      loadCurrentSelectedSlot,
      notes.length,
      serviceId,
      shopId,
      startsAt,
      token,
    ],
  );

  useEffect(() => {
    void loadReviewData();
  }, [loadReviewData]);

  /* ========================================================
     NAVIGATION
     ======================================================== */

  function handleEditBooking(): void {
    if (!isSubmitting) {
      router.back();
    }
  }

  function handleChooseAnotherTime(): void {
    if (!isSubmitting) {
      router.back();
    }
  }

  /* ========================================================
     CONFIRM BOOKING
     ======================================================== */

  async function handleConfirmBooking(): Promise<void> {
    if (
      confirmationInFlightRef.current ||
      bookingCreatedRef.current
    ) {
      return;
    }

    setErrorMessage('');

    if (
      !token ||
      !shop ||
      !shopId ||
      !selectedService ||
      !serviceId ||
      !selectedSlot ||
      appointmentDate === '' ||
      startsAt === ''
    ) {
      setErrorMessage(
        'The booking information is no longer valid. Please go back and choose your appointment again.',
      );
      return;
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      setErrorMessage(
        `Booking notes may not exceed ${MAX_NOTES_LENGTH} characters.`,
      );
      return;
    }

    confirmationInFlightRef.current = true;
    setIsSubmitting(true);

    try {
      /*
       * Recheck the requested slot immediately
       * before sending the booking transaction.
       */

      const latestSlot = await loadCurrentSelectedSlot();
      setSelectedSlot(latestSlot);

      if (!latestSlot) {
        setIsSlotUnavailable(true);
        setErrorMessage(
          'That appointment time is no longer available. Please choose another time before confirming.',
        );
        return;
      }

      setIsSlotUnavailable(false);

      const response = await createCustomerAppointment(
        token,
        {
          shopId,
          serviceId,
          appointmentDate,
          startsAt,
          notes,
        },
      );

      /*
       * A successfully created booking must never
       * be submitted again from this screen.
       */

      bookingCreatedRef.current = true;

      setSuccessMessage(
        response.message ??
          'Your appointment has been booked successfully.',
      );

      setSuccessVisible(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) {
          try {
            const refreshedSlot =
              await loadCurrentSelectedSlot();

            setSelectedSlot(refreshedSlot);

            if (!refreshedSlot) {
              setIsSlotUnavailable(true);
              setErrorMessage(
                'That appointment time was just taken or is no longer available. Please choose another time.',
              );
              return;
            }
          } catch {
            // Keep the original Laravel validation error.
          }
        }

        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(
        'Unable to confirm your appointment. Please try again.',
      );
    } finally {
      confirmationInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  /* ========================================================
     SUCCESS NAVIGATION
     ======================================================== */

  function handleViewBookings(): void {
    setSuccessVisible(false);

    router.replace(
      '/(customer)/customer/appointments',
    );
  }

  function handleSuccessDone(): void {
    setSuccessVisible(false);

    router.replace(
      '/(customer)/customer/appointments',
    );
  }

  /* ========================================================
     LOADING SCREEN
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
            Preparing booking review
          </Text>

          <Text style={styles.loadingText}>
            Rechecking the shop, service, and exact
            appointment slot before confirmation.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ========================================================
     FINAL CONFIRMATION STATE
     ======================================================== */

  const canConfirm = Boolean(
    token &&
      shop &&
      selectedService &&
      selectedSlot &&
      !isSlotUnavailable &&
      shop.availability.accepts_appointments &&
      !bookingCreatedRef.current,
  );

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
        contentContainerStyle={styles.container}
      >
        {/* TOP NAVIGATION */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back and edit booking"
            disabled={isSubmitting}
            onPress={handleEditBooking}
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
              Review booking
            </Text>

            <Text style={styles.topBarCaption}>
              Final check before submission
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh booking review"
            disabled={isSubmitting}
            onPress={() => void loadReviewData()}
            style={styles.topIconButton}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            CONFIRM APPOINTMENT
          </Text>

          <Text style={styles.title}>
            Check every detail before booking
          </Text>

          <Text style={styles.subtitle}>
            StyleHub rechecks the exact slot before
            sending the final booking request. The
            Laravel booking transaction remains the
            final authority if availability changes
            at the same moment.
          </Text>
        </View>

        {/* ERROR */}

        {errorMessage ? (
          <MessageBox
            title={
              isSlotUnavailable
                ? 'Selected time changed'
                : 'Booking needs attention'
            }
            message={errorMessage}
          />
        ) : null}

        {/* BOOKING SUMMARY HERO */}

        <View style={styles.reviewHero}>
          <View style={styles.reviewHeroTopRow}>
            <View style={styles.reviewHeroIcon}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={COLORS.white}
              />
            </View>

            <View
              style={[
                styles.slotBadge,
                {
                  backgroundColor: isSlotUnavailable
                    ? COLORS.dangerSoft
                    : COLORS.greenSoft,
                },
              ]}
            >
              <Ionicons
                name={
                  isSlotUnavailable
                    ? 'alert-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={14}
                color={
                  isSlotUnavailable
                    ? COLORS.danger
                    : COLORS.green
                }
              />

              <Text
                style={[
                  styles.slotBadgeText,
                  {
                    color: isSlotUnavailable
                      ? COLORS.danger
                      : COLORS.green,
                  },
                ]}
              >
                {isSlotUnavailable
                  ? 'Time unavailable'
                  : 'Ready to confirm'}
              </Text>
            </View>
          </View>

          <Text style={styles.reviewHeroService}>
            {selectedService?.name ?? 'Selected service'}
          </Text>

          <Text style={styles.reviewHeroShop}>
            {shop?.name ?? 'StyleHub Shop'}
          </Text>

          <View style={styles.reviewHeroDetails}>
            <HeroDetail
              icon="calendar-outline"
              label="Date"
              value={
                appointmentDate
                  ? formatAppointmentDate(appointmentDate)
                  : '—'
              }
            />

            <View style={styles.reviewHeroDivider} />

            <HeroDetail
              icon="time-outline"
              label="Time"
              value={
                selectedSlot?.label ??
                (startsAt ? formatTime(startsAt) : '—')
              }
            />
          </View>
        </View>

        {/* SHOP INFORMATION */}

        <SectionHeading
          title="Shop"
          subtitle="Where this appointment request will be sent."
        />

        <View style={styles.detailCard}>
          <DetailRow
            icon="storefront-outline"
            label="Shop"
            value={shop?.name ?? 'Unavailable'}
          />

          <DetailDivider />

          <DetailRow
            icon="location-outline"
            label="Location"
            value={
              shop
                ? [
                    shop.address,
                    shop.city,
                    shop.province,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : 'Unavailable'
            }
          />
        </View>

        {/* SERVICE INFORMATION */}

        <SectionHeading
          title="Service"
          subtitle="The selected service, duration, and listed price."
        />

        <View style={styles.detailCard}>
          <DetailRow
            icon="cut-outline"
            label="Service"
            value={selectedService?.name ?? 'Unavailable'}
          />

          <DetailDivider />

          <DetailRow
            icon="time-outline"
            label="Duration"
            value={
              selectedService
                ? `${selectedService.duration_minutes} minutes`
                : '—'
            }
          />

          <DetailDivider />

          <DetailRow
            icon="cash-outline"
            label="Price"
            value={
              selectedService
                ? formatPrice(selectedService.price)
                : '—'
            }
            emphasized
          />
        </View>

        {/* APPOINTMENT SCHEDULE */}

        <SectionHeading
          title="Schedule"
          subtitle="The exact date and time currently being checked for availability."
        />

        <View style={styles.detailCard}>
          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={
              appointmentDate
                ? formatAppointmentDate(appointmentDate)
                : '—'
            }
          />

          <DetailDivider />

          <DetailRow
            icon="time-outline"
            label="Start time"
            value={
              selectedSlot?.label ??
              (startsAt ? formatTime(startsAt) : '—')
            }
          />

          {selectedSlot?.ends_at ? (
            <>
              <DetailDivider />

              <DetailRow
                icon="hourglass-outline"
                label="Time range"
                value={`${formatTime(
                  selectedSlot.starts_at,
                )} – ${formatTime(
                  selectedSlot.ends_at,
                )}`}
              />
            </>
          ) : null}
        </View>

        {/* BOOKING NOTE */}

        <SectionHeading
          title="Booking note"
          subtitle="Optional note that will be sent with the appointment."
        />

        <View style={styles.notesCard}>
          <View style={styles.notesIcon}>
            <Ionicons
              name="document-text-outline"
              size={19}
              color={COLORS.navy}
            />
          </View>

          <Text
            style={[
              styles.notesText,
              notes === '' && styles.emptyNotesText,
            ]}
          >
            {notes === ''
              ? 'No booking notes added.'
              : notes}
          </Text>
        </View>

        {/* PENDING BOOKING NOTICE */}

        <View style={styles.pendingNotice}>
          <View style={styles.pendingNoticeIcon}>
            <Ionicons
              name="time-outline"
              size={20}
              color={COLORS.violet}
            />
          </View>

          <View style={styles.pendingNoticeCopy}>
            <Text style={styles.pendingNoticeTitle}>
              Booking starts as pending
            </Text>

            <Text style={styles.pendingNoticeText}>
              Confirming creates the appointment
              request. The Shop Owner must still confirm
              it before it becomes a confirmed appointment.
            </Text>
          </View>
        </View>

        {/* CONFIRM OR CHOOSE ANOTHER TIME */}

        {isSlotUnavailable ? (
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleChooseAnotherTime}
            style={styles.chooseAnotherButton}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.white}
            />

            <Text style={styles.chooseAnotherButtonText}>
              Choose another time
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityRole="button"
            disabled={isSubmitting || !canConfirm}
            onPress={() => void handleConfirmBooking()}
            style={[
              styles.confirmButton,
              (isSubmitting || !canConfirm) &&
                styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={COLORS.white}
              />
            )}

            <Text style={styles.confirmButtonText}>
              {isSubmitting
                ? 'Confirming booking...'
                : 'Confirm booking'}
            </Text>
          </TouchableOpacity>
        )}

        {/* EDIT BOOKING */}

        {!isSlotUnavailable ? (
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleEditBooking}
            style={styles.editButton}
          >
            <Ionicons
              name="create-outline"
              size={17}
              color={COLORS.navy}
            />

            <Text style={styles.editButtonText}>
              Edit booking
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* RETRY REVIEW */}

        {errorMessage &&
        !isSlotUnavailable &&
        !canConfirm ? (
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void loadReviewData()}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color={COLORS.navy}
            />

            <Text style={styles.refreshButtonText}>
              Refresh review
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* ================================================
          SHARED COMPACT STYLEHUB SUCCESS MODAL
          ================================================ */}

      <StyleHubModal
        visible={successVisible}
        onClose={handleSuccessDone}
        title="Appointment booked"
        message={successMessage}
        tone="success"
        icon="checkmark-circle-outline"
        dismissOnBackdrop={false}
        actions={[
          {
            label: 'Done',
            variant: 'secondary',
            onPress: handleSuccessDone,
          },
          {
            label: 'View bookings',
            variant: 'primary',
            icon: 'arrow-forward',
            onPress: handleViewBookings,
          },
        ]}
      >
        <View style={styles.modalPendingNotice}>
          <Ionicons
            name="time-outline"
            size={16}
            color={COLORS.navy}
          />

          <Text style={styles.modalPendingText}>
            Pending Shop Owner confirmation.
          </Text>
        </View>
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

/* ==========================================================
   HERO DETAIL
   ========================================================== */

function HeroDetail({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroDetail}>
      <View style={styles.heroDetailLabelRow}>
        <Ionicons
          name={icon}
          size={13}
          color="#AEB8C5"
        />

        <Text style={styles.heroDetailLabel}>
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        style={styles.heroDetailValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* ==========================================================
   DETAIL ROW
   ========================================================== */

function DetailRow({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  emphasized?: boolean;
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

        <Text
          numberOfLines={3}
          style={[
            styles.detailValue,
            emphasized && styles.detailValueEmphasized,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================
   DETAIL DIVIDER
   ========================================================== */

function DetailDivider() {
  return <View style={styles.detailDivider} />;
}

/* ==========================================================
   MESSAGE BOX
   ========================================================== */

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

  /* ERROR MESSAGE */

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

  /* REVIEW SUMMARY HERO */

  reviewHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  reviewHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  reviewHeroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  slotBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
  },

  slotBadgeText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  reviewHeroService: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  reviewHeroShop: {
    marginTop: 4,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  reviewHeroDetails: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  heroDetail: {
    flex: 1,
    minWidth: 0,
  },

  heroDetailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  heroDetailLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  heroDetailValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '800',
  },

  reviewHeroDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  /* SECTION HEADING */

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

  /* DETAIL CARDS */

  detailCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  detailRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    minWidth: 0,
  },

  detailLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  detailValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  detailValueEmphasized: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  detailDivider: {
    height: 1,
    marginLeft: 62,
    backgroundColor: COLORS.border,
  },

  /* BOOKING NOTES */

  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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

  emptyNotesText: {
    color: COLORS.textLight,
    fontStyle: 'italic',
  },

  /* PENDING NOTICE */

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

  /* CONFIRM BOOKING */

  confirmButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  confirmButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  chooseAnotherButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  chooseAnotherButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  /* EDIT BOOKING */

  editButton: {
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

  editButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  /* REFRESH BOOKING REVIEW */

  refreshButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  refreshButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  /* ================================================
     SMALL PENDING LABEL IN SHARED MODAL
     ================================================ */

  modalPendingNotice: {
    width: '100%',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  modalPendingText: {
    flexShrink: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* LOADING SCREEN */

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
    maxWidth: 360,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.48,
  },
});
