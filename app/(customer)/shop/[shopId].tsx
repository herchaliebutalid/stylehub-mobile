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
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CustomerShopGallery from '@/src/components/CustomerShopGallery';
import CustomerShopLocationCard from '@/src/components/CustomerShopLocationCard';
import ShopOwnerAvatar from '@/src/components/ShopOwnerAvatar';
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
  getCustomerSavedShopStatus,
  removeCustomerSavedShop,
  saveCustomerShop,
} from '@/src/services/saved-shops-api';
import type {
  CustomerPromo,
  CustomerReview,
  CustomerService,
  CustomerShopDetail,
  CustomerShopSchedule,
  ShopAvailabilityStatus,
} from '@/src/types/customer';
import { resolveApiAssetUrl } from '@/src/utils/api-asset-url';

type IconName = ComponentProps<typeof Ionicons>['name'];

function getRouteValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function formatPrice(
  value: string | number,
): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return `₱${numericValue.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatTime(
  value: string | null,
): string {
  if (!value) {
    return '—';
  }

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

function formatPromoDate(
  value: string | null,
): string {
  if (!value) {
    return 'No end date';
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

function availabilityPresentation(
  status: ShopAvailabilityStatus,
): {
  background: string;
  color: string;
  icon: IconName;
  message: string;
} {
  switch (status) {
    case 'open':
      return {
        background: COLORS.greenSoft,
        color: COLORS.green,
        icon: 'checkmark-circle-outline',
        message:
          'This shop is currently open and accepting appointments.',
      };

    case 'accepting_walk_ins':
      return {
        background: COLORS.blueSoft,
        color: COLORS.blue,
        icon: 'walk-outline',
        message:
          'This shop is currently accepting walk-ins.',
      };

    case 'fully_booked':
      return {
        background: COLORS.orangeSoft,
        color: COLORS.orange,
        icon: 'time-outline',
        message:
          'This shop is currently fully booked.',
      };

    case 'closed':
    default:
      return {
        background: COLORS.surfaceSoft,
        color: COLORS.textMuted,
        icon: 'moon-outline',
        message:
          'This shop is currently closed.',
      };
  }
}

export default function CustomerShopDetailScreen() {
  const params =
    useLocalSearchParams<{
      shopId?: string | string[];
    }>();

  const {
    token,
  } = useAuth();

  const shopId = Number(
    getRouteValue(
      params.shopId,
    ),
  );

  const [
    shop,
    setShop,
  ] =
    useState<CustomerShopDetail | null>(
      null,
    );

  const [
    isSaved,
    setIsSaved,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

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
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    savedMessage,
    setSavedMessage,
  ] =
    useState('');

  const hasLoadedOnce =
    useRef(false);

  const loadShop =
    useCallback(
      async (
        refreshing = false,
        silent = false,
      ): Promise<void> => {
        if (
          !token
          || !Number.isInteger(
            shopId,
          )
          || shopId < 1
        ) {
          setIsLoading(false);
          setIsRefreshing(false);

          setErrorMessage(
            'The selected shop is invalid.',
          );

          return;
        }

        if (refreshing) {
          setIsRefreshing(true);
        } else if (!silent) {
          setIsLoading(true);
        }

        setErrorMessage('');

        try {
          const [
            shopResponse,
            savedResponse,
          ] =
            await Promise.all([
              getCustomerShop(
                token,
                shopId,
              ),

              getCustomerSavedShopStatus(
                token,
                shopId,
              ),
            ]);

          setShop(
            shopResponse.data.shop,
          );

          setIsSaved(
            savedResponse.data.is_saved,
          );

          hasLoadedOnce.current = true;
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to load this shop.',
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        shopId,
        token,
      ],
    );

  useFocusEffect(
    useCallback(() => {
      void loadShop(
        false,
        hasLoadedOnce.current,
      );

      return undefined;
    }, [loadShop]),
  );

  const serviceCount =
    shop?.services?.length ?? 0;

  const promoCount =
    shop?.promos?.length ?? 0;

  const reviewCount =
    shop?.rating.review_count ?? 0;

  const availability =
    useMemo(
      () =>
        shop
          ? availabilityPresentation(
              shop.availability.status,
            )
          : null,
      [
        shop,
      ],
    );

  const fullAddress =
    useMemo(
      () =>
        shop
          ? [
              shop.address,
              shop.city,
              shop.province,
            ]
              .map(
                (part) =>
                  part?.trim(),
              )
              .filter(Boolean)
              .join(', ')
          : '',
      [
        shop,
      ],
    );

  const canBook =
    Boolean(
      shop
      && shop.availability
        .accepts_appointments
      && serviceCount > 0,
    );

  async function toggleSavedShop(): Promise<void> {
    if (
      !token
      || !shop
      || isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSavedMessage('');

    try {
      if (isSaved) {
        await removeCustomerSavedShop(
          token,
          shop.id,
        );

        setIsSaved(false);

        setSavedMessage(
          'Removed from saved shops.',
        );
      } else {
        await saveCustomerShop(
          token,
          shop.id,
        );

        setIsSaved(true);

        setSavedMessage(
          'Saved to your shops.',
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : isSaved
            ? 'Unable to remove this shop from your saved shops.'
            : 'Unable to save this shop.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openBooking(
    serviceId?: number,
  ): void {
    if (!shop) {
      return;
    }

    router.push({
      pathname:
        '/(customer)/book/[shopId]',

      params: {
        shopId:
          String(
            shop.id,
          ),

        ...(serviceId
          ? {
              serviceId:
                String(
                  serviceId,
                ),
            }
          : {}),
      },
    });
  }

  function openReviews(): void {
    if (!shop) {
      return;
    }

    router.push({
      pathname:
        '/(customer)/reviews/[shopId]',

      params: {
        shopId:
          String(
            shop.id,
          ),
      },
    });
  }

  if (
    isLoading
    && !shop
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
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
            Loading shop
          </Text>

          <Text
            style={styles.loadingText}
          >
            Getting the latest services,
            availability, photos, promotions,
            and reviews.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView
        style={styles.safeArea}
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
                name="storefront-outline"
                size={30}
                color={COLORS.navy}
              />
            </View>

            <Text
              style={
                styles.unavailableTitle
              }
            >
              Shop unavailable
            </Text>

            <Text
              style={
                styles.unavailableText
              }
            >
              {errorMessage
                || 'This shop is not currently available to customers.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                router.replace(
                  '/(customer)/customer/shops',
                )
              }
              style={
                styles.discoverButton
              }
            >
              <Text
                style={
                  styles.discoverButtonText
                }
              >
                Back to Discover
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
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
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() =>
              void loadShop(true)
            }
            tintColor={COLORS.navy}
            colors={[
              COLORS.navy,
            ]}
          />
        }
        contentContainerStyle={
          styles.container
        }
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
            style={
              styles.topBarTitleBlock
            }
          >
            <Text
              style={
                styles.topBarTitle
              }
            >
              Shop details
            </Text>

            <Text
              style={
                styles.topBarCaption
              }
            >
              Services, location & reviews
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={
              isSaved
                ? 'Remove shop from saved shops'
                : 'Save shop'
            }
            disabled={isSaving}
            onPress={() =>
              void toggleSavedShop()
            }
            style={[
              styles.topIconButton,
              styles.savedTopButton,

              isSaved
              &&
                styles.savedTopButtonActive,

              isSaving
              &&
                styles.disabledButton,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            ) : (
              <Ionicons
                name={
                  isSaved
                    ? 'bookmark'
                    : 'bookmark-outline'
                }
                size={21}
                color={COLORS.navy}
              />
            )}
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Shop needs attention"
            message={errorMessage}
          />
        ) : null}

        {savedMessage ? (
          <MessageBox
            type="success"
            title={
              isSaved
                ? 'Shop saved'
                : 'Saved shop updated'
            }
            message={savedMessage}
          />
        ) : null}

        <View
          style={styles.heroCard}
        >
          <View
            style={styles.heroTopRow}
          >
            <ShopOwnerAvatar
              shop={shop}
              size={76}
              iconSize={29}
              fallbackIcon={
                shop.type
                === 'barber_shop'
                  ? 'cut-outline'
                  : 'sparkles-outline'
              }
              containerStyle={
                styles.heroAvatar
              }
              imageStyle={
                styles.heroAvatarImage
              }
            />

            {availability ? (
              <View
                style={[
                  styles.availabilityBadge,

                  {
                    backgroundColor:
                      availability.background,
                  },
                ]}
              >
                <Ionicons
                  name={
                    availability.icon
                  }
                  size={14}
                  color={
                    availability.color
                  }
                />

                <Text
                  style={[
                    styles.availabilityBadgeText,

                    {
                      color:
                        availability.color,
                    },
                  ]}
                >
                  {
                    shop.availability
                      .status_label
                  }
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={styles.heroType}
          >
            {shop.type_label}
          </Text>

          <Text
            style={styles.heroName}
          >
            {shop.name}
          </Text>

          <View
            style={
              styles.heroLocationRow
            }
          >
            <Ionicons
              name="location-outline"
              size={15}
              color="#D4DAE1"
            />

            <Text
              numberOfLines={2}
              style={
                styles.heroLocationText
              }
            >
              {fullAddress}
            </Text>
          </View>

          <View
            style={styles.heroStats}
          >
            <HeroStat
              label="Rating"
              value={
                shop.rating.average
                === null
                  ? 'New'
                  : `${shop.rating.average.toFixed(1)} / 5`
              }
              icon="star-outline"
            />

            <View
              style={styles.heroDivider}
            />

            <HeroStat
              label="Reviews"
              value={
                String(reviewCount)
              }
              icon="chatbubble-outline"
            />

            <View
              style={styles.heroDivider}
            />

            <HeroStat
              label="Services"
              value={
                String(serviceCount)
              }
              icon="cut-outline"
            />
          </View>
        </View>

        {availability ? (
          <View
            style={[
              styles.availabilityNotice,

              {
                backgroundColor:
                  availability.background,
              },
            ]}
          >
            <View
              style={
                styles.availabilityNoticeIcon
              }
            >
              <Ionicons
                name={
                  availability.icon
                }
                size={20}
                color={
                  availability.color
                }
              />
            </View>

            <View
              style={
                styles.availabilityNoticeCopy
              }
            >
              <Text
                style={[
                  styles.availabilityNoticeTitle,

                  {
                    color:
                      availability.color,
                  },
                ]}
              >
                {
                  shop.availability
                    .status_label
                }
              </Text>

              <Text
                style={
                  styles.availabilityNoticeText
                }
              >
                {availability.message}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Book appointment"
          disabled={!canBook}
          onPress={() =>
            openBooking()
          }
          style={[
            styles.primaryBookButton,

            !canBook
            &&
              styles.primaryBookButtonDisabled,
          ]}
        >
          <Ionicons
            name={
              canBook
                ? 'calendar-outline'
                : 'lock-closed-outline'
            }
            size={19}
            color={
              canBook
                ? COLORS.white
                : COLORS.textLight
            }
          />

          <Text
            style={[
              styles.primaryBookButtonText,

              !canBook
              &&
                styles.primaryBookButtonTextDisabled,
            ]}
          >
            {canBook
              ? 'Book an appointment'
              : serviceCount === 0
                ? 'No services available'
                : 'Booking unavailable'}
          </Text>
        </TouchableOpacity>

        <SectionHeading
          title="About this shop"
          subtitle="Business description and customer-facing contact information."
        />

        <View
          style={styles.aboutCard}
        >
          <View
            style={styles.aboutHeader}
          >
            <View
              style={styles.aboutIcon}
            >
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={COLORS.navy}
              />
            </View>

            <View
              style={styles.aboutCopy}
            >
              <Text
                style={styles.aboutTitle}
              >
                {shop.name}
              </Text>

              <Text
                style={
                  styles.aboutDescription
                }
              >
                {shop.description?.trim()
                  || 'This shop has not added a public description yet.'}
              </Text>
            </View>
          </View>

          <View
            style={styles.contactArea}
          >
            <ContactRow
              icon="location-outline"
              label="Address"
              value={fullAddress}
            />

            {shop.phone_number ? (
              <ContactRow
                icon="call-outline"
                label="Business phone"
                value={
                  shop.phone_number
                }
              />
            ) : null}

            {shop.email ? (
              <ContactRow
                icon="mail-outline"
                label="Business email"
                value={shop.email}
              />
            ) : null}
          </View>
        </View>

        {promoCount > 0 ? (
          <>
            <SectionHeading
              title="Current promotions"
              subtitle={`${promoCount} active offer${promoCount === 1 ? '' : 's'} available from this shop.`}
            />

            <View
              style={styles.promoList}
            >
              {shop.promos?.map(
                (promo) => (
                  <PromoCard
                    key={promo.id}
                    promo={promo}
                  />
                ),
              )}
            </View>
          </>
        ) : null}

        <SectionHeading
          title="Services"
          subtitle={`${serviceCount} active service${serviceCount === 1 ? '' : 's'} available to customers.`}
        />

        {serviceCount > 0 ? (
          <View
            style={styles.serviceList}
          >
            {shop.services?.map(
              (service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  canBook={
                    shop.availability
                      .accepts_appointments
                  }
                  onBook={() =>
                    openBooking(
                      service.id,
                    )
                  }
                />
              ),
            )}
          </View>
        ) : (
          <EmptySection
            icon="cut-outline"
            title="No active services"
            text="This shop currently has no active services available to customers."
          />
        )}

        <SectionHeading
          title="Shop gallery"
          subtitle={
            shop.gallery.length > 0
              ? `${shop.gallery.length} public photo${shop.gallery.length === 1 ? '' : 's'} from this shop.`
              : 'Public photos uploaded by the shop.'
          }
        />

        <CustomerShopGallery
          images={shop.gallery}
        />

        <SectionHeading
          title="Location & directions"
          subtitle="The exact customer-visible shop pin saved in StyleHub."
        />

        <CustomerShopLocationCard
          shopName={shop.name}
          address={shop.address}
          city={shop.city}
          province={shop.province}
          location={shop.location}
        />

        <SectionHeading
          title="Weekly schedule"
          subtitle="Regular opening hours published by the shop."
        />

        {shop.schedule
        && shop.schedule.length > 0 ? (
          <ScheduleCard
            schedule={shop.schedule}
          />
        ) : (
          <EmptySection
            icon="calendar-outline"
            title="Schedule unavailable"
            text="The shop has not published a weekly schedule yet."
          />
        )}

        <View
          style={
            styles.reviewSectionHeading
          }
        >
          <View
            style={
              styles.reviewSectionCopy
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Recent reviews
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Verified feedback from completed
              StyleHub appointments.
            </Text>
          </View>

          {reviewCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel="View all reviews"
              onPress={openReviews}
              style={
                styles.reviewSeeAllButton
              }
            >
              <Text
                style={
                  styles.reviewSeeAllText
                }
              >
                See all
              </Text>

              <Ionicons
                name="chevron-forward"
                size={15}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {shop.recent_reviews
        && shop.recent_reviews.length
        > 0 ? (
          <View
            style={styles.reviewList}
          >
            {shop.recent_reviews.map(
              (review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                />
              ),
            )}
          </View>
        ) : (
          <EmptySection
            icon="chatbubble-outline"
            title="No reviews yet"
            text="Verified reviews will appear after customers complete appointments and submit feedback."
          />
        )}

        <View
          style={styles.footerCard}
        >
          <View
            style={styles.footerIcon}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.green}
            />
          </View>

          <View
            style={styles.footerCopy}
          >
            <Text
              style={styles.footerTitle}
            >
              Customer-visible shop information
            </Text>

            <Text
              style={styles.footerText}
            >
              Services, promotions, ratings,
              availability, gallery photos, and
              map location on this page come
              from the existing StyleHub
              customer APIs.
            </Text>
          </View>
        </View>
      </ScrollView>
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
    <View
      style={styles.sectionHeading}
    >
      <Text
        style={styles.sectionTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.sectionSubtitle}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function HeroStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: IconName;
}) {
  return (
    <View style={styles.heroStat}>
      <View
        style={
          styles.heroStatLabelRow
        }
      >
        <Ionicons
          name={icon}
          size={12}
          color="#AEB8C5"
        />

        <Text
          style={styles.heroStatLabel}
        >
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={styles.heroStatValue}
      >
        {value}
      </Text>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.contactRow}>
      <View
        style={styles.contactIcon}
      >
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.navy}
        />
      </View>

      <View
        style={styles.contactCopy}
      >
        <Text
          style={styles.contactLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.contactValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function ServiceCard({
  service,
  canBook,
  onBook,
}: {
  service: CustomerService;
  canBook: boolean;
  onBook: () => void;
}) {
  const serviceImageUrl =
    resolveApiAssetUrl(
      service.image?.image_url,
    );

  return (
    <View
      style={styles.serviceCard}
    >
      {serviceImageUrl ? (
        <Image
          source={{
            uri: serviceImageUrl,
          }}
          resizeMode="cover"
          style={styles.serviceImage}
        />
      ) : (
        <View
          style={
            styles.serviceImageFallback
          }
        >
          <View
            style={
              styles.serviceImageFallbackIcon
            }
          >
            <Ionicons
              name="cut-outline"
              size={24}
              color={COLORS.navy}
            />
          </View>

          <Text
            style={
              styles.serviceImageFallbackText
            }
          >
            Service photo not available
          </Text>
        </View>
      )}

      <View
        style={styles.serviceBody}
      >
        <View
          style={styles.serviceHeader}
        >
          <View
            style={
              styles.serviceHeading
            }
          >
            <Text
              numberOfLines={2}
              style={styles.serviceName}
            >
              {service.name}
            </Text>

            <View
              style={
                styles.serviceDurationRow
              }
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={COLORS.textMuted}
              />

              <Text
                style={
                  styles.serviceDurationText
                }
              >
                {service.duration_minutes} minutes
              </Text>
            </View>
          </View>

          <Text
            style={styles.servicePrice}
          >
            {formatPrice(
              service.price,
            )}
          </Text>
        </View>

        {service.description?.trim()
          ? (
              <Text
                style={
                  styles.serviceDescription
                }
              >
                {service.description}
              </Text>
            )
          : null}

        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={
            canBook
              ? `Book ${service.name}`
              : `${service.name} booking unavailable`
          }
          disabled={!canBook}
          onPress={onBook}
          style={[
            styles.serviceBookButton,

            !canBook
            &&
              styles.serviceBookButtonDisabled,
          ]}
        >
          <Ionicons
            name={
              canBook
                ? 'calendar-outline'
                : 'lock-closed-outline'
            }
            size={17}
            color={
              canBook
                ? COLORS.white
                : COLORS.textLight
            }
          />

          <Text
            style={[
              styles.serviceBookButtonText,

              !canBook
              &&
                styles.serviceBookButtonTextDisabled,
            ]}
          >
            {canBook
              ? 'Book this service'
              : 'Booking unavailable'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PromoCard({
  promo,
}: {
  promo: CustomerPromo;
}) {
  return (
    <View style={styles.promoCard}>
      <View style={styles.promoIcon}>
        <Ionicons
          name="pricetag-outline"
          size={21}
          color={COLORS.warning}
        />
      </View>

      <View style={styles.promoCopy}>
        <View
          style={styles.promoTopRow}
        >
          <Text
            numberOfLines={2}
            style={styles.promoTitle}
          >
            {promo.title}
          </Text>

          <View
            style={
              styles.promoDiscountBadge
            }
          >
            <Text
              style={
                styles.promoDiscountText
              }
            >
              {promo.discount.type_label}:{' '}
              {String(
                promo.discount.value,
              )}
            </Text>
          </View>
        </View>

        <Text
          style={styles.promoScope}
        >
          {promo.service
            ? `For ${promo.service.name}`
            : 'Shop-wide promotion'}
        </Text>

        {promo.description?.trim()
          ? (
              <Text
                style={
                  styles.promoDescription
                }
              >
                {promo.description}
              </Text>
            )
          : null}

        <View
          style={styles.promoPeriodRow}
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color={COLORS.textMuted}
          />

          <Text
            style={
              styles.promoPeriodText
            }
          >
            {formatPromoDate(
              promo.starts_at,
            )}{' '}
            –{' '}
            {formatPromoDate(
              promo.ends_at,
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ScheduleCard({
  schedule,
}: {
  schedule: CustomerShopSchedule[];
}) {
  return (
    <View
      style={styles.scheduleCard}
    >
      {schedule.map(
        (
          day,
          index,
        ) => (
          <View
            key={day.day_of_week}
            style={[
              styles.scheduleRow,

              index
              !== schedule.length - 1
              &&
                styles.scheduleRowBorder,
            ]}
          >
            <View
              style={
                styles.scheduleDayBlock
              }
            >
              <View
                style={[
                  styles.scheduleStatusDot,

                  {
                    backgroundColor:
                      day.is_open
                        ? COLORS.green
                        : COLORS.textLight,
                  },
                ]}
              />

              <Text
                style={
                  styles.scheduleDay
                }
              >
                {day.day_label}
              </Text>
            </View>

            <Text
              style={[
                styles.scheduleHours,

                !day.is_open
                &&
                  styles.scheduleHoursClosed,
              ]}
            >
              {day.is_open
                ? `${formatTime(day.opens_at)} – ${formatTime(day.closes_at)}`
                : 'Closed'}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

function ReviewCard({
  review,
}: {
  review: CustomerReview;
}) {
  const reviewDate =
    formatReviewDate(
      review.created_at,
    );

  return (
    <View style={styles.reviewCard}>
      <View
        style={styles.reviewHeader}
      >
        <View
          style={styles.reviewAvatar}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={COLORS.navy}
          />
        </View>

        <View
          style={styles.reviewHeading}
        >
          <Text
            style={styles.reviewerName}
          >
            {review.reviewer.label}
          </Text>

          {review.verified_booking ? (
            <View
              style={styles.verifiedRow}
            >
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={COLORS.green}
              />

              <Text
                style={
                  styles.verifiedText
                }
              >
                Verified booking
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={
            styles.reviewRatingBadge
          }
        >
          <Ionicons
            name="star"
            size={13}
            color={COLORS.warning}
          />

          <Text
            style={
              styles.reviewRatingText
            }
          >
            {review.rating}/5
          </Text>
        </View>
      </View>

      {review.comment?.trim() ? (
        <Text
          style={styles.reviewComment}
        >
          {review.comment}
        </Text>
      ) : (
        <Text
          style={
            styles.reviewCommentMuted
          }
        >
          Rating submitted without a
          written comment.
        </Text>
      )}

      {(review.service
      || reviewDate) ? (
        <View
          style={styles.reviewMetaCard}
        >
          {review.service ? (
            <View
              style={
                styles.reviewMetaRow
              }
            >
              <Ionicons
                name="cut-outline"
                size={14}
                color={COLORS.textMuted}
              />

              <Text
                style={
                  styles.reviewMetaText
                }
              >
                {review.service.name}
              </Text>
            </View>
          ) : null}

          {reviewDate ? (
            <View
              style={
                styles.reviewMetaRow
              }
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={COLORS.textMuted}
              />

              <Text
                style={
                  styles.reviewMetaText
                }
              >
                {reviewDate}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={24}
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
      <View
        style={styles.messageIcon}
      >
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

      <View
        style={styles.messageContent}
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
          style={styles.messageText}
        >
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
    paddingHorizontal:
      LAYOUT.screenPadding,
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
    fontSize:
      TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    textAlign: 'center',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    textAlign: 'center',
  },

  savedTopButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  savedTopButtonActive: {
    backgroundColor:
      COLORS.accentSoft,
  },

  messageBox: {
    marginTop: 12,
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
    marginTop: SPACING.lg,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: 12,
  },

  heroAvatar: {
    borderRadius: 24,
    backgroundColor:
      COLORS.accentSoft,
  },

  heroAvatarImage: {
    borderRadius: 24,
  },

  availabilityBadge: {
    maxWidth: 150,
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
  },

  availabilityBadgeText: {
    flexShrink: 1,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  heroType: {
    marginTop: 15,
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  heroName: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  heroLocationRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  heroLocationText: {
    flex: 1,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  heroStats: {
    marginTop: 17,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor:
      COLORS.navyMuted,
  },

  heroStat: {
    flex: 1,
    minWidth: 0,
  },

  heroStatLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  heroStatLabel: {
    color: '#AEB8C5',
    fontSize: 9,
    fontWeight: '600',
  },

  heroStatValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize:
      TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  heroDivider: {
    width: 1,
    marginHorizontal: 11,
    backgroundColor:
      COLORS.navyMuted,
  },

  availabilityNotice: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: RADII.lg,
  },

  availabilityNoticeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  availabilityNoticeCopy: {
    flex: 1,
  },

  availabilityNoticeTitle: {
    fontSize:
      TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  availabilityNoticeText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  primaryBookButton: {
    minHeight:
      LAYOUT.buttonHeight,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  primaryBookButtonDisabled: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor:
      COLORS.surfaceSoft,
  },

  primaryBookButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  primaryBookButtonTextDisabled: {
    color: COLORS.textLight,
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

  aboutCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  aboutIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor:
      COLORS.accentSoft,
  },

  aboutCopy: {
    flex: 1,
  },

  aboutTitle: {
    color: COLORS.text,
    fontSize:
      TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  aboutDescription: {
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  contactArea: {
    marginTop: 15,
    gap: 9,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor:
      COLORS.surfaceSoft,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  contactIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  contactCopy: {
    flex: 1,
  },

  contactLabel: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  contactValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  promoList: {
    gap: 10,
  },

  promoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor:
      COLORS.warningSoft,
  },

  promoIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },

  promoCopy: {
    flex: 1,
  },

  promoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  promoTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize:
      TYPOGRAPHY.secondary,
    lineHeight: 18,
    fontWeight: '800',
  },

  promoDiscountBadge: {
    maxWidth: 128,
    minHeight: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
  },

  promoDiscountText: {
    color: COLORS.warning,
    fontSize: 9,
    fontWeight: '800',
  },

  promoScope: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  promoDescription: {
    marginTop: 7,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  promoPeriodRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  promoPeriodText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  serviceList: {
    gap: 12,
  },

  serviceCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  serviceImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor:
      COLORS.surfaceSoft,
  },

  serviceImageFallback: {
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor:
      COLORS.surfaceSoft,
  },

  serviceImageFallbackIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor:
      COLORS.accentSoft,
  },

  serviceImageFallbackText: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  serviceBody: {
    padding: 15,
  },

  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  serviceHeading: {
    flex: 1,
    minWidth: 0,
  },

  serviceName: {
    color: COLORS.text,
    fontSize:
      TYPOGRAPHY.cardTitle,
    lineHeight: 22,
    fontWeight: '800',
  },

  serviceDurationRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  serviceDurationText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  servicePrice: {
    flexShrink: 0,
    color: COLORS.navy,
    fontSize:
      TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  serviceDescription: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  serviceBookButton: {
    minHeight:
      LAYOUT.compactButtonHeight,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  serviceBookButtonDisabled: {
    backgroundColor:
      COLORS.surfaceSoft,
  },

  serviceBookButtonText: {
    color: COLORS.white,
    fontSize:
      TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  serviceBookButtonTextDisabled: {
    color: COLORS.textLight,
  },

  scheduleCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  scheduleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  scheduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  scheduleDayBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scheduleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  scheduleDay: {
    color: COLORS.text,
    fontSize:
      TYPOGRAPHY.secondary,
    fontWeight: '700',
  },

  scheduleHours: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
    textAlign: 'right',
  },

  scheduleHoursClosed: {
    color: COLORS.textLight,
  },

  reviewSectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },

  reviewSectionCopy: {
    flex: 1,
  },

  reviewSeeAllButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
  },

  reviewSeeAllText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  reviewList: {
    gap: 10,
  },

  reviewCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  reviewAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor:
      COLORS.accentSoft,
  },

  reviewHeading: {
    flex: 1,
    minWidth: 0,
  },

  reviewerName: {
    color: COLORS.text,
    fontSize:
      TYPOGRAPHY.secondary,
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

  reviewRatingBadge: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor:
      COLORS.warningSoft,
  },

  reviewRatingText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  reviewComment: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  reviewCommentMuted: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  reviewMetaCard: {
    marginTop: 12,
    gap: 6,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor:
      COLORS.surfaceSoft,
  },

  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  reviewMetaText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 27,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor:
      COLORS.accentSoft,
  },

  emptyTitle: {
    marginTop: 12,
    color: COLORS.text,
    fontSize:
      TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 360,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
  },

  footerCard: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: RADII.lg,
    backgroundColor:
      COLORS.greenSoft,
  },

  footerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  footerCopy: {
    flex: 1,
  },

  footerTitle: {
    color: COLORS.green,
    fontSize:
      TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  footerText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
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
    fontSize:
      TYPOGRAPHY.cardTitle,
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
    paddingHorizontal:
      LAYOUT.screenPadding,
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
    backgroundColor:
      COLORS.accentSoft,
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

  discoverButton: {
    minHeight:
      LAYOUT.compactButtonHeight,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  discoverButtonText: {
    color: COLORS.white,
    fontSize:
      TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.48,
  },
});