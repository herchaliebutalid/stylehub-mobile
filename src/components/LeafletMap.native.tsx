import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  WebView,
  WebViewMessageEvent,
} from 'react-native-webview';

export type LeafletCoordinate = {
  latitude: number;
  longitude: number;
};

export type LeafletMapMarker = {
  id: string;
  coordinate: LeafletCoordinate;
  title?: string;
  description?: string;
  draggable?: boolean;
};

type LeafletMapProps = {
  center: LeafletCoordinate;
  zoom?: number;
  markers?: LeafletMapMarker[];
  userLocation?: LeafletCoordinate | null;
  onMapPress?: (
    coordinate: LeafletCoordinate,
  ) => void;
  onMarkerPress?: (
    markerId: string,
  ) => void;
  onMarkerDragEnd?: (
    markerId: string,
    coordinate: LeafletCoordinate,
  ) => void;
  onMapError?: (
    message: string,
  ) => void;
  style?: StyleProp<ViewStyle>;
};

type LeafletMessage =
  | {
      type: 'mapPress';
      coordinate: LeafletCoordinate;
    }
  | {
      type: 'markerPress';
      markerId: string;
    }
  | {
      type: 'markerDragEnd';
      markerId: string;
      coordinate: LeafletCoordinate;
    };

function isValidCoordinate(
  coordinate: LeafletCoordinate,
): boolean {
  return (
    Number.isFinite(
      coordinate.latitude,
    )
    &&
    Number.isFinite(
      coordinate.longitude,
    )
    &&
    coordinate.latitude >= -90
    &&
    coordinate.latitude <= 90
    &&
    coordinate.longitude >= -180
    &&
    coordinate.longitude <= 180
  );
}

function safeJson(
  value: unknown,
): string {
  return JSON.stringify(
    value,
  )
    .replace(
      /</g,
      '\\u003c',
    )
    .replace(
      />/g,
      '\\u003e',
    )
    .replace(
      /&/g,
      '\\u0026',
    );
}

