
import { AppState } from 'react-native';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import { useAuth } from '@/src/context/AuthContext';

import {
  getInAppNotificationUnreadCount,
} from '@/src/services/in-app-notification-api';

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const BADGE_REFRESH_INTERVAL_MS = 30_000;

/*
|--------------------------------------------------------------------------
| Context Types
|--------------------------------------------------------------------------
*/

interface InAppNotificationContextValue {
  unreadCount: number;

  refreshUnreadCount: () => Promise<void>;

  syncUnreadCount: (count: number) => void;

  acknowledgeOneRead: () => void;

  acknowledgeAllRead: () => void;
}

interface InAppNotificationProviderProps {
  children: ReactNode;
}

const InAppNotificationContext =
  createContext<InAppNotificationContextValue | null>(
    null,
  );

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(0, Math.floor(count));
}

/*
|--------------------------------------------------------------------------
| Notification Provider
|--------------------------------------------------------------------------
*/

export function InAppNotificationProvider({
  children,
}: InAppNotificationProviderProps) {
  const {
    token,
    user,
    isBootstrapping,
  } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  /*
   * Each request receives a sequence number.
   *
   * Only the latest valid response may update the
   * notification badge.
   */
  const requestSequence = useRef(0);

  const canUseNotifications =
    !isBootstrapping &&
    token !== null &&
    user !== null &&
    user.status === 'active' &&
    user.phone_verified === true &&
    (
      user.role === 'customer' ||
      user.role === 'shop_owner'
    );

  /*
  |--------------------------------------------------------------------------
  | Synchronize Count From Notification List
  |--------------------------------------------------------------------------
  */

  const syncUnreadCount = useCallback(
    (count: number): void => {
      /*
       * Invalidate earlier unread-count requests.
       *
       * This prevents an old HTTP response from replacing
       * the newer count returned by the notification list.
       */
      requestSequence.current += 1;

      setUnreadCount(
        normalizeUnreadCount(count),
      );
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | One Notification Marked as Read
  |--------------------------------------------------------------------------
  */

  const acknowledgeOneRead = useCallback(
    (): void => {
      /*
       * Stop any older pending request from restoring
       * the notification count after a successful read.
       */
      requestSequence.current += 1;

      setUnreadCount((current) =>
        Math.max(0, current - 1),
      );
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | All Notifications Marked as Read
  |--------------------------------------------------------------------------
  */

  const acknowledgeAllRead = useCallback(
    (): void => {
      /*
       * Prevent a delayed polling response from
       * restoring an outdated unread badge.
       */
      requestSequence.current += 1;

      setUnreadCount(0);
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | Fetch Latest Unread Count
  |--------------------------------------------------------------------------
  */

  const refreshUnreadCount = useCallback(
    async (): Promise<void> => {
      const sequence = ++requestSequence.current;

      if (!canUseNotifications || !token) {
        if (sequence === requestSequence.current) {
          setUnreadCount(0);
        }

        return;
      }

      try {
        const response =
          await getInAppNotificationUnreadCount(
            token,
          );

        /*
         * Ignore responses superseded by a newer
         * request or a notification read action.
         */
        if (sequence !== requestSequence.current) {
          return;
        }

        setUnreadCount(
          normalizeUnreadCount(
            response.data.unread_count,
          ),
        );
      } catch {
        /*
         * Temporary network failures must not
         * interrupt normal application usage.
         *
         * The notification center displays its own
         * error when notifications cannot be loaded.
         */
      }
    },
    [
      canUseNotifications,
      token,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Session and Foreground Synchronization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    /*
     * Invalidate requests from the previous
     * authentication or account state.
     */
    requestSequence.current += 1;

    if (!canUseNotifications) {
      setUnreadCount(0);

      return undefined;
    }

    /*
     * Fetch unread notifications when the account
     * becomes eligible.
     */
    void refreshUnreadCount();

    /*
     * Refresh when returning to StyleHub from
     * another mobile application.
     */
    const appStateSubscription =
      AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active') {
            void refreshUnreadCount();
          }
        },
      );

    /*
     * Refresh every 30 seconds while the mobile
     * application is active.
     */
    const interval = setInterval(
      () => {
        if (AppState.currentState === 'active') {
          void refreshUnreadCount();
        }
      },
      BADGE_REFRESH_INTERVAL_MS,
    );

    /*
     * Remove subscriptions when the provider
     * unmounts or the session changes.
     */
    return () => {
      appStateSubscription.remove();

      clearInterval(interval);

      requestSequence.current += 1;
    };
  }, [
    canUseNotifications,
    refreshUnreadCount,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Context Value
  |--------------------------------------------------------------------------
  */

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
    <InAppNotificationContext.Provider value={value}>
      {children}
    </InAppNotificationContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| Notification Hook
|--------------------------------------------------------------------------
*/

export function useInAppNotifications(): InAppNotificationContextValue {
  const context = useContext(
    InAppNotificationContext,
  );

  if (!context) {
    throw new Error(
      'useInAppNotifications must be used inside InAppNotificationProvider.',
    );
  }

  return context;
}
