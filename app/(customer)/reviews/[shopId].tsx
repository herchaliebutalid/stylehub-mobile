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
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CustomerReviewCard from '@/src/components/CustomerReviewCard';
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
import { getCustomerShopReviews } from '@/src/services/customer-api';
import type {
  CustomerReview,
  CustomerShopPagination,
  CustomerShopRating,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];

const PER_PAGE = 10;
const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function ratingDescription(
  rating: number | undefined,
): string {
  if (rating === undefined) {
    return 'All verified reviews';
  }

  return `${rating}-star reviews`;
}

export default function CustomerShopReviewsScreen() {
  const params = useLocalSearchParams<{
    shopId?: string | string[];
  }>();

  const { token } = useAuth();

  const shopId = Number(
    getRouteValue(params.shopId),
  );

  const [
    shopName,
    setShopName,
  ] = useState('');

  const [
    ratingSummary,
    setRatingSummary,
  ] = useState<CustomerShopRating | null>(null);

  const [
    reviews,
    setReviews,
  ] = useState<CustomerReview[]>([]);

  const [
    pagination,
    setPagination,
  ] = useState<CustomerShopPagination | null>(null);

  const [
    rating,
    setRating,
  ] = useState<number | undefined>(undefined);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isUpdating,
    setIsUpdating,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const hasLoadedOnce = useRef(false);

  const loadReviews = useCallback(
    async (
      refreshing = false,
      updating = false,
    ): Promise<void> => {
      if (
        !token
        || !Number.isInteger(shopId)
        || shopId < 1
      ) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsUpdating(false);

        setErrorMessage(
          'The selected shop is invalid.',
        );

        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (updating) {
        setIsUpdating(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getCustomerShopReviews(
          token,
          shopId,
          {
            rating,
            page,
            perPage: PER_PAGE,
          },
        );

        setShopName(
          response.data.shop.name,
        );

        setRatingSummary(
          response.data.shop.rating,
        );

        setReviews(
          response.data.reviews,
        );

        setPagination(
          response.data.pagination,
        );

        hasLoadedOnce.current = true;
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load reviews.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsUpdating(false);
      }
    },
    [
      page,
      rating,
      shopId,
      token,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void loadReviews(
        false,
        hasLoadedOnce.current,
      );

      return undefined;
    }, [loadReviews]),
  );

  const resultRange = useMemo(
    () => {
      if (
        !pagination
        || pagination.total === 0
      ) {
        return null;
      }

      const first =
        (pagination.current_page - 1)
        * pagination.per_page
        + 1;

      const last = Math.min(
        pagination.current_page
        * pagination.per_page,
        pagination.total,
      );

      return {
        first,
        last,
      };
    },
    [pagination],
  );

  function selectRating(
    nextRating?: number,
  ): void {
    if (
      isLoading
      || isRefreshing
      || isUpdating
      || rating === nextRating
    ) {
      return;
    }

    setPage(1);
    setRating(nextRating);
  }

  function changePage(
    nextPage: number,
  ): void {
    if (
      !pagination
      || isLoading
      || isRefreshing
      || isUpdating
      || nextPage < 1
      || nextPage > pagination.last_page
      || nextPage === pagination.current_page
    ) {
      return;
    }

    setPage(nextPage);
  }

  if (
    isLoading
    && !ratingSummary
    && reviews.length === 0
  ) {
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
            Loading verified reviews
          </Text>

          <Text style={styles.loadingText}>
            Getting the latest ratings and customer feedback for this shop.
          </Text>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              void loadReviews(true)
            }
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
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
              Reviews
            </Text>

            <Text style={styles.topBarCaption}>
              Verified StyleHub feedback
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh reviews"
            disabled={
              isRefreshing
              || isUpdating
            }
            onPress={() =>
              void loadReviews(true)
            }
            style={[
              styles.topIconButton,

              (
                isRefreshing
                || isUpdating
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
            VERIFIED REVIEWS
          </Text>

          <Text style={styles.title}>
            {shopName || 'Shop reviews'}
          </Text>

          <Text style={styles.subtitle}>
            Read ratings submitted from completed StyleHub appointments and filter them by star rating.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>
                Reviews need attention
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>
                Average rating
              </Text>

              <View style={styles.averageRow}>
                <Ionicons
                  name="star"
                  size={25}
                  color={COLORS.warning}
                />

                <Text style={styles.averageValue}>
                  {ratingSummary?.average === null
                    || ratingSummary?.average === undefined
                    ? 'New'
                    : ratingSummary.average.toFixed(1)}
                </Text>

                {ratingSummary?.average !== null
                && ratingSummary?.average !== undefined ? (
                  <Text style={styles.averageOutOf}>
                    / 5
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.summaryIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <SummaryItem
              label="Verified reviews"
              value={String(
                ratingSummary?.review_count ?? 0,
              )}
            />

            <View style={styles.summaryDivider} />

            <SummaryItem
              label="Current filter"
              value={ratingDescription(rating)}
            />
          </View>
        </View>

        <View style={styles.filterHeading}>
          <View style={styles.filterHeadingCopy}>
            <Text style={styles.sectionTitle}>
              Filter reviews
            </Text>

            <Text style={styles.sectionSubtitle}>
              The rating filter is sent to your existing Laravel reviews endpoint.
            </Text>
          </View>

          {isUpdating ? (
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <RatingChip
            label="All reviews"
            icon="apps-outline"
            selected={rating === undefined}
            disabled={isUpdating}
            onPress={() => selectRating()}
          />

          {RATING_OPTIONS.map(
            (value) => (
              <RatingChip
                key={value}
                label={`${value} star${value === 1 ? '' : 's'}`}
                icon="star"
                selected={rating === value}
                disabled={isUpdating}
                onPress={() =>
                  selectRating(value)
                }
              />
            ),
          )}
        </ScrollView>

        <View style={styles.resultsHeading}>
          <View style={styles.resultsHeadingCopy}>
            <Text style={styles.sectionTitle}>
              {ratingDescription(rating)}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {pagination
                ? `${pagination.total} matching review${pagination.total === 1 ? '' : 's'}.`
                : 'Customer feedback for this shop.'}
            </Text>
          </View>

          {resultRange ? (
            <View style={styles.rangeBadge}>
              <Text style={styles.rangeBadgeText}>
                {resultRange.first}–{resultRange.last}
              </Text>
            </View>
          ) : null}
        </View>

        {isUpdating && reviews.length === 0 ? (
          <View style={styles.inlineLoadingCard}>
            <ActivityIndicator
              size="small"
              color={COLORS.navy}
            />

            <Text style={styles.inlineLoadingText}>
              Updating reviews...
            </Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={27}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No matching reviews
            </Text>

            <Text style={styles.emptyText}>
              {rating === undefined
                ? 'This shop does not have verified customer reviews yet.'
                : `No verified ${rating}-star reviews were returned for this shop.`}
            </Text>

            {rating !== undefined ? (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => selectRating()}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>
                  Show all reviews
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.reviewList,

              isUpdating
              && styles.updatingList,
            ]}
          >
            {reviews.map(
              (review) => (
                <CustomerReviewCard
                  key={review.id}
                  review={review}
                />
              ),
            )}
          </View>
        )}

        {pagination
        && pagination.total > 0
        && pagination.last_page > 1 ? (
          <View style={styles.paginationCard}>
            <View style={styles.paginationCopy}>
              <Text style={styles.paginationTitle}>
                Page {pagination.current_page} of {pagination.last_page}
              </Text>

              <Text style={styles.paginationText}>
                {resultRange
                  ? `Showing ${resultRange.first}–${resultRange.last} of ${pagination.total} reviews.`
                  : `${pagination.total} reviews found.`}
              </Text>
            </View>

            <View style={styles.paginationButtons}>
              <TouchableOpacity
                activeOpacity={0.78}
                disabled={
                  pagination.current_page <= 1
                  || isUpdating
                  || isRefreshing
                }
                accessibilityRole="button"
                accessibilityLabel="Previous reviews page"
                onPress={() =>
                  changePage(
                    pagination.current_page - 1,
                  )
                }
                style={[
                  styles.pageButton,

                  (
                    pagination.current_page <= 1
                    || isUpdating
                    || isRefreshing
                  )
                  && styles.disabledButton,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={COLORS.navy}
                />

                <Text style={styles.pageButtonText}>
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.78}
                disabled={
                  !pagination.has_more_pages
                  || isUpdating
                  || isRefreshing
                }
                accessibilityRole="button"
                accessibilityLabel="Next reviews page"
                onPress={() =>
                  changePage(
                    pagination.current_page + 1,
                  )
                }
                style={[
                  styles.pageButton,

                  (
                    !pagination.has_more_pages
                    || isUpdating
                    || isRefreshing
                  )
                  && styles.disabledButton,
                ]}
              >
                <Text style={styles.pageButtonText}>
                  Next
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.navy}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.summaryItemValue}
      >
        {value}
      </Text>
    </View>
  );
}

function RatingChip({
  label,
  icon,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  icon: IconName;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{
        selected,
        disabled,
      }}
      onPress={onPress}
      style={[
        styles.filterChip,

        selected
        && styles.filterChipSelected,

        disabled
        && styles.disabledButton,
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={
          selected
            ? COLORS.white
            : icon === 'star'
              ? COLORS.warning
              : COLORS.textMuted
        }
      />

      <Text
        style={[
          styles.filterChipText,

          selected
          && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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

  summaryCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  averageRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },

  averageValue: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  averageOutOf: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },

  summaryIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  summaryFooter: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  summaryItem: {
    flex: 1,
    minWidth: 0,
  },

  summaryItemLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  summaryItemValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 18,
    fontWeight: '800',
  },

  summaryDivider: {
    width: 1,
    marginHorizontal: 14,
    backgroundColor: COLORS.navyMuted,
  },

  filterHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },

  filterHeadingCopy: {
    flex: 1,
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

  filterRow: {
    gap: 7,
    paddingRight: 4,
    paddingBottom: 3,
  },

  filterChip: {
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },

  filterChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  filterChipText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  filterChipTextSelected: {
    color: COLORS.white,
  },

  resultsHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },

  resultsHeadingCopy: {
    flex: 1,
  },

  rangeBadge: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  rangeBadgeText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  reviewList: {
    gap: 10,
  },

  updatingList: {
    opacity: 0.55,
  },

  inlineLoadingCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  inlineLoadingText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 370,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  emptyButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  paginationCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  paginationCopy: {
    alignItems: 'center',
  },

  paginationTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  paginationText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    textAlign: 'center',
  },

  paginationButtons: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },

  pageButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  pageButtonText: {
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

  disabledButton: {
    opacity: 0.48,
  },
});