function buildMapHtml({
  center,
  zoom,
  markers,
  userLocation,
  allowMapPress,
}: {
  center: LeafletCoordinate;
  zoom: number;
  markers: LeafletMapMarker[];
  userLocation: LeafletCoordinate | null;
  allowMapPress: boolean;
}): string {
  const centerJson =
    safeJson(
      center,
    );

  const markersJson =
    safeJson(
      markers,
    );

  const userLocationJson =
    safeJson(
      userLocation,
    );

  const allowMapPressJson =
    safeJson(
      allowMapPress,
    );

  return `
<!DOCTYPE html>

<html>
<head>

<meta charset="utf-8" />

<meta
  name="viewport"
  content="
    width=device-width,
    initial-scale=1.0,
    maximum-scale=1.0,
    user-scalable=no
  "
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
/>

<style>

html,
body,
#map {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

html,
body {
  overflow: hidden;
}

body {
  background: #eef2f6;

  user-select: none;
  -webkit-user-select: none;

  -webkit-touch-callout: none;
}

#map {
  z-index: 1;
}

/*
|--------------------------------------------------------------------------
| StyleHub shop pin
|--------------------------------------------------------------------------
*/

.stylehub-marker {
  background: transparent;
  border: none;
}

.stylehub-pin {
  position: relative;

  width: 30px;
  height: 30px;

  background: #f97316;

  border: 3px solid #ffffff;

  border-radius:
    50%
    50%
    50%
    0;

  transform:
    rotate(-45deg);

  box-shadow:
    0 3px 9px
    rgba(
      15,
      23,
      42,
      0.35
    );
}

.stylehub-pin::after {
  content: '';

  position: absolute;

  left: 50%;
  top: 50%;

  width: 8px;
  height: 8px;

  background: #ffffff;

  border-radius: 50%;

  transform:
    translate(
      -50%,
      -50%
    );
}

/*
|--------------------------------------------------------------------------
| User current location
|--------------------------------------------------------------------------
*/

.stylehub-user-location {
  width: 18px;
  height: 18px;

  background: #2563eb;

  border: 4px solid #ffffff;

  border-radius: 50%;

  box-shadow:
    0 2px 7px
    rgba(
      37,
      99,
      235,
      0.4
    );
}

/*
|--------------------------------------------------------------------------
| Leaflet popup
|--------------------------------------------------------------------------
*/

.leaflet-popup-content-wrapper {
  border-radius: 12px;
}

.leaflet-popup-content {
  margin:
    11px
    13px;
}

.popup-title {
  margin-bottom: 4px;

  color: #0f172a;

  font-family:
    Arial,
    sans-serif;

  font-size: 14px;

  font-weight: 700;
}

.popup-description {
  color: #64748b;

  font-family:
    Arial,
    sans-serif;

  font-size: 12px;

  line-height: 17px;
}

.user-popup {
  color: #0f172a;

  font-family:
    Arial,
    sans-serif;

  font-size: 12px;

  font-weight: 700;
}

/*
|--------------------------------------------------------------------------
| Attribution
|--------------------------------------------------------------------------
*/

.leaflet-control-attribution {
  background:
    rgba(
      255,
      255,
      255,
      0.88
    ) !important;

  color: #475569;

  font-size: 9px;
}

.leaflet-control-attribution a {
  color: #2563eb;
}

/*
|--------------------------------------------------------------------------
| Zoom controls
|--------------------------------------------------------------------------
*/

.leaflet-control-zoom a {
  color: #0f172a !important;
}

</style>

</head>

<body>

<div id="map"></div>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
  crossorigin=""
></script>

<script>

(function () {

  const center =
    ${centerJson};

  const zoom =
    ${zoom};

  const markers =
    ${markersJson};

  const userLocation =
    ${userLocationJson};

  const allowMapPress =
    ${allowMapPressJson};


  function sendToReactNative(
    message
  ) {
    if (
      window.ReactNativeWebView
      &&
      typeof
        window
          .ReactNativeWebView
          .postMessage
        ===
        'function'
    ) {
      window
        .ReactNativeWebView
        .postMessage(
          JSON.stringify(
            message
          )
        );
    }
  }


  function createPopupContent(
    markerData
  ) {
    if (
      !markerData.title
      &&
      !markerData.description
    ) {
      return null;
    }


    const container =
      document.createElement(
        'div'
      );


    if (
      markerData.title
    ) {
      const title =
        document.createElement(
          'div'
        );

      title.className =
        'popup-title';

      title.textContent =
        markerData.title;

      container.appendChild(
        title
      );
    }


    if (
      markerData.description
    ) {
      const description =
        document.createElement(
          'div'
        );

      description.className =
        'popup-description';

      description.textContent =
        markerData.description;

      container.appendChild(
        description
      );
    }


    return container;
  }


  const map =
    L.map(
      'map',
      {
        zoomControl:
          true,

        attributionControl:
          false,

        preferCanvas:
          true,
      }
    );


  map.setView(
    [
      center.latitude,
      center.longitude
    ],
    zoom
  );


  L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      minZoom: 2,

      maxZoom: 19,

      attribution:
        '&copy; OpenStreetMap contributors',
    }
  )
    .addTo(
      map
    );


  L.control
    .attribution({
      position:
        'bottomright',

      prefix:
        false,
    })
    .addAttribution(
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    )
    .addTo(
      map
    );


  const shopIcon =
    L.divIcon({
      className:
        'stylehub-marker',

      html:
        '<div class="stylehub-pin"></div>',

      iconSize:
        [
          36,
          44
        ],

      iconAnchor:
        [
          18,
          41
        ],

      popupAnchor:
        [
          0,
          -38
        ],
    });


  const userIcon =
    L.divIcon({
      className:
        'stylehub-marker',

      html:
        '<div class="stylehub-user-location"></div>',

      iconSize:
        [
          26,
          26
        ],

      iconAnchor:
        [
          13,
          13
        ],

      popupAnchor:
        [
          0,
          -12
        ],
    });


  markers.forEach(
    function (
      markerData
    ) {
      const coordinate =
        markerData.coordinate;


      if (
        !coordinate
        ||
        typeof coordinate.latitude
          !==
          'number'
        ||
        typeof coordinate.longitude
          !==
          'number'
      ) {
        return;
      }


      const marker =
        L.marker(
          [
            coordinate.latitude,
            coordinate.longitude
          ],
          {
            icon:
              shopIcon,

            draggable:
              Boolean(
                markerData.draggable
              ),

            autoPan:
              true,
          }
        )
          .addTo(
            map
          );


      const popupContent =
        createPopupContent(
          markerData
        );


      if (
        popupContent
      ) {
        marker.bindPopup(
          popupContent
        );
      }


      marker.on(
        'click',
        function () {
          sendToReactNative({
            type:
              'markerPress',

            markerId:
              markerData.id,
          });
        }
      );


      if (
        markerData.draggable
      ) {
        marker.on(
          'dragend',
          function (
            event
          ) {
            const latLng =
              event
                .target
                .getLatLng();


            sendToReactNative({
              type:
                'markerDragEnd',

              markerId:
                markerData.id,

              coordinate: {
                latitude:
                  latLng.lat,

                longitude:
                  latLng.lng,
              },
            });
          }
        );
      }
    }
  );


  if (
    userLocation
    &&
    typeof userLocation.latitude
      ===
      'number'
    &&
    typeof userLocation.longitude
      ===
      'number'
  ) {
    const currentLocationMarker =
      L.marker(
        [
          userLocation.latitude,
          userLocation.longitude
        ],
        {
          icon:
            userIcon,

          interactive:
            true,

          keyboard:
            false,
        }
      )
        .addTo(
          map
        );


    const popup =
      document.createElement(
        'div'
      );

    popup.className =
      'user-popup';

    popup.textContent =
      'Your current location';


    currentLocationMarker.bindPopup(
      popup
    );
  }


  if (
    allowMapPress
  ) {
    map.on(
      'click',
      function (
        event
      ) {
        sendToReactNative({
          type:
            'mapPress',

          coordinate: {
            latitude:
              event.latlng.lat,

            longitude:
              event.latlng.lng,
          },
        });
      }
    );
  }


  map.on(
    'tileerror',
    function () {
      sendToReactNative({
        type:
          'mapError',

        message:
          'Some OpenStreetMap tiles could not be loaded. Check your internet connection.',
      });
    }
  );


  setTimeout(
    function () {
      map.invalidateSize();
    },
    100
  );


  setTimeout(
    function () {
      map.invalidateSize();
    },
    500
  );

})();

</script>

</body>

</html>
`;
}

