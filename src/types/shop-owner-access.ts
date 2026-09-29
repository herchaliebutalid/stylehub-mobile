import type { AuthUser } from '@/src/types/auth';
import type { ShopOwnerShop } from '@/src/types/shop-owner';

export type ShopOwnerAdministrativeStatus =
  | 'active'
  | 'suspended';

export interface ShopOwnerSuspensionState {
  is_suspended: boolean;
  suspended_at: string | null;
  reason: string | null;
}

export interface ShopOwnerAccessShop
  extends ShopOwnerShop {
  administrative_status:
    ShopOwnerAdministrativeStatus;

  administrative_status_label:
    string;

  suspension:
    ShopOwnerSuspensionState;
}

export interface ShopOwnerAccessResponse {
  success: boolean;

  data: {
    user: AuthUser;
    shop: ShopOwnerAccessShop | null;
  };
}