import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import LeafletMap from '@/src/components/LeafletMap';
import { COLORS } from '@/src/constants/colors';
import type {
  CustomerShopLocation,
} from '@/src/types/customer';

interface CustomerShopLocationCardProps {
  shopName: string;

  address: string;

  city: string;

  province: string;

  location: CustomerShopLocation;
}

type Coordinate = {
  latitude: number;
  longitude: number;
};

function buildOpenStreetMapDirectionsUrl(
  origin: Coordinate,
  destination: Coordinate,
): string {
  const route =
    encodeURIComponent(
      `${origin.latitude},${origin.longitude};${destination.latitude},${destination.longitude}`,
    );

  return (
    'https://www.openstreetmap.org/directions'
    + '?engine=fossgis_osrm_car'
    + `&route=${route}`
  );
}

export default function CustomerShopLocationCard({
  shopName,
  address,
  city,
  province,
  location,
}: CustomerShopLocationCardProps) {
  const [
    isOpeningDirections,
    setIsOpeningDirections,
  ] = useState(
    false,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    currentUserLocation,
    setCurrentUserLocation,
  ] = useState<Coordinate | null>(
    null,
  );

  const hasCoordinates =
    location.has_location
    &&
    location.latitude !== null
    &&
    location.longitude !== null;

  const fullAddress =
    `${address}, ${city}, ${province}`;

  async function openDirections(): Promise<void> {
    if (
      !hasCoordinates
      ||
      location.latitude === null
      ||
      location.longitude === null
      ||
      isOpeningDirections
    ) {
      return;
    }

    setIsOpeningDirections(
      true,
    );

    setErrorMessage('');

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setErrorMessage(
          'Location permission is required to get directions from your current location.',
        );

        return;
      }

      const currentPosition =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      const origin: Coordinate = {
        latitude:
          currentPosition.coords.latitude,

        longitude:
          currentPosition.coords.longitude,
      };

      const destination: Coordinate = {
        latitude:
          location.latitude,

        longitude:
          location.longitude,
      };

      setCurrentUserLocation(
        origin,
      );

      const directionsUrl =
        buildOpenStreetMapDirectionsUrl(
          origin,
          destination,
        );

      await Linking.openURL(
        directionsUrl,
      );
    } catch {
      setErrorMessage(
        'Unable to open directions. Check your internet connection and location settings.',
      );
    } finally {
      setIsOpeningDirections(
        false,
      );
    }
  }

  if (!hasCoordinates) {
    return (
      <View
        style={
          styles.unavailableCard
        }
      >
        <View
          style={
            styles.unavailableIcon
          }
        >
          <Ionicons
            name="location-outline"
            size={22}
            color={
              COLORS.textMuted
            }
          />
        </View>

        <View
          style={
            styles.unavailableContent
          }
        >
          <Text
            style={
              styles.unavailableTitle
            }
          >
            Map pin not available yet
          </Text>

          <Text
            style={
              styles.unavailableText
            }
          >
            {fullAddress}
          </Text>
        </View>
      </View>
    );
  }

  const latitude =
    location.latitude as number;

  const longitude =
    location.longitude as number;

  const shopCoordinate: Coordinate = {
    latitude,
    longitude,
  };

  return (
    <View
      style={
        styles.card
      }
    >
      <View
        style={
          styles.mapFrame
        }
      >
        <LeafletMap
          style={
            styles.map
          }
          center={
            shopCoordinate
          }
          zoom={17}
          markers={[
            {
              id:
                'customer-shop-location',

              coordinate:
                shopCoordinate,

              title:
                shopName,

              description:
                fullAddress,

              draggable:
                false,
            },
          ]}
          userLocation={
            currentUserLocation
          }
          onMapError={
            setErrorMessage
          }
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <View
          style={
            styles.addressRow
          }
        >
          <View
            style={
              styles.pinIcon
            }
          >
            <Ionicons
              name="location"
              size={18}
              color={
                COLORS.orange
              }
            />
          </View>

          <View
            style={
              styles.addressContent
            }
          >
            <Text
              style={
                styles.shopName
              }
              numberOfLines={1}
            >
              {shopName}
            </Text>

            <Text
              style={
                styles.address
              }
            >
              {fullAddress}
            </Text>
          </View>
        </View>

        {
          errorMessage
            ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={
                    COLORS.danger
                  }
                />

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              </View>
            )
            : null
        }

        <View
          style={
            styles.mapInfoBox
          }
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={
              COLORS.blue
            }
          />

          <Text
            style={
              styles.mapInfoText
            }
          >
            This shop location is displayed using OpenStreetMap.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={
            0.82
          }
          accessibilityRole="button"
          accessibilityLabel={
            `Get directions to ${shopName}`
          }
          disabled={
            isOpeningDirections
          }
          onPress={
            () =>
              void openDirections()
          }
          style={[
            styles.directionsButton,

            isOpeningDirections
              &&
              styles.disabledButton,
          ]}
        >
          {
            isOpeningDirections
              ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.white
                  }
                />
              )
              : (
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={
                    COLORS.white
                  }
                />
              )
          }

          <Text
            style={
              styles.directionsButtonText
            }
          >
            {
              isOpeningDirections
                ? 'Opening Directions...'
                : 'Get Directions'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      overflow: 'hidden',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 18,

      backgroundColor:
        COLORS.surface,
    },

    mapFrame: {
      height: 245,

      backgroundColor:
        COLORS.surfaceSoft,
    },

    map: {
      width: '100%',

      height: '100%',
    },

    content: {
      padding: 14,
    },

    addressRow: {
      flexDirection: 'row',

      alignItems: 'flex-start',
    },

    pinIcon: {
      width: 36,

      height: 36,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius: 11,

      backgroundColor:
        COLORS.orangeSoft,
    },

    addressContent: {
      flex: 1,

      minWidth: 0,

      marginLeft: 10,
    },

    shopName: {
      color:
        COLORS.navy,

      fontSize: 11,

      lineHeight: 15,

      fontWeight: '800',
    },

    address: {
      marginTop: 4,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
    },

    mapInfoBox: {
      marginTop: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      paddingHorizontal: 10,

      paddingVertical: 9,

      borderRadius: 11,

      backgroundColor:
        COLORS.blueSoft,
    },

    mapInfoText: {
      flex: 1,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
    },

    directionsButton: {
      minHeight: 48,

      marginTop: 14,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 8,

      borderRadius: 14,

      backgroundColor:
        COLORS.navy,
    },

    directionsButtonText: {
      color:
        COLORS.white,

      fontSize: 10,

      fontWeight: '800',
    },

    disabledButton: {
      opacity: 0.6,
    },

    errorBox: {
      marginTop: 12,

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 7,

      padding: 10,

      borderRadius: 11,

      backgroundColor:
        COLORS.dangerSoft,
    },

    errorText: {
      flex: 1,

      color:
        COLORS.danger,

      fontSize: 9,

      lineHeight: 14,
    },

    unavailableCard: {
      flexDirection: 'row',

      alignItems: 'center',

      padding: 15,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 17,

      backgroundColor:
        COLORS.surface,
    },

    unavailableIcon: {
      width: 42,

      height: 42,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius: 12,

      backgroundColor:
        COLORS.accentSoft,
    },

    unavailableContent: {
      flex: 1,

      marginLeft: 11,
    },

    unavailableTitle: {
      color:
        COLORS.navy,

      fontSize: 10,

      fontWeight: '800',
    },

    unavailableText: {
      marginTop: 4,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
    },
  });