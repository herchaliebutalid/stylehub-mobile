import type {
  AuthUser,
  ShopType,
} from '@/src/types/auth';

export type ShopApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type ShopOwnerAvailabilityStatus =
  | 'open'
  | 'closed'
  | 'fully_booked'
  | 'accepting_walk_ins';

export type ShopOwnerDayOfWeek =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7;

export type ShopOwnerAppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'declined';

export type ShopOwnerRescheduleRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type ShopOwnerPromoScope =
  | 'shop_wide'
  | 'service_specific';

export type ShopOwnerPromoDiscountType =
  | 'percentage'
  | 'fixed_amount';

/* ==========================================================================
   SHOP OWNER ACCOUNT
   ========================================================================== */

export interface ShopOwnerShop {
  id: number;

  name: string;

  type: ShopType;

  type_label: string;

  description: string | null;

  phone_number: string | null;

  email: string | null;

  address: string;

  city: string;

  province: string;

  availability_status:
    ShopOwnerAvailabilityStatus;

  availability_status_label: string;

  approval_status:
    ShopApprovalStatus;

  approval_status_label: string;

  rejection_reason: string | null;

  reviewed_at: string | null;

  created_at: string | null;

  updated_at: string | null;
}

export interface ShopOwnerAccountResponse {
  success: boolean;

  data: {
    user: AuthUser;

    shop: ShopOwnerShop | null;
  };
}

/* ==========================================================================
   SERVICES
   ========================================================================== */

export interface ShopOwnerService {
  id: number;

  name: string;

  description: string | null;

  price: string | number;

  duration_minutes: number;

  is_active: boolean;

  created_at: string | null;

  updated_at: string | null;
}

export interface ShopOwnerServicesResponse {
  success: boolean;

  data: {
    services: ShopOwnerService[];
  };
}

export interface ShopOwnerServiceResponse {
  success: boolean;

  message?: string;

  data: {
    service: ShopOwnerService;
  };
}

export interface DeleteShopOwnerServiceResponse {
  success: boolean;

  message: string;
}

export interface CreateShopOwnerServiceData {
  name: string;

  description: string;

  price: string;

  durationMinutes: number;

  isActive: boolean;
}

export interface UpdateShopOwnerServiceData {
  name: string;

  description: string;

  price: string;

  durationMinutes: number;

  isActive: boolean;
}

/* ==========================================================================
   WEEKLY SCHEDULE
   ========================================================================== */

export interface ShopOwnerScheduleEntry {
  id?: number;

  day_of_week:
    ShopOwnerDayOfWeek;

  day_label: string;

  is_open: boolean;

  opens_at: string | null;

  closes_at: string | null;

  created_at?: string | null;

  updated_at?: string | null;
}

export interface ShopOwnerScheduleUpdateEntry {
  day_of_week:
    ShopOwnerDayOfWeek;

  is_open: boolean;

  opens_at: string | null;

  closes_at: string | null;
}

export interface ShopOwnerAvailability {
  status:
    ShopOwnerAvailabilityStatus;

  status_label: string;
}

export interface ShopOwnerScheduleResponse {
  success: boolean;

  data: {
    availability:
      ShopOwnerAvailability;

    schedule:
      ShopOwnerScheduleEntry[];
  };
}

export interface UpdateShopOwnerScheduleResponse {
  success: boolean;

  message: string;

  data: {
    schedule:
      ShopOwnerScheduleEntry[];
  };
}

export interface UpdateShopOwnerAvailabilityResponse {
  success: boolean;

  message: string;

  data: {
    availability:
      ShopOwnerAvailability;
  };
}

/* ==========================================================================
   APPOINTMENTS
   ========================================================================== */

export interface ShopOwnerAppointmentCustomer {
  id: number;

  full_name: string;

  email: string;

  phone_number: string;
}

export interface ShopOwnerAppointmentServiceSnapshot {
  name: string;

  price: string | number;

  duration_minutes: number;
}

export interface ShopOwnerAppointmentService {
  id: number;

  name: string;

