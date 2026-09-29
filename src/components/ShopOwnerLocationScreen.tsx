import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
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

import LeafletMap from '@/src/components/LeafletMap';
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
  getShopOwnerLocation,
  updateShopOwnerLocation,
} from '@/src/services/shop-location-api';
import type { ShopLocation } from '@/src/types/shop-location';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapRegion = Coordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_REGION: MapRegion = {
  latitude: 12.8797,
  longitude: 121.774,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

function regionForCoordinate(
  coordinate: Coordinate,
): MapRegion {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };
}

function formatCoordinate(
  value: number | null,
): string {
  return value === null
    ? 'Not set'
    : value.toFixed(7);
}

function getMapZoom(
  region: MapRegion,
): number {
  if (region.latitudeDelta >= 10) {
    return 5;
  }

  if (region.latitudeDelta >= 1) {
    return 8;
  }

  if (region.latitudeDelta >= 0.1) {
    return 12;
  }

  if (region.latitudeDelta >= 0.03) {
    return 14;
  }

  return 17;
}

export default function ShopOwnerLocationScreen() {
  const { token } = useAuth();

  const [location, setLocation] = useState<ShopLocation | null>(null);
  const [draftCoordinate, setDraftCoordinate] = useState<Coordinate | null>(null);
  const [currentUserCoordinate, setCurrentUserCoordinate] = useState<Coordinate | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadLocation = useCallback(
    async (
      refreshing = false,
    ): Promise<void> => {
      if (!token) {
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
        const response = await getShopOwnerLocation(token);
        const loadedLocation = response.data.location;

        setLocation(loadedLocation);

        if (
          loadedLocation.has_location
          && loadedLocation.latitude !== null
          && loadedLocation.longitude !== null
        ) {
          const coordinate: Coordinate = {
            latitude: loadedLocation.latitude,
            longitude: loadedLocation.longitude,
          };

          setDraftCoordinate(coordinate);
          setMapRegion(regionForCoordinate(coordinate));
        } else {
          setDraftCoordinate(null);
          setMapRegion(DEFAULT_REGION);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load your shop location.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  const isDirty = useMemo(() => {
    if (!draftCoordinate) {
      return false;
    }

    if (
      !location
      || location.latitude === null
      || location.longitude === null
    ) {
      return true;
    }

    return (
      Math.abs(
        draftCoordinate.latitude - location.latitude,
      ) > 0.00000005
      || Math.abs(
        draftCoordinate.longitude - location.longitude,
      ) > 0.00000005
    );
  }, [draftCoordinate, location]);

  const hasSavedLocation = Boolean(
    location?.has_location
    && location.latitude !== null
    && location.longitude !== null,
  );

  const mapZoom = useMemo(
    () => getMapZoom(mapRegion),
    [mapRegion],
  );

  const formattedAddress = useMemo(() => {
    if (!location) {
      return 'Shop address unavailable';
    }

    return [
      location.address,
      location.city,
      location.province,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ');
  }, [location]);

  const pinStatus = !draftCoordinate
    ? {
        label: 'Pin not set',
        color: COLORS.warning,
        soft: COLORS.warningSoft,
        icon: 'location-outline' as IconName,
      }
    : isDirty
      ? {
          label: 'Unsaved pin',
          color: COLORS.orange,
          soft: COLORS.orangeSoft,
          icon: 'alert-circle-outline' as IconName,
        }
      : {
          label: 'Location saved',
          color: COLORS.green,
          soft: COLORS.greenSoft,
          icon: 'checkmark-circle-outline' as IconName,
        };

  const selectCoordinate = useCallback(
    (
      coordinate: Coordinate,
    ): void => {
      setDraftCoordinate(coordinate);
      setSuccessMessage('');
      setErrorMessage('');
    },
    [],
  );

  const moveMapToCoordinate = useCallback(
    (
      coordinate: Coordinate,
    ): void => {
      setMapRegion(regionForCoordinate(coordinate));
    },
    [],
  );

  const handleMapPress = useCallback(
    (
      coordinate: Coordinate,
    ): void => {
      selectCoordinate(coordinate);
      moveMapToCoordinate(coordinate);
    },
    [moveMapToCoordinate, selectCoordinate],
  );

  const handleMarkerDragEnd = useCallback(
    (
      _markerId: string,
      coordinate: Coordinate,
    ): void => {
      selectCoordinate(coordinate);
      moveMapToCoordinate(coordinate);
    },
    [moveMapToCoordinate, selectCoordinate],
  );

  const handleMapError = useCallback(
    (
      message: string,
    ): void => {
      setErrorMessage(message);
    },
    [],
  );

  function resetToSavedLocation(): void {
    if (
      !location
      || location.latitude === null
      || location.longitude === null
      || isSaving
      || isLocating
    ) {
      return;
    }

    const coordinate: Coordinate = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    setDraftCoordinate(coordinate);
    moveMapToCoordinate(coordinate);
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleUseCurrentLocation(): Promise<void> {
    if (isLocating || isSaving) {
      return;
    }

    setIsLocating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setCurrentUserCoordinate(null);
        setErrorMessage(
          'Location permission is required to use your current position. You can still set the shop pin manually by tapping anywhere on the map.',
        );
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinate: Coordinate = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };

      setCurrentUserCoordinate(coordinate);
      selectCoordinate(coordinate);
      moveMapToCoordinate(coordinate);
    } catch {
      setErrorMessage(
        'Unable to determine your current location. Check your device location settings or place the pin manually.',
      );
    } finally {
      setIsLocating(false);
    }
  }

  async function saveLocation(): Promise<void> {
    if (
      !token
      || !draftCoordinate
      || isSaving
      || !isDirty
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await updateShopOwnerLocation(
        token,
        {
          latitude: draftCoordinate.latitude,
          longitude: draftCoordinate.longitude,
        },
      );

      const savedLocation = response.data.location;

      setLocation(savedLocation);

      if (
        savedLocation.latitude !== null
        && savedLocation.longitude !== null
      ) {
        const savedCoordinate: Coordinate = {
          latitude: savedLocation.latitude,
          longitude: savedLocation.longitude,
        };

        setDraftCoordinate(savedCoordinate);
        moveMapToCoordinate(savedCoordinate);
      }

      setSuccessMessage(
        response.message
        ?? 'Shop location updated successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to save your shop location.',
      );
    } finally {
      setIsSaving(false);
    }
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
            onRefresh={() => void loadLocation(true)}
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
              Shop location
            </Text>

            <Text style={styles.topBarCaption}>
              Map pin and coordinates
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh shop location"
            disabled={isSaving || isLocating}
            onPress={() => void loadLocation(true)}
            style={[
              styles.topIconButton,
              (isSaving || isLocating) && styles.disabledButton,
            ]}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            SHOP MAP PIN
          </Text>

          <Text style={styles.title}>
            Help customers find the exact entrance to your shop
          </Text>

          <Text style={styles.subtitle}>
            Place the pin on your real shop location. Customers use the saved coordinates when viewing your shop on the map and opening directions.
          </Text>
        </View>

        {errorMessage ? (
          <MessageBox
            type="error"
            title="Location needs attention"
            message={errorMessage}
          />
        ) : null}

        {successMessage ? (
          <MessageBox
            type="success"
            title="Location saved"
            message={successMessage}
          />
        ) : null}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                size="small"
                color={COLORS.navy}
              />
            </View>

            <Text style={styles.loadingTitle}>
              Loading shop location
            </Text>

            <Text style={styles.loadingText}>
              Getting your saved map pin and shop address.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.overviewCard}>
              <View style={styles.overviewTopRow}>
                <View style={styles.overviewIcon}>
                  <Ionicons
                    name="location-outline"
                    size={24}
                    color={COLORS.white}
                  />
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: pinStatus.soft,
                    },
                  ]}
                >
                  <Ionicons
                    name={pinStatus.icon}
                    size={14}
                    color={pinStatus.color}
                  />

                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: pinStatus.color,
                      },
                    ]}
                  >
                    {pinStatus.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.overviewShopName}>
                {location?.shop_name ?? 'Your shop'}
              </Text>

              <Text style={styles.overviewAddress}>
                {formattedAddress}
              </Text>

              <View style={styles.overviewStats}>
                <OverviewItem
                  label="Saved pin"
                  value={
                    hasSavedLocation
                      ? 'Ready'
                      : 'Not set'
                  }
                />

                <View style={styles.overviewDivider} />

                <OverviewItem
                  label="Draft"
                  value={
                    draftCoordinate
                      ? isDirty
                        ? 'Changed'
                        : 'Matched'
                      : 'None'
                  }
                />

                <View style={styles.overviewDivider} />

                <OverviewItem
                  label="Map"
                  value="OSM"
                />
              </View>
            </View>

            <SectionHeading
              title="Place the shop pin"
              subtitle="Tap the map to choose a location, or drag the shop marker for a more precise position."
            />

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
                    Exact shop position
                  </Text>

                  <Text style={styles.mapHeaderText}>
                    Tap or drag the pin, then save the coordinates below.
                  </Text>
                </View>
              </View>

              <View style={styles.mapFrame}>
                <LeafletMap
                  style={styles.map}
                  center={{
                    latitude: mapRegion.latitude,
                    longitude: mapRegion.longitude,
                  }}
                  zoom={mapZoom}
                  markers={
                    draftCoordinate
                      ? [
                          {
                            id: 'shop-location',
                            coordinate: draftCoordinate,
                            draggable: true,
                            title: location?.shop_name ?? 'Shop location',
                            description: 'Drag this pin to fine-tune the location.',
                          },
                        ]
                      : []
                  }
                  userLocation={currentUserCoordinate}
                  onMapPress={handleMapPress}
                  onMarkerDragEnd={handleMarkerDragEnd}
                  onMapError={handleMapError}
                />
              </View>

              <View style={styles.mapLegend}>
                <LegendItem
                  color={COLORS.orange}
                  label="Shop pin"
                />

                <LegendItem
                  color={COLORS.blue}
                  label="Your current position"
                />
              </View>
            </View>

            <View style={styles.instructionsCard}>
              <InstructionRow
                icon="locate-outline"
                title="Use current location"
                description="Best when you are physically at the shop. StyleHub asks for foreground location permission first."
              />

              <View style={styles.instructionsDivider} />

              <InstructionRow
                icon="finger-print-outline"
                title="Tap anywhere on the map"
                description="Use this when the device location is unavailable or you need to place the pin manually."
              />

              <View style={styles.instructionsDivider} />

              <InstructionRow
                icon="move-outline"
                title="Fine-tune by dragging"
                description="Drag the orange shop marker until it sits on the exact shop entrance or building."
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              disabled={isLocating || isSaving}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
              onPress={() => void handleUseCurrentLocation()}
              style={[
                styles.currentLocationButton,
                (isLocating || isSaving) && styles.disabledButton,
              ]}
            >
              <View style={styles.currentLocationButtonIcon}>
                {isLocating ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.navy}
                  />
                ) : (
                  <Ionicons
                    name="locate-outline"
                    size={20}
                    color={COLORS.navy}
                  />
                )}
              </View>

              <View style={styles.currentLocationButtonCopy}>
                <Text style={styles.currentLocationButtonTitle}>
                  {isLocating
                    ? 'Finding your location...'
                    : 'Use my current location'}
                </Text>

                <Text style={styles.currentLocationButtonText}>
                  {isLocating
                    ? 'Waiting for a precise foreground location result.'
                    : 'Center the map and place the shop pin where this device is now.'}
                </Text>
              </View>

              {!isLocating ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textLight}
                />
              ) : null}
            </TouchableOpacity>

            <SectionHeading
              title="Selected coordinates"
              subtitle="These exact latitude and longitude values are sent to Laravel when you save."
            />

            <View style={styles.coordinateCard}>
              <CoordinateRow
                icon="navigate-outline"
                label="Latitude"
                value={
                  formatCoordinate(
                    draftCoordinate?.latitude ?? null,
                  )
                }
              />

              <View style={styles.coordinateDivider} />

              <CoordinateRow
                icon="compass-outline"
                label="Longitude"
                value={
                  formatCoordinate(
                    draftCoordinate?.longitude ?? null,
                  )
                }
              />
            </View>

            {isDirty && hasSavedLocation ? (
              <TouchableOpacity
                activeOpacity={0.78}
                disabled={isSaving || isLocating}
                accessibilityRole="button"
                accessibilityLabel="Restore saved shop location"
                onPress={resetToSavedLocation}
                style={styles.restoreButton}
              >
                <Ionicons
                  name="return-up-back-outline"
                  size={17}
                  color={COLORS.navy}
                />

                <Text style={styles.restoreButtonText}>
                  Restore saved pin
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.saveCard}>
              <View style={styles.saveHeader}>
                <View style={styles.saveIcon}>
                  <Ionicons
                    name={
                      isDirty
                        ? 'location-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={20}
                    color={COLORS.navy}
                  />
                </View>

                <View style={styles.saveCopy}>
                  <Text style={styles.saveTitle}>
                    {!draftCoordinate
                      ? 'Choose a shop position'
                      : isDirty
                        ? 'Save this shop pin'
                        : 'Shop pin is up to date'}
                  </Text>

                  <Text style={styles.saveText}>
                    {!draftCoordinate
                      ? 'Tap the map or use your current location before saving.'
                      : isDirty
                        ? 'Review the marker position and coordinates before saving the change.'
                        : 'The map currently matches the coordinates already saved for your shop.'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={
                  !draftCoordinate
                  || !isDirty
                  || isSaving
                  || isLocating
                }
                accessibilityRole="button"
                accessibilityLabel="Save shop location"
                onPress={() => void saveLocation()}
                style={[
                  styles.primaryButton,
                  (
                    !draftCoordinate
                    || !isDirty
                    || isSaving
                    || isLocating
                  ) && styles.disabledButton,
                ]}
              >
                {isSaving ? (
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

                <Text style={styles.primaryButtonText}>
                  {isSaving
                    ? 'Saving location...'
                    : !draftCoordinate
                      ? 'Choose a location first'
                      : isDirty
                        ? hasSavedLocation
                          ? 'Save updated location'
                          : 'Save shop location'
                        : 'Location is up to date'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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

function OverviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.overviewItem}>
      <Text style={styles.overviewItemLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.overviewItemValue}
      >
        {value}
      </Text>
    </View>
  );
}

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
          {
            backgroundColor: color,
          },
        ]}
      />

      <Text style={styles.legendText}>
        {label}
      </Text>
    </View>
  );
}

