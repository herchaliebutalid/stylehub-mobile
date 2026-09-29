import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ApiError,
  apiRequest,
} from '@/src/services/api';

import {
  sendPhoneVerificationCode as sendPhoneVerificationCodeRequest,
  verifyPhoneVerificationCode as verifyPhoneVerificationCodeRequest,
} from '@/src/services/phone-verification-api';

import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '@/src/storage/auth-storage';

import type {
  AuthSession,
  AuthUser,
  CustomerRegistrationData,
  CustomerRegistrationResponse,
  LoginResponse,
  MeResponse,
  MobileUserRole,
  PhoneVerificationSendData,
  ShopOwnerRegistrationData,
  ShopOwnerRegistrationResponse,
} from '@/src/types/auth';

/* ==========================================================================
   LOGIN
   ========================================================================== */

interface LoginCredentials {
  role:
    MobileUserRole;

  email:
    string;

  password:
    string;
}

/* ==========================================================================
   AUTH CONTEXT
   ========================================================================== */

interface AuthContextValue {
  user:
    AuthUser | null;

  token:
    string | null;

  expiresAt:
    string | null;

  isBootstrapping:
    boolean;

  isSubmitting:
    boolean;

  login: (
    credentials: LoginCredentials,
  ) => Promise<AuthUser>;

  registerCustomer: (
    data: CustomerRegistrationData,
  ) => Promise<AuthUser>;

  registerShopOwner: (
    data: ShopOwnerRegistrationData,
  ) => Promise<AuthUser>;

  sendPhoneVerificationCode:
    () => Promise<PhoneVerificationSendData>;

  verifyPhoneVerificationCode: (
    code: string,
  ) => Promise<AuthUser>;

  syncAuthenticatedUser: (
    user: AuthUser,
  ) => Promise<AuthUser>;

