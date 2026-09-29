import {
  apiRequest,
} from '@/src/services/api';

import type {
  CreateCustomerAppointmentData,
  CreateCustomerAppointmentResponse,
  CreateCustomerFeedbackData,
  CreateCustomerRescheduleRequestData,
  CustomerAppointmentResponse,
  CustomerAppointmentsResponse,
  CustomerFeedbackListResponse,
  CustomerFeedbackResponse,
  CustomerRescheduleRequestResponse,
  CustomerRescheduleRequestsResponse,
  CustomerShopFilters,
  CustomerShopResponse,
  CustomerShopReviewFilters,
  CustomerShopReviewsResponse,
  CustomerShopsResponse,
} from '@/src/types/customer';

import type {
  CustomerNearbyShopsQuery,
  CustomerNearbyShopsResponse,
} from '@/src/types/nearby-shop';


/* ==========================================================================
   QUERY HELPERS
   ========================================================================== */

function appendQuery(
  parameters: string[],
  key: string,
  value: string | number | undefined,
): void {
  if (
    value === undefined
    ||
    value === ''
  ) {
    return;
  }

  parameters.push(
    `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );
}


function buildShopQuery(
  filters: CustomerShopFilters,
): string {
  const parameters: string[] = [];

  appendQuery(
    parameters,
    'search',
    filters.search?.trim(),
  );

  appendQuery(
    parameters,
    'type',
    filters.type,
  );

  appendQuery(
    parameters,
    'city',
    filters.city?.trim(),
  );

  appendQuery(
    parameters,
    'province',
    filters.province?.trim(),
  );

  appendQuery(
    parameters,
    'availability_status',
    filters.availabilityStatus,
  );

  appendQuery(
    parameters,
    'page',
    filters.page,
  );

  appendQuery(
    parameters,
    'per_page',
    filters.perPage,
  );

  if (
    parameters.length === 0
  ) {
    return '';
  }

  return `?${parameters.join('&')}`;
}


function buildNearbyShopQuery(
  query: CustomerNearbyShopsQuery,
): string {
  const parameters: string[] = [];

  appendQuery(
    parameters,
    'latitude',
    query.latitude,
  );

  appendQuery(
    parameters,
    'longitude',
    query.longitude,
  );

  appendQuery(
    parameters,
    'radius_km',
    query.radiusKm,
  );

  appendQuery(
    parameters,
    'limit',
    query.limit,
  );

  return `?${parameters.join('&')}`;
}


function buildReviewQuery(
  filters: CustomerShopReviewFilters,
): string {
  const parameters: string[] = [];

  appendQuery(
    parameters,
    'rating',
    filters.rating,
  );

  appendQuery(
    parameters,
    'page',
    filters.page,
  );

  appendQuery(
    parameters,
    'per_page',
    filters.perPage,
  );

  if (
    parameters.length === 0
  ) {
    return '';
  }

  return `?${parameters.join('&')}`;
}


/* ==========================================================================
   SHOP DISCOVERY
   ========================================================================== */

export async function getCustomerShops(
  token: string,
  filters: CustomerShopFilters = {},
): Promise<CustomerShopsResponse> {
  const query =
    buildShopQuery(
      filters,
    );

  return apiRequest<CustomerShopsResponse>(
    `/customer/shops${query}`,
    {
      token,
    },
  );
}


/* ==========================================================================
   NEARBY SHOPS
   ========================================================================== */

export async function getCustomerNearbyShops(
  token: string,
  query: CustomerNearbyShopsQuery,
): Promise<CustomerNearbyShopsResponse> {
  const queryString =
    buildNearbyShopQuery(
      query,
    );

  return apiRequest<CustomerNearbyShopsResponse>(
    `/customer/shops/nearby${queryString}`,
    {
      token,
    },
  );
}


/* ==========================================================================
   SHOP DETAIL
   ========================================================================== */

export async function getCustomerShop(
  token: string,
  shopId: number,
): Promise<CustomerShopResponse> {
  return apiRequest<CustomerShopResponse>(
    `/customer/shops/${shopId}`,
    {
      token,
    },
  );
}


/* ==========================================================================
   SHOP REVIEWS
   ========================================================================== */

export async function getCustomerShopReviews(
  token: string,
  shopId: number,
  filters: CustomerShopReviewFilters = {},
): Promise<CustomerShopReviewsResponse> {
  const query =
    buildReviewQuery(
      filters,
    );

  return apiRequest<CustomerShopReviewsResponse>(
    `/customer/shops/${shopId}/reviews${query}`,
    {
      token,
    },
  );
}


/* ==========================================================================
   APPOINTMENTS
   ========================================================================== */

export async function getCustomerAppointments(
  token: string,
): Promise<CustomerAppointmentsResponse> {
  return apiRequest<CustomerAppointmentsResponse>(
    '/customer/appointments',
    {
      token,
    },
  );
}


export async function getCustomerAppointment(
  token: string,
  appointmentId: number,
): Promise<CustomerAppointmentResponse> {
  return apiRequest<CustomerAppointmentResponse>(
    `/customer/appointments/${appointmentId}`,
    {
      token,
    },
  );
}


export async function createCustomerAppointment(
  token: string,
  data: CreateCustomerAppointmentData,
): Promise<CreateCustomerAppointmentResponse> {
  return apiRequest<CreateCustomerAppointmentResponse>(
    '/customer/appointments',
    {
      method:
        'POST',

      token,

      body: {
        shop_id:
          data.shopId,

        service_id:
          data.serviceId,

        appointment_date:
          data.appointmentDate.trim(),

        starts_at:
          data.startsAt.trim(),

        notes:
          data.notes.trim() === ''
            ? null
            : data.notes.trim(),
      },
    },
  );
}


export async function cancelCustomerAppointment(
  token: string,
  appointmentId: number,
  reason: string,
): Promise<CustomerAppointmentResponse> {
  return apiRequest<CustomerAppointmentResponse>(
    `/customer/appointments/${appointmentId}/cancel`,
    {
      method:
        'PATCH',

      token,

      body: {
        reason:
          reason.trim(),
      },
    },
  );
}


/* ==========================================================================
   RESCHEDULE REQUESTS
   ========================================================================== */

export async function createCustomerRescheduleRequest(
  token: string,
  appointmentId: number,
  data: CreateCustomerRescheduleRequestData,
): Promise<CustomerRescheduleRequestResponse> {
  return apiRequest<CustomerRescheduleRequestResponse>(
    `/customer/appointments/${appointmentId}/reschedule-requests`,
    {
      method:
        'POST',

      token,

      body: {
        requested_date:
          data.requestedDate.trim(),

        requested_starts_at:
          data.requestedStartsAt.trim(),

        reason:
          data.reason.trim() === ''
            ? null
            : data.reason.trim(),
      },
    },
  );
}


export async function getCustomerRescheduleRequests(
  token: string,
): Promise<CustomerRescheduleRequestsResponse> {
  return apiRequest<CustomerRescheduleRequestsResponse>(
    '/customer/reschedule-requests',
    {
      token,
    },
  );
}


export async function getCustomerRescheduleRequest(
  token: string,
  requestId: number,
): Promise<CustomerRescheduleRequestResponse> {
  return apiRequest<CustomerRescheduleRequestResponse>(
    `/customer/reschedule-requests/${requestId}`,
    {
      token,
    },
  );
}


export async function withdrawCustomerRescheduleRequest(
  token: string,
  requestId: number,
): Promise<CustomerRescheduleRequestResponse> {
  return apiRequest<CustomerRescheduleRequestResponse>(
    `/customer/reschedule-requests/${requestId}/withdraw`,
    {
      method:
        'PATCH',

      token,
    },
  );
}


/* ==========================================================================
   FEEDBACK
   ========================================================================== */

export async function getCustomerFeedback(
  token: string,
): Promise<CustomerFeedbackListResponse> {
  return apiRequest<CustomerFeedbackListResponse>(
    '/customer/feedback',
    {
      token,
    },
  );
}


export async function submitCustomerFeedback(
  token: string,
  appointmentId: number,
  data: CreateCustomerFeedbackData,
): Promise<CustomerFeedbackResponse> {
  return apiRequest<CustomerFeedbackResponse>(
    `/customer/appointments/${appointmentId}/feedback`,
    {
      method:
        'POST',

      token,

      body: {
        rating:
          data.rating,

        comment:
          data.comment.trim() === ''
            ? null
            : data.comment.trim(),
      },
    },
  );
}