import { apiRequest } from '@/src/services/api';
import type {
    ShopOwnerShopProfileResponse,
    UpdateShopOwnerShopData,
} from '@/src/types/shop-owner-shop';

/* ==========================================================================
   GET OWN SHOP PROFILE
   ========================================================================== */

export async function getShopOwnerShopProfile(
  token: string,
): Promise<ShopOwnerShopProfileResponse> {
  return apiRequest<ShopOwnerShopProfileResponse>(
    '/shop-owner/shop',
    {
      token,
    },
  );
}

/* ==========================================================================
   UPDATE OWN SHOP PROFILE
   ========================================================================== */

export async function updateShopOwnerShopProfile(
  token: string,
  data: UpdateShopOwnerShopData,
): Promise<ShopOwnerShopProfileResponse> {
  return apiRequest<ShopOwnerShopProfileResponse>(
    '/shop-owner/shop',
    {
      method: 'PUT',

      token,

      body: {
        name: data.name.trim(),

        type: data.type,

        description:
          data.description.trim() === ''
            ? null
            : data.description.trim(),

        phone_number: data.phoneNumber.trim(),

        email:
          data.email.trim() === ''
            ? null
            : data.email.trim(),

        address: data.address.trim(),

        city: data.city.trim(),

        province: data.province.trim(),
      },
    },
  );
}