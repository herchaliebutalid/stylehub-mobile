import * as SecureStore from 'expo-secure-store';

import {
  Platform,
} from 'react-native';

import type {
  AuthSession,
  MobileUserRole,
} from '@/src/types/auth';


/* ==========================================================================
   STORAGE KEY
   ========================================================================== */

const AUTH_SESSION_KEY =
  'stylehub.auth.session';


/* ==========================================================================
   PLATFORM HELPERS
   ========================================================================== */

function isWeb(): boolean {
  return (
    Platform.OS === 'web'
  );
}

function canUseWebStorage(): boolean {
  return (
    typeof window !==
      'undefined' &&
    typeof window.sessionStorage !==
      'undefined'
  );
}


/* ==========================================================================
   SESSION VALIDATION
   ========================================================================== */

function isMobileRole(
  value: unknown,
): value is MobileUserRole {
  return (
    value === 'customer' ||
    value === 'shop_owner'
  );
}

function isValidSession(
  value: unknown,
): value is AuthSession {
  if (
    typeof value !==
      'object' ||
    value === null
  ) {
    return false;
  }

  const session =
    value as Partial<AuthSession>;

  if (
    typeof session.token !==
      'string' ||
    session.token.trim() === ''
  ) {
    return false;
  }

  if (
    typeof session.user !==
      'object' ||
    session.user === null
  ) {
    return false;
  }

  if (
    typeof session.user.id !==
      'number' ||
    typeof session.user.email !==
      'string' ||
    !isMobileRole(
      session.user.role,
    )
  ) {
    return false;
  }

  return true;
}


/* ==========================================================================
   SAVE AUTH SESSION
   ========================================================================== */

export async function saveAuthSession(
  session: AuthSession,
): Promise<void> {
  const serializedSession =
    JSON.stringify(
      session,
    );

  /*
  |--------------------------------------------------------------------------
  | Web
  |--------------------------------------------------------------------------
  |
  | expo-secure-store does not provide secure browser storage.
  |
  | StyleHub's React Native web version is being used as a development
  | preview, so sessionStorage is used on web. The session disappears when
  | the browser session is closed.
  |
  */

  if (
    isWeb()
  ) {
    if (
      !canUseWebStorage()
    ) {
      return;
    }

    window.sessionStorage.setItem(
      AUTH_SESSION_KEY,
      serializedSession,
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Android / iOS
  |--------------------------------------------------------------------------
  */

  await SecureStore.setItemAsync(
    AUTH_SESSION_KEY,
    serializedSession,
  );
}


/* ==========================================================================
   LOAD AUTH SESSION
   ========================================================================== */

export async function loadAuthSession(): Promise<AuthSession | null> {
  try {
    let storedValue:
      string | null =
        null;

    /*
    |--------------------------------------------------------------------------
    | Web
    |--------------------------------------------------------------------------
    */

    if (
      isWeb()
    ) {
      if (
        !canUseWebStorage()
      ) {
        return null;
      }

      storedValue =
        window.sessionStorage.getItem(
          AUTH_SESSION_KEY,
        );
    } else {
      /*
      |--------------------------------------------------------------------------
      | Android / iOS
      |--------------------------------------------------------------------------
      */

      storedValue =
        await SecureStore.getItemAsync(
          AUTH_SESSION_KEY,
        );
    }

    if (
      !storedValue
    ) {
      return null;
    }

    const parsedValue:
      unknown =
        JSON.parse(
          storedValue,
        );

    if (
      !isValidSession(
        parsedValue,
      )
    ) {
      await clearAuthSession();

      return null;
    }

    return parsedValue;
  } catch {
    /*
    |--------------------------------------------------------------------------
    | Invalid / Corrupted Storage
    |--------------------------------------------------------------------------
    */

    try {
      await clearAuthSession();
    } catch {
      // Ignore cleanup errors.
    }

    return null;
  }
}


/* ==========================================================================
   CLEAR AUTH SESSION
   ========================================================================== */

export async function clearAuthSession(): Promise<void> {
  /*
  |--------------------------------------------------------------------------
  | Web
  |--------------------------------------------------------------------------
  */

  if (
    isWeb()
  ) {
    if (
      canUseWebStorage()
    ) {
      window.sessionStorage.removeItem(
        AUTH_SESSION_KEY,
      );
    }

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Android / iOS
  |--------------------------------------------------------------------------
  */

  await SecureStore.deleteItemAsync(
    AUTH_SESSION_KEY,
  );
}