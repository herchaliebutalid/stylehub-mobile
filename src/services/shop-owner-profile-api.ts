import {
    apiRequest,
} from '@/src/services/api';

import type {
    AuthUser,
} from '@/src/types/auth';


/* ==========================================================================
   RESPONSE
   ========================================================================== */

export interface ShopOwnerProfilePhotoResponse {
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
   UPLOAD / REPLACE PROFILE PHOTO
   ========================================================================== */

export async function uploadShopOwnerProfilePhoto(
  token:
    string,

  formData:
    FormData,
): Promise<ShopOwnerProfilePhotoResponse> {
  return apiRequest<ShopOwnerProfilePhotoResponse>(
    '/shop-owner/profile/photo',
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

export async function removeShopOwnerProfilePhoto(
  token:
    string,
): Promise<ShopOwnerProfilePhotoResponse> {
  return apiRequest<ShopOwnerProfilePhotoResponse>(
    '/shop-owner/profile/photo',
    {
      method:
        'DELETE',

      token,
    },
  );
}