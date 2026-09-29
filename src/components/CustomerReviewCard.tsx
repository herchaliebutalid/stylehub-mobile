import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import {
  RADII,
  SHADOWS,
  TYPOGRAPHY,
} from '@/src/constants/design';
import type { CustomerReview } from '@/src/types/customer';

interface CustomerReviewCardProps {
  review: CustomerReview;
}

function formatReviewDate(
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
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

function formatAppointmentDate(
  value: string,
): string {
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
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      },
    ).format(date);
  } catch {
    return value;
  }
}

export default function CustomerReviewCard({
  review,
}: CustomerReviewCardProps) {
  const reviewDate = formatReviewDate(
    review.created_at,
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons
            name="person-outline"
            size={19}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.heading}>
          <Text
            numberOfLines={1}
            style={styles.reviewer}
          >
            {review.reviewer.label}
          </Text>

          {review.verified_booking ? (
            <View style={styles.verifiedRow}>
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={COLORS.green}
              />

              <Text style={styles.verifiedText}>
                Verified booking
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.ratingBadge}>
          <Ionicons
            name="star"
            size={14}
            color={COLORS.warning}
          />

          <Text style={styles.ratingText}>
            {review.rating}/5
          </Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <Ionicons
              key={star}
              name={
                star <= review.rating
                  ? 'star'
                  : 'star-outline'
              }
              size={16}
              color={
                star <= review.rating
                  ? COLORS.warning
                  : COLORS.textLight
              }
            />
          ),
        )}
      </View>

      {review.comment?.trim() ? (
        <Text style={styles.comment}>
          {review.comment}
        </Text>
      ) : (
        <Text style={styles.commentMuted}>
          Rating submitted without a written comment.
        </Text>
      )}

      {(review.service || reviewDate) ? (
        <View style={styles.metaCard}>
          {review.service ? (
            <>
              <View style={styles.metaRow}>
                <Ionicons
                  name="cut-outline"
                  size={14}
                  color={COLORS.textMuted}
                />

                <Text
                  numberOfLines={1}
                  style={styles.metaText}
                >
                  {review.service.name}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={14}
                  color={COLORS.textMuted}
                />

                <Text style={styles.metaText}>
                  Appointment {formatAppointmentDate(
                    review.service.appointment_date,
                  )}
                </Text>
              </View>
            </>
          ) : null}

          {reviewDate ? (
            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={COLORS.textMuted}
              />

              <Text style={styles.metaText}>
                Reviewed {reviewDate}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  heading: {
    flex: 1,
    minWidth: 0,
  },

  reviewer: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  verifiedRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  verifiedText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '700',
  },

  ratingBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.warningSoft,
  },

  ratingText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  starsRow: {
    marginTop: 13,
    flexDirection: 'row',
    gap: 4,
  },

  comment: {
    marginTop: 11,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  commentMuted: {
    marginTop: 11,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  metaCard: {
    marginTop: 13,
    gap: 7,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  metaText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
    fontWeight: '600',
  },
});