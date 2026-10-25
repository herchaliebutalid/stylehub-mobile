
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { getCustomerShops } from '@/src/services/customer-api';
import type {
  CustomerShop,
  CustomerShopPagination,
  ShopAvailabilityStatus,
} from '@/src/types/customer';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ShopType = CustomerShop['type'];
type ShopTypeFilter = 'all' | ShopType;
type AvailabilityFilter = 'any' | ShopAvailabilityStatus;

interface DiscoveryFilters {
  search: string;
  shopType: ShopTypeFilter;
  availability: AvailabilityFilter;
  city: string;
  province: string;
}

const PER_PAGE = 10;

const SHOP_TYPES: {
  value: ShopTypeFilter;
  label: string;
  icon: IconName;
}[] = [
  {
    value: 'all',
    label: 'All shops',
    icon: 'apps-outline',
  },
  {
    value: 'barber_shop',
    label: 'Barber Shop',
    icon: 'cut-outline',
  },
  {
    value: 'beauty_parlor',
    label: 'Beauty Parlor',
    icon: 'sparkles-outline',
  },
];

const AVAILABILITY_OPTIONS: {
  value: AvailabilityFilter;
  label: string;
}[] = [
  { value: 'any', label: 'Any' },
  { value: 'open', label: 'Open' },
  { value: 'accepting_walk_ins', label: 'Walk-ins' },
  { value: 'fully_booked', label: 'Fully Booked' },
  { value: 'closed', label: 'Closed' },
];

/* DEFAULT FILTERS */

function createDefaultFilters(): DiscoveryFilters {
  return {
    search: '',
    shopType: 'all',
    availability: 'any',
    city: '',
    province: '',
  };
}

/* AVAILABILITY DISPLAY */

function getAvailabilityPresentation(
  status: ShopAvailabilityStatus,
): {
  background: string;
  color: string;
  icon: IconName;
} {
  switch (status) {
    case 'open':
      return {
        background: COLORS.greenSoft,
        color: COLORS.green,
        icon: 'checkmark-circle-outline',
      };

    case 'accepting_walk_ins':
      return {
        background: COLORS.blueSoft,
        color: COLORS.blue,
        icon: 'walk-outline',
      };

    case 'fully_booked':
      return {
        background: COLORS.orangeSoft,
        color: COLORS.orange,
        icon: 'time-outline',
      };

    case 'closed':
    default:
      return {
        background: COLORS.surfaceSoft,
        color: COLORS.textMuted,
        icon: 'moon-outline',
      };
  }
}

/* FILTER COUNT */

function filterCount(filters: DiscoveryFilters): number {
  let count = 0;

  if (filters.search.trim()) count += 1;
  if (filters.shopType !== 'all') count += 1;
  if (filters.availability !== 'any') count += 1;
  if (filters.city.trim()) count += 1;
  if (filters.province.trim()) count += 1;

  return count;
}

/* MAIN DISCOVER SCREEN */

