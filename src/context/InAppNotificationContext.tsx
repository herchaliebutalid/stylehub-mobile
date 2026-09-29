import {
    AppState,
} from 'react-native';

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    useAuth,
} from '@/src/context/AuthContext';

import {
    getInAppNotificationUnreadCount,
} from '@/src/services/in-app-notification-api';


/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const BADGE_REFRESH_INTERVAL_MS =
  30_000;


/* ==========================================================================
   CONTEXT
   ========================================================================== */

interface InAppNotificationContextValue {
  unreadCount:
    number;

  refreshUnreadCount:
    () => Promise<void>;

  syncUnreadCount: (
    count: number,
  ) => void;

  acknowledgeOneRead:
    () => void;

  acknowledgeAllRead:
    () => void;
}

const InAppNotificationContext =
  createContext<InAppNotificationContextValue | null>(
    null,
  );

interface InAppNotificationProviderProps {
  children:
    ReactNode;
}


/* ==========================================================================
   HELPERS
   ========================================================================== */

function normalizeUnreadCount(
  count: number,
): number {
  if (
    !Number.isFinite(
      count,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      count,
    ),
  );
}


/* ==========================================================================
   PROVIDER
   ========================================================================== */

export function InAppNotificationProvider({
  children,
}: InAppNotificationProviderProps) {
  const {
    token,
    user,
    isBootstrapping,
  } = useAuth();

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(
    0,
  );

  const requestSequence =
    useRef(
      0,
    );

  const canUseNotifications =
    !isBootstrapping
    &&
    token !== null
    &&
    user !== null
    &&
    user.status === 'active'
    &&
    user.phone_verified === true
    &&
    (
      user.role === 'customer'
      ||
      user.role === 'shop_owner'
    );


  /* ==========================================================================
     SYNC HELPERS
     ========================================================================== */

  const syncUnreadCount =
    useCallback(
      (
        count: number,
      ): void => {
        setUnreadCount(
          normalizeUnreadCount(
            count,
          ),
        );
      },
      [],
    );

  const acknowledgeOneRead =
    useCallback(
      (): void => {
        setUnreadCount(
          (
            current,
          ) =>
            Math.max(
              0,
              current - 1,
            ),
        );
      },
      [],
    );

  const acknowledgeAllRead =
    useCallback(
      (): void => {
        setUnreadCount(
          0,
        );
      },
      [],
    );


  /* ==========================================================================
     SERVER REFRESH
     ========================================================================== */

  const refreshUnreadCount =
    useCallback(
      async (): Promise<void> => {
        const sequence =
          ++requestSequence.current;

        if (
          !canUseNotifications
          ||
          !token
        ) {
          if (
            sequence ===
            requestSequence.current
          ) {
            setUnreadCount(
              0,
            );
          }

          return;
        }

        try {
          const response =
            await getInAppNotificationUnreadCount(
              token,
            );

          if (
            sequence !==
            requestSequence.current
          ) {
            return;
          }

          setUnreadCount(
            normalizeUnreadCount(
              response
                .data
                .unread_count,
            ),
          );
        } catch {
          /*
          |--------------------------------------------------------------------
          | Badge Refresh Isolation
          |--------------------------------------------------------------------
          |
          | A temporary network problem must never block normal app use.
          | The notification center itself will show an actionable error if
          | the user opens it while offline.
          |
          */
        }
      },
      [
        canUseNotifications,
        token,
      ],
    );


  /* ==========================================================================
     SESSION + APP FOREGROUND REFRESH
     ========================================================================== */

  useEffect(
    () => {
      requestSequence.current +=
        1;

      if (
        !canUseNotifications
      ) {
        setUnreadCount(
          0,
        );

        return undefined;
      }

      void refreshUnreadCount();

      const appStateSubscription =
        AppState.addEventListener(
          'change',
          (
            nextState,
          ) => {
            if (
              nextState === 'active'
            ) {
              void refreshUnreadCount();
            }
          },
        );

      const interval =
        setInterval(
          () => {
            if (
              AppState.currentState === 'active'
            ) {
              void refreshUnreadCount();
            }
          },
          BADGE_REFRESH_INTERVAL_MS,
        );

      return () => {
        appStateSubscription.remove();

        clearInterval(
          interval,
        );

        requestSequence.current +=
          1;
      };
    },
    [
      canUseNotifications,
      refreshUnreadCount,
    ],
  );


  /* ==========================================================================
     CONTEXT VALUE
     ========================================================================== */

  const value =
    useMemo<InAppNotificationContextValue>(
      () => ({
        unreadCount,
        refreshUnreadCount,
        syncUnreadCount,
        acknowledgeOneRead,
        acknowledgeAllRead,
      }),
      [
        unreadCount,
        refreshUnreadCount,
        syncUnreadCount,
        acknowledgeOneRead,
        acknowledgeAllRead,
      ],
    );

  return (
    <InAppNotificationContext.Provider
      value={
        value
      }
    >
      {children}
    </InAppNotificationContext.Provider>
  );
}


/* ==========================================================================
   HOOK
   ========================================================================== */

export function useInAppNotifications(): InAppNotificationContextValue {
  const context =
    useContext(
      InAppNotificationContext,
    );

  if (!context) {
    throw new Error(
      'useInAppNotifications must be used inside InAppNotificationProvider.',
    );
  }

  return context;
}