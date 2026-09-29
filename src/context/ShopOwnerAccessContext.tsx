import { usePathname } from 'expo-router';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import { getShopOwnerAccess } from '@/src/services/shop-owner-access-api';
import type { ShopOwnerAccessShop } from '@/src/types/shop-owner-access';

interface ShopOwnerAccessContextValue {
  shop: ShopOwnerAccessShop | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string;
  refreshAccess: () => Promise<void>;
}

const ShopOwnerAccessContext =
  createContext<ShopOwnerAccessContextValue | null>(
    null,
  );

interface ShopOwnerAccessProviderProps {
  children: ReactNode;
}

export function ShopOwnerAccessProvider({
  children,
}: ShopOwnerAccessProviderProps) {
  const {
    token,
  } = useAuth();

  const pathname =
    usePathname();

  const [
    shop,
    setShop,
  ] =
    useState<ShopOwnerAccessShop | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const lastPathname =
    useRef(
      pathname,
    );

  const loadAccess =
    useCallback(
      async (
        refreshing: boolean,
      ): Promise<void> => {
        if (!token) {
          setShop(
            null,
          );

          setErrorMessage('');
          setIsLoading(false);
          setIsRefreshing(false);

          return;
        }

        if (refreshing) {
          setIsRefreshing(
            true,
          );
        } else {
          setIsLoading(
            true,
          );
        }

        setErrorMessage('');

        try {
          const response =
            await getShopOwnerAccess(
              token,
            );

          if (
            response.data.user.role !==
            'shop_owner'
          ) {
            throw new ApiError(
              'This account is not authorized as a Shop Owner.',
              403,
            );
          }

          setShop(
            response.data.shop,
          );
        } catch (error) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'Unable to verify the current shop status.',
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        token,
      ],
    );

  const refreshAccess =
    useCallback(
      async (): Promise<void> => {
        await loadAccess(
          true,
        );
      },
      [
        loadAccess,
      ],
    );

  useEffect(
    () => {
      void loadAccess(
        false,
      );
    },
    [
      loadAccess,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Recheck When Navigating Between Shop Owner Screens
  |--------------------------------------------------------------------------
  |
  | If an Administrator suspends the shop while the owner is already signed
  | in, the next Shop Owner navigation rechecks /auth/me before they continue.
  |
  */

  useEffect(
    () => {
      if (
        lastPathname.current ===
        pathname
      ) {
        return;
      }

      lastPathname.current =
        pathname;

      void refreshAccess();
    },
    [
      pathname,
      refreshAccess,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Recheck When App Returns To Foreground
  |--------------------------------------------------------------------------
  |
  | This covers the common flow where an Administrator changes the shop state
  | while the Shop Owner has Expo Go/the app in the background.
  |
  */

  useEffect(
    () => {
      const subscription =
        AppState.addEventListener(
          'change',
          (nextState) => {
            if (
              nextState ===
              'active'
            ) {
              void refreshAccess();
            }
          },
        );

      return () => {
        subscription.remove();
      };
    },
    [
      refreshAccess,
    ],
  );

  return (
    <ShopOwnerAccessContext.Provider
      value={{
        shop,
        isLoading,
        isRefreshing,
        errorMessage,
        refreshAccess,
      }}
    >
      {children}
    </ShopOwnerAccessContext.Provider>
  );
}

export function useShopOwnerAccess(): ShopOwnerAccessContextValue {
  const context =
    useContext(
      ShopOwnerAccessContext,
    );

  if (!context) {
    throw new Error(
      'useShopOwnerAccess must be used inside ShopOwnerAccessProvider.',
    );
  }

  return context;
}