import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
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
  getCustomerAppointment,
  getCustomerFeedback,
  submitCustomerFeedback,
} from '@/src/services/customer-api';
import type {
  CustomerAppointment,
  CustomerFeedback,
} from '@/src/types/customer';


const RATINGS = [1, 2, 3, 4, 5] as const;

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value)
    ? value[0]
    : value;
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

function ratingLabel(rating: number): string {
  switch (rating) {
    case 1:
      return 'Needs improvement';

    case 2:
      return 'Fair';

    case 3:
      return 'Good';

    case 4:
      return 'Very good';

    case 5:
    default:
      return 'Excellent';
  }
}

export default function CustomerFeedbackScreen() {
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
    existingFeedback,
    setExistingFeedback,
  ] = useState<CustomerFeedback | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    'Thank you for sharing your experience.',
  );

  const loadData = useCallback(
    async (
      refreshing = false,
    ): Promise<void> => {
      if (
        !token
        || !Number.isInteger(appointmentId)
        || appointmentId < 1
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
        const [
          appointmentResponse,
          feedbackResponse,
        ] = await Promise.all([
          getCustomerAppointment(
            token,
            appointmentId,
          ),
          getCustomerFeedback(token),
        ]);

        const loadedAppointment =
          appointmentResponse.data.appointment;

        const feedback =
          feedbackResponse.data.feedback.find(
            (item) =>
              item.appointment?.id === appointmentId,
          ) ?? null;

        setAppointment(loadedAppointment);
        setExistingFeedback(feedback);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to prepare feedback.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [appointmentId, token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();

      return undefined;
    }, [loadData]),
  );

  const scheduleLabel = useMemo(
    () => {
      if (!appointment) {
        return '';
      }

      return `${formatTime(appointment.starts_at)} – ${formatTime(appointment.ends_at)}`;
    },
    [appointment],
  );

  const canSubmit = Boolean(
    appointment
    && appointment.status === 'completed'
    && !existingFeedback,
  );

  const existingSubmittedAt = formatDateTime(
    existingFeedback?.created_at ?? null,
  );

  async function handleSubmit(): Promise<void> {
    if (
      !token
      || !appointment
      || !canSubmit
      || isSubmitting
    ) {
      return;
    }

    setErrorMessage('');

    if (rating < 1 || rating > 5) {
      setErrorMessage(
        'Select a rating from 1 to 5 stars.',
      );
      return;
    }

    if (comment.trim().length > 2000) {
      setErrorMessage(
        'Feedback comment may not exceed 2000 characters.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitCustomerFeedback(
        token,
        appointment.id,
        {
          rating,
          comment,
        },
      );

      setExistingFeedback(response.data.feedback);

      setSuccessMessage(
        response.message
        ?? 'Thank you for sharing your experience.',
      );

      setSuccessVisible(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to submit feedback.',
      );
    } finally {
      setIsSubmitting(false);
    }
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

  if (isLoading && !appointment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          </View>

          <Text style={styles.loadingTitle}>
            Preparing your review
          </Text>

          <Text style={styles.loadingText}>
            Checking the appointment and whether feedback has already been submitted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
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
                name="star-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.unavailableTitle}>
              Feedback unavailable
            </Text>

            <Text style={styles.unavailableText}>
              {errorMessage
                || 'Unable to display this appointment.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={isSubmitting}
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
                Review appointment
              </Text>

              <Text style={styles.topBarCaption}>
                Appointment #{appointment.id}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Refresh feedback"
              disabled={
                isRefreshing
                || isSubmitting
              }
              onPress={() =>
                void loadData(true)
              }
              style={[
                styles.topIconButton,
                (
                  isRefreshing
                  || isSubmitting
                )
                && styles.disabledButton,
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
              YOUR EXPERIENCE
            </Text>

            <Text style={styles.title}>
              Share feedback about your completed visit
            </Text>

            <Text style={styles.subtitle}>
              Rate the appointment from 1 to 5 stars and optionally leave a comment for the shop. Each completed appointment can receive feedback only once.
            </Text>
          </View>

          {errorMessage ? (
            <MessageBox
              title="Feedback needs attention"
              message={errorMessage}
            />
          ) : null}

          <View style={styles.appointmentHero}>
            <View style={styles.appointmentHeroTopRow}>
              <View style={styles.appointmentHeroIcon}>
                <Ionicons
                  name={
                    appointment.shop?.type === 'barber_shop'
                      ? 'cut-outline'
                      : 'sparkles-outline'
                  }
                  size={24}
                  color={COLORS.white}
                />
              </View>

              <View style={styles.completedBadge}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={14}
                  color={COLORS.blue}
                />

                <Text style={styles.completedBadgeText}>
                  {appointment.status_label}
                </Text>
              </View>
            </View>

            <Text style={styles.heroService}>
              {appointment.service_snapshot.name}
            </Text>

            <Text style={styles.heroShop}>
              {appointment.shop?.name ?? 'StyleHub Shop'}
            </Text>

            <View style={styles.heroScheduleRow}>
              <View style={styles.heroScheduleItem}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color="#D4DAE1"
                />

                <Text style={styles.heroScheduleText}>
                  {formatDate(appointment.appointment_date)}
                </Text>
              </View>

              <View style={styles.heroScheduleItem}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color="#D4DAE1"
                />

                <Text style={styles.heroScheduleText}>
                  {scheduleLabel}
                </Text>
              </View>
            </View>
          </View>

          {existingFeedback ? (
            <>
              <SectionHeading
                title="Your submitted feedback"
                subtitle="This appointment already has feedback, so another review cannot be submitted."
              />

              <View style={styles.existingCard}>
                <View style={styles.existingHeader}>
                  <View style={styles.existingIcon}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color={COLORS.green}
                    />
                  </View>

                  <View style={styles.existingHeaderCopy}>
                    <Text style={styles.existingTitle}>
                      Feedback already submitted
                    </Text>

                    <Text style={styles.existingSubtitle}>
                      Your review is saved with this completed appointment.
                    </Text>
                  </View>
                </View>

                <View style={styles.existingRatingArea}>
                  <View style={styles.existingStars}>
                    {RATINGS.map((star) => (
                      <Ionicons
                        key={star}
                        name={
                          star <= existingFeedback.rating
                            ? 'star'
                            : 'star-outline'
                        }
                        size={25}
                        color={
                          star <= existingFeedback.rating
                            ? COLORS.warning
                            : COLORS.textLight
                        }
                      />
                    ))}
                  </View>

                  <Text style={styles.existingRatingValue}>
                    {existingFeedback.rating}/5 · {ratingLabel(existingFeedback.rating)}
                  </Text>
                </View>

                <View style={styles.existingCommentCard}>
                  <Text style={styles.existingCommentLabel}>
                    Comment
                  </Text>

                  <Text style={styles.existingComment}>
                    {existingFeedback.comment?.trim()
                      || 'No written comment was included.'}
                  </Text>
                </View>

                {existingSubmittedAt ? (
                  <View style={styles.submittedRow}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.submittedText}>
                      Submitted {existingSubmittedAt}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Return to appointment details"
                onPress={() =>
                  router.replace({
                    pathname:
                      '/(customer)/customer-appointment/[appointmentId]',
                    params: {
                      appointmentId:
                        String(appointment.id),
                    },
                  })
                }
                style={styles.returnButton}
              >
                <Text style={styles.returnButtonText}>
                  Back to appointment details
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </>
          ) : appointment.status !== 'completed' ? (
            <>
              <SectionHeading
                title="Feedback availability"
                subtitle="Reviews are tied to completed appointments."
              />

              <View style={styles.warningCard}>
                <View style={styles.warningIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={COLORS.warning}
                  />
                </View>

                <View style={styles.warningCopy}>
                  <Text style={styles.warningTitle}>
                    This appointment cannot be reviewed yet
                  </Text>

                  <Text style={styles.warningText}>
                    Feedback can only be submitted after Laravel marks the appointment as completed.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <SectionHeading
                title="Your rating"
                subtitle="Select one rating from 1 to 5 stars."
              />

              <View style={styles.ratingCard}>
                <View style={styles.starsRow}>
                  {RATINGS.map((star) => {
                    const selected = star <= rating;

                    return (
                      <TouchableOpacity
                        key={star}
                        activeOpacity={0.75}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
                        accessibilityState={{
                          selected: rating === star,
                        }}
                        onPress={() =>
                          setRating(star)
                        }
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={
                            selected
                              ? 'star'
                              : 'star-outline'
                          }
                          size={33}
                          color={
                            selected
                              ? COLORS.warning
                              : COLORS.textLight
                          }
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.ratingValue}>
                  {rating} out of 5
                </Text>

                <Text style={styles.ratingDescription}>
                  {ratingLabel(rating)}
                </Text>
              </View>

              <SectionHeading
                title="Optional comment"
                subtitle="Add more detail if you want to tell the shop what went well or what could improve."
              />

              <View style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentIcon}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={19}
                      color={COLORS.navy}
                    />
                  </View>

                  <View style={styles.commentHeaderCopy}>
                    <Text style={styles.commentTitle}>
                      Comment
                    </Text>

                    <Text style={styles.commentHelper}>
                      Optional · Maximum 2000 characters
                    </Text>
                  </View>
                </View>

                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  editable={!isSubmitting}
                  maxLength={2000}
                  multiline
                  textAlignVertical="top"
                  placeholder="Tell the shop about your experience..."
                  placeholderTextColor={COLORS.textLight}
                  selectionColor={COLORS.navy}
                  style={styles.commentInput}
                />

                <Text style={styles.characterCount}>
                  {comment.length}/2000
                </Text>
              </View>

              <View style={styles.reviewNotice}>
                <View style={styles.reviewNoticeIcon}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={COLORS.blue}
                  />
                </View>

                <View style={styles.reviewNoticeCopy}>
                  <Text style={styles.reviewNoticeTitle}>
                    One review per appointment
                  </Text>

                  <Text style={styles.reviewNoticeText}>
                    After submission, this appointment cannot receive duplicate feedback. Laravel remains the final authority for review eligibility.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Submit feedback"
                onPress={() =>
                  void handleSubmit()
                }
                style={[
                  styles.submitButton,
                  isSubmitting
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

                <Text style={styles.submitButtonText}>
                  {isSubmitting
                    ? 'Submitting feedback...'
                    : 'Submit feedback'}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
            <View style={styles.modalSuccessIcon}>
              <Ionicons
                name="checkmark"
                size={30}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.modalTitle}>
              Feedback submitted
            </Text>

            <Text style={styles.modalText}>
              {successMessage}
            </Text>

            <View style={styles.modalRatingCard}>
              <View style={styles.modalStars}>
                {RATINGS.map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= rating
                        ? 'star'
                        : 'star-outline'
                    }
                    size={22}
                    color={
                      star <= rating
                        ? COLORS.warning
                        : COLORS.textLight
                    }
                  />
                ))}
              </View>

              <Text style={styles.modalRatingText}>
                {rating}/5 · {ratingLabel(rating)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleDone}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>
                Back to appointment
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

  appointmentHero: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  appointmentHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  appointmentHeroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  completedBadge: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.blueSoft,
  },

  completedBadgeText: {
    color: COLORS.blue,
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

  existingCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  existingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  existingIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
  },

  existingHeaderCopy: {
    flex: 1,
  },

  existingTitle: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  existingSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  existingRatingArea: {
    marginTop: 16,
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.warningSoft,
  },

  existingStars: {
    flexDirection: 'row',
    gap: 6,
  },

  existingRatingValue: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  existingCommentCard: {
    marginTop: 13,
    padding: 13,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  existingCommentLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  existingComment: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  submittedRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  submittedText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  returnButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  returnButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
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

  ratingCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  starButton: {
    width: 47,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.pill,
  },

  ratingValue: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  ratingDescription: {
    marginTop: 3,
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  commentCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  commentIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  commentHeaderCopy: {
    flex: 1,
  },

  commentTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  commentHelper: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  commentInput: {
    minHeight: 130,
    marginTop: 13,
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

  reviewNotice: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.blueSoft,
  },

  reviewNoticeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  reviewNoticeCopy: {
    flex: 1,
  },

  reviewNoticeTitle: {
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  reviewNoticeText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  submitButton: {
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

  submitButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 500,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.floating,
  },

  modalSuccessIcon: {
    width: 58,
    height: 58,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: COLORS.green,
  },

  modalTitle: {
    marginTop: 13,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    textAlign: 'center',
  },

  modalText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  modalRatingCard: {
    marginTop: 15,
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.warningSoft,
  },

  modalStars: {
    flexDirection: 'row',
    gap: 5,
  },

  modalRatingText: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  modalButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  modalButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
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