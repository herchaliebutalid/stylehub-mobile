export type AppointmentAvailabilityUnavailableReason =
  | 'shop_not_accepting_appointments'
  | 'shop_closed'
  | 'shop_blocked_date'
  | 'no_available_slots';

export interface CustomerAvailableDate {
  date: string;
  day_label: string;
  short_day_label: string;
  is_open: boolean;
  is_available: boolean;
  available_slot_count: number;
  opens_at: string | null;
  closes_at: string | null;
  unavailable_reason: AppointmentAvailabilityUnavailableReason | null;
}

export interface CustomerAvailableSlot {
  starts_at: string;
  ends_at: string;
  label: string;
}

export interface AppointmentAvailabilityShopSummary {
  id: number;
  name: string;
}

export interface AppointmentAvailabilityServiceSummary {
  id: number;
  name: string;
  duration_minutes: number;
}

export interface CustomerAvailableDatesResponse {
  success: boolean;

  data: {
    shop: AppointmentAvailabilityShopSummary;

    service: AppointmentAvailabilityServiceSummary;

    timezone: string;

    slot_interval_minutes: number;

    booking_window: {
      from: string;
      to: string;
    };

    dates: CustomerAvailableDate[];
  };
}

export interface CustomerAvailableSlotsResponse {
  success: boolean;

  data: {
    shop: AppointmentAvailabilityShopSummary;

    service: AppointmentAvailabilityServiceSummary;

    timezone: string;

    slot_interval_minutes: number;

    date: {
      value: string;
      day_label: string;
      is_open: boolean;
      opens_at: string | null;
      closes_at: string | null;
      unavailable_reason: AppointmentAvailabilityUnavailableReason | null;
    };

    slots: CustomerAvailableSlot[];
  };
}