  logout:
    () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

interface AuthProviderProps {
  children:
    ReactNode;
}

/* ==========================================================================
   ROLE VALIDATION
   ========================================================================== */

function isMobileRole(
  role: unknown,
): role is MobileUserRole {
  return (
    role ===
      'customer'
    ||
    role ===
      'shop_owner'
  );
}

/* ==========================================================================
   TOKEN EXPIRATION
   ========================================================================== */

function isExpired(
  expiresAt: string | null,
): boolean {
  if (!expiresAt) {
    return false;
  }

  const timestamp =
    Date.parse(
      expiresAt,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return false;
  }

  return (
    timestamp <=
    Date.now()
  );
}

/* ==========================================================================
   AUTHENTICATED USER VALIDATION
   ========================================================================== */

function validateAuthenticatedUser(
  user: AuthUser,
): void {
  if (
    !isMobileRole(
      user.role,
    )
  ) {
    throw new ApiError(
      'Administrator accounts cannot use the mobile application.',
      403,
    );
  }

  if (
    user.status !==
    'active'
  ) {
    throw new ApiError(
      'This account is not active.',
      403,
    );
  }
}

/* ==========================================================================
   SESSION PERSISTENCE
   ========================================================================== */

async function persistAuthenticatedSession(
  token: string,
  expiresAt: string | null,
  user: AuthUser,
): Promise<AuthSession> {
  validateAuthenticatedUser(
    user,
  );

  const session: AuthSession = {
    token,

    expiresAt,

    user,
  };

  await saveAuthSession(
    session,
  );

  return session;
}

/* ==========================================================================
   AUTH PROVIDER
   ========================================================================== */

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    session,
    setSession,
  ] =
    useState<AuthSession | null>(
      null,
    );

  const [
    isBootstrapping,
    setIsBootstrapping,
  ] =
    useState(
      true,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  /* ==========================================================================
     RESTORE SESSION
     ========================================================================== */

  useEffect(
    () => {
      let isMounted =
        true;

      async function bootstrap() {
        try {
          const storedSession =
            await loadAuthSession();

          if (
            !storedSession
          ) {
            return;
          }

          if (
            isExpired(
              storedSession.expiresAt,
            )
          ) {
            await clearAuthSession();

            return;
          }

          if (
            isMounted
          ) {
            setSession(
              storedSession,
            );
          }

          try {
            const response =
              await apiRequest<MeResponse>(
                '/auth/me',
                {
                  token:
                    storedSession.token,
                },
              );

            const remoteUser =
              response
                ?.data
                ?.user;

            if (!remoteUser) {
              throw new ApiError(
                'The authenticated user response was incomplete.',
              );
            }

            validateAuthenticatedUser(
              remoteUser,
            );

            const refreshedSession: AuthSession = {
              ...storedSession,

              user:
                remoteUser,
            };

            await saveAuthSession(
              refreshedSession,
            );

            if (
              isMounted
            ) {
              setSession(
                refreshedSession,
              );
            }
          } catch (error) {
            if (
              error instanceof ApiError
              &&
              (
                error.status ===
                  401
                ||
                error.status ===
                  403
              )
            ) {
              await clearAuthSession();

              if (
                isMounted
              ) {
                setSession(
                  null,
                );
              }
            }
          }
        } finally {
          if (
            isMounted
          ) {
            setIsBootstrapping(
              false,
            );
          }
        }
      }

      void bootstrap();

      return () => {
        isMounted =
          false;
      };
    },
    [],
  );

  /* ==========================================================================
     LOGIN
     ========================================================================== */

  const login =
    useCallback(
      async ({
        role,
        email,
        password,
      }: LoginCredentials): Promise<AuthUser> => {
        setIsSubmitting(
          true,
        );

        try {
          const endpoint =
            role ===
              'customer'
              ?
                '/auth/customers/login'
              :
                '/auth/shop-owners/login';

          const response =
            await apiRequest<LoginResponse>(
              endpoint,
              {
                method:
                  'POST',

                body: {
                  email:
                    email
                      .trim()
                      .toLowerCase(),

                  password,

                  device_name:
                    role ===
                      'customer'
                      ?
                        'stylehub-customer-mobile'
                      :
                        'stylehub-shop-owner-mobile',
                },
              },
            );

          const token =
            response
              ?.data
              ?.token;

          const user =
            response
              ?.data
              ?.user;

          if (
            !token
            ||
            !user
          ) {
            throw new ApiError(
              'The login response was incomplete.',
            );
          }

          if (
            user.role !==
            role
          ) {
            throw new ApiError(
              'This account does not match the selected account type.',
              403,
            );
          }

          const newSession =
            await persistAuthenticatedSession(
              token,

              response
                .data
                ?.expires_at
              ?? null,

              user,
            );

          setSession(
            newSession,
          );

          return user;
        } finally {
          setIsSubmitting(
            false,
          );
        }
      },
      [],
    );

  /* ==========================================================================
     CUSTOMER REGISTRATION
     ========================================================================== */

  const registerCustomer =
    useCallback(
      async (
        data: CustomerRegistrationData,
      ): Promise<AuthUser> => {
        setIsSubmitting(
          true,
        );

        try {
          const response =
            await apiRequest<CustomerRegistrationResponse>(
              '/auth/customers/register',
              {
                method:
                  'POST',

                body: {
                  first_name:
                    data
                      .firstName
                      .trim(),

                  middle_name:
                    data
                      .middleName
                      .trim() ===
                    ''
                      ?
                        null
                      :
                        data
                          .middleName
                          .trim(),

                  last_name:
                    data
                      .lastName
                      .trim(),

                  email:
                    data
                      .email
                      .trim()
                      .toLowerCase(),

                  phone_number:
                    data
                      .phoneNumber
                      .trim(),

                  password:
                    data.password,

                  password_confirmation:
                    data.passwordConfirmation,

                  device_name:
                    'stylehub-customer-mobile',
                },
              },
            );

          const token =
            response
              ?.data
              ?.token;

          const user =
            response
              ?.data
              ?.user;

          if (
            !token
            ||
            !user
          ) {
            throw new ApiError(
              'The registration response was incomplete.',
            );
          }

          if (
            user.role !==
            'customer'
          ) {
            throw new ApiError(
              'The created account has an invalid mobile role.',
              403,
            );
          }

          const newSession =
            await persistAuthenticatedSession(
              token,

              response
                .data
                ?.expires_at
              ?? null,

              user,
            );

          setSession(
            newSession,
          );

          return user;
        } finally {
          setIsSubmitting(
            false,
          );
        }
      },
      [],
    );

  /* ==========================================================================
     SHOP OWNER REGISTRATION
     ========================================================================== */

  const registerShopOwner =
    useCallback(
      async (
        data: ShopOwnerRegistrationData,
      ): Promise<AuthUser> => {
        setIsSubmitting(
          true,
        );

        try {
          const response =
            await apiRequest<ShopOwnerRegistrationResponse>(
              '/auth/shop-owners/register',
              {
                method:
                  'POST',

                body: {
                  first_name:
                    data
                      .firstName
                      .trim(),

                  middle_name:
                    data
                      .middleName
                      .trim() ===
                    ''
                      ?
                        null
                      :
                        data
                          .middleName
                          .trim(),

                  last_name:
                    data
                      .lastName
                      .trim(),

                  email:
                    data
                      .email
                      .trim()
                      .toLowerCase(),

                  phone_number:
                    data
                      .phoneNumber
                      .trim(),

                  password:
                    data.password,

                  password_confirmation:
                    data.passwordConfirmation,

                  device_name:
                    'stylehub-shop-owner-mobile',

                  shop: {
                    name:
                      data
                        .shop
                        .name
                        .trim(),

                    type:
                      data
                        .shop
                        .type,

                    description:
                      data
                        .shop
                        .description
                        .trim() ===
                      ''
                        ?
                          null
                        :
                          data
                            .shop
                            .description
                            .trim(),

                    phone_number:
                      data
                        .shop
                        .phoneNumber
                        .trim(),

                    email:
                      data
                        .shop
                        .email
                        .trim() ===
                      ''
                        ?
                          null
                        :
                          data
                            .shop
                            .email
                            .trim()
                            .toLowerCase(),

                    address:
                      data
                        .shop
                        .address
                        .trim(),

                    city:
                      data
                        .shop
                        .city
                        .trim(),

                    province:
                      data
                        .shop
                        .province
                        .trim(),
                  },
                },
              },
            );

          const token =
            response
              ?.data
              ?.token;

          const user =
            response
              ?.data
              ?.user;

          if (
            !token
            ||
            !user
          ) {
            throw new ApiError(
              'The registration response was incomplete.',
            );
          }

          if (
            user.role !==
            'shop_owner'
          ) {
            throw new ApiError(
              'The created account has an invalid mobile role.',
              403,
            );
          }

          const newSession =
            await persistAuthenticatedSession(
              token,

              response
                .data
                ?.expires_at
              ?? null,

              user,
            );

          setSession(
            newSession,
          );

          return user;
        } finally {
          setIsSubmitting(
            false,
          );
        }
      },
      [],
    );

  /* ==========================================================================
     SEND PHONE VERIFICATION CODE
     ========================================================================== */

  const sendPhoneVerificationCode =
    useCallback(
      async (): Promise<PhoneVerificationSendData> => {
        const currentToken =
          session
            ?.token;

        if (!currentToken) {
          throw new ApiError(
            'You must be signed in to verify your phone number.',
            401,
          );
        }

        setIsSubmitting(
          true,
        );

        try {
          return await sendPhoneVerificationCodeRequest(
            currentToken,
          );
        } finally {
          setIsSubmitting(
            false,
          );
        }
      },
      [
        session?.token,
      ],
    );

  /* ==========================================================================
     VERIFY PHONE NUMBER
     ========================================================================== */

  const verifyPhoneVerificationCode =
    useCallback(
      async (
        code: string,
      ): Promise<AuthUser> => {
        const currentSession =
          session;

        if (!currentSession) {
          throw new ApiError(
            'You must be signed in to verify your phone number.',
            401,
          );
        }

        setIsSubmitting(
          true,
        );

        try {
          const verifiedUser =
            await verifyPhoneVerificationCodeRequest(
              currentSession.token,
              code,
            );

          validateAuthenticatedUser(
            verifiedUser,
          );

          if (
            verifiedUser.id !==
              currentSession.user.id
            ||
            verifiedUser.role !==
              currentSession.user.role
          ) {
            throw new ApiError(
              'The verified account did not match the current session.',
              409,
            );
          }

          if (
            verifiedUser.phone_verified !==
            true
          ) {
            throw new ApiError(
              'The server did not confirm phone verification.',
              409,
            );
          }

          const updatedSession: AuthSession = {
            ...currentSession,

            user:
              verifiedUser,
          };

          await saveAuthSession(
            updatedSession,
          );

          setSession(
            updatedSession,
          );

          return verifiedUser;
        } finally {
          setIsSubmitting(
            false,
          );
        }
      },
      [
        session,
      ],
    );

  /* ==========================================================================
     SYNCHRONIZE AUTHENTICATED USER
     ========================================================================== */

  const syncAuthenticatedUser =
    useCallback(
      async (
        updatedUser: AuthUser,
      ): Promise<AuthUser> => {
        const currentSession =
          session;

        if (!currentSession) {
          throw new ApiError(
            'You must be signed in to update the current session.',
            401,
          );
        }

        validateAuthenticatedUser(
          updatedUser,
        );

        /*
        |--------------------------------------------------------------------------
        | Session Identity Must Never Change
        |--------------------------------------------------------------------------
        |
        | Personal-information and profile APIs may change account details,
        | but they must never replace the authenticated account itself.
        |
        */

        if (
          updatedUser.id !==
            currentSession.user.id
          ||
          updatedUser.role !==
            currentSession.user.role
        ) {
          throw new ApiError(
            'The updated account did not match the current session.',
            409,
          );
        }

        const updatedSession: AuthSession = {
          ...currentSession,

          user:
            updatedUser,
        };

        /*
        |--------------------------------------------------------------------------
        | Keep SecureStore And React State Synchronized
        |--------------------------------------------------------------------------
        |
        | If a mobile number changes, Laravel returns phone_verified=false.
        | Saving that exact server state makes the Customer layout immediately
        | redirect the customer into the existing OTP verification flow.
        |
        */

        await saveAuthSession(
          updatedSession,
        );

        setSession(
          updatedSession,
        );

        return updatedUser;
      },
      [
        session,
      ],
    );

  /* ==========================================================================
     LOGOUT
     ========================================================================== */

  const logout =
    useCallback(
      async (): Promise<void> => {
        const currentToken =
          session
            ?.token;

        setIsSubmitting(
          true,
        );

        try {
          if (
            currentToken
          ) {
            try {
              await apiRequest(
                '/auth/logout',
                {
                  method:
                    'POST',

                  token:
                    currentToken,
                },
              );
            } catch {
              /*
               * Local logout still succeeds if Laravel cannot be reached.
               */
            }
          }
        } finally {
          await clearAuthSession();

          setSession(
            null,
          );

          setIsSubmitting(
            false,
          );
        }
      },
      [
        session?.token,
      ],
    );

  /* ==========================================================================
     CONTEXT VALUE
     ========================================================================== */

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user:
          session
            ?.user
          ?? null,

        token:
          session
            ?.token
          ?? null,

        expiresAt:
          session
            ?.expiresAt
          ?? null,

        isBootstrapping,

        isSubmitting,

        login,

        registerCustomer,

        registerShopOwner,

        sendPhoneVerificationCode,

        verifyPhoneVerificationCode,

        syncAuthenticatedUser,

        logout,
      }),
      [
        session,
        isBootstrapping,
        isSubmitting,
        login,
        registerCustomer,
        registerShopOwner,
        sendPhoneVerificationCode,
        verifyPhoneVerificationCode,
        syncAuthenticatedUser,
        logout,
      ],
    );

  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ==========================================================================
   AUTH HOOK
   ========================================================================== */

export function useAuth(): AuthContextValue {
  const context =
    useContext(
      AuthContext,
    );

  if (
    !context
  ) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    );
  }

  return context;
}