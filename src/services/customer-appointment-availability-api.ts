import { apiRequest } from '@/src/services/api';

import type {
    CustomerAvailableDatesResponse,
    CustomerAvailableSlotsResponse,
} from '@/src/types/appointment-availability';

const MIN_PREVIEW_DAYS = 1;
const MAX_PREVIEW_DAYS = 60;
const DEFAULT_PREVIEW_DAYS = 30;

function normalizePreviewDays(days: number): number {
  if (!Number.isFinite(days)) {
    return DEFAULT_PREVIEW_DAYS;
  }

  return Math.max(
    MIN_PREVIEW_DAYS,
    Math.min(
      MAX_PREVIEW_DAYS,
      Math.trunc(days),
    ),
  );
}

export async function getCustomerAvailableDates(
  token: string,
  shopId: number,
  serviceId: number,
  days = DEFAULT_PREVIEW_DAYS,
): Promise<CustomerAvailableDatesResponse> {
  const previewDays =
    normalizePreviewDays(days);

  return apiRequest<CustomerAvailableDatesResponse>(
    `/customer/shops/${shopId}/services/${serviceId}/available-dates?days=${previewDays}`,
    {
      token,
    },
  );
}

export async function getCustomerAvailableSlots(
  token: string,
  shopId: number,
  serviceId: number,
  date: string,
): Promise<CustomerAvailableSlotsResponse> {
  const cleanDate =
    date.trim();

  return apiRequest<CustomerAvailableSlotsResponse>(
    `/customer/shops/${shopId}/services/${serviceId}/available-slots?date=${encodeURIComponent(cleanDate)}`,
    {
      token,
    },
  );
}