  is_active: boolean;
}

export interface ShopOwnerAppointment {
  id: number;

  appointment_date: string;

  starts_at: string;

  ends_at: string;

  status:
    ShopOwnerAppointmentStatus;

  status_label: string;

  customer?:
    ShopOwnerAppointmentCustomer;

  service_snapshot:
    ShopOwnerAppointmentServiceSnapshot;

  service?:
    ShopOwnerAppointmentService;

  notes: string | null;

  cancellation_reason: string | null;

  cancelled_by:
    string | number | null;

  cancelled_at: string | null;

  completed_at: string | null;

  no_show_at: string | null;

  created_at: string | null;

  updated_at: string | null;
}

export interface ShopOwnerAppointmentsResponse {
  success: boolean;

  data: {
    appointments:
      ShopOwnerAppointment[];
  };
}

export interface ShopOwnerAppointmentResponse {
  success: boolean;

  message?: string;

  data: {
    appointment:
      ShopOwnerAppointment;
  };
}

/* ==========================================================================
   RESCHEDULE REQUESTS
   ========================================================================== */

export interface ShopOwnerRescheduleCustomer {
  id: number;

  full_name: string;

  email: string;

  phone_number: string;
}

export interface ShopOwnerRescheduleAppointment {
  id: number;

  appointment_date: string;

  starts_at: string;

  ends_at: string;

  status:
    ShopOwnerAppointmentStatus;

  service_snapshot: {
    name: string;

    price: string | number;

    duration_minutes: number;
  };

  customer:
    ShopOwnerRescheduleCustomer | null;
}

export interface ShopOwnerRescheduleReviewer {
  id: number;

  full_name: string;
}

export interface ShopOwnerRescheduleRequest {
  id: number;

  status:
    ShopOwnerRescheduleRequestStatus;

  status_label: string;

  requested_date: string;

  requested_starts_at: string;

  requested_ends_at: string;

  customer_reason: string | null;

  rejection_reason: string | null;

  appointment?:
    ShopOwnerRescheduleAppointment;

  reviewer?:
    ShopOwnerRescheduleReviewer;

  reviewed_at: string | null;

  created_at: string | null;

  updated_at: string | null;
}

export interface ShopOwnerRescheduleRequestsResponse {
  success: boolean;

  data: {
    reschedule_requests:
      ShopOwnerRescheduleRequest[];
  };
}

export interface ShopOwnerRescheduleRequestResponse {
  success: boolean;

  message?: string;

  data: {
    reschedule_request:
      ShopOwnerRescheduleRequest;
  };
}

/* ==========================================================================
   PROMOTIONS
   ========================================================================== */

export interface ShopOwnerPromoDiscount {
  type:
    ShopOwnerPromoDiscountType;

  type_label: string;

  value: string | number;
}

export interface ShopOwnerPromoService {
  id: number;

  name: string;

  is_active: boolean;
}

export interface ShopOwnerPromo {
  id: number;

  scope:
    ShopOwnerPromoScope;

  title: string;

  description: string | null;

  discount:
    ShopOwnerPromoDiscount;

  starts_at: string | null;

  ends_at: string | null;

  is_active: boolean;

  is_currently_active: boolean;

  is_upcoming: boolean;

  has_ended: boolean;

  service?:
    ShopOwnerPromoService | null;

  created_at: string | null;

  updated_at: string | null;
}

export interface ShopOwnerPromosResponse {
  success: boolean;

  data: {
    promos:
      ShopOwnerPromo[];
  };
}

export interface ShopOwnerPromoResponse {
  success: boolean;

  message?: string;

  data: {
    promo:
      ShopOwnerPromo;
  };
}

export interface DeleteShopOwnerPromoResponse {
  success: boolean;

  message: string;
}

export interface ShopOwnerPromoFormData {
  serviceId: number | null;

  title: string;

  description: string;

  discountType:
    ShopOwnerPromoDiscountType;

  discountValue: string;

  startsAt: string;

  endsAt: string;

  isActive: boolean;
}