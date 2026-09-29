import type {
    ShopOwnerDayOfWeek,
} from '@/src/types/shop-owner';

export interface ShopOwnerBreakPeriod {
  id: number;

  day_of_week:
    ShopOwnerDayOfWeek;

  day_label: string;

  starts_at: string;

  ends_at: string;

  label:
    | string
    | null;

  created_at:
    | string
    | null;

  updated_at:
    | string
    | null;
}

export interface ShopOwnerBreakPeriodsResponse {
  success: boolean;

  data: {
    break_periods:
      ShopOwnerBreakPeriod[];
  };
}

export interface ShopOwnerBreakPeriodResponse {
  success: boolean;

  message?: string;

  data: {
    break_period:
      ShopOwnerBreakPeriod;
  };
}

export interface DeleteShopOwnerBreakPeriodResponse {
  success: boolean;

  message?: string;
}

export interface SaveShopOwnerBreakPeriodData {
  dayOfWeek:
    ShopOwnerDayOfWeek;

  startsAt: string;

  endsAt: string;

  label: string;
}