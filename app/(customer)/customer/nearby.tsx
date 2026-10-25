
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
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

import CustomerNearbyShopCard from '@/src/components/CustomerNearbyShopCard';
import LeafletMap from '@/src/components/LeafletMap';
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
import { getCustomerNearbyShops } from '@/src/services/customer-api';
import type { ShopAvailabilityStatus } from '@/src/types/customer';
import type {
  CustomerNearbyShop,
  CustomerNearbyShopSearch,
} from '@/src/types/nearby-shop';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ViewMode = 'map' | 'list';

type CustomerCoordinate = {
  latitude: number;
  longitude: number;
};

const DEFAULT_RADIUS_KM = 25;
const DEFAULT_RESULT_LIMIT = 20;
const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

/* HELPERS */

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(0, Math.round(distanceKm * 1000))} m away`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }

  return `${distanceKm.toFixed(0)} km away`;
}

function mapZoomForRadius(radiusKm: number): number {
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 25) return 10;
  return 9;
}

function availabilityPresentation(
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

/* MAIN SCREEN */

export default function CustomerNearbyShopsScreen() {
  const { token } = useAuth();

  const [shops, setShops] = useState<CustomerNearbyShop[]>([]);
  const [search, setSearch] =
    useState<CustomerNearbyShopSearch | null>(null);

  const [customerCoordinate, setCustomerCoordinate] =
    useState<CustomerCoordinate | null>(null);

  const [selectedShopId, setSelectedShopId] =
    useState<number | null>(null);

  const [radiusKm, setRadiusKm] =
    useState<number>(DEFAULT_RADIUS_KM);

  const [viewMode, setViewMode] =
    useState<ViewMode>('map');

  const [hasSearched, setHasSearched] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedShop = useMemo(
    () => shops.find(
      (shop) => shop.id === selectedShopId,
    ) ?? null,
    [selectedShopId, shops],
  );

  const closestShop = shops[0] ?? null;

  /* MAP MARKERS */

  const mapMarkers = useMemo(
    () =>
      shops.flatMap((shop) => {
        if (
          shop.location.latitude === null ||
          shop.location.longitude === null
        ) {
          return [];
        }

        return [
          {
            id: String(shop.id),
            coordinate: {
              latitude: shop.location.latitude,
              longitude: shop.location.longitude,
            },
            title: shop.name,
            description: formatDistance(shop.distance_km),
            draggable: false,
          },
        ];
      }),
    [shops],
  );

  /* FIND NEARBY SHOPS */

  const loadNearbyShops = useCallback(
    async (refreshing = false): Promise<void> => {
      if (!token || isFinding || isRefreshing) {
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsFinding(true);
      }

      setErrorMessage('');

      try {
        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          setErrorMessage(
            'Your device location service is turned off. Turn on Location/GPS and try again.',
          );
          return;
        }

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (!permission.granted) {
          setErrorMessage(
            'Location permission is needed to find nearby shops. You can still browse all StyleHub shops from Discover.',
          );
          return;
        }

        const currentPosition =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        const coordinate: CustomerCoordinate = {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        };

        const response = await getCustomerNearbyShops(
          token,
          {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            radiusKm,
            limit: DEFAULT_RESULT_LIMIT,
          },
        );

        setCustomerCoordinate(coordinate);
        setShops(response.data.shops);
        setSearch(response.data.search);
        setSelectedShopId(
          response.data.shops[0]?.id ?? null,
        );
        setHasSearched(true);
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to find nearby shops. Check your location and network connection, then try again.',
        );
      } finally {
        setIsFinding(false);
        setIsRefreshing(false);
      }
    },
    [isFinding, isRefreshing, radiusKm, token],
  );

  /* NAVIGATION */

  const openShop = useCallback(
    (shopId: number): void => {
      router.push({
        pathname: '/(customer)/shop/[shopId]',
        params: { shopId: String(shopId) },
      });
    },
    [],
  );

  /* MAP INTERACTION */

  const handleMarkerPress = useCallback(
    (markerId: string): void => {
      const shopId = Number(markerId);

      if (!Number.isInteger(shopId) || shopId <= 0) {
        return;
      }

      if (!shops.some((shop) => shop.id === shopId)) {
        return;
      }

      setSelectedShopId(shopId);
    },
    [shops],
  );

  const handleMapError = useCallback(
    (message: string): void => {
      setErrorMessage(message);
    },
    [],
  );

  function chooseRadius(nextRadius: number): void {
    if (isFinding || isRefreshing) return;

    setRadiusKm(nextRadius);
    setErrorMessage('');
  }

  const activeRadius = search?.radius_km ?? radiusKm;

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
            onRefresh={() => {
              if (hasSearched) {
                void loadNearbyShops(true);
              }
            }}
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
              Nearby
            </Text>

            <Text style={styles.topBarCaption}>
              Location-based shop discovery
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Open all shops"
            onPress={() =>
              router.push('/(customer)/customer/shops')
            }
            style={styles.topActionButton}
          >
            <Ionicons
              name="storefront-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            AROUND YOU
          </Text>

          <Text style={styles.title}>
            Find the closest StyleHub shops from your current position
          </Text>

          <Text style={styles.subtitle}>
            Use foreground location once for this search,
            compare verified shop pins by distance, and open
            a shop when you are ready to explore its services.
          </Text>
        </View>

        {/* PRIVACY NOTICE */}

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.green}
            />
          </View>

          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>
              Location is used for nearby search
            </Text>

            <Text style={styles.privacyText}>
              Your current coordinates are used to calculate
              nearby shops for this request. This screen
              does not save those coordinates to your
              StyleHub customer profile.
            </Text>
          </View>
        </View>

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
                Nearby search needs attention
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {/* SEARCH RADIUS */}

        <View style={styles.searchCard}>
          <View style={styles.searchHeader}>
            <View style={styles.searchHeaderIcon}>
              <Ionicons
                name="locate-outline"
                size={20}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.searchHeaderCopy}>
              <Text style={styles.searchTitle}>
                Search radius
              </Text>

              <Text style={styles.searchText}>
                Choose how far StyleHub should look
                from your current location.
              </Text>
            </View>
          </View>

          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map((option) => {
              const selected = radiusKm === option;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.78}
                  disabled={isFinding || isRefreshing}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => chooseRadius(option)}
                  style={[
                    styles.radiusButton,
                    selected && styles.radiusButtonSelected,
                    (isFinding || isRefreshing) &&
                      styles.disabledButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusButtonValue,
                      selected &&
                        styles.radiusButtonValueSelected,
                    ]}
                  >
                    {option}
                  </Text>

                  <Text
                    style={[
                      styles.radiusButtonUnit,
                      selected &&
                        styles.radiusButtonUnitSelected,
                    ]}
                  >
                    km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hasSearched &&
          search?.radius_km !== radiusKm ? (
            <View style={styles.radiusChangedNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.blue}
              />

              <Text style={styles.radiusChangedText}>
                Radius changed. Search again to refresh
                the map and shop list.
              </Text>
            </View>
          ) : null}

          {/* SEARCH BUTTON */}

          <TouchableOpacity
            activeOpacity={0.84}
            disabled={isFinding || isRefreshing}
            accessibilityRole="button"
            accessibilityLabel={
              hasSearched
                ? 'Search nearby shops again'
                : 'Find nearby shops'
            }
            onPress={() => void loadNearbyShops()}
            style={[
              styles.primaryButton,
              (isFinding || isRefreshing) &&
                styles.disabledButton,
            ]}
          >
            {isFinding ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name={
                  hasSearched
                    ? 'locate-outline'
                    : 'navigate-outline'
                }
                size={19}
                color={COLORS.white}
              />
            )}

            <Text style={styles.primaryButtonText}>
              {isFinding
                ? 'Finding nearby shops...'
                : hasSearched
                  ? `Search again within ${radiusKm} km`
                  : `Find shops within ${radiusKm} km`}
            </Text>
          </TouchableOpacity>

          {!hasSearched ? (
            <Text style={styles.searchFootnote}>
              StyleHub will request foreground location
              permission when you press the button.
            </Text>
          ) : null}
        </View>

        {/* BEFORE FIRST SEARCH */}

        {!hasSearched ? (
          <View style={styles.startCard}>
            <View style={styles.startGraphic}>
              <View style={styles.startGraphicRing}>
                <Ionicons
                  name="navigate"
                  size={27}
                  color={COLORS.blue}
                />
              </View>
            </View>

            <Text style={styles.startTitle}>
              Nearby search is ready
            </Text>

            <Text style={styles.startText}>
              We will show only approved customer-visible
              shops that have saved map coordinates and
              fall inside your selected radius.
            </Text>

            <View style={styles.startFeatures}>
              <FeatureLine
                icon="map-outline"
                text="OpenStreetMap and Leaflet map view"
              />

              <FeatureLine
                icon="speedometer-outline"
                text="Server-calculated distance ordering"
              />

              <FeatureLine
                icon="storefront-outline"
                text={`Up to ${DEFAULT_RESULT_LIMIT} nearby shop results`}
              />
            </View>
          </View>
        ) : null}

        {/* AFTER SEARCH */}

        {hasSearched ? (
          <>
            {/* RESULTS OVERVIEW */}

            <View style={styles.resultsOverview}>
              <View style={styles.resultsOverviewTop}>
                <View>
                  <Text style={styles.resultsOverviewLabel}>
                    Nearby shops found
                  </Text>

                  <Text style={styles.resultsOverviewValue}>
                    {search?.results_count ?? shops.length}
                  </Text>
                </View>

                <View style={styles.resultsOverviewIcon}>
                  <Ionicons
                    name="navigate-outline"
                    size={24}
                    color={COLORS.white}
                  />
                </View>
              </View>

              <View style={styles.resultsOverviewFooter}>
                <SummaryItem
                  label="Radius"
                  value={`${activeRadius} km`}
                />

                <View style={styles.resultsOverviewDivider} />

                <SummaryItem
                  label="Closest"
                  value={
                    closestShop
                      ? formatDistance(closestShop.distance_km)
                      : 'None'
                  }
                />

                <View style={styles.resultsOverviewDivider} />

                <SummaryItem
                  label="Order"
                  value="Nearest first"
                />
              </View>
            </View>

            {/* MAP / LIST SWITCHER */}

            <View style={styles.viewSwitcher}>
              <TouchableOpacity
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityState={{
                  selected: viewMode === 'map',
                }}
                onPress={() => setViewMode('map')}
                style={[
                  styles.viewButton,
                  viewMode === 'map' &&
                    styles.viewButtonSelected,
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={17}
                  color={
                    viewMode === 'map'
                      ? COLORS.white
                      : COLORS.navy
                  }
                />

                <Text
                  style={[
                    styles.viewButtonText,
                    viewMode === 'map' &&
                      styles.viewButtonTextSelected,
                  ]}
                >
                  Map
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityState={{
                  selected: viewMode === 'list',
                }}
                onPress={() => setViewMode('list')}
                style={[
                  styles.viewButton,
                  viewMode === 'list' &&
                    styles.viewButtonSelected,
                ]}
              >
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={
                    viewMode === 'list'
                      ? COLORS.white
                      : COLORS.navy
                  }
                />

                <Text
                  style={[
                    styles.viewButtonText,
                    viewMode === 'list' &&
                      styles.viewButtonTextSelected,
                  ]}
                >
                  List
                </Text>
              </TouchableOpacity>
            </View>

            {/* EMPTY RESULTS */}

            {shops.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="storefront-outline"
                    size={28}
                    color={COLORS.navy}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No nearby shops found
                </Text>

                <Text style={styles.emptyText}>
                  There are no approved shops with saved
                  map locations inside {activeRadius} km
                  of your current position. Try a wider
                  radius or browse Discover.
                </Text>

                <View style={styles.emptyActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setRadiusKm(50)}
                    style={styles.emptySecondaryButton}
                  >
                    <Text style={styles.emptySecondaryButtonText}>
                      Use 50 km
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() =>
                      router.push('/(customer)/customer/shops')
                    }
                    style={styles.emptyPrimaryButton}
                  >
                    <Text style={styles.emptyPrimaryButtonText}>
                      Open Discover
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* LEAFLET MAP VIEW */}

            {shops.length > 0 &&
            viewMode === 'map' &&
            customerCoordinate ? (
              <>
                <View style={styles.mapCard}>
                  <View style={styles.mapHeader}>
                    <View style={styles.mapHeaderIcon}>
                      <Ionicons
                        name="map-outline"
                        size={19}
                        color={COLORS.navy}
                      />
                    </View>

                    <View style={styles.mapHeaderCopy}>
                      <Text style={styles.mapHeaderTitle}>
                        Shops around your position
                      </Text>

                      <Text style={styles.mapHeaderText}>
                        Tap an orange shop pin to preview
                        that shop below the map.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mapFrame}>
                    <LeafletMap
                      style={styles.map}
                      center={customerCoordinate}
                      zoom={mapZoomForRadius(activeRadius)}
                      markers={mapMarkers}
                      userLocation={customerCoordinate}
                      onMarkerPress={handleMarkerPress}
                      onMapError={handleMapError}
                    />
                  </View>

                  <View style={styles.mapLegend}>
                    <LegendItem
                      color={COLORS.blue}
                      label="Your position"
                    />

                    <LegendItem
                      color={COLORS.orange}
                      label="StyleHub shop"
                    />
                  </View>
                </View>

                {selectedShop ? (
                  <SelectedShopCard
                    shop={selectedShop}
                    onOpen={() =>
                      openShop(selectedShop.id)
                    }
                  />
                ) : null}
              </>
            ) : null}

            {/* LIST VIEW */}

            {shops.length > 0 &&
            viewMode === 'list' ? (
              <View style={styles.listSection}>
                <View style={styles.listHeading}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>
                      Nearest first
                    </Text>

                    <Text style={styles.listSubtitle}>
                      Distances are returned by your
                      existing nearby-shop API.
                    </Text>
                  </View>

                  <View style={styles.listCountBadge}>
                    <Text style={styles.listCountText}>
                      {shops.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.shopList}>
                  {shops.map((shop) => (
                    <CustomerNearbyShopCard
                      key={shop.id}
                      shop={shop}
                      onPress={() => openShop(shop.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* FEATURE LINE */

function FeatureLine({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) {
  return (
    <View style={styles.featureLine}>
      <View style={styles.featureIcon}>
        <Ionicons
          name={icon}
          size={16}
          color={COLORS.navy}
        />
      </View>

      <Text style={styles.featureText}>
        {text}
      </Text>
    </View>
  );
}

/* SUMMARY ITEM */

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
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={styles.summaryItemValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* MAP LEGEND */

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
        ]}
      />

      <Text style={styles.legendText}>
        {label}
      </Text>
    </View>
  );
}

/* SELECTED SHOP PREVIEW */

function SelectedShopCard({
  shop,
  onOpen,
}: {
  shop: CustomerNearbyShop;
  onOpen: () => void;
}) {
  const availability = availabilityPresentation(
    shop.availability.status,
  );

  return (
    <View style={styles.selectedCard}>
      <View style={styles.selectedHeader}>
        <ShopOwnerAvatar
          shop={shop}
          size={54}
          iconSize={22}
          fallbackIcon={
            shop.type === 'barber_shop'
              ? 'cut-outline'
              : 'sparkles-outline'
          }
          containerStyle={styles.selectedAvatar}
          imageStyle={styles.selectedAvatarImage}
        />

        <View style={styles.selectedHeading}>
          <Text
            numberOfLines={1}
            style={styles.selectedName}
          >
            {shop.name}
          </Text>

          <Text style={styles.selectedType}>
            {shop.type_label}
          </Text>
        </View>

        <View
          style={[
            styles.selectedStatus,
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
              styles.selectedStatusText,
              { color: availability.color },
            ]}
          >
            {shop.availability.status_label}
          </Text>
        </View>
      </View>

      {/* DISTANCE */}

      <View style={styles.selectedDistanceRow}>
        <View style={styles.selectedDistanceIcon}>
          <Ionicons
            name="navigate"
            size={17}
            color={COLORS.blue}
          />
        </View>

        <View style={styles.selectedDistanceCopy}>
          <Text style={styles.selectedDistanceLabel}>
            Distance from you
          </Text>

          <Text style={styles.selectedDistanceValue}>
            {formatDistance(shop.distance_km)}
          </Text>
        </View>
      </View>

      {/* SHOP RATING */}

      <View style={styles.selectedMetaRow}>
        <View style={styles.selectedMetaPill}>
          <Ionicons
            name="star"
            size={13}
            color={COLORS.warning}
          />

          <Text style={styles.selectedMetaText}>
            {shop.rating.average === null
              ? 'New'
              : shop.rating.average.toFixed(1)}
          </Text>

          {shop.rating.review_count > 0 ? (
            <Text style={styles.selectedMetaMuted}>
              ({shop.rating.review_count})
            </Text>
          ) : null}
        </View>

        <View style={styles.selectedMetaPill}>
          <Ionicons
            name="cut-outline"
            size={13}
            color={COLORS.textMuted}
          />

          <Text style={styles.selectedMetaText}>
            {shop.active_services_count ?? 0}
          </Text>

          <Text style={styles.selectedMetaMuted}>
            services
          </Text>
        </View>
      </View>

      {/* SHOP ADDRESS */}

      <View style={styles.selectedAddressRow}>
        <Ionicons
          name="location-outline"
          size={15}
          color={COLORS.textMuted}
        />

        <Text
          numberOfLines={2}
          style={styles.selectedAddress}
        >
          {shop.address}, {shop.city}, {shop.province}
        </Text>
      </View>

      {/* OPEN SHOP */}

      <TouchableOpacity
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`Open ${shop.name}`}
        onPress={onOpen}
        style={styles.selectedOpenButton}
      >
        <Text style={styles.selectedOpenButtonText}>
          View shop
        </Text>

        <Ionicons
          name="arrow-forward"
          size={17}
          color={COLORS.white}
        />
      </TouchableOpacity>
    </View>
  );
}

/* STYLES */

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

  topActionButton: {
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

  privacyCard: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.greenSoft,
  },

  privacyIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  privacyCopy: {
    flex: 1,
  },

  privacyTitle: {
    color: COLORS.green,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  privacyText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
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

  searchCard: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  searchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  searchHeaderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  searchHeaderCopy: {
    flex: 1,
  },

  searchTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  searchText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  radiusRow: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 7,
  },

  radiusButton: {
    flex: 1,
    minHeight: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  radiusButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  radiusButtonValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  radiusButtonValueSelected: {
    color: COLORS.white,
  },

  radiusButtonUnit: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  radiusButtonUnitSelected: {
    color: '#D4DAE1',
  },

  radiusChangedNote: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  radiusChangedText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  primaryButton: {
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

  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  searchFootnote: {
    marginTop: 9,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 15,
    textAlign: 'center',
  },

  startCard: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  startGraphic: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: COLORS.blueSoft,
  },

  startGraphicRing: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
  },

  startTitle: {
    marginTop: 15,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },

  startText: {
    maxWidth: 440,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  startFeatures: {
    alignSelf: 'stretch',
    marginTop: 18,
    gap: 8,
  },

  featureLine: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  featureIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  featureText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '600',
  },

  resultsOverview: {
    marginTop: 14,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  resultsOverviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultsOverviewLabel: {
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  resultsOverviewValue: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },

  resultsOverviewIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.navyMuted,
  },

  resultsOverviewFooter: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  resultsOverviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 11,
    backgroundColor: COLORS.navyMuted,
  },

  viewSwitcher: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  viewButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  viewButtonSelected: {
    backgroundColor: COLORS.primary,
  },

  viewButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  viewButtonTextSelected: {
    color: COLORS.white,
  },

  emptyCard: {
    marginTop: 12,
    alignItems: 'center',
    paddingHorizontal: 23,
    paddingVertical: 31,
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
    maxWidth: 390,
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyActions: {
    marginTop: 17,
    flexDirection: 'row',
    gap: 8,
  },

  emptySecondaryButton: {
    minHeight: LAYOUT.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  emptySecondaryButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  emptyPrimaryButton: {
    minHeight: LAYOUT.compactButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 15,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  emptyPrimaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  mapCard: {
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  mapHeader: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  mapHeaderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  mapHeaderCopy: {
    flex: 1,
  },

  mapHeaderTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  mapHeaderText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  mapFrame: {
    height: 390,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
  },

  map: {
    width: '100%',
    height: '100%',
  },

  mapLegend: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  selectedCard: {
    marginTop: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  selectedAvatar: {
    borderRadius: 18,
  },

  selectedAvatarImage: {
    borderRadius: 18,
  },

  selectedHeading: {
    flex: 1,
    minWidth: 0,
  },

  selectedName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  selectedType: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  selectedStatus: {
    maxWidth: 112,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  selectedStatusText: {
    flexShrink: 1,
    fontSize: 8,
    fontWeight: '800',
  },

  selectedDistanceRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: RADII.md,
    backgroundColor: COLORS.blueSoft,
  },

  selectedDistanceIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },

  selectedDistanceCopy: {
    flex: 1,
  },

  selectedDistanceLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  selectedDistanceValue: {
    marginTop: 2,
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  selectedMetaRow: {
    marginTop: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  selectedMetaPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  selectedMetaText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },

  selectedMetaMuted: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  selectedAddressRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  selectedAddress: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  selectedOpenButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  selectedOpenButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  listSection: {
    marginTop: SPACING.xxl,
  },

  listHeading: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  listTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
  },

  listSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  listCountBadge: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.accentSoft,
  },

  listCountText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  shopList: {
    gap: 10,
  },

  disabledButton: {
    opacity: 0.46,
  },
});
