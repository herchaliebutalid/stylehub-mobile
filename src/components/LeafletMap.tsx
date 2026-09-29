import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import type {
  LayerGroup,
  Map as LeafletMapInstance,
} from 'leaflet';


/* ==========================================================================
   TYPES
   ========================================================================== */

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

type LeafletModule =
  typeof import('leaflet');


/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const DEFAULT_CENTER: LeafletCoordinate = {
  latitude: 12.8797,
  longitude: 121.774,
};

const LEAFLET_CSS_ID =
  'stylehub-leaflet-css';

const LEAFLET_CSS_URL =
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';


/* ==========================================================================
   HELPERS
   ========================================================================== */

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


function ensureLeafletCss():
  Promise<void> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      if (
        typeof document
        ===
        'undefined'
      ) {
        resolve();

        return;
      }

      const existing =
        document.getElementById(
          LEAFLET_CSS_ID,
        );

      if (existing) {
        resolve();

        return;
      }

      const link =
        document.createElement(
          'link',
        );

      link.id =
        LEAFLET_CSS_ID;

      link.rel =
        'stylesheet';

      link.href =
        LEAFLET_CSS_URL;

      link.crossOrigin =
        'anonymous';

      link.onload =
        () => {
          resolve();
        };

      link.onerror =
        () => {
          reject(
            new Error(
              'Unable to load Leaflet CSS.',
            ),
          );
        };

      document.head.appendChild(
        link,
      );
    },
  );
}


function createShopIcon(
  L: LeafletModule,
) {
  return L.divIcon({
    className:
      'stylehub-leaflet-shop-marker',

    html: `
      <div
        style="
          position: relative;
          width: 30px;
          height: 30px;
          background: #f97316;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 9px rgba(15, 23, 42, 0.35);
        "
      >
        <div
          style="
            position: absolute;
            left: 50%;
            top: 50%;
            width: 8px;
            height: 8px;
            background: #ffffff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          "
        ></div>
      </div>
    `,

    iconSize: [
      36,
      44,
    ],

    iconAnchor: [
      18,
      41,
    ],

    popupAnchor: [
      0,
      -38,
    ],
  });
}


function createUserIcon(
  L: LeafletModule,
) {
  return L.divIcon({
    className:
      'stylehub-leaflet-user-marker',

    html: `
      <div
        style="
          width: 18px;
          height: 18px;
          background: #2563eb;
          border: 4px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 7px rgba(37, 99, 235, 0.4);
        "
      ></div>
    `,

    iconSize: [
      26,
      26,
    ],

    iconAnchor: [
      13,
      13,
    ],

    popupAnchor: [
      0,
      -12,
    ],
  });
}


function buildPopupContent(
  title?: string,
  description?: string,
): HTMLElement {
  const container =
    document.createElement(
      'div',
    );

  if (title) {
    const titleElement =
      document.createElement(
        'div',
      );

    titleElement.textContent =
      title;

    titleElement.style.color =
      '#0f172a';

    titleElement.style.fontSize =
      '14px';

    titleElement.style.fontWeight =
      '700';

    container.appendChild(
      titleElement,
    );
  }

  if (description) {
    const descriptionElement =
      document.createElement(
        'div',
      );

    descriptionElement.textContent =
      description;

    descriptionElement.style.marginTop =
      '4px';

    descriptionElement.style.color =
      '#64748b';

    descriptionElement.style.fontSize =
      '12px';

    descriptionElement.style.lineHeight =
      '17px';

    container.appendChild(
      descriptionElement,
    );
  }

  return container;
}


