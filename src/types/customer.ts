import type {
  ShopType,
} from '@/src/types/auth';

export type ShopAvailabilityStatus =
  | 'open'
  | 'closed'
  | 'fully_booked'
  | 'accepting_walk_ins';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined';

export type RescheduleRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export interface CustomerShopAvailability {
  status: ShopAvailabilityStatus;

  status_label: string;

  accepts_appointments: boolean;
}

export interface CustomerShopRating {
  average: number | null;

  review_count: number;
}

export interface CustomerShopOwnerPublicProfile {
  profile_photo_url: string | null;
}

export interface CustomerShopLocation {
  latitude: number | null;

  longitude: number | null;

  has_location: boolean;
}

export interface CustomerMediaImageState {
  has_image: boolean;

  image_url: string | null;
}

export interface CustomerShopGalleryImage {
  id: number;

  image_url: string;

  position: number;
}

export interface CustomerService {
  id: number;

  name: string;

  description: string | null;

  price: string | number;

  duration_minutes: number;

  image: CustomerMediaImageState;
}

export interface CustomerShopSchedule {
  day_of_week: number;

  day_label: string;

  is_open: boolean;

  opens_at: string | null;

  closes_at: string | null;
}

export interface CustomerPromoDiscount {
  type: string;

  type_label: string;

  value: string | number;
}

export interface CustomerPromoService {
  id: number;

  name: string;

  price: string | number;

  duration_minutes: number;
}

export interface CustomerPromo {
  id: number;

  scope:
    | 'shop_wide'
    | 'service_specific';

  title: string;

  description: string | null;

  discount: CustomerPromoDiscount;

  starts_at: string | null;

  ends_at: string | null;

  service?: CustomerPromoService | null;
}

export interface CustomerReview {
  id: number;

  rating: number;

  comment: string | null;

  verified_booking: boolean;

  reviewer: {
    label: string;
  };

  service?: {
    name: string;

    appointment_date: string;
  };

  created_at: string | null;
}

export interface CustomerShop {
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

  owner?: CustomerShopOwnerPublicProfile;

  location?: CustomerShopLocation;

  availability: CustomerShopAvailability;

  rating: CustomerShopRating;

  active_services_count?: number;
}

export interface CustomerShopDetail
  extends CustomerShop {
  location: CustomerShopLocation;

  gallery: CustomerShopGalleryImage[];

  services?: CustomerService[];

  schedule?: CustomerShopSchedule[];

  promos?: CustomerPromo[];

  recent_reviews?: CustomerReview[];
}

export interface CustomerShopPagination {
  current_page: number;

  per_page: number;

  total: number;

  last_page: number;

  has_more_pages: boolean;
}

export interface CustomerShopsResponse {
  success: boolean;

  data: {
    shops: CustomerShop[];

    pagination: CustomerShopPagination;
  };
}

export interface CustomerShopResponse {
  success: boolean;

  data: {
    shop: CustomerShopDetail;
  };
}

export interface CustomerShopFilters {
  search?: string;

  type?: ShopType;

  city?: string;

  province?: string;

  availabilityStatus?: ShopAvailabilityStatus;

  page?: number;

  perPage?: number;
}

export interface CustomerShopReviewsResponse {
  success: boolean;

  data: {
    shop: {
      id: number;

      name: string;

      rating: CustomerShopRating;
    };

    reviews: CustomerReview[];

    pagination: CustomerShopPagination;
  };
}

export interface CustomerShopReviewFilters {
  rating?: number;

  page?: number;

  perPage?: number;
}

export interface AppointmentServiceSnapshot {
  name: string;

  price: string | number | null;

  duration_minutes: number | null;
}

export interface AppointmentShopSummary {
  id: number;

  name: string;

  type: ShopType;

  type_label: string;
}

export interface AppointmentServiceSummary {
  id: number;

  name: string;
}

export interface CustomerAppointment {
  id: number;

  appointment_date: string;

  starts_at: string;

  ends_at: string;

  status: AppointmentStatus;

  status_label: string;

  service_snapshot: AppointmentServiceSnapshot;

  shop?: AppointmentShopSummary;

  service?: AppointmentServiceSummary;

  notes: string | null;

  cancellation_reason: string | null;

  cancelled_at: string | null;

  completed_at: string | null;

  created_at: string | null;

  updated_at: string | null;
}

export interface CustomerAppointmentsResponse {
  success: boolean;

  data: {
    appointments: CustomerAppointment[];
  };
}

export interface CustomerAppointmentResponse {
  success: boolean;

  message?: string;

  data: {
    appointment: CustomerAppointment;
  };
}

export interface CreateCustomerAppointmentData {
  shopId: number;

  serviceId: number;

  appointmentDate: string;

  startsAt: string;

  notes: string;
}

export interface CreateCustomerAppointmentResponse {
  success: boolean;

  message?: string;

  data: {
    appointment: CustomerAppointment;
  };
}

export interface CustomerRescheduleAppointment {
  id: number;

  appointment_date: string;

  starts_at: string;

  ends_at: string;

  status: AppointmentStatus;

  service_name: string;

  shop: {
    id: number;

    name: string;
  };
}

export interface CustomerRescheduleRequest {
  id: number;

  appointment_id: number;

  requested_date: string;

  requested_starts_at: string;

  requested_ends_at: string;

  status: RescheduleRequestStatus;

  status_label: string;

  customer_reason: string | null;

  rejection_reason: string | null;

  reviewed_at: string | null;

  appointment?: CustomerRescheduleAppointment;

  created_at: string | null;

  updated_at: string | null;
}

export interface CustomerRescheduleRequestsResponse {
  success: boolean;

  data: {
    reschedule_requests: CustomerRescheduleRequest[];
  };
}

export interface CustomerRescheduleRequestResponse {
  success: boolean;

  message?: string;

  data: {
    reschedule_request: CustomerRescheduleRequest;
  };
}

export interface CreateCustomerRescheduleRequestData {
  requestedDate: string;

  requestedStartsAt: string;

  reason: string;
}

export interface CustomerFeedbackAppointment {
  id: number;

  appointment_date: string;

  starts_at: string;

  ends_at: string;

  status: AppointmentStatus;

  service_snapshot: AppointmentServiceSnapshot;
}

export interface CustomerFeedback {
  id: number;

  rating: number;

  comment: string | null;

  appointment?: CustomerFeedbackAppointment;

  shop?: AppointmentShopSummary;

  created_at: string | null;

  updated_at: string | null;
}

export interface CustomerFeedbackListResponse {
  success: boolean;

  data: {
    feedback: CustomerFeedback[];
  };
}

export interface CustomerFeedbackResponse {
  success: boolean;

  message?: string;

  data: {
    feedback: CustomerFeedback;
  };
}

export interface CreateCustomerFeedbackData {
  rating: number;

  comment: string;
}