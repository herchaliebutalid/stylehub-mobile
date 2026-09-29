import {
    Redirect,
    Stack,
    usePathname,
} from 'expo-router';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import {
    ShopOwnerAccessProvider,
    useShopOwnerAccess,
} from '@/src/context/ShopOwnerAccessContext';

export default function ShopOwnerWorkspaceLayout() {
  return (
    <ShopOwnerAccessProvider>
      <ShopOwnerWorkspaceGate />
    </ShopOwnerAccessProvider>
  );
}

function ShopOwnerWorkspaceGate() {
  const pathname =
    usePathname();

  const {
    shop,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshAccess,
  } =
    useShopOwnerAccess();

  if (isLoading) {
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

        <Text
          style={
            styles.loadingText
          }
        >
          Checking shop status...
        </Text>
      </View>
    );
  }

  if (
    errorMessage
    &&
    !shop
  ) {
    return (
      <View
        style={
          styles.errorState
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Unable to verify shop status
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {errorMessage}
        </Text>

        <TouchableOpacity
          activeOpacity={0.82}
          disabled={
            isRefreshing
          }
          onPress={() =>
            void refreshAccess()
          }
          style={[
            styles.retryButton,
            isRefreshing
              &&
              styles.retryButtonDisabled,
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS.white
              }
            />
          ) : (
            <Text
              style={
                styles.retryText
              }
            >
              Try Again
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const suspended =
    shop?.approval_status ===
      'approved'
    &&
    shop.administrative_status ===
      'suspended';

  const onSuspendedRoute =
    pathname.endsWith(
      '/suspended',
    );

  if (
    suspended
    &&
    !onSuspendedRoute
  ) {
    return (
      <Redirect
        href="./suspended"
      />
    );
  }

  if (
    !suspended
    &&
    onSuspendedRoute
  ) {
    return (
      <Redirect
        href="./"
      />
    );
  }

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
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor:
        COLORS.background,
    },

    loadingText: {
      color:
        COLORS.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },

    errorState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      backgroundColor:
        COLORS.background,
    },

    errorTitle: {
      color:
        COLORS.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },

    errorMessage: {
      marginTop: 8,
      color:
        COLORS.textMuted,
      fontSize: 10,
      lineHeight: 16,
      textAlign: 'center',
    },

    retryButton: {
      minWidth: 150,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor:
        COLORS.primary,
    },

    retryButtonDisabled: {
      opacity: 0.55,
    },

    retryText: {
      color:
        COLORS.white,
      fontSize: 10,
      fontWeight: '700',
    },
  });