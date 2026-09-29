import {
    apiRequest,
} from '@/src/services/api';

import type {
    ShopOwnerCalendarMonthResponse,
    ShopOwnerDayAgendaResponse,
} from '@/src/types/shop-owner-calendar';

/* ==========================================================================
   MONTH CALENDAR
   ========================================================================== */

export async function getShopOwnerCalendarMonth(
  token: string,
  month?: string,
): Promise<ShopOwnerCalendarMonthResponse> {
  const path =
    month && month.trim() !== ''
      ? `/shop-owner/calendar?month=${encodeURIComponent(
          month.trim(),
        )}`
      : '/shop-owner/calendar';

  return apiRequest<ShopOwnerCalendarMonthResponse>(
    path,
    {
      token,
    },
  );
}

/* ==========================================================================
   DAY AGENDA
   ========================================================================== */

export async function getShopOwnerDayAgenda(
  token: string,
  date: string,
): Promise<ShopOwnerDayAgendaResponse> {
  return apiRequest<ShopOwnerDayAgendaResponse>(
    `/shop-owner/calendar/agenda?date=${encodeURIComponent(
      date.trim(),
    )}`,
    {
      token,
    },
  );
}