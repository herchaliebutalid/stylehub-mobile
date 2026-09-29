import {
  Stack,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import 'react-native-reanimated';

import {
  AuthProvider,
} from '@/src/context/AuthContext';

import {
  InAppNotificationProvider,
} from '@/src/context/InAppNotificationContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <InAppNotificationProvider>
          <Stack
            screenOptions={{
              headerShown:
                false,

              animation:
                'fade',
            }}
          >
            <Stack.Screen
              name="index"
            />

            <Stack.Screen
              name="(auth)"
            />

            <Stack.Screen
              name="(customer)"
            />

            <Stack.Screen
              name="(shop-owner)"
            />
          </Stack>

          <StatusBar
            style="dark"
          />
        </InAppNotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}