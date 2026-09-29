export interface ShopOwnerBlockedDate {
  id: number;

  blocked_date: string;

  reason:
    | string
    | null;

  created_at:
    | string
    | null;

  updated_at:
    | string
    | null;
}

export interface ShopOwnerBlockedDatesResponse {
  success: boolean;

  data: {
    blocked_dates:
      ShopOwnerBlockedDate[];
  };
}

export interface ShopOwnerBlockedDateResponse {
  success: boolean;

  message?: string;

  data: {
    blocked_date:
      ShopOwnerBlockedDate;
  };
}

export interface DeleteShopOwnerBlockedDateResponse {
  success: boolean;

  message?: string;
}

export interface SaveShopOwnerBlockedDateData {
  blockedDate: string;

  reason: string;
}