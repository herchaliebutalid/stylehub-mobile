import {
  ApiError,
  apiRequest,
} from '@/src/services/api';

import type {
  AuthUser,
} from '@/src/types/auth';


/* ==========================================================================
   PROFILE RESPONSE
   ========================================================================== */

export interface CustomerProfileResponse {
  success:
    boolean;

  message?:
    string;

  data: {
    user:
      AuthUser;
  };
}


/* ==========================================================================
   PERSONAL INFORMATION UPDATE
   ========================================================================== */

export interface UpdateCustomerPersonalInformationData {
  firstName:
    string;

  middleName:
    string;

  lastName:
    string;

  email:
    string;

  phoneNumber:
    string;

  currentPassword?:
    string;
}

export interface UpdateCustomerPersonalInformationResponse {
  success:
    boolean;

  message?:
    string;

  data?: {
    user?:
      AuthUser;

    requires_phone_verification?:
      boolean;
  };
}

export interface UpdateCustomerPersonalInformationResult {
  user:
    AuthUser;

  requiresPhoneVerification:
    boolean;

  message:
    string | null;
}


/* ==========================================================================
   GET CURRENT CUSTOMER
   ========================================================================== */

export async function getCustomerProfile(
  token:
    string,
): Promise<CustomerProfileResponse> {
  return apiRequest<CustomerProfileResponse>(
    '/auth/me',

    {
      token,
    },
  );
}


/* ==========================================================================
   UPDATE PERSONAL INFORMATION
   ========================================================================== */

export async function updateCustomerPersonalInformation(
  token:
    string,

  data:
    UpdateCustomerPersonalInformationData,
): Promise<UpdateCustomerPersonalInformationResult> {
  const cleanCurrentPassword =
    data
      .currentPassword
      ?.trim();

  const response =
    await apiRequest<UpdateCustomerPersonalInformationResponse>(
      '/customer/profile',

      {
        method:
          'PATCH',

        token,

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

          ...(
            cleanCurrentPassword
              ? {
                  current_password:
                    data.currentPassword,
                }
              : {}
          ),
        },
      },
    );

  const user =
    response
      ?.data
      ?.user;

  const requiresPhoneVerification =
    response
      ?.data
      ?.requires_phone_verification;

  if (
    !user
    ||
    typeof requiresPhoneVerification !==
      'boolean'
  ) {
    throw new ApiError(
      'The personal information update response was incomplete.',
    );
  }

  return {
    user,

    requiresPhoneVerification,

    message:
      typeof response.message ===
        'string'
        ?
          response.message
        :
          null,
  };
}


/* ==========================================================================
   UPLOAD / REPLACE PROFILE PHOTO
   ========================================================================== */

export async function uploadCustomerProfilePhoto(
  token:
    string,

  formData:
    FormData,
): Promise<CustomerProfileResponse> {
  return apiRequest<CustomerProfileResponse>(
    '/customer/profile/photo',

    {
      method:
        'POST',

      token,

      body:
        formData,
    },
  );
}


/* ==========================================================================
   REMOVE PROFILE PHOTO
   ========================================================================== */

export async function removeCustomerProfilePhoto(
  token:
    string,
): Promise<CustomerProfileResponse> {
  return apiRequest<CustomerProfileResponse>(
    '/customer/profile/photo',

    {
      method:
        'DELETE',

      token,
    },
  );
}