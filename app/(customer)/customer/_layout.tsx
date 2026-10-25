
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import {
  Platform,
  StyleSheet,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { COLORS } from '@/src/constants/colors';

/*
|--------------------------------------------------------------------------
| STYLEHUB CUSTOMER TAB LAYOUT
|--------------------------------------------------------------------------
|
| Improvements:
|
| 1. Removes excessive bottom white space.
| 2. Keeps tabs close to Android navigation buttons.
| 3. Respects Android gesture / three-button navigation.
| 4. Maintains comfortable touch targets.
| 5. Preserves all customer routes and tab icons.
|
*/

const THEME = {
  white: '#FFFFFF',
  border: '#E7EBF0',
  navy: '#08131F',
};

export default function CustomerTabLayout() {
  const insets = useSafeAreaInsets();

  /*
  |--------------------------------------------------------------------------
  | Bottom Safe Area
  |--------------------------------------------------------------------------
  |
  | Expo Router's bottom tabs need enough space for
  | Android navigation, but should not add excessive
  | additional padding on top of that inset.
  |
  */

  const bottomInset = Math.max(0, insets.bottom);

  /*
  |--------------------------------------------------------------------------
  | Tab Bar Dimensions
  |--------------------------------------------------------------------------
  |
  | 54px for icons and labels.
  | Android bottom inset is added once.
  |
  */

  const tabContentHeight = 54;

  const tabBarHeight = tabContentHeight + bottomInset;

  return (
    <Tabs
      screenOptions={{
        /*
        |----------------------------------------------------
        | Screen Options
        |----------------------------------------------------
        */

        headerShown: false,

        tabBarHideOnKeyboard: true,

        sceneStyle: {
          backgroundColor: COLORS.background,
        },

        /*
        |----------------------------------------------------
        | Colors
        |----------------------------------------------------
        */

        tabBarActiveTintColor: THEME.navy,
        tabBarInactiveTintColor: COLORS.textLight,

        /*
        |----------------------------------------------------
        | Bottom Tab Bar
        |----------------------------------------------------
        */

        tabBarStyle: {
          height: tabBarHeight,

          paddingTop: 5,

          /*
           * Only a very small amount of space is
           * added above the Android system area.
           */

          paddingBottom: bottomInset + 2,

          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: THEME.border,

          backgroundColor: THEME.white,

          /*
           * Light shadow to separate the tab bar
           * from the customer page content.
           */

          elevation: Platform.OS === 'android' ? 3 : 0,

          shadowColor: '#000000',

          shadowOffset: {
            width: 0,
            height: -2,
          },

          shadowOpacity: 0.04,
          shadowRadius: 6,
        },

        /*
        |----------------------------------------------------
        | Tab Button Touch Area
        |----------------------------------------------------
        */

        tabBarItemStyle: {
          minHeight: 44,
          paddingVertical: 0,
        },

        /*
        |----------------------------------------------------
        | Tab Labels
        |----------------------------------------------------
        */

        tabBarLabelStyle: {
          marginTop: 1,
          fontSize: 10,
          fontWeight: '700',
        },

        /*
        |----------------------------------------------------
        | Tab Icons
        |----------------------------------------------------
        */

        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      {/* ====================================================
          HOME
          ==================================================== */}

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ====================================================
          DISCOVER
          ==================================================== */}

      <Tabs.Screen
        name="shops"
        options={{
          title: 'Discover',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'storefront'
                  : 'storefront-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ====================================================
          NEARBY
          ==================================================== */}

      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'navigate'
                  : 'navigate-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ====================================================
          BOOKINGS
          ==================================================== */}

      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Bookings',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'calendar'
                  : 'calendar-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ====================================================
          PROFILE
          ==================================================== */}

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ====================================================
          HIDDEN NOTIFICATIONS PAGE
          ==================================================== */}

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
