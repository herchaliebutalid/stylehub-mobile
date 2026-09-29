import {
    apiRequest,
} from '@/src/services/api';

import type {
    ShopOwnerBookingRulesResponse,
    UpdateShopOwnerBookingRulesData,
} from '@/src/types/shop-owner-booking-rules';

/* ==========================================================================
   GET BOOKING RULES
   ========================================================================== */

export async function getShopOwnerBookingRules(
  token: string,
): Promise<ShopOwnerBookingRulesResponse> {
  return apiRequest<ShopOwnerBookingRulesResponse>(
    '/shop-owner/booking-rules',
    {
      token,
    },
  );
}

/* ==========================================================================
   UPDATE BOOKING RULES
   ========================================================================== */

export async function updateShopOwnerBookingRules(
  token: string,
  data: UpdateShopOwnerBookingRulesData,
): Promise<ShopOwnerBookingRulesResponse> {
  return apiRequest<ShopOwnerBookingRulesResponse>(
    '/shop-owner/booking-rules',
    {
      method: 'PUT',

      token,

      body: {
        slot_interval_minutes:
          data.slotIntervalMinutes,

        minimum_lead_time_minutes:
          data.minimumLeadTimeMinutes,

        booking_window_days:
          data.bookingWindowDays,

        cancellation_cutoff_minutes:
          data.cancellationCutoffMinutes,

        reschedule_cutoff_minutes:
          data.rescheduleCutoffMinutes,
      },
    },
  );
}