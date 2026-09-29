import type {
    CustomerShop,
} from '@/src/types/customer';

export interface CustomerSavedShopsResponse {
  success: boolean;

  data: {
    shops: CustomerShop[];
  };
}

export interface CustomerSavedShopStatusResponse {
  success: boolean;

  data: {
    shop_id: number;

    is_saved: boolean;
  };
}

export interface CustomerSavedShopMutationResponse {
  success: boolean;

  message?: string;

  data: {
    shop_id: number;

    is_saved: boolean;
  };
}