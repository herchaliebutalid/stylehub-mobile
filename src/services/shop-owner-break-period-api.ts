import {
    apiRequest,
} from '@/src/services/api';

import type {
    DeleteShopOwnerBreakPeriodResponse,
    SaveShopOwnerBreakPeriodData,
    ShopOwnerBreakPeriodResponse,
    ShopOwnerBreakPeriodsResponse,
} from '@/src/types/shop-owner-break-period';

/* ==========================================================================
   LIST BREAK PERIODS
   ========================================================================== */

export async function getShopOwnerBreakPeriods(
  token: string,
): Promise<ShopOwnerBreakPeriodsResponse> {
  return apiRequest<ShopOwnerBreakPeriodsResponse>(
    '/shop-owner/break-periods',
    {
      token,
    },
  );
}

/* ==========================================================================
   CREATE BREAK PERIOD
   ========================================================================== */

export async function createShopOwnerBreakPeriod(
  token: string,
  data: SaveShopOwnerBreakPeriodData,
): Promise<ShopOwnerBreakPeriodResponse> {
  return apiRequest<ShopOwnerBreakPeriodResponse>(
    '/shop-owner/break-periods',
    {
      method:
        'POST',

      token,

      body: {
        day_of_week:
          data.dayOfWeek,

        starts_at:
          data.startsAt.trim(),

        ends_at:
          data.endsAt.trim(),

        label:
          data.label.trim() === ''
            ? null
            : data.label.trim(),
      },
    },
  );
}

/* ==========================================================================
   UPDATE BREAK PERIOD
   ========================================================================== */

export async function updateShopOwnerBreakPeriod(
  token: string,
  breakPeriodId: number,
  data: SaveShopOwnerBreakPeriodData,
): Promise<ShopOwnerBreakPeriodResponse> {
  return apiRequest<ShopOwnerBreakPeriodResponse>(
    `/shop-owner/break-periods/${breakPeriodId}`,
    {
      method:
        'PUT',

      token,

      body: {
        day_of_week:
          data.dayOfWeek,

        starts_at:
          data.startsAt.trim(),

        ends_at:
          data.endsAt.trim(),

        label:
          data.label.trim() === ''
            ? null
            : data.label.trim(),
      },
    },
  );
}

/* ==========================================================================
   DELETE BREAK PERIOD
   ========================================================================== */

export async function deleteShopOwnerBreakPeriod(
  token: string,
  breakPeriodId: number,
): Promise<DeleteShopOwnerBreakPeriodResponse> {
  return apiRequest<DeleteShopOwnerBreakPeriodResponse>(
    `/shop-owner/break-periods/${breakPeriodId}`,
    {
      method:
        'DELETE',

      token,
    },
  );
}