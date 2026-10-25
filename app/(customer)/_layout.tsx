
import { Redirect, Stack } from 'expo-router';

import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/src/constants/colors';
import { useAuth } from '@/src/context/AuthContext';

export default function CustomerLayout() {
  const { user, isBootstrapping } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Session Is Still Being Restored
  |--------------------------------------------------------------------------
  */

  if (isBootstrapping) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom']}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </SafeAreaView>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Guest
  |--------------------------------------------------------------------------
  */

  if (!user) {
    return <Redirect href="/(auth)/role-selection" />;
  }

  /*
  |--------------------------------------------------------------------------
  | Phone Verification Gate
  |--------------------------------------------------------------------------
  |
  | Laravel middleware independently protects the APIs.
  |
  */

  if (user.phone_verified !== true) {
    return <Redirect href="/phone-verification" />;
  }

  /*
  |--------------------------------------------------------------------------
  | Wrong Role
  |--------------------------------------------------------------------------
  */

  if (user.role !== 'customer') {
    return (
      <Redirect href="/(shop-owner)/shop-owner" />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Authorized Customer
  |--------------------------------------------------------------------------
  */

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: COLORS.background,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
