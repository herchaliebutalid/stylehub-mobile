import type { ShopType } from '@/src/types/auth';
import type { ShopOwnerShop } from '@/src/types/shop-owner';

/* ==========================================================================
   SHOP OWNER EDITABLE SHOP PROFILE
   ========================================================================== */

export interface UpdateShopOwnerShopData {
  name: string;

  type: ShopType;

  description: string;

  phoneNumber: string;

  email: string;

  address: string;

  city: string;

  province: string;
}

export interface ShopOwnerShopProfileResponse {
  success: boolean;

  message?: string;

  data: {
    shop: ShopOwnerShop;
  };
}