/* ==========================================================================
   COMPONENT
   ========================================================================== */

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
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const leafletRef =
    useRef<LeafletModule | null>(
      null,
    );

  const mapRef =
    useRef<LeafletMapInstance | null>(
      null,
    );

  const markerLayerRef =
    useRef<LayerGroup | null>(
      null,
    );

  const errorCallbackRef =
    useRef(
      onMapError,
    );

  const initialCenterRef =
    useRef(
      center,
    );

  const initialZoomRef =
    useRef(
      zoom,
    );

  const [
    isReady,
    setIsReady,
  ] = useState(
    false,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true,
  );


  /* ==========================================================================
     KEEP ERROR CALLBACK UPDATED
     ========================================================================== */

  useEffect(
    () => {
      errorCallbackRef.current =
        onMapError;
    },
    [
      onMapError,
    ],
  );


  /* ==========================================================================
     INITIALIZE MAP IN BROWSER ONLY
     ========================================================================== */

  useEffect(
    () => {
      let cancelled =
        false;

      async function initializeMap():
        Promise<void> {
        if (
          typeof window
          ===
          'undefined'
          ||
          typeof document
          ===
          'undefined'
          ||
          !containerRef.current
        ) {
          return;
        }

        setIsLoading(
          true,
        );

        try {
          await ensureLeafletCss();

          const importedLeaflet:
            LeafletModule =
              await import(
                'leaflet'
              );

          const L =
            importedLeaflet;

          if (
            cancelled
            ||
            !containerRef.current
          ) {
            return;
          }

          leafletRef.current =
            L;

          const initialCenter =
            isValidCoordinate(
              initialCenterRef.current,
            )
              ? initialCenterRef.current
              : DEFAULT_CENTER;

          const map =
            L.map(
              containerRef.current,
              {
                zoomControl:
                  true,

                attributionControl:
                  true,

                preferCanvas:
                  true,
              },
            );

          map.setView(
            [
              initialCenter.latitude,
              initialCenter.longitude,
            ],
            initialZoomRef.current,
          );

          L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
              minZoom:
                2,

              maxZoom:
                19,

              attribution:
                '&copy; OpenStreetMap contributors',
            },
          ).addTo(
            map,
          );

          const markerLayer =
            L.layerGroup().addTo(
              map,
            );

          mapRef.current =
            map;

          markerLayerRef.current =
            markerLayer;

          map.on(
            'tileerror',
            () => {
              errorCallbackRef
                .current?.(
                  'Some OpenStreetMap tiles could not be loaded. Check your internet connection.',
                );
            },
          );

          window.requestAnimationFrame(
            () => {
              map.invalidateSize();
            },
          );

          window.setTimeout(
            () => {
              map.invalidateSize();
            },
            100,
          );

          window.setTimeout(
            () => {
              map.invalidateSize();
            },
            500,
          );

          if (
            !cancelled
          ) {
            setIsReady(
              true,
            );
          }
        } catch (
          error
        ) {
          console.error(
            'StyleHub Leaflet initialization error:',
            error,
          );

          if (
            !cancelled
          ) {
            errorCallbackRef
              .current?.(
                'Unable to initialize OpenStreetMap. Check your internet connection and try again.',
              );
          }
        } finally {
          if (
            !cancelled
          ) {
            setIsLoading(
              false,
            );
          }
        }
      }

      void initializeMap();

      return () => {
        cancelled =
          true;

        if (
          mapRef.current
        ) {
          mapRef.current.remove();

          mapRef.current =
            null;
        }

        markerLayerRef.current =
          null;

        leafletRef.current =
          null;
      };
    },
    [],
  );


  /* ==========================================================================
     UPDATE CENTER AND ZOOM
     ========================================================================== */

  useEffect(
    () => {
      const map =
        mapRef.current;

      if (
        !isReady
        ||
        !map
        ||
        !isValidCoordinate(
          center,
        )
      ) {
        return;
      }

      map.setView(
        [
          center.latitude,
          center.longitude,
        ],
        zoom,
      );

      window.setTimeout(
        () => {
          map.invalidateSize();
        },
        50,
      );
    },
    [
      center,
      isReady,
      zoom,
    ],
  );


  /* ==========================================================================
     MAP CLICK
     ========================================================================== */

  useEffect(
    () => {
      const map =
        mapRef.current;

      if (
        !isReady
        ||
        !map
        ||
        !onMapPress
      ) {
        return;
      }

      const handleMapClick =
        (
          event: {
            latlng: {
              lat: number;
              lng: number;
            };
          },
        ) => {
          onMapPress({
            latitude:
              event.latlng.lat,

            longitude:
              event.latlng.lng,
          });
        };

      map.on(
        'click',
        handleMapClick,
      );

      return () => {
        map.off(
          'click',
          handleMapClick,
        );
      };
    },
    [
      isReady,
      onMapPress,
    ],
  );


  /* ==========================================================================
     MARKERS
     ========================================================================== */

  useEffect(
    () => {
      const L =
        leafletRef.current;

      const markerLayer =
        markerLayerRef.current;

      if (
        !isReady
        ||
        !L
        ||
        !markerLayer
      ) {
        return;
      }

      markerLayer.clearLayers();

      const shopIcon =
        createShopIcon(
          L,
        );

      for (
        const markerData
        of markers
      ) {
        if (
          !isValidCoordinate(
            markerData.coordinate,
          )
        ) {
          continue;
        }

        const marker =
          L.marker(
            [
              markerData
                .coordinate
                .latitude,

              markerData
                .coordinate
                .longitude,
            ],
            {
              icon:
                shopIcon,

              draggable:
                Boolean(
                  markerData.draggable,
                ),

              autoPan:
                true,
            },
          );

        if (
          markerData.title
          ||
          markerData.description
        ) {
          marker.bindPopup(
            buildPopupContent(
              markerData.title,
              markerData.description,
            ),
          );
        }

        marker.on(
          'click',
          () => {
            onMarkerPress?.(
              markerData.id,
            );
          },
        );

        if (
          markerData.draggable
        ) {
          marker.on(
            'dragend',
            () => {
              const position =
                marker.getLatLng();

              onMarkerDragEnd?.(
                markerData.id,
                {
                  latitude:
                    position.lat,

                  longitude:
                    position.lng,
                },
              );
            },
          );
        }

        marker.addTo(
          markerLayer,
        );
      }

      if (
        userLocation
        &&
        isValidCoordinate(
          userLocation,
        )
      ) {
        const userMarker =
          L.marker(
            [
              userLocation.latitude,
              userLocation.longitude,
            ],
            {
              icon:
                createUserIcon(
                  L,
                ),

              interactive:
                true,

              keyboard:
                false,
            },
          );

        userMarker.bindPopup(
          'Your current location',
        );

        userMarker.addTo(
          markerLayer,
        );
      }
    },
    [
      isReady,
      markers,
      onMarkerDragEnd,
      onMarkerPress,
      userLocation,
    ],
  );


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <View
      style={[
        styles.container,
        style,
      ]}
    >
      <div
        ref={
          containerRef
        }
        style={{
          width:
            '100%',

          height:
            '100%',

          minHeight:
            '100%',
        }}
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


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    container: {
      position:
        'relative',

      overflow:
        'hidden',

      backgroundColor:
        '#eef2f6',
    },

    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#eef2f6',
    },
  });