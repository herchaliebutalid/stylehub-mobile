import {
    apiRequest,
} from '@/src/services/api';

import type {
    DeleteShopOwnerBlockedDateResponse,
    SaveShopOwnerBlockedDateData,
    ShopOwnerBlockedDateResponse,
    ShopOwnerBlockedDatesResponse,
} from '@/src/types/shop-owner-blocked-date';

/* ==========================================================================
   LIST BLOCKED DATES
   ========================================================================== */

export async function getShopOwnerBlockedDates(
  token: string,
): Promise<ShopOwnerBlockedDatesResponse> {
  return apiRequest<ShopOwnerBlockedDatesResponse>(
    '/shop-owner/blocked-dates',
    {
      token,
    },
  );
}

/* ==========================================================================
   CREATE BLOCKED DATE
   ========================================================================== */

export async function createShopOwnerBlockedDate(
  token: string,
  data: SaveShopOwnerBlockedDateData,
): Promise<ShopOwnerBlockedDateResponse> {
  return apiRequest<ShopOwnerBlockedDateResponse>(
    '/shop-owner/blocked-dates',
    {
      method:
        'POST',

      token,

      body: {
        blocked_date:
          data.blockedDate.trim(),

        reason:
          data.reason.trim() === ''
            ? null
            : data.reason.trim(),
      },
    },
  );
}

/* ==========================================================================
   UPDATE BLOCKED DATE
   ========================================================================== */

export async function updateShopOwnerBlockedDate(
  token: string,
  blockedDateId: number,
  data: SaveShopOwnerBlockedDateData,
): Promise<ShopOwnerBlockedDateResponse> {
  return apiRequest<ShopOwnerBlockedDateResponse>(
    `/shop-owner/blocked-dates/${blockedDateId}`,
    {
      method:
        'PUT',

      token,

      body: {
        blocked_date:
          data.blockedDate.trim(),

        reason:
          data.reason.trim() === ''
            ? null
            : data.reason.trim(),
      },
    },
  );
}

/* ==========================================================================
   DELETE BLOCKED DATE
   ========================================================================== */

export async function deleteShopOwnerBlockedDate(
  token: string,
  blockedDateId: number,
): Promise<DeleteShopOwnerBlockedDateResponse> {
  return apiRequest<DeleteShopOwnerBlockedDateResponse>(
    `/shop-owner/blocked-dates/${blockedDateId}`,
    {
      method:
        'DELETE',

      token,
    },
  );
}