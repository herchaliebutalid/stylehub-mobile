export type ShopOwnerSlotIntervalMinutes =
  | 5
  | 10
  | 15
  | 20
  | 30
  | 60;

export interface ShopOwnerBookingRules {
  is_customized: boolean;

  slot_interval_minutes:
    ShopOwnerSlotIntervalMinutes;

  minimum_lead_time_minutes: number;

  booking_window_days: number;

  cancellation_cutoff_minutes: number;

  reschedule_cutoff_minutes: number;
}

export interface ShopOwnerBookingRulesResponse {
  success: boolean;

  message?: string;

  data: {
    rules:
      ShopOwnerBookingRules;
  };
}

export interface UpdateShopOwnerBookingRulesData {
  slotIntervalMinutes:
    ShopOwnerSlotIntervalMinutes;

  minimumLeadTimeMinutes: number;

  bookingWindowDays: number;

  cancellationCutoffMinutes: number;

  rescheduleCutoffMinutes: number;
}