function InstructionRow({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.instructionRow}>
      <View style={styles.instructionIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.instructionCopy}>
        <Text style={styles.instructionTitle}>
          {title}
        </Text>

        <Text style={styles.instructionText}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function CoordinateRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.coordinateRow}>
      <View style={styles.coordinateIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.navy}
        />
      </View>

      <View style={styles.coordinateCopy}>
        <Text style={styles.coordinateLabel}>
          {label}
        </Text>

        <Text
          selectable
          style={styles.coordinateValue}
        >
          {value}
        </Text>
      </View>
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
  const success = type === 'success';

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
              color:
                success
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
    maxWidth: 570,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 610,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

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
    maxWidth: 320,
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    textAlign: 'center',
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
    gap: 12,
  },

  overviewIcon: {
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

  overviewShopName: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  overviewAddress: {
    marginTop: 5,
    color: '#D4DAE1',
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  overviewStats: {
    marginTop: 17,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  overviewItem: {
    flex: 1,
    minWidth: 0,
  },

  overviewItemLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  overviewItemValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '800',
  },

  overviewDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: COLORS.navyMuted,
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

  mapCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  mapHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
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

  instructionsCard: {
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  instructionRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  instructionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
  },

  instructionCopy: {
    flex: 1,
  },

  instructionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  instructionText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  instructionsDivider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: COLORS.border,
  },

  currentLocationButton: {
    minHeight: 68,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  currentLocationButtonIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
  },

  currentLocationButtonCopy: {
    flex: 1,
  },

  currentLocationButtonTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  currentLocationButtonText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  coordinateCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  coordinateRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  coordinateIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  coordinateCopy: {
    flex: 1,
  },

  coordinateLabel: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  coordinateValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  coordinateDivider: {
    height: 1,
    marginLeft: 63,
    backgroundColor: COLORS.border,
  },

  restoreButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  restoreButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  saveCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  saveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  saveIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  saveCopy: {
    flex: 1,
  },

  saveTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  saveText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  primaryButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.46,
  },
});