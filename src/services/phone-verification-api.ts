import {
  ApiError,
  apiRequest,
} from '@/src/services/api';

import type {
  AuthUser,
  PhoneVerificationSendData,
  PhoneVerificationSendResponse,
  PhoneVerificationVerifyResponse,
  UpdateUnverifiedPhoneNumberData,
  UpdateUnverifiedPhoneNumberResponse,
} from '@/src/types/auth';

/* ==========================================================================
   SEND VERIFICATION CODE
   ========================================================================== */

export async function sendPhoneVerificationCode(
  token: string,
): Promise<PhoneVerificationSendData> {
  /*
  |--------------------------------------------------------------------------
  | Important Security Design
  |--------------------------------------------------------------------------
  |
  | We intentionally DO NOT send a phone number from React Native.
  |
  | Laravel determines the destination from:
  |
  | authenticated user
  |       ↓
  | users.phone_number
  |
  | This prevents a malicious client from using StyleHub as an arbitrary
  | SMS sending endpoint.
  |
  */

  const response =
    await apiRequest<PhoneVerificationSendResponse>(
      '/auth/phone-verification/send',
      {
        method:
          'POST',

        token,
      },
    );

  const data =
    response
      ?.data;

  /*
  |--------------------------------------------------------------------------
  | Defensive Response Validation
  |--------------------------------------------------------------------------
  */

  if (
    !data
    ||
    typeof data.phone_number !==
      'string'
    ||
    typeof data.expires_at !==
      'string'
    ||
    typeof data.resend_after_seconds !==
      'number'
  ) {
    throw new ApiError(
      'The phone verification response was incomplete.',
    );
  }

  return data;
}

/* ==========================================================================
   VERIFY CODE
   ========================================================================== */

export async function verifyPhoneVerificationCode(
  token: string,
  code: string,
): Promise<AuthUser> {
  const response =
    await apiRequest<PhoneVerificationVerifyResponse>(
      '/auth/phone-verification/verify',
      {
        method:
          'POST',

        token,

        body: {
          code:
            code.trim(),
        },
      },
    );

  const user =
    response
      ?.data
      ?.user;

  /*
  |--------------------------------------------------------------------------
  | Never Assume Verification Succeeded
  |--------------------------------------------------------------------------
  |
  | We require Laravel to return the authenticated user after successful
  | verification.
  |
  */

  if (!user) {
    throw new ApiError(
      'The phone verification response was incomplete.',
    );
  }

  return user;
}

/* ==========================================================================
   UPDATE UNVERIFIED PHONE NUMBER
   ========================================================================== */

export async function updateUnverifiedPhoneNumber(
  token: string,
  data: UpdateUnverifiedPhoneNumberData,
): Promise<AuthUser> {
  const response =
    await apiRequest<UpdateUnverifiedPhoneNumberResponse>(
      '/auth/phone-verification/phone-number',
      {
        method:
          'PATCH',

        token,

        body: {
          phone_number:
            data.phoneNumber.trim(),

          current_password:
            data.currentPassword,
        },
      },
    );

  const user =
    response
      ?.data
      ?.user;

  if (!user) {
    throw new ApiError(
      'The phone number update response was incomplete.',
    );
  }

  return user;
}