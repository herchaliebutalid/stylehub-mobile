import {
  apiRequest,
} from '@/src/services/api';

import type {
  CreateShopOwnerServiceData,
  DeleteShopOwnerPromoResponse,
  DeleteShopOwnerServiceResponse,
  ShopOwnerAccountResponse,
  ShopOwnerAppointmentResponse,
  ShopOwnerAppointmentsResponse,
  ShopOwnerAvailabilityStatus,
  ShopOwnerPromoFormData,
  ShopOwnerPromoResponse,
  ShopOwnerPromosResponse,
  ShopOwnerRescheduleRequestResponse,
  ShopOwnerRescheduleRequestsResponse,
  ShopOwnerScheduleResponse,
  ShopOwnerScheduleUpdateEntry,
  ShopOwnerServiceResponse,
  ShopOwnerServicesResponse,
  UpdateShopOwnerAvailabilityResponse,
  UpdateShopOwnerScheduleResponse,
  UpdateShopOwnerServiceData,
} from '@/src/types/shop-owner';

/* ==========================================================================
   ACCOUNT
   ========================================================================== */

export async function getShopOwnerAccount(
  token: string,
): Promise<ShopOwnerAccountResponse> {
  return apiRequest<ShopOwnerAccountResponse>(
    '/auth/me',
    {
      token,
    },
  );
}

/* ==========================================================================
   SERVICES
   ========================================================================== */

export async function getShopOwnerServices(
  token: string,
): Promise<ShopOwnerServicesResponse> {
  return apiRequest<ShopOwnerServicesResponse>(
    '/shop-owner/services',
    {
      token,
    },
  );
}

export async function getShopOwnerService(
  token: string,
  serviceId: number,
): Promise<ShopOwnerServiceResponse> {
  return apiRequest<ShopOwnerServiceResponse>(
    `/shop-owner/services/${serviceId}`,
    {
      token,
    },
  );
}

export async function createShopOwnerService(
  token: string,
  data: CreateShopOwnerServiceData,
): Promise<ShopOwnerServiceResponse> {
  return apiRequest<ShopOwnerServiceResponse>(
    '/shop-owner/services',
    {
      method: 'POST',

      token,

      body: {
        name:
          data.name.trim(),

        description:
          data.description.trim() === ''
            ? null
            : data.description.trim(),

        price:
          data.price.trim(),

        duration_minutes:
          data.durationMinutes,

        is_active:
          data.isActive,
      },
    },
  );
}

export async function updateShopOwnerService(
  token: string,
  serviceId: number,
  data: UpdateShopOwnerServiceData,
): Promise<ShopOwnerServiceResponse> {
  return apiRequest<ShopOwnerServiceResponse>(
    `/shop-owner/services/${serviceId}`,
    {
      method: 'PUT',

      token,

      body: {
        name:
          data.name.trim(),

        description:
          data.description.trim() === ''
            ? null
            : data.description.trim(),

        price:
          data.price.trim(),

        duration_minutes:
          data.durationMinutes,

        is_active:
          data.isActive,
      },
    },
  );
}

export async function deleteShopOwnerService(
  token: string,
  serviceId: number,
): Promise<DeleteShopOwnerServiceResponse> {
  return apiRequest<DeleteShopOwnerServiceResponse>(
    `/shop-owner/services/${serviceId}`,
    {
      method: 'DELETE',

      token,
    },
  );
}

/* ==========================================================================
   SCHEDULE
   ========================================================================== */

export async function getShopOwnerSchedule(
  token: string,
): Promise<ShopOwnerScheduleResponse> {
  return apiRequest<ShopOwnerScheduleResponse>(
    '/shop-owner/schedule',
    {
      token,
    },
  );
}

export async function updateShopOwnerSchedule(
  token: string,
  schedule: ShopOwnerScheduleUpdateEntry[],
): Promise<UpdateShopOwnerScheduleResponse> {
  return apiRequest<UpdateShopOwnerScheduleResponse>(
    '/shop-owner/schedule',
    {
      method: 'PUT',

      token,

      body: {
        schedule:
          schedule.map(
            (entry) => ({
              day_of_week:
                entry.day_of_week,

              is_open:
                entry.is_open,

              opens_at:
                entry.is_open
                  ? entry.opens_at
                  : null,

              closes_at:
                entry.is_open
                  ? entry.closes_at
                  : null,
            }),
          ),
      },
    },
  );
}

export async function updateShopOwnerAvailability(
  token: string,
  status: ShopOwnerAvailabilityStatus,
): Promise<UpdateShopOwnerAvailabilityResponse> {
  return apiRequest<UpdateShopOwnerAvailabilityResponse>(
    '/shop-owner/availability',
    {
      method: 'PATCH',

      token,

      body: {
        status,
      },
    },
  );
}

/* ==========================================================================
   APPOINTMENTS
   ========================================================================== */

export async function getShopOwnerAppointments(
  token: string,
): Promise<ShopOwnerAppointmentsResponse> {
  return apiRequest<ShopOwnerAppointmentsResponse>(
    '/shop-owner/appointments',
    {
      token,
    },
  );
}

export async function getShopOwnerAppointment(
  token: string,
  appointmentId: number,
): Promise<ShopOwnerAppointmentResponse> {
  return apiRequest<ShopOwnerAppointmentResponse>(
    `/shop-owner/appointments/${appointmentId}`,
    {
      token,
    },
  );
}

