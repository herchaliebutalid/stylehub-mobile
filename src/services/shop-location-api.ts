import {
    apiRequest,
} from '@/src/services/api';

import type {
    ShopLocationResponse,
    UpdateShopLocationData,
} from '@/src/types/shop-location';

export async function getShopOwnerLocation(
  token: string,
): Promise<ShopLocationResponse> {
  return apiRequest<ShopLocationResponse>(
    '/shop-owner/location',
    {
      token,
    },
  );
}

export async function updateShopOwnerLocation(
  token: string,
  data: UpdateShopLocationData,
): Promise<ShopLocationResponse> {
  return apiRequest<ShopLocationResponse>(
    '/shop-owner/location',
    {
      method: 'PUT',

      token,

      body: {
        latitude:
          data.latitude,

        longitude:
          data.longitude,
      },
    },
  );
}