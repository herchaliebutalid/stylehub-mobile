import {
    apiRequest,
} from '@/src/services/api';

import type {
    ShopOwnerAnalyticsDateRange,
    ShopOwnerAnalyticsResponse,
} from '@/src/types/shop-owner-analytics';

/* ==========================================================================
   SHOP OWNER ANALYTICS
   ========================================================================== */

export async function getShopOwnerAnalytics(
  token: string,
  dateRange?: ShopOwnerAnalyticsDateRange,
): Promise<ShopOwnerAnalyticsResponse> {
  const query =
    dateRange
      ? `?date_from=${encodeURIComponent(
          dateRange.dateFrom.trim(),
        )}&date_to=${encodeURIComponent(
          dateRange.dateTo.trim(),
        )}`
      : '';

  return apiRequest<ShopOwnerAnalyticsResponse>(
    `/shop-owner/analytics${query}`,
    {
      token,
    },
  );
}