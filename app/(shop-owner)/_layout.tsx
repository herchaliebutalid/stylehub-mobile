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

export default function ShopOwnerLayout() {
  const {
    user,
    isBootstrapping,
  } =
    useAuth();

  /*
  |--------------------------------------------------------------------------
  | Session Bootstrap
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
  | Phone Verification
  |--------------------------------------------------------------------------
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
  | Correct Role
  |--------------------------------------------------------------------------
  */

  if (
    user.role !==
    'shop_owner'
  ) {
    return (
      <Redirect
        href="/(customer)/customer"
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Authorized Shop Owner
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