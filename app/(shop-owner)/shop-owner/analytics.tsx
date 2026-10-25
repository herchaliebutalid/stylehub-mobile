
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { getShopOwnerAnalytics } from '@/src/services/shop-owner-analytics-api';
import type {
  ShopOwnerAnalyticsDailyTrendItem,
  ShopOwnerAnalyticsData,
  ShopOwnerAnalyticsDateRange,
  ShopOwnerAnalyticsStatusCounts,
  ShopOwnerAnalyticsTopService,
} from '@/src/types/shop-owner-analytics';

type IconName = ComponentProps<typeof Ionicons>['name'];
type PeriodPreset = 7 | 30 | 90;
type StatusKey = keyof ShopOwnerAnalyticsStatusCounts;

interface StatusDefinition {
  key: StatusKey;
  label: string;
  icon: IconName;
  background: string;
  color: string;
}

const PERIOD_PRESETS: {
  value: PeriodPreset;
  label: string;
  caption: string;
}[] = [
  { value: 7, label: '7 days', caption: 'This week' },
  { value: 30, label: '30 days', caption: 'Default' },
  { value: 90, label: '90 days', caption: 'Quarter view' },
];

const STATUS_DEFINITIONS: StatusDefinition[] = [
  {
    key: 'pending',
    label: 'Pending',
    icon: 'time-outline',
    background: COLORS.warningSoft,
    color: COLORS.warning,
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    icon: 'checkmark-circle-outline',
    background: COLORS.blueSoft,
    color: COLORS.blue,
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'checkmark-done-outline',
    background: COLORS.greenSoft,
    color: COLORS.green,
  },
  {
    key: 'no_show',
    label: 'No-show',
    icon: 'person-remove-outline',
    background: COLORS.orangeSoft,
    color: COLORS.orange,
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: 'close-circle-outline',
    background: COLORS.dangerSoft,
    color: COLORS.danger,
  },
  {
    key: 'declined',
    label: 'Declined',
    icon: 'remove-circle-outline',
    background: COLORS.surfaceSoft,
    color: COLORS.textMuted,
  },
];

/* DATE AND NUMBER FORMATTERS */

function manilaDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dateRangeForPreset(
  preset: PeriodPreset,
): ShopOwnerAnalyticsDateRange | undefined {
  // Keep Laravel's default date range for 30 days.
  if (preset === 30) {
    return undefined;
  }

  const today = manilaDateString(new Date());
  const todayAtNoon = new Date(
    `${today}T12:00:00+08:00`,
  );

  todayAtNoon.setTime(
    todayAtNoon.getTime() -
      (preset - 1) * 24 * 60 * 60 * 1000,
  );

  return {
    dateFrom: manilaDateString(todayAtNoon),
    dateTo: today,
  };
}

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `₱${(value / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `₱${(value / 1_000).toFixed(1)}K`;
  }

  return formatCurrency(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';

  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatRating(value: number | null): string {
  return value === null ? '—' : value.toFixed(1);
}

function formatShortDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00+08:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(parsed);
}

function formatGeneratedAt(value: string | null): string | null {
  if (!value) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    }).format(parsed);
  } catch {
    return null;
  }
}

function percentageWidth(
  value: number,
  maximum: number,
): `${number}%` {
  if (maximum <= 0 || value <= 0) {
    return '0%';
  }

  return `${Math.max(
    4,
    Math.round((value / maximum) * 100),
  )}%`;
}

function ratioWidth(value: number | null): `${number}%` {
  if (value === null || value <= 0) {
    return '0%';
  }

  return `${Math.min(100, Math.max(4, value))}%`;
}

function statusShare(
  value: number,
  totalBookings: number,
): string {
  if (totalBookings <= 0) return '0%';

  return `${Math.round(
    (value / totalBookings) * 100,
  )}%`;
}

/* MAIN ANALYTICS SCREEN */

export default function ShopOwnerAnalyticsScreen() {
  const { token } = useAuth();

  const [periodPreset, setPeriodPreset] =
    useState<PeriodPreset>(30);

  const [analytics, setAnalytics] =
    useState<ShopOwnerAnalyticsData | null>(null);

  const [generatedAt, setGeneratedAt] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /* LOAD ANALYTICS */

  const loadAnalytics = useCallback(
    async (refreshing = false): Promise<void> => {
      if (!token) {
        setAnalytics(null);
        setGeneratedAt(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getShopOwnerAnalytics(
          token,
          dateRangeForPreset(periodPreset),
        );

        setAnalytics(response.data);
        setGeneratedAt(response.generated_at);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load shop analytics.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [periodPreset, token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics]),
  );

  /* DERIVED ANALYTICS */

  const recentTrend = useMemo(
    () => analytics?.daily_trend.slice(-14) ?? [],
    [analytics],
  );

  const maximumRecentBookings = useMemo(
    () =>
      Math.max(
        0,
        ...recentTrend.map((item) => item.total_bookings),
      ),
    [recentTrend],
  );

  const maximumServiceBookings = useMemo(
    () =>
      Math.max(
        0,
        ...(analytics?.top_services.map(
          (service) => service.total_bookings,
        ) ?? []),
      ),
    [analytics],
  );

  const periodLabel = analytics
    ? `${formatShortDate(
        analytics.period.date_from,
      )} – ${formatShortDate(analytics.period.date_to)}`
    : 'Selected period';

  const generatedLabel = formatGeneratedAt(generatedAt);

  /* RENDER */

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadAnalytics(true)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* TOP BAR */}

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to shop owner home"
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
              Analytics
            </Text>

            <Text style={styles.topBarCaption}>
              Shop performance overview
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh shop analytics"
            disabled={isRefreshing || isLoading}
            onPress={() => void loadAnalytics(true)}
            style={[
              styles.topIconButton,
              (isRefreshing || isLoading) &&
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

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            BUSINESS INSIGHTS
          </Text>

          <Text style={styles.title}>
            Understand your bookings, revenue, and service performance
          </Text>

          <Text style={styles.subtitle}>
            Review the reporting period, customer activity,
            appointment outcomes, and completed revenue
            already calculated by StyleHub.
          </Text>
        </View>

        {/* REPORTING PERIOD */}

        <View style={styles.periodCard}>
          <View style={styles.periodHeader}>
            <View style={styles.periodHeaderIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.periodHeaderCopy}>
              <Text style={styles.periodTitle}>
                Reporting period
              </Text>

              <Text style={styles.periodValue}>
                {periodLabel}
              </Text>
            </View>
          </View>

          <View style={styles.periodButtons}>
            {PERIOD_PRESETS.map((preset) => {
              const selected =
                periodPreset === preset.value;

              return (
                <TouchableOpacity
                  key={preset.value}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={isLoading || isRefreshing}
                  onPress={() =>
                    setPeriodPreset(preset.value)
                  }
                  style={[
                    styles.periodButton,
                    selected &&
                      styles.periodButtonSelected,
                    (isLoading || isRefreshing) &&
                      styles.disabledButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selected &&
                        styles.periodButtonTextSelected,
                    ]}
                  >
                    {preset.label}
                  </Text>

                  <Text
                    style={[
                      styles.periodButtonCaption,
                      selected &&
                        styles.periodButtonCaptionSelected,
                    ]}
                  >
                    {preset.caption}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ERROR */}

        {errorMessage ? (
          <MessageBox
            title="Analytics needs attention"
            message={errorMessage}
          />
        ) : null}

        {/* FIRST LOADING */}

        {isLoading && !analytics ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.loadingTitle}>
              Loading analytics
            </Text>

            <Text style={styles.loadingText}>
              Getting your bookings, completed revenue,
              ratings, and service performance.
            </Text>
          </View>
        ) : null}

        {/* ANALYTICS DATA */}

        {analytics ? (
          <>
            {/* COMPLETED REVENUE */}

            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.heroLabel}>
                    Completed revenue
                  </Text>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={styles.heroRevenue}
                  >
                    {formatCurrency(
                      analytics.summary.completed_revenue,
                    )}
                  </Text>
                </View>

                <View style={styles.heroIcon}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={24}
                    color={COLORS.white}
                  />
                </View>
              </View>

              <Text style={styles.heroRevenueNote}>
                Earned revenue from completed appointments
                in this reporting period.
              </Text>

              <View style={styles.heroStats}>
                <HeroStat
                  value={String(
                    analytics.summary.total_bookings,
                  )}
                  label="Bookings"
                />

                <View style={styles.heroDivider} />

                <HeroStat
                  value={String(
                    analytics.summary.unique_customers,
                  )}
                  label="Customers"
                />

                <View style={styles.heroDivider} />

                <HeroStat
                  value={formatRating(
                    analytics.summary.average_rating,
                  )}
                  label={
                    analytics.summary.review_count === 1
                      ? '1 review'
                      : `${analytics.summary.review_count} reviews`
                  }
                  icon="star"
                />
              </View>

              {generatedLabel ? (
                <View style={styles.generatedRow}>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color="#AEB8C5"
                  />

                  <Text style={styles.generatedText}>
                    Updated {generatedLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* BOOKING OVERVIEW */}

            <SectionHeading
              title="Booking overview"
              subtitle="Key totals for the selected reporting period."
            />

            <View style={styles.kpiGrid}>
              <KpiCard
                icon="calendar-outline"
                label="Total bookings"
                value={String(
                  analytics.summary.total_bookings,
                )}
                helper="All appointment statuses"
                background={COLORS.blueSoft}
                color={COLORS.blue}
              />

              <KpiCard
                icon="people-outline"
                label="Unique customers"
                value={String(
                  analytics.summary.unique_customers,
                )}
                helper="Distinct customers booked"
                background={COLORS.violetSoft}
                color={COLORS.violet}
              />

              <KpiCard
                icon="cash-outline"
                label="Completed revenue"
                value={formatCompactCurrency(
                  analytics.summary.completed_revenue,
                )}
                helper="Completed appointments only"
                background={COLORS.greenSoft}
                color={COLORS.green}
              />

              <KpiCard
                icon="star-outline"
                label="Average rating"
                value={formatRating(
                  analytics.summary.average_rating,
                )}
                helper={
                  analytics.summary.review_count === 1
                    ? 'Based on 1 review'
                    : `Based on ${analytics.summary.review_count} reviews`
                }
                background={COLORS.warningSoft}
                color={COLORS.warning}
              />
            </View>

            {/* BOOKING STATUS */}

            <SectionHeading
              title="Booking status"
              subtitle="See where appointments ended up during this period."
            />

            <View style={styles.statusCard}>
              {STATUS_DEFINITIONS.map(
                (definition, index) => (
                  <View key={definition.key}>
                    {index > 0 ? (
                      <View style={styles.rowDivider} />
                    ) : null}

                    <StatusRow
                      definition={definition}
                      value={
                        analytics.status_counts[
                          definition.key
                        ]
                      }
                      totalBookings={
                        analytics.summary.total_bookings
                      }
                    />
                  </View>
                ),
              )}
            </View>

            {/* PERFORMANCE RATES */}

            <SectionHeading
              title="Performance rates"
              subtitle="Operational outcome rates already calculated by your analytics API."
            />

            <View style={styles.performanceGrid}>
              <PerformanceCard
                icon="checkmark-done-outline"
                label="Completion"
                value={
                  analytics.performance.completion_rate
                }
                helper="Completed vs completed + no-show outcomes"
                color={COLORS.green}
                softColor={COLORS.greenSoft}
              />

              <PerformanceCard
                icon="person-remove-outline"
                label="No-show"
                value={analytics.performance.no_show_rate}
                helper="No-shows vs completed + no-show outcomes"
                color={COLORS.orange}
                softColor={COLORS.orangeSoft}
              />

              <PerformanceCard
                icon="close-circle-outline"
                label="Cancellation"
                value={
                  analytics.performance.cancellation_rate
                }
                helper="Cancelled bookings in the reporting period"
                color={COLORS.danger}
                softColor={COLORS.dangerSoft}
              />

              <PerformanceCard
                icon="remove-circle-outline"
                label="Decline"
                value={analytics.performance.decline_rate}
                helper="Declined bookings in the reporting period"
                color={COLORS.textMuted}
                softColor={COLORS.surfaceSoft}
              />
            </View>

            {/* ATTENDANCE OUTCOMES */}

            <View style={styles.attendanceCard}>
              <View style={styles.attendanceIcon}>
                <Ionicons
                  name="people-circle-outline"
                  size={21}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.attendanceCopy}>
                <Text style={styles.attendanceLabel}>
                  Attendance outcomes
                </Text>

                <Text style={styles.attendanceValue}>
                  {analytics.performance.attendance_outcomes}
                </Text>

                <Text style={styles.attendanceText}>
                  Completed and no-show outcomes used by the
                  completion and no-show rate calculations.
                </Text>
              </View>
            </View>

            {/* DAILY TREND */}

            <SectionHeading
              title="Daily trend"
              subtitle="The latest 14 days available inside the selected reporting period."
              trailing="Bookings · Revenue"
            />

            <View style={styles.trendCard}>
              {recentTrend.length === 0 ? (
                <EmptySection
                  icon="stats-chart-outline"
                  title="No daily trend yet"
                  text="Booking activity for this reporting period will appear here once data is available."
                />
              ) : (
                recentTrend.map((item, index) => (
                  <TrendRow
                    key={item.date}
                    item={item}
                    maximumBookings={
                      maximumRecentBookings
                    }
                    isLast={
                      index === recentTrend.length - 1
                    }
                  />
                ))
              )}
            </View>

            {/* TOP SERVICES */}

            <SectionHeading
              title="Top services"
              subtitle="Services ranked by booking count for this reporting period."
              trailing="Bookings · Revenue"
            />

            <View style={styles.servicesCard}>
              {analytics.top_services.length === 0 ? (
                <EmptySection
                  icon="cut-outline"
                  title="No service performance yet"
                  text="Service booking and completed revenue data will appear here once customers book your services."
                />
              ) : (
                analytics.top_services.map(
                  (service, index) => (
                    <TopServiceRow
                      key={service.service_id}
                      service={service}
                      rank={index + 1}
                      maximumBookings={
                        maximumServiceBookings
                      }
                      isLast={
                        index ===
                        analytics.top_services.length - 1
                      }
                    />
                  ),
                )
              )}
            </View>

            {/* REVENUE EXPLANATION */}

            <View style={styles.revenueNote}>
              <View style={styles.revenueNoteIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={COLORS.blue}
                />
              </View>

              <View style={styles.revenueNoteCopy}>
                <Text style={styles.revenueNoteTitle}>
                  How revenue is counted
                </Text>

                <Text style={styles.revenueNoteText}>
                  Revenue includes completed appointments
                  only. Pending, confirmed, cancelled,
                  declined, and no-show bookings are not
                  counted as earned revenue.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* SECTION HEADING */

function SectionHeading({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle: string;
  trailing?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>

      {trailing ? (
        <Text style={styles.sectionTrailing}>
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}

/* HERO STAT */

function HeroStat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatValueRow}>
        {icon ? (
          <Ionicons
            name={icon}
            size={13}
            color={COLORS.warning}
          />
        ) : null}

        <Text style={styles.heroStatValue}>
          {value}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={styles.heroStatLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/* KPI CARD */

function KpiCard({
  icon,
  label,
  value,
  helper,
  background,
  color,
}: {
  icon: IconName;
  label: string;
  value: string;
  helper: string;
  background: string;
  color: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View
        style={[
          styles.kpiIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={color}
        />
      </View>

      <Text style={styles.kpiLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        style={styles.kpiValue}
      >
        {value}
      </Text>

      <Text style={styles.kpiHelper}>
        {helper}
      </Text>
    </View>
  );
}

/* BOOKING STATUS ROW */

function StatusRow({
  definition,
  value,
  totalBookings,
}: {
  definition: StatusDefinition;
  value: number;
  totalBookings: number;
}) {
  const share =
    totalBookings > 0
      ? (value / totalBookings) * 100
      : 0;

  return (
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusIcon,
          {
            backgroundColor: definition.background,
          },
        ]}
      >
        <Ionicons
          name={definition.icon}
          size={18}
          color={definition.color}
        />
      </View>

      <View style={styles.statusContent}>
        <View style={styles.statusTitleRow}>
          <Text style={styles.statusLabel}>
            {definition.label}
          </Text>

          <Text style={styles.statusShare}>
            {statusShare(value, totalBookings)}
          </Text>
        </View>

        <View style={styles.statusTrack}>
          <View
            style={[
              styles.statusFill,
              {
                width: ratioWidth(share),
                backgroundColor: definition.color,
              },
            ]}
          />
        </View>
      </View>

      <Text style={styles.statusValue}>
        {value}
      </Text>
    </View>
  );
}

/* PERFORMANCE CARD */

function PerformanceCard({
  icon,
  label,
  value,
  helper,
  color,
  softColor,
}: {
  icon: IconName;
  label: string;
  value: number | null;
  helper: string;
  color: string;
  softColor: string;
}) {
  return (
    <View style={styles.performanceCard}>
      <View style={styles.performanceTopRow}>
        <View
          style={[
            styles.performanceIcon,
            {
              backgroundColor: softColor,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={color}
          />
        </View>

        <Text
          style={[
            styles.performanceValue,
            { color },
          ]}
        >
          {formatPercent(value)}
        </Text>
      </View>

      <Text style={styles.performanceLabel}>
        {label}
      </Text>

      <View style={styles.performanceTrack}>
        <View
          style={[
            styles.performanceFill,
            {
              width: ratioWidth(value),
              backgroundColor: color,
            },
          ]}
        />
      </View>

      <Text style={styles.performanceHelper}>
        {helper}
      </Text>
    </View>
  );
}

/* DAILY TREND ROW */

function TrendRow({
  item,
  maximumBookings,
  isLast,
}: {
  item: ShopOwnerAnalyticsDailyTrendItem;
  maximumBookings: number;
  isLast: boolean;
}) {
  return (
    <View>
      <View style={styles.trendRow}>
        <View style={styles.trendDateBlock}>
          <Text style={styles.trendDate}>
            {formatShortDate(item.date)}
          </Text>

          <Text style={styles.trendOutcome}>
            {item.completed} completed · {item.no_show} no-show ·{' '}
            {item.cancelled} cancelled
          </Text>
        </View>

        <View style={styles.trendNumbers}>
          <Text style={styles.trendCount}>
            {item.total_bookings}
          </Text>

          <Text style={styles.trendRevenue}>
            {formatCompactCurrency(
              item.completed_revenue,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.trendTrack}>
        <View
          style={[
            styles.trendFill,
            {
              width: percentageWidth(
                item.total_bookings,
                maximumBookings,
              ),
            },
          ]}
        />
      </View>

      {!isLast ? (
        <View style={styles.trendDivider} />
      ) : null}
    </View>
  );
}

/* TOP SERVICE ROW */

function TopServiceRow({
  service,
  rank,
  maximumBookings,
  isLast,
}: {
  service: ShopOwnerAnalyticsTopService;
  rank: number;
  maximumBookings: number;
  isLast: boolean;
}) {
  return (
    <View>
      <View style={styles.serviceRow}>
        <View
          style={[
            styles.serviceRank,
            rank === 1 && styles.serviceRankFirst,
          ]}
        >
          {rank === 1 ? (
            <Ionicons
              name="trophy-outline"
              size={17}
              color={COLORS.warning}
            />
          ) : (
            <Text style={styles.serviceRankText}>
              {rank}
            </Text>
          )}
        </View>

        <View style={styles.serviceContent}>
          <View style={styles.serviceTitleRow}>
            <Text
              numberOfLines={1}
              style={styles.serviceName}
            >
              {service.service_name}
            </Text>

            <Text style={styles.serviceRevenue}>
              {formatCompactCurrency(
                service.completed_revenue,
              )}
            </Text>
          </View>

          <Text style={styles.serviceDetail}>
            {service.total_bookings} booking
            {service.total_bookings === 1 ? '' : 's'}{' '}
            · {service.completed_bookings} completed ·{' '}
            {service.no_show_count} no-show
          </Text>

          <View style={styles.serviceTrack}>
            <View
              style={[
                styles.serviceFill,
                {
                  width: percentageWidth(
                    service.total_bookings,
                    maximumBookings,
                  ),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {!isLast ? (
        <View style={styles.serviceDivider} />
      ) : null}
    </View>
  );
}

/* EMPTY SECTION */

function EmptySection({
  icon,
  title,
  text,
}: {
  icon: IconName;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptySection}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={23}
          color={COLORS.navy}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyText}>
        {text}
      </Text>
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

      <View style={styles.errorContent}>
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

  // Updated to 40px to match other Shop Owner screens.
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

  disabledButton: {
    opacity: 0.46,
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
    maxWidth: 580,
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

  periodCard: {
    marginTop: SPACING.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  periodHeaderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  periodHeaderCopy: {
    flex: 1,
  },

  periodTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  periodValue: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
  },

  periodButtons: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },

  periodButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  periodButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  periodButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  periodButtonTextSelected: {
    color: COLORS.white,
  },

  periodButtonCaption: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '600',
  },

  periodButtonCaptionSelected: {
    color: '#D4DAE1',
  },

  errorBox: {
    marginTop: 12,
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

  errorContent: {
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

  loadingCard: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  loadingIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
  },

  loadingTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  loadingText: {
    maxWidth: 340,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  heroCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  heroLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  heroRevenue: {
    marginTop: 5,
    color: COLORS.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  heroRevenueNote: {
    marginTop: 7,
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  heroStats: {
    marginTop: 17,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  heroStat: {
    flex: 1,
    minWidth: 0,
  },

  heroStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  heroStatValue: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  heroStatLabel: {
    marginTop: 3,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
  },

  heroDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
  },

  generatedRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  generatedText: {
    color: '#AEB8C5',
    fontSize: 9,
  },

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  sectionHeadingCopy: {
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

  sectionTrailing: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  kpiCard: {
    width: '48.4%',
    minHeight: 148,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  kpiIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  kpiLabel: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  kpiValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  kpiHelper: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 9,
    lineHeight: 14,
  },

  statusCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  statusRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  statusIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },

  statusContent: {
    flex: 1,
    minWidth: 0,
  },

  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  statusLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  statusShare: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  statusTrack: {
    height: 6,
    marginTop: 7,
    overflow: 'hidden',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  statusFill: {
    height: '100%',
    borderRadius: RADII.pill,
  },

  statusValue: {
    minWidth: 30,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    textAlign: 'right',
  },

  rowDivider: {
    height: 1,
    marginLeft: 65,
    backgroundColor: COLORS.border,
  },

  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  performanceCard: {
    width: '48.4%',
    minHeight: 165,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  performanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  performanceIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  performanceValue: {
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  performanceLabel: {
    marginTop: 11,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  performanceTrack: {
    height: 6,
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  performanceFill: {
    height: '100%',
    borderRadius: RADII.pill,
  },

  performanceHelper: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },

  attendanceCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  attendanceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
  },

  attendanceCopy: {
    flex: 1,
  },

  attendanceLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  attendanceValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },

  attendanceText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  trendCard: {
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  trendRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },

  trendDateBlock: {
    flex: 1,
    minWidth: 0,
  },

  trendDate: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  trendOutcome: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },

  trendNumbers: {
    alignItems: 'flex-end',
  },

  trendCount: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  trendRevenue: {
    marginTop: 2,
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '700',
  },

  trendTrack: {
    height: 6,
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  trendFill: {
    height: '100%',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.blue,
  },

  trendDivider: {
    height: 1,
    marginTop: 12,
    backgroundColor: COLORS.border,
  },

  servicesCard: {
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  serviceRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
  },

  serviceRank: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  serviceRankFirst: {
    backgroundColor: COLORS.warningSoft,
  },

  serviceRankText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  serviceContent: {
    flex: 1,
    minWidth: 0,
  },

  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  serviceName: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  serviceRevenue: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  serviceDetail: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },

  serviceTrack: {
    height: 6,
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  serviceFill: {
    height: '100%',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.violet,
  },

  serviceDivider: {
    height: 1,
    marginLeft: 51,
    backgroundColor: COLORS.border,
  },

  emptySection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },

  emptyIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 340,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  revenueNote: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  revenueNoteIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
  },

  revenueNoteCopy: {
    flex: 1,
  },

  revenueNoteTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  revenueNoteText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },
});