export default function CustomerShopsScreen() {
  const { token } = useAuth();

  const [shops, setShops] = useState<CustomerShop[]>([]);
  const [pagination, setPagination] =
    useState<CustomerShopPagination | null>(null);

  const [draftFilters, setDraftFilters] =
    useState<DiscoveryFilters>(createDefaultFilters);

  const [appliedFilters, setAppliedFilters] =
    useState<DiscoveryFilters>(createDefaultFilters);

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasLoadedOnce = useRef(false);

  /* FETCH SHOP RESULTS */

  const loadShops = useCallback(
    async (
      refreshing = false,
      silent = false,
    ): Promise<void> => {
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const response = await getCustomerShops(token, {
          search:
            appliedFilters.search.trim() || undefined,

          type:
            appliedFilters.shopType === 'all'
              ? undefined
              : appliedFilters.shopType,

          city:
            appliedFilters.city.trim() || undefined,

          province:
            appliedFilters.province.trim() || undefined,

          availabilityStatus:
            appliedFilters.availability === 'any'
              ? undefined
              : appliedFilters.availability,

          page,
          perPage: PER_PAGE,
        });

        setShops(response.data.shops);
        setPagination(response.data.pagination);
        hasLoadedOnce.current = true;
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load StyleHub shops.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [appliedFilters, page, token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadShops(false, hasLoadedOnce.current);
      return undefined;
    }, [loadShops]),
  );

  /* RESULT COUNTS */

  const activeFilterCount = useMemo(
    () => filterCount(appliedFilters),
    [appliedFilters],
  );

  const resultRange = useMemo(() => {
    if (!pagination || pagination.total === 0) {
      return null;
    }

    const first =
      (pagination.current_page - 1) *
        pagination.per_page +
      1;

    const last = Math.min(
      pagination.current_page * pagination.per_page,
      pagination.total,
    );

    return { first, last };
  }, [pagination]);

  /* UPDATE DRAFT FILTERS */

  function updateDraftFilter<K extends keyof DiscoveryFilters>(
    key: K,
    value: DiscoveryFilters[K],
  ): void {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  /* APPLY FILTERS */

  function applyFilters(): void {
    setErrorMessage('');
    setPage(1);
    setIsLoading(true);

    setAppliedFilters({
      search: draftFilters.search.trim(),
      shopType: draftFilters.shopType,
      availability: draftFilters.availability,
      city: draftFilters.city.trim(),
      province: draftFilters.province.trim(),
    });
  }

  /* CLEAR FILTERS */

  function clearFilters(): void {
    const defaults = createDefaultFilters();

    setDraftFilters(defaults);
    setAppliedFilters({ ...defaults });
    setPage(1);
    setIsLoading(true);
    setShowFilters(false);
    setErrorMessage('');
  }

  /* CHANGE PAGE */

  function changePage(nextPage: number): void {
    if (
      isLoading ||
      isRefreshing ||
      !pagination ||
      nextPage < 1 ||
      nextPage > pagination.last_page ||
      nextPage === pagination.current_page
    ) {
      return;
    }

    setIsLoading(true);
    setPage(nextPage);
  }

  /* OPEN SHOP DETAILS */

  function openShop(shopId: number): void {
    router.push({
      pathname: '/(customer)/shop/[shopId]',
      params: { shopId: String(shopId) },
    });
  }

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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadShops(true)}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        contentContainerStyle={styles.container}
      >
        {/* TOP BAR */}

        <View style={styles.topBar}>
          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>
              Discover
            </Text>

            <Text style={styles.topBarCaption}>
              Shops, ratings &amp; availability
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Open saved shops"
            onPress={() =>
              router.push('/(customer)/saved-shops')
            }
            style={styles.savedButton}
          >
            <Ionicons
              name="bookmark-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            FIND YOUR SHOP
          </Text>

          <Text style={styles.title}>
            Compare approved barber shops and beauty parlors
          </Text>

          <Text style={styles.subtitle}>
            Search by name or location, narrow the results
            by shop type and availability, then open a shop
            to view its services and booking options.
          </Text>
        </View>

        {/* OVERVIEW */}

        <View style={styles.overviewCard}>
          <View style={styles.overviewTopRow}>
            <View>
              <Text style={styles.overviewLabel}>
                Approved shops found
              </Text>

              <Text style={styles.overviewValue}>
                {pagination?.total ?? shops.length}
              </Text>
            </View>

            <View style={styles.overviewIcon}>
              <Ionicons
                name="storefront-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </View>

          <View style={styles.overviewFooter}>
            <View style={styles.overviewFooterItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#D4DAE1"
              />
              <Text style={styles.overviewFooterText}>
                Customer-visible shops
              </Text>
            </View>

            <View style={styles.overviewFooterItem}>
              <Ionicons
                name="options-outline"
                size={14}
                color="#D4DAE1"
              />
              <Text style={styles.overviewFooterText}>
                {activeFilterCount === 0
                  ? 'No filters applied'
                  : `${activeFilterCount} filter${
                      activeFilterCount === 1 ? '' : 's'
                    } applied`}
              </Text>
            </View>
          </View>
        </View>

        {/* SEARCH */}

        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>
            Search shops
          </Text>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={COLORS.accent}
              />

              <TextInput
                value={draftFilters.search}
                onChangeText={(value) =>
                  updateDraftFilter('search', value)
                }
                onSubmitEditing={applyFilters}
                placeholder="Shop name, city, address..."
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={styles.searchInput}
              />

              {draftFilters.search !== '' ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search text"
                  onPress={() =>
                    updateDraftFilter('search', '')
                  }
                  style={styles.searchClearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Search shops"
              disabled={isLoading || isRefreshing}
              onPress={applyFilters}
              style={[
                styles.searchButton,
                (isLoading || isRefreshing) &&
                  styles.disabledButton,
              ]}
            >
              <Ionicons
                name="arrow-forward"
                size={19}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* FILTER TOGGLE */}

          <View style={styles.filterToggleRow}>
            <TouchableOpacity
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityState={{ expanded: showFilters }}
              onPress={() =>
                setShowFilters((current) => !current)
              }
              style={[
                styles.filterToggle,
                showFilters && styles.filterToggleOpen,
              ]}
            >
              <Ionicons
                name="options-outline"
                size={17}
                color={
                  showFilters
                    ? COLORS.white
                    : COLORS.navy
                }
              />

              <Text
                style={[
                  styles.filterToggleText,
                  showFilters &&
                    styles.filterToggleTextOpen,
                ]}
              >
                Filters
              </Text>

              {activeFilterCount > 0 ? (
                <View
                  style={[
                    styles.filterCountBadge,
                    showFilters &&
                      styles.filterCountBadgeOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      showFilters &&
                        styles.filterCountTextOpen,
                    ]}
                  >
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            {activeFilterCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                onPress={clearFilters}
                style={styles.clearFiltersButton}
              >
                <Text style={styles.clearFiltersText}>
                  Clear all
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* FILTER PANEL */}

        {showFilters ? (
          <View style={styles.filtersCard}>
            {/* SHOP TYPE */}

            <FilterSection
              icon="storefront-outline"
              title="Shop type"
              subtitle="Choose the kind of shop you want to browse."
            >
              <View style={styles.typeGrid}>
                {SHOP_TYPES.map((option) => (
                  <TypeFilterButton
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    selected={
                      draftFilters.shopType === option.value
                    }
                    onPress={() =>
                      updateDraftFilter(
                        'shopType',
                        option.value,
                      )
                    }
                  />
                ))}
              </View>
            </FilterSection>

            <View style={styles.filterDivider} />

            {/* AVAILABILITY */}

            <FilterSection
              icon="radio-outline"
              title="Availability"
              subtitle="Filter by the availability status published by the shop."
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.availabilityChips
                }
              >
                {AVAILABILITY_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={
                      draftFilters.availability ===
                      option.value
                    }
                    onPress={() =>
                      updateDraftFilter(
                        'availability',
                        option.value,
                      )
                    }
                  />
                ))}
              </ScrollView>
            </FilterSection>

            <View style={styles.filterDivider} />

            {/* LOCATION */}

            <FilterSection
              icon="location-outline"
              title="Location"
              subtitle="Use the city and province filters already supported by the StyleHub shop API."
            >
              <Text style={styles.inputLabel}>
                City or municipality
              </Text>

              <View style={styles.locationInputShell}>
                <Ionicons
                  name="business-outline"
                  size={17}
                  color={COLORS.textMuted}
                />

                <TextInput
                  value={draftFilters.city}
                  onChangeText={(value) =>
                    updateDraftFilter('city', value)
                  }
                  placeholder="Example: Surigao City"
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.locationInput}
                />
              </View>

              <Text style={styles.inputLabelSecondary}>
                Province
              </Text>

              <View style={styles.locationInputShell}>
                <Ionicons
                  name="map-outline"
                  size={17}
                  color={COLORS.textMuted}
                />

                <TextInput
                  value={draftFilters.province}
                  onChangeText={(value) =>
                    updateDraftFilter('province', value)
                  }
                  placeholder="Example: Surigao del Norte"
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.locationInput}
                />
              </View>
            </FilterSection>

            {/* FILTER ACTIONS */}

            <View style={styles.filterActions}>
              <TouchableOpacity
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Reset discovery filters"
                onPress={() =>
                  setDraftFilters(createDefaultFilters())
                }
                style={styles.resetDraftButton}
              >
                <Text style={styles.resetDraftText}>
                  Reset
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel="Apply discovery filters"
                disabled={isLoading || isRefreshing}
                onPress={applyFilters}
                style={[
                  styles.applyButton,
                  (isLoading || isRefreshing) &&
                    styles.disabledButton,
                ]}
              >
                <Ionicons
                  name="checkmark-outline"
                  size={18}
                  color={COLORS.white}
                />

                <Text style={styles.applyButtonText}>
                  Show results
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ERROR */}

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
                Couldn't load shops
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {/* RESULTS HEADER */}

        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeaderCopy}>
            <Text style={styles.resultsTitle}>
              Shop results
            </Text>

            <Text style={styles.resultsSubtitle}>
              {pagination
                ? `${pagination.total} approved shop${
                    pagination.total === 1 ? '' : 's'
                  } match your current filters.`
                : 'Browse approved StyleHub shops.'}
            </Text>
          </View>

          {resultRange && pagination ? (
            <View style={styles.rangeBadge}>
              <Text style={styles.rangeBadgeText}>
                {resultRange.first}–{resultRange.last}
              </Text>
            </View>
          ) : null}
        </View>

        {/* LOADING, EMPTY OR RESULTS */}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.loadingTitle}>
              Finding shops
            </Text>

            <Text style={styles.loadingText}>
              Applying your current search, shop type,
              availability, and location filters.
            </Text>
          </View>
        ) : shops.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={28}
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No shops match these filters
            </Text>

            <Text style={styles.emptyText}>
              Try a broader search, remove a location
              filter, or choose another availability status.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Clear discovery filters"
              onPress={clearFilters}
              style={styles.emptyButton}
            >
              <Ionicons
                name="refresh-outline"
                size={17}
                color={COLORS.white}
              />

              <Text style={styles.emptyButtonText}>
                Clear filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.shopList}>
            {shops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                onPress={() => openShop(shop.id)}
              />
            ))}
          </View>
        )}

        {/* PAGINATION */}

        {!isLoading &&
        pagination &&
        pagination.total > 0 ? (
          <View style={styles.paginationCard}>
            <View style={styles.paginationCopy}>
              <Text style={styles.paginationTitle}>
                Page {pagination.current_page} of{' '}
                {Math.max(1, pagination.last_page)}
              </Text>

              <Text style={styles.paginationText}>
                {resultRange
                  ? `Showing ${resultRange.first}–${resultRange.last} of ${pagination.total} shops.`
                  : `${pagination.total} shops found.`}
              </Text>
            </View>

            <View style={styles.paginationButtons}>
              <TouchableOpacity
                activeOpacity={0.78}
                disabled={
                  pagination.current_page <= 1 ||
                  isRefreshing
                }
                accessibilityRole="button"
                accessibilityLabel="Previous shop results page"
                onPress={() =>
                  changePage(
                    pagination.current_page - 1,
                  )
                }
                style={[
                  styles.pageButton,
                  (pagination.current_page <= 1 ||
                    isRefreshing) &&
                    styles.disabledButton,
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
                  !pagination.has_more_pages ||
                  isRefreshing
                }
                accessibilityRole="button"
                accessibilityLabel="Next shop results page"
                onPress={() =>
                  changePage(
                    pagination.current_page + 1,
                  )
                }
                style={[
                  styles.pageButton,
                  (!pagination.has_more_pages ||
                    isRefreshing) &&
                    styles.disabledButton,
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

/* FILTER SECTION */

function FilterSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View>
      <View style={styles.filterSectionHeader}>
        <View style={styles.filterSectionIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.filterSectionCopy}>
          <Text style={styles.filterSectionTitle}>
            {title}
          </Text>

          <Text style={styles.filterSectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.filterSectionBody}>
        {children}
      </View>
    </View>
  );
}

/* SHOP TYPE BUTTON */

function TypeFilterButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.typeButton,
        selected && styles.typeButtonSelected,
      ]}
    >
      <View
        style={[
          styles.typeButtonIcon,
          selected && styles.typeButtonIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={selected ? COLORS.white : COLORS.navy}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.typeButtonText,
          selected && styles.typeButtonTextSelected,
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={17}
        color={
          selected
            ? COLORS.white
            : COLORS.textLight
        }
      />
    </TouchableOpacity>
  );
}

/* AVAILABILITY CHIP */

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filterChip,
        selected && styles.filterChipSelected,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* DISCOVER SHOP CARD */

function ShopCard({
  shop,
  onPress,
}: {
  shop: CustomerShop;
  onPress: () => void;
}) {
  const availability = getAvailabilityPresentation(
    shop.availability.status,
  );

  const description =
    shop.description?.trim() ||
    (shop.type === 'barber_shop'
      ? 'Explore this barber shop, available services, and appointment options.'
      : 'Explore this beauty parlor, available services, and appointment options.');

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Open ${shop.name}`}
      onPress={onPress}
      style={styles.shopCard}
    >
      <View style={styles.shopCardHeader}>
        <ShopOwnerAvatar
          shop={shop}
          size={58}
          iconSize={23}
          fallbackIcon={
            shop.type === 'barber_shop'
              ? 'cut-outline'
              : 'sparkles-outline'
          }
          containerStyle={styles.shopAvatar}
          imageStyle={styles.shopAvatarImage}
        />

        <View style={styles.shopHeading}>
          <Text
            numberOfLines={1}
            style={styles.shopName}
          >
            {shop.name}
          </Text>

          <Text style={styles.shopType}>
            {shop.type_label}
          </Text>
        </View>

        <View
          style={[
            styles.availabilityBadge,
            {
              backgroundColor: availability.background,
            },
          ]}
        >
          <Ionicons
            name={availability.icon}
            size={12}
            color={availability.color}
          />

          <Text
            style={[
              styles.availabilityText,
              { color: availability.color },
            ]}
          >
            {shop.availability.status_label}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={styles.shopDescription}
      >
        {description}
      </Text>

      <View style={styles.locationCard}>
        <View style={styles.locationIcon}>
          <Ionicons
            name="location-outline"
            size={17}
            color={COLORS.navy}
          />
        </View>

        <View style={styles.locationCopy}>
          <Text style={styles.locationLabel}>
            Location
          </Text>

          <Text
            numberOfLines={2}
            style={styles.locationValue}
          >
            {shop.address}, {shop.city}, {shop.province}
          </Text>
        </View>
      </View>

      <View style={styles.shopMetaRow}>
        <View style={styles.metaPill}>
          <Ionicons
            name="star"
            size={13}
            color={COLORS.warning}
          />

          <Text style={styles.metaPrimaryText}>
            {shop.rating.average === null
              ? 'New'
              : shop.rating.average.toFixed(1)}
          </Text>

          {shop.rating.review_count > 0 ? (
            <Text style={styles.metaSecondaryText}>
              ({shop.rating.review_count})
            </Text>
          ) : null}
        </View>

        {typeof shop.active_services_count ===
        'number' ? (
          <View style={styles.metaPill}>
            <Ionicons
              name="cut-outline"
              size={13}
              color={COLORS.textMuted}
            />

            <Text style={styles.metaPrimaryText}>
              {shop.active_services_count}
            </Text>

            <Text style={styles.metaSecondaryText}>
              service
              {shop.active_services_count === 1
                ? ''
                : 's'}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.bookingPill,
            {
              backgroundColor:
                shop.availability.accepts_appointments
                  ? COLORS.greenSoft
                  : COLORS.surfaceSoft,
            },
          ]}
        >
          <Ionicons
            name={
              shop.availability.accepts_appointments
                ? 'calendar-outline'
                : 'calendar-clear-outline'
            }
            size={13}
            color={
              shop.availability.accepts_appointments
                ? COLORS.green
                : COLORS.textMuted
            }
          />

          <Text
            style={[
              styles.bookingPillText,
              {
                color:
                  shop.availability.accepts_appointments
                    ? COLORS.green
                    : COLORS.textMuted,
              },
            ]}
          >
            {shop.availability.accepts_appointments
              ? 'Bookings available'
              : 'Booking unavailable'}
          </Text>
        </View>
      </View>

      <View style={styles.shopCardFooter}>
        <Text style={styles.shopCardFooterText}>
          View services, details &amp; reviews
        </Text>

        <View style={styles.shopCardFooterAction}>
          <Text style={styles.shopCardFooterActionText}>
            View shop
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color={COLORS.navy}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Updated: same top spacing as other screens.
  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 110,
  },

  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topBarTitleBlock: {
    flex: 1,
  },

  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  savedButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
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

  overviewCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overviewLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  overviewValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  overviewIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  overviewFooter: {
    marginTop: 17,
    paddingTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  overviewFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  overviewFooterText: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  searchCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  searchLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  searchRow: {
    marginTop: 9,
    flexDirection: 'row',
    gap: 8,
  },

  searchBox: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 0,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  searchClearButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchButton: {
    width: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  filterToggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  filterToggle: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceSoft,
  },

  filterToggleOpen: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  filterToggleText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  filterToggleTextOpen: {
    color: COLORS.white,
  },

  filterCountBadge: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  filterCountBadgeOpen: {
    backgroundColor: COLORS.navyMuted,
  },

  filterCountText: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '800',
  },

  filterCountTextOpen: {
    color: COLORS.white,
  },

  clearFiltersButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },

  clearFiltersText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  filtersCard: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  filterSectionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  filterSectionCopy: {
    flex: 1,
  },

  filterSectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  filterSectionSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  filterSectionBody: {
    marginTop: 13,
  },

  filterDivider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: COLORS.border,
  },

  typeGrid: {
    gap: 8,
  },

  typeButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  typeButtonIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.surface,
  },

  typeButtonIconSelected: {
    backgroundColor: COLORS.navyMuted,
  },

  typeButtonText: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  typeButtonTextSelected: {
    color: COLORS.white,
  },

  availabilityChips: {
    gap: 7,
    paddingRight: 4,
  },

  filterChip: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceSoft,
  },

  filterChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  filterChipText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  filterChipTextSelected: {
    color: COLORS.white,
  },

  inputLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  inputLabelSecondary: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
  },

  locationInputShell: {
    minHeight: 48,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  locationInput: {
    flex: 1,
    minHeight: 46,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  filterActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 9,
  },

  resetDraftButton: {
    minHeight: LAYOUT.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  resetDraftText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  applyButton: {
    flex: 1,
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 15,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  applyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
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

  resultsHeader: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },

  resultsHeaderCopy: {
    flex: 1,
  },

  resultsTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  resultsSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
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

  loadingCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
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
    marginTop: 13,
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

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
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
    maxWidth: 360,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  shopList: {
    gap: 12,
  },

  shopCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  shopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  shopAvatar: {
    borderRadius: 18,
  },

  shopAvatarImage: {
    borderRadius: 18,
  },

  shopHeading: {
    flex: 1,
    minWidth: 0,
  },

  shopName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  shopType: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  availabilityBadge: {
    maxWidth: 116,
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  availabilityText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '800',
  },

  shopDescription: {
    marginTop: 13,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
  },

  locationCard: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  locationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.surface,
  },

  locationCopy: {
    flex: 1,
    minWidth: 0,
  },

  locationLabel: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  locationValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '700',
  },

  shopMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  metaPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  metaPrimaryText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  metaSecondaryText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  bookingPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  bookingPillText: {
    fontSize: 9,
    fontWeight: '800',
  },

  shopCardFooter: {
    marginTop: 13,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  shopCardFooterText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
  },

  shopCardFooterAction: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  shopCardFooterActionText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.caption,
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

  disabledButton: {
    opacity: 0.46,
  },
});