export async function confirmShopOwnerAppointment(
  token: string,
  appointmentId: number,
): Promise<ShopOwnerAppointmentResponse> {
  return apiRequest<ShopOwnerAppointmentResponse>(
    `/shop-owner/appointments/${appointmentId}/confirm`,
    {
      method: 'PATCH',

      token,
    },
  );
}

export async function declineShopOwnerAppointment(
  token: string,
  appointmentId: number,
  reason: string,
): Promise<ShopOwnerAppointmentResponse> {
  return apiRequest<ShopOwnerAppointmentResponse>(
    `/shop-owner/appointments/${appointmentId}/decline`,
    {
      method: 'PATCH',

      token,

      body: {
        reason:
          reason.trim(),
      },
    },
  );
}

export async function cancelShopOwnerAppointment(
  token: string,
  appointmentId: number,
  reason: string,
): Promise<ShopOwnerAppointmentResponse> {
  return apiRequest<ShopOwnerAppointmentResponse>(
    `/shop-owner/appointments/${appointmentId}/cancel`,
    {
      method: 'PATCH',

      token,

      body: {
        reason:
          reason.trim(),
      },
    },
  );
}

export async function completeShopOwnerAppointment(
  token: string,
  appointmentId: number,
): Promise<ShopOwnerAppointmentResponse> {
  return apiRequest<ShopOwnerAppointmentResponse>(
    `/shop-owner/appointments/${appointmentId}/complete`,
    {
      method: 'PATCH',

      token,
    },
  );
}

/* ==========================================================================
   RESCHEDULE REQUESTS
   ========================================================================== */

export async function getShopOwnerRescheduleRequests(
  token: string,
): Promise<ShopOwnerRescheduleRequestsResponse> {
  return apiRequest<ShopOwnerRescheduleRequestsResponse>(
    '/shop-owner/reschedule-requests',
    {
      token,
    },
  );
}

export async function getShopOwnerRescheduleRequest(
  token: string,
  requestId: number,
): Promise<ShopOwnerRescheduleRequestResponse> {
  return apiRequest<ShopOwnerRescheduleRequestResponse>(
    `/shop-owner/reschedule-requests/${requestId}`,
    {
      token,
    },
  );
}

export async function approveShopOwnerRescheduleRequest(
  token: string,
  requestId: number,
): Promise<ShopOwnerRescheduleRequestResponse> {
  return apiRequest<ShopOwnerRescheduleRequestResponse>(
    `/shop-owner/reschedule-requests/${requestId}/approve`,
    {
      method: 'PATCH',

      token,
    },
  );
}

export async function rejectShopOwnerRescheduleRequest(
  token: string,
  requestId: number,
  reason: string,
): Promise<ShopOwnerRescheduleRequestResponse> {
  return apiRequest<ShopOwnerRescheduleRequestResponse>(
    `/shop-owner/reschedule-requests/${requestId}/reject`,
    {
      method: 'PATCH',

      token,

      body: {
        reason:
          reason.trim(),
      },
    },
  );
}

/* ==========================================================================
   PROMOTIONS
   ========================================================================== */

export async function getShopOwnerPromos(
  token: string,
): Promise<ShopOwnerPromosResponse> {
  return apiRequest<ShopOwnerPromosResponse>(
    '/shop-owner/promos',
    {
      token,
    },
  );
}

export async function getShopOwnerPromo(
  token: string,
  promoId: number,
): Promise<ShopOwnerPromoResponse> {
  return apiRequest<ShopOwnerPromoResponse>(
    `/shop-owner/promos/${promoId}`,
    {
      token,
    },
  );
}

export async function createShopOwnerPromo(
  token: string,
  data: ShopOwnerPromoFormData,
): Promise<ShopOwnerPromoResponse> {
  return apiRequest<ShopOwnerPromoResponse>(
    '/shop-owner/promos',
    {
      method: 'POST',

      token,

      body: {
        service_id:
          data.serviceId,

        title:
          data.title.trim(),

        description:
          data.description.trim() === ''
            ? null
            : data.description.trim(),

        discount_type:
          data.discountType,

        discount_value:
          data.discountValue.trim(),

        starts_at:
          data.startsAt.trim(),

        ends_at:
          data.endsAt.trim(),

        is_active:
          data.isActive,
      },
    },
  );
}

export async function updateShopOwnerPromo(
  token: string,
  promoId: number,
  data: ShopOwnerPromoFormData,
): Promise<ShopOwnerPromoResponse> {
  return apiRequest<ShopOwnerPromoResponse>(
    `/shop-owner/promos/${promoId}`,
    {
      method: 'PUT',

      token,

      body: {
        service_id:
          data.serviceId,

        title:
          data.title.trim(),

        description:
          data.description.trim() === ''
            ? null
            : data.description.trim(),

        discount_type:
          data.discountType,

        discount_value:
          data.discountValue.trim(),

        starts_at:
          data.startsAt.trim(),

        ends_at:
          data.endsAt.trim(),

        is_active:
          data.isActive,
      },
    },
  );
}

export async function deleteShopOwnerPromo(
  token: string,
  promoId: number,
): Promise<DeleteShopOwnerPromoResponse> {
  return apiRequest<DeleteShopOwnerPromoResponse>(
    `/shop-owner/promos/${promoId}`,
    {
      method: 'DELETE',

      token,
    },
  );
}