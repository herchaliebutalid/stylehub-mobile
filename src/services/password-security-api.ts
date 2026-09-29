import {
    ApiError,
    apiRequest,
} from '@/src/services/api';

import type {
    ChangePasswordPayload,
    ChangePasswordResponse,
    ForgotPasswordPayload,
    ForgotPasswordResponse,
    ResetPasswordPayload,
    ResetPasswordResponse,
} from '@/src/types/password-security';

/* ==========================================================================
   FORGOT PASSWORD
   ========================================================================== */

export async function requestPasswordReset(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  const response =
    await apiRequest<ForgotPasswordResponse>(
      '/auth/password/forgot',
      {
        method:
          'POST',

        body: {
          role:
            payload.role,

          email:
            payload
              .email
              .trim()
              .toLowerCase(),
        },
      },
    );

  if (
    !response
    ||
    response.success !==
      true
    ||
    typeof response.message !==
      'string'
  ) {
    throw new ApiError(
      'The password reset response was incomplete.',
    );
  }

  return response;
}

/* ==========================================================================
   RESET PASSWORD
   ========================================================================== */

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  const response =
    await apiRequest<ResetPasswordResponse>(
      '/auth/password/reset',
      {
        method:
          'POST',

        body: {
          role:
            payload.role,

          email:
            payload
              .email
              .trim()
              .toLowerCase(),

          code:
            payload
              .code
              .trim(),

          password:
            payload.password,

          password_confirmation:
            payload.passwordConfirmation,
        },
      },
    );

  if (
    !response
    ||
    response.success !==
      true
    ||
    typeof response.message !==
      'string'
  ) {
    throw new ApiError(
      'The password reset response was incomplete.',
    );
  }

  return response;
}

/* ==========================================================================
   CHANGE PASSWORD
   ========================================================================== */

export async function changePassword(
  token: string,
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  const response =
    await apiRequest<ChangePasswordResponse>(
      '/auth/password/change',
      {
        method:
          'POST',

        token,

        body: {
          current_password:
            payload.currentPassword,

          password:
            payload.password,

          password_confirmation:
            payload.passwordConfirmation,
        },
      },
    );

  if (
    !response
    ||
    response.success !==
      true
    ||
    typeof response.message !==
      'string'
  ) {
    throw new ApiError(
      'The password change response was incomplete.',
    );
  }

  return response;
}