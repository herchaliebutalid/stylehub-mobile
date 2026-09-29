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

export default function AuthLayout() {
  const {
    user,
    isBootstrapping,
  } =
    useAuth();

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

  if (
    user?.role ===
    'customer'
  ) {
    return (
      <Redirect
        href="/(customer)/customer"
      />
    );
  }

  if (
    user?.role ===
    'shop_owner'
  ) {
    return (
      <Redirect
        href="/(shop-owner)/shop-owner"
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown:
          false,

        animation:
          'slide_from_right',
      }}
    />
  );
}

const styles =
  StyleSheet.create({
    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.background,
    },
  });