function isCoordinateMessage(
  value: unknown,
): value is LeafletCoordinate {
  if (
    typeof value !== 'object'
    ||
    value === null
  ) {
    return false;
  }

  const coordinate =
    value as
      Partial<LeafletCoordinate>;

  if (
    typeof coordinate.latitude
      !==
      'number'
    ||
    typeof coordinate.longitude
      !==
      'number'
  ) {
    return false;
  }

  return isValidCoordinate({
    latitude:
      coordinate.latitude,

    longitude:
      coordinate.longitude,
  });
}

export default function LeafletMap({
  center,
  zoom = 15,
  markers = [],
  userLocation = null,
  onMapPress,
  onMarkerPress,
  onMarkerDragEnd,
  onMapError,
  style,
}: LeafletMapProps) {
  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );

  const validCenter =
    useMemo<LeafletCoordinate>(
      () => {
        if (
          isValidCoordinate(
            center,
          )
        ) {
          return center;
        }

        return {
          latitude: 12.8797,
          longitude: 121.774,
        };
      },
      [
        center,
      ],
    );

  const validMarkers =
    useMemo(
      () =>
        markers.filter(
          (
            marker,
          ) =>
            isValidCoordinate(
              marker.coordinate,
            ),
        ),
      [
        markers,
      ],
    );

  const validUserLocation =
    useMemo(
      () => {
        if (
          userLocation
          &&
          isValidCoordinate(
            userLocation,
          )
        ) {
          return userLocation;
        }

        return null;
      },
      [
        userLocation,
      ],
    );

  const html =
    useMemo(
      () =>
        buildMapHtml({
          center:
            validCenter,

          zoom,

          markers:
            validMarkers,

          userLocation:
            validUserLocation,

          allowMapPress:
            Boolean(
              onMapPress,
            ),
        }),
      [
        onMapPress,
        validCenter,
        validMarkers,
        validUserLocation,
        zoom,
      ],
    );

  function handleMessage(
    event: WebViewMessageEvent,
  ): void {
    try {
      const parsed =
        JSON.parse(
          event.nativeEvent.data,
        ) as
          LeafletMessage
          | {
              type: 'mapError';
              message?: string;
            };

      if (
        parsed.type
          ===
          'mapPress'
        &&
        isCoordinateMessage(
          parsed.coordinate,
        )
      ) {
        onMapPress?.(
          parsed.coordinate,
        );

        return;
      }

      if (
        parsed.type
          ===
          'markerPress'
        &&
        typeof parsed.markerId
          ===
          'string'
      ) {
        onMarkerPress?.(
          parsed.markerId,
        );

        return;
      }

      if (
        parsed.type
          ===
          'markerDragEnd'
        &&
        typeof parsed.markerId
          ===
          'string'
        &&
        isCoordinateMessage(
          parsed.coordinate,
        )
      ) {
        onMarkerDragEnd?.(
          parsed.markerId,
          parsed.coordinate,
        );

        return;
      }

      if (
        parsed.type
          ===
          'mapError'
      ) {
        onMapError?.(
          typeof parsed.message
            ===
            'string'
            &&
            parsed.message.trim() !== ''
              ? parsed.message
              : 'Unable to load OpenStreetMap.',
        );
      }
    } catch {
      onMapError?.(
        'The map returned an unreadable response.',
      );
    }
  }

  return (
    <View
      style={[
        styles.container,
        style,
      ]}
    >
      <WebView
        style={
          styles.webView
        }
        source={{
          html,
        }}
        originWhitelist={[
          '*',
        ]}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        mixedContentMode="compatibility"
        setSupportMultipleWindows={
          false
        }
        allowsInlineMediaPlayback
        scrollEnabled={false}
        overScrollMode="never"
        onMessage={
          handleMessage
        }
        onLoadStart={
          () => {
            setIsLoading(
              true,
            );
          }
        }
        onLoadEnd={
          () => {
            setIsLoading(
              false,
            );
          }
        }
        onError={
          () => {
            setIsLoading(
              false,
            );

            onMapError?.(
              'Unable to load the map. Check your internet connection.',
            );
          }
        }
        onHttpError={
          () => {
            setIsLoading(
              false,
            );

            onMapError?.(
              'OpenStreetMap could not be loaded right now.',
            );
          }
        }
      />

      {
        isLoading
          ? (
            <View
              pointerEvents="none"
              style={
                styles.loadingOverlay
              }
            >
              <ActivityIndicator
                size="small"
              />
            </View>
          )
          : null
      }
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position: 'relative',

      overflow: 'hidden',

      backgroundColor:
        '#eef2f6',
    },

    webView: {
      flex: 1,

      backgroundColor:
        '#eef2f6',
    },

    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,

      alignItems: 'center',

      justifyContent:
        'center',

      backgroundColor:
        '#eef2f6',
    },
  });