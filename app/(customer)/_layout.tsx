import {
  Redirect,
  Stack,
} from 'expo-router';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  COLORS,
} from '@/src/constants/colors';

import {
  useAuth,
} from '@/src/context/AuthContext';

export default function CustomerLayout() {
  const {
    user,
    isBootstrapping,
  } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | Session Is Still Being Restored
  |--------------------------------------------------------------------------
  */

  if (
    isBootstrapping
  ) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />
      </View>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Guest
  |--------------------------------------------------------------------------
  */

  if (!user) {
    return (
      <Redirect
        href="/(auth)/role-selection"
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Phone Verification Gate
  |--------------------------------------------------------------------------
  |
  | This protects navigation UX.
  |
  | Laravel middleware independently protects the actual APIs.
  |
  */

  if (
    user.phone_verified !==
    true
  ) {
    return (
      <Redirect
        href="/phone-verification"
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Wrong Role
  |--------------------------------------------------------------------------
  */

  if (
    user.role !==
    'customer'
  ) {
    return (
      <Redirect
        href="/(shop-owner)/shop-owner"
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Authorized Customer
  |--------------------------------------------------------------------------
  */

  return (
    <Stack
      screenOptions={{
        headerShown:
          false,
      }}
    />
  );
}

const styles =
  StyleSheet.create({
    loading: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.background,
    },
  });