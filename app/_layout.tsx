
import { Stack } from 'expo-router';

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

/*
|--------------------------------------------------------------------------
| StyleHub Root Layout
|--------------------------------------------------------------------------
|
| Each screen controls its own Android status bar.
|
| Customer and Shop Owner dashboards:
| - Dark navy status bar background
| - White Android status icons
|
| Other screens:
| - Light background
| - Dark Android status icons
|
| Do not place a global StatusBar with style="dark" here.
|
*/

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <InAppNotificationProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: {
                backgroundColor: '#F3F5F7',
              },
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
        </InAppNotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
