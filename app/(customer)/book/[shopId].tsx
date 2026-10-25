
import { Ionicons } from '@expo/vector-icons';
import {
  type Href,
  router,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomerBookingDatePicker from '@/src/components/CustomerBookingDatePicker';
import CustomerTimeSlotPicker from '@/src/components/CustomerTimeSlotPicker';
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
import { getCustomerShop } from '@/src/services/customer-api';
import {
  getCustomerAvailableDates,
  getCustomerAvailableSlots,
} from '@/src/services/customer-appointment-availability-api';
import type {
  CustomerAvailableDate,
  CustomerAvailableSlot,
} from '@/src/types/appointment-availability';
import type {
  CustomerService,
  CustomerShopDetail,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

const AVAILABILITY_PREVIEW_DAYS = 30;
const MAX_NOTES_LENGTH = 1000;

/* HELPERS */

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

function formatTime(value: string | null): string {
  if (!value) return '—';

  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;

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

/* MAIN BOOKING SCREEN */

export default function CustomerBookingScreen() {
  const params = useLocalSearchParams<{
    shopId?: string | string[];
    serviceId?: string | string[];
  }>();

  const navigation = useNavigation();
  const { token } = useAuth();

  const shopId = Number(getRouteValue(params.shopId));
  const initialServiceId = Number(
    getRouteValue(params.serviceId),
  );

  const [shop, setShop] =
    useState<CustomerShopDetail | null>(null);

  const [selectedServiceId, setSelectedServiceId] =
    useState<number | null>(
      Number.isInteger(initialServiceId) &&
      initialServiceId > 0
        ? initialServiceId
        : null,
    );

  const [availableDates, setAvailableDates] =
    useState<CustomerAvailableDate[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [availableSlots, setAvailableSlots] =
    useState<CustomerAvailableSlot[]>([]);

  const [selectedStartsAt, setSelectedStartsAt] =
    useState<string | null>(null);

  const [notes, setNotes] = useState('');

  const [isLoadingShop, setIsLoadingShop] =
    useState(true);

  const [isLoadingDates, setIsLoadingDates] =
    useState(false);

  const [isLoadingSlots, setIsLoadingSlots] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const dateRequestSequence = useRef(0);
  const slotRequestSequence = useRef(0);
  const hasBlurredForReviewRef = useRef(false);

  const latestSelectionRef = useRef<{
    serviceId: number | null;
    date: string | null;
  }>({
    serviceId: selectedServiceId,
    date: selectedDate,
  });

  /* SELECTED SERVICE */

  const selectedService = useMemo<
    CustomerService | undefined
  >(
    () =>
      shop?.services?.find(
        (service) => service.id === selectedServiceId,
      ),
    [shop, selectedServiceId],
  );

  /* SELECTED DATE */

  const selectedDateDetails = useMemo(
    () =>
      availableDates.find(
        (date) => date.date === selectedDate,
      ),
    [availableDates, selectedDate],
  );

  /* SELECTED TIME SLOT */

  const selectedSlot = useMemo(
    () =>
      availableSlots.find(
        (slot) => slot.starts_at === selectedStartsAt,
      ),
    [availableSlots, selectedStartsAt],
  );

  /* KEEP THE LATEST SELECTION FOR RETURN NAVIGATION */

  useEffect(() => {
    latestSelectionRef.current = {
      serviceId: selectedServiceId,
      date: selectedDate,
    };
  }, [selectedDate, selectedServiceId]);

  /* LOAD SHOP */

  const loadShop = useCallback(async () => {
    if (
      !token ||
      !Number.isInteger(shopId) ||
      shopId < 1
    ) {
      setIsLoadingShop(false);
      setErrorMessage('The selected shop is invalid.');
      return;
    }

    setIsLoadingShop(true);
    setErrorMessage('');

    try {
      const response = await getCustomerShop(
        token,
        shopId,
      );

      const loadedShop = response.data.shop;
      setShop(loadedShop);

      setSelectedServiceId((currentServiceId) => {
        if (
          currentServiceId !== null &&
          loadedShop.services?.some(
            (service) => service.id === currentServiceId,
          )
        ) {
          return currentServiceId;
        }

        return null;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load booking information.',
      );
    } finally {
      setIsLoadingShop(false);
    }
  }, [token, shopId]);

  /* LOAD AVAILABLE DATES FROM LARAVEL */

  const loadAvailableDates = useCallback(
    async (serviceId: number) => {
      if (!token || !shop) return;

      const requestId = ++dateRequestSequence.current;

      setIsLoadingDates(true);
      setErrorMessage('');

      try {
        const response =
          await getCustomerAvailableDates(
            token,
            shop.id,
            serviceId,
            AVAILABILITY_PREVIEW_DAYS,
          );

        if (
          requestId !== dateRequestSequence.current
        ) {
          return;
        }

        setAvailableDates(response.data.dates);
      } catch (error) {
        if (
          requestId !== dateRequestSequence.current
        ) {
          return;
        }

        setAvailableDates([]);

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load available booking dates.',
        );
      } finally {
        if (
          requestId === dateRequestSequence.current
        ) {
          setIsLoadingDates(false);
        }
      }
    },
    [token, shop],
  );

  /* LOAD AVAILABLE TIME SLOTS FROM LARAVEL */

  const loadAvailableSlots = useCallback(
    async (
      serviceId: number,
      date: string,
      preserveSelectedTime = false,
    ) => {
      if (!token || !shop) return;

      const requestId = ++slotRequestSequence.current;

      setIsLoadingSlots(true);
      setAvailableSlots([]);
      setErrorMessage('');

      if (!preserveSelectedTime) {
        setSelectedStartsAt(null);
      }

      try {
        const response =
          await getCustomerAvailableSlots(
            token,
            shop.id,
            serviceId,
            date,
          );

        if (
          requestId !== slotRequestSequence.current
        ) {
          return;
        }

        const slots = response.data.slots;
        setAvailableSlots(slots);

        if (preserveSelectedTime) {
          setSelectedStartsAt((currentStartsAt) => {
            if (!currentStartsAt) return null;

            return slots.some(
              (slot) =>
                slot.starts_at === currentStartsAt,
            )
              ? currentStartsAt
              : null;
          });
        }
      } catch (error) {
        if (
          requestId !== slotRequestSequence.current
        ) {
          return;
        }

        setAvailableSlots([]);
        setSelectedStartsAt(null);

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load available appointment times.',
        );
      } finally {
        if (
          requestId === slotRequestSequence.current
        ) {
          setIsLoadingSlots(false);
        }
      }
    },
    [token, shop],
  );

  /* INITIAL SHOP LOAD */

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  /* RESET DATE AND TIME WHEN SERVICE CHANGES */

  useEffect(() => {
    dateRequestSequence.current += 1;
    slotRequestSequence.current += 1;

    setAvailableDates([]);
    setSelectedDate(null);
    setAvailableSlots([]);
    setSelectedStartsAt(null);

    if (selectedService) {
      void loadAvailableDates(selectedService.id);
    }
  }, [selectedService, loadAvailableDates]);

  /* RECHECK SLOTS AFTER RETURNING FROM REVIEW */

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener(
      'blur',
      () => {
        hasBlurredForReviewRef.current = true;
      },
    );

    const unsubscribeFocus = navigation.addListener(
      'focus',
      () => {
        if (!hasBlurredForReviewRef.current) {
          return;
        }

        hasBlurredForReviewRef.current = false;

        const currentSelection =
          latestSelectionRef.current;

        if (
          currentSelection.serviceId &&
          currentSelection.date
        ) {
          void loadAvailableSlots(
            currentSelection.serviceId,
            currentSelection.date,
            true,
          );
        }
      },
    );

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [navigation, loadAvailableSlots]);

  /* INVALIDATE PENDING REQUESTS ON UNMOUNT */

  useEffect(() => {
    return () => {
      dateRequestSequence.current += 1;
      slotRequestSequence.current += 1;
    };
  }, []);

  /* SERVICE SELECTION */

  function handleServiceSelect(serviceId: number): void {
    setErrorMessage('');
    setSelectedServiceId(serviceId);
  }

  /* DATE SELECTION */

  function handleDateSelect(
    date: CustomerAvailableDate,
  ): void {
    if (!selectedService || !date.is_available) {
      return;
    }

    setErrorMessage('');
    setSelectedDate(date.date);
    setAvailableSlots([]);
    setSelectedStartsAt(null);

    void loadAvailableSlots(
      selectedService.id,
      date.date,
    );
  }

  /* TIME SLOT SELECTION */

  function handleSlotSelect(
    slot: CustomerAvailableSlot,
  ): void {
    setErrorMessage('');
    setSelectedStartsAt(slot.starts_at);
  }

  /* CONTINUE TO BOOKING REVIEW */

  function handleContinueToReview(): void {
    setErrorMessage('');

    if (!token || !shop) {
      setErrorMessage(
        'Booking information is unavailable.',
      );
      return;
    }

    if (!shop.availability.accepts_appointments) {
      setErrorMessage(
        'This shop is not currently accepting appointment bookings.',
      );
      return;
    }

    if (!selectedService) {
      setErrorMessage(
        'Please select a service first.',
      );
      return;
    }

    if (!selectedDate) {
      setErrorMessage(
        'Please select an available appointment date.',
      );
      return;
    }

    if (!selectedSlot) {
      setErrorMessage(
        'Please select an available appointment time.',
      );
      return;
    }

    const cleanNotes = notes.trim();

    if (cleanNotes.length > MAX_NOTES_LENGTH) {
      setErrorMessage(
        `Booking notes may not exceed ${MAX_NOTES_LENGTH} characters.`,
      );
      return;
    }

    router.push({
      pathname: '/(customer)/book/review',
      params: {
        shopId: String(shop.id),
        serviceId: String(selectedService.id),
        appointmentDate: selectedDate,
        startsAt: selectedSlot.starts_at,
        notes: cleanNotes,
      },
    } as unknown as Href);
  }

  const continueDisabled =
    isLoadingDates ||
    isLoadingSlots ||
    !shop?.availability.accepts_appointments ||
    !selectedService ||
    !selectedDate ||
    !selectedSlot;

  /* LOADING SCREEN */

  if (isLoadingShop) {
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
            Preparing booking
          </Text>

          <Text style={styles.loadingText}>
            Loading the shop, active services, and current
            booking availability.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* UNAVAILABLE SHOP SCREEN */

  if (!shop) {
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
                name="calendar-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.unavailableTitle}>
              Booking unavailable
            </Text>

            <Text style={styles.unavailableText}>
              {errorMessage ||
                'Unable to prepare this shop for booking.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* MAIN BOOKING SCREEN */

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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
                Book appointment
              </Text>

              <Text style={styles.topBarCaption}>
                {shop.name}
              </Text>
            </View>

            <View style={styles.topIconButton} />
          </View>

          {/* PAGE HEADER */}

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              NEW BOOKING
            </Text>

            <Text style={styles.title}>
              Build your appointment one step at a time
            </Text>

            <Text style={styles.subtitle}>
              Choose a service, then a date and time returned
              by Laravel. Nothing is booked until you review
              and confirm on the next screen.
            </Text>
          </View>

          {errorMessage ? (
            <MessageBox
              title="Booking needs attention"
              message={errorMessage}
            />
          ) : null}

          {/* SHOP HERO */}

          <View style={styles.shopHero}>
            <View style={styles.shopHeroTopRow}>
              <View style={styles.shopHeroIcon}>
                <Ionicons
                  name={
                    shop.type === 'barber_shop'
                      ? 'cut-outline'
                      : 'sparkles-outline'
                  }
                  size={24}
                  color={COLORS.white}
                />
              </View>

              <View
                style={[
                  styles.availabilityBadge,
                  {
                    backgroundColor:
                      shop.availability.accepts_appointments
                        ? COLORS.greenSoft
                        : COLORS.orangeSoft,
                  },
                ]}
              >
                <Ionicons
                  name={
                    shop.availability.accepts_appointments
                      ? 'checkmark-circle-outline'
                      : 'time-outline'
                  }
                  size={14}
                  color={
                    shop.availability.accepts_appointments
                      ? COLORS.green
                      : COLORS.orange
                  }
                />

                <Text
                  style={[
                    styles.availabilityBadgeText,
                    {
                      color:
                        shop.availability.accepts_appointments
                          ? COLORS.green
                          : COLORS.orange,
                    },
                  ]}
                >
                  {shop.availability.status_label}
                </Text>
              </View>
            </View>

            <Text style={styles.shopHeroName}>
              {shop.name}
            </Text>

            <Text style={styles.shopHeroAddress}>
              {[
                shop.address,
                shop.city,
                shop.province,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>

            {/* BOOKING PROGRESS */}

            <View style={styles.progressRow}>
              <ProgressItem
                number="1"
                label="Service"
                complete={Boolean(selectedService)}
              />

              <View style={styles.progressLine} />

              <ProgressItem
                number="2"
                label="Date"
                complete={Boolean(selectedDate)}
              />

              <View style={styles.progressLine} />

              <ProgressItem
                number="3"
                label="Time"
                complete={Boolean(selectedSlot)}
              />
            </View>
          </View>

          {/* BOOKING AVAILABILITY WARNING */}

          {!shop.availability.accepts_appointments ? (
            <View style={styles.warningCard}>
              <View style={styles.warningIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.warning}
                />
              </View>

              <View style={styles.warningCopy}>
                <Text style={styles.warningTitle}>
                  Booking is currently unavailable
                </Text>

                <Text style={styles.warningText}>
                  This shop is not accepting appointment
                  bookings right now. The backend will also
                  block any invalid booking attempt.
                </Text>
              </View>
            </View>
          ) : null}

          {/* STEP 1: SELECT SERVICE */}

          <SectionHeading
            step="1"
            title="Select a service"
            subtitle="Choose one active service from this shop."
          />

          {shop.services && shop.services.length > 0 ? (
            <View style={styles.serviceList}>
              {shop.services.map((service) => {
                const selected =
                  selectedServiceId === service.id;

                return (
                  <TouchableOpacity
                    key={service.id}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() =>
                      handleServiceSelect(service.id)
                    }
                    style={[
                      styles.serviceOption,
                      selected &&
                        styles.serviceOptionSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.serviceIcon,
                        selected &&
                          styles.serviceIconSelected,
                      ]}
                    >
                      <Ionicons
                        name="cut-outline"
                        size={19}
                        color={
                          selected
                            ? COLORS.white
                            : COLORS.navy
                        }
                      />
                    </View>

                    <View style={styles.serviceContent}>
                      <Text
                        numberOfLines={2}
                        style={styles.serviceName}
                      >
                        {service.name}
                      </Text>

                      <View style={styles.serviceMetaRow}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color={COLORS.textMuted}
                        />

                        <Text style={styles.serviceMeta}>
                          {service.duration_minutes} minutes
                        </Text>
                      </View>
                    </View>

                    <View style={styles.serviceRight}>
                      <Text style={styles.servicePrice}>
                        {formatPrice(service.price)}
                      </Text>

                      <Ionicons
                        name={
                          selected
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={20}
                        color={
                          selected
                            ? COLORS.green
                            : COLORS.textLight
                        }
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <EmptyCard
              title="No active services"
              message="This shop does not currently have an active service available for booking."
            />
          )}

          {/* STEP 2: SELECT DATE */}

          <SectionHeading
            step="2"
            title="Select a date"
            subtitle="Available dates depend on the selected service, shop schedule, blocked dates, and existing appointments."
          />

          {!selectedService ? (
            <EmptyCard
              title="Choose a service first"
              message="StyleHub will load the real available dates after you select a service."
            />
          ) : (
            <CustomerBookingDatePicker
              dates={availableDates}
              selectedDate={selectedDate}
              isLoading={isLoadingDates}
              disabled={
                !shop.availability.accepts_appointments
              }
              onSelect={handleDateSelect}
            />
          )}

          {/* STEP 3: SELECT TIME */}

          <SectionHeading
            step="3"
            title="Select a time"
            subtitle="Only slots currently returned as available can be selected."
          />

          {selectedDateDetails ? (
            <View style={styles.scheduleHintCard}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={COLORS.blue}
              />

              <View style={styles.scheduleHintCopy}>
                <Text style={styles.scheduleHintTitle}>
                  {selectedDateDetails.day_label}
                </Text>

                <Text style={styles.scheduleHintText}>
                  {selectedDateDetails.opens_at &&
                  selectedDateDetails.closes_at
                    ? `Shop hours ${formatTime(
                        selectedDateDetails.opens_at,
                      )} – ${formatTime(
                        selectedDateDetails.closes_at,
                      )}`
                    : 'Shop hours are unavailable for this date.'}
                </Text>
              </View>
            </View>
          ) : null}

          <CustomerTimeSlotPicker
            slots={availableSlots}
            selectedStartsAt={selectedStartsAt}
            isLoading={isLoadingSlots}
            disabled={
              !shop.availability.accepts_appointments
            }
            emptyMessage={
              selectedDate
                ? 'No appointment times remain for this date. Please choose another available date.'
                : 'Select an available date to see appointment times.'
            }
            onSelect={handleSlotSelect}
          />

          {/* OPTIONAL BOOKING NOTE */}

          <SectionHeading
            title="Booking note"
            subtitle="Optional information you want the shop to see with this appointment request."
          />

          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <View style={styles.notesIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.notesHeaderCopy}>
                <Text style={styles.notesTitle}>
                  Notes
                </Text>

                <Text style={styles.notesHelper}>
                  Optional · Maximum {MAX_NOTES_LENGTH} characters
                </Text>
              </View>
            </View>

            <TextInput
              value={notes}
              onChangeText={(value) => {
                setNotes(value);
                setErrorMessage('');
              }}
              placeholder="Add an optional booking note"
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={MAX_NOTES_LENGTH}
              textAlignVertical="top"
              selectionColor={COLORS.navy}
              style={styles.notesInput}
            />

            <Text style={styles.characterCount}>
              {notes.length}/{MAX_NOTES_LENGTH}
            </Text>
          </View>

          {/* CURRENT SELECTION */}

          <SectionHeading
            title="Current selection"
            subtitle="You will confirm these details on the next screen."
          />

          <View style={styles.selectionCard}>
            <SelectionRow
              icon="cut-outline"
              label="Service"
              value={
                selectedService?.name ?? 'Not selected'
              }
            />

            <SelectionDivider />

            <SelectionRow
              icon="calendar-outline"
              label="Date"
              value={
                selectedDateDetails?.day_label ??
                'Not selected'
              }
            />

            <SelectionDivider />

            <SelectionRow
              icon="time-outline"
              label="Time"
              value={
                selectedSlot?.label ?? 'Not selected'
              }
            />
          </View>

          {/* REVIEW NOTICE */}

          <View style={styles.reviewNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.green}
            />

            <Text style={styles.reviewNoticeText}>
              No appointment has been created yet. The
              next screen rechecks the exact slot before
              the final booking request is submitted.
            </Text>
          </View>

          {/* CONTINUE BUTTON */}

          <TouchableOpacity
            disabled={continueDisabled}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Continue to review booking"
            onPress={handleContinueToReview}
            style={[
              styles.continueButton,
              continueDisabled && styles.continueDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueText,
                continueDisabled &&
                  styles.continueTextDisabled,
              ]}
            >
              Continue to review
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={
                continueDisabled
                  ? COLORS.textLight
                  : COLORS.white
              }
            />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* SECTION HEADING */

function SectionHeading({
  step,
  title,
  subtitle,
}: {
  step?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionTitleRow}>
        {step ? (
          <View style={styles.sectionStepBadge}>
            <Text style={styles.sectionStepText}>
              {step}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

/* PROGRESS ITEM */

function ProgressItem({
  number,
  label,
  complete,
}: {
  number: string;
  label: string;
  complete: boolean;
}) {
  return (
    <View style={styles.progressItem}>
      <View
        style={[
          styles.progressCircle,
          complete && styles.progressCircleComplete,
        ]}
      >
        {complete ? (
          <Ionicons
            name="checkmark"
            size={14}
            color={COLORS.white}
          />
        ) : (
          <Text style={styles.progressNumber}>
            {number}
          </Text>
        )}
      </View>

      <Text style={styles.progressLabel}>
        {label}
      </Text>
    </View>
  );
}

/* SELECTION ROW */

function SelectionRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.selectionRow}>
      <View style={styles.selectionIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.selectionCopy}>
        <Text style={styles.selectionLabel}>
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={styles.selectionValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SelectionDivider() {
  return <View style={styles.selectionDivider} />;
}

/* EMPTY CARD */

function EmptyCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyDot} />

      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>
          {title}
        </Text>

        <Text style={styles.emptyText}>
          {message}
        </Text>
      </View>
    </View>
  );
}

/* ERROR MESSAGE */

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

/* STYLES */

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

  shopHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  shopHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  shopHeroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  availabilityBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
  },

  availabilityBadgeText: {
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  shopHeroName: {
    marginTop: 15,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  shopHeroAddress: {
    marginTop: 5,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  progressRow: {
    marginTop: 17,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  progressItem: {
    width: 60,
    alignItems: 'center',
  },

  progressCircle: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#69798B',
    borderRadius: 15,
    backgroundColor: COLORS.navyMuted,
  },

  progressCircleComplete: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },

  progressNumber: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  progressLabel: {
    marginTop: 5,
    color: '#AEB8C5',
    fontSize: 9,
    fontWeight: '700',
  },

  progressLine: {
    flex: 1,
    height: 1,
    marginTop: 15,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
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

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionStepBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
  },

  sectionStepText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  serviceList: {
    gap: 9,
  },

  serviceOption: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  serviceOptionSelected: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.accentSoft,
  },

  serviceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  serviceIconSelected: {
    backgroundColor: COLORS.navy,
  },

  serviceContent: {
    flex: 1,
    minWidth: 0,
  },

  serviceName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 19,
    fontWeight: '800',
  },

  serviceMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  serviceMeta: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  serviceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },

  servicePrice: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  scheduleHintCard: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  scheduleHintCopy: {
    flex: 1,
  },

  scheduleHintTitle: {
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  scheduleHintText: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  notesCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  notesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  notesIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  notesHeaderCopy: {
    flex: 1,
  },

  notesTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  notesHelper: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  notesInput: {
    minHeight: 118,
    marginTop: 12,
    paddingHorizontal: 13,
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

  characterCount: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: 9,
    textAlign: 'right',
  },

  selectionCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  selectionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  selectionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  selectionCopy: {
    flex: 1,
    minWidth: 0,
  },

  selectionLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  selectionValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '800',
  },

  selectionDivider: {
    height: 1,
    marginLeft: 60,
    backgroundColor: COLORS.border,
  },

  emptyCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surfaceSoft,
  },

  emptyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.textLight,
  },

  emptyCopy: {
    flex: 1,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  reviewNotice: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.greenSoft,
  },

  reviewNoticeText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  continueButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  continueDisabled: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
  },

  continueText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  continueTextDisabled: {
    color: COLORS.textLight,
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
    maxWidth: 360,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

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
});
