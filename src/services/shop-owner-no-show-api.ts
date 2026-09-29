import {
    apiRequest,
} from '@/src/services/api';

import type {
    ShopOwnerAppointmentResponse,
} from '@/src/types/shop-owner';

export async function markShopOwnerAppointmentNoShow(
  token: string,
  appointmentId: number,
): Promise<ShopOwnerAppointmentResponse> {
  return apiRequest<ShopOwnerAppointmentResponse>(
    `/shop-owner/appointments/${appointmentId}/no-show`,
    {
      method: 'PATCH',
      token,
    },
  );
}