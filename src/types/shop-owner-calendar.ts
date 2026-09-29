import type {
    ShopOwnerAppointment,
    ShopOwnerAppointmentStatus,
    ShopOwnerDayOfWeek,
} from '@/src/types/shop-owner';

export interface ShopOwnerCalendarSchedule {
  is_open: boolean;

  opens_at: string | null;

  closes_at: string | null;
}

export interface ShopOwnerCalendarStatusCounts {
  pending: number;

  confirmed: number;

  completed: number;

  cancelled: number;

  declined: number;
}

export interface ShopOwnerCalendarDay {
  date: string;

  day_of_week:
    ShopOwnerDayOfWeek;

  day_label: string;

  short_day_label: string;

  day_number: number;

  is_today: boolean;

  schedule:
    ShopOwnerCalendarSchedule;

  is_blocked: boolean;

  blocked_reason:
    | string
    | null;

  break_period_count: number;

  has_break_periods: boolean;

  appointment_count: number;

  active_appointment_count: number;

  status_counts:
    ShopOwnerCalendarStatusCounts;
}

export interface ShopOwnerCalendarMonthData {
  month: string;

  month_label: string;

  timezone: string;

  days:
    ShopOwnerCalendarDay[];
}

export interface ShopOwnerCalendarMonthResponse {
  success: boolean;

  data:
    ShopOwnerCalendarMonthData;
}

export interface ShopOwnerDayAgendaDate {
  value: string;

  day_of_week:
    ShopOwnerDayOfWeek;

  day_label: string;

  long_label: string;

  is_today: boolean;
}

export interface ShopOwnerDayAgendaBlockedDate {
  id: number;

  reason:
    | string
    | null;
}

export interface ShopOwnerDayAgendaBreakPeriod {
  id: number;

  starts_at: string;

  ends_at: string;

  label:
    | string
    | null;
}

export interface ShopOwnerDayAgendaSummary {
  appointment_count: number;

  active_appointment_count: number;

  status_counts:
    ShopOwnerCalendarStatusCounts;
}

export interface ShopOwnerDayAgendaData {
  date:
    ShopOwnerDayAgendaDate;

  timezone: string;

  schedule:
    ShopOwnerCalendarSchedule;

  blocked_date:
    | ShopOwnerDayAgendaBlockedDate
    | null;

  break_periods:
    ShopOwnerDayAgendaBreakPeriod[];

  summary:
    ShopOwnerDayAgendaSummary;

  appointments:
    ShopOwnerAppointment[];
}

export interface ShopOwnerDayAgendaResponse {
  success: boolean;

  data:
    ShopOwnerDayAgendaData;
}

export interface ShopOwnerCalendarStatusFilterOption {
  value:
    | ShopOwnerAppointmentStatus
    | 'all';

  label: string;
}