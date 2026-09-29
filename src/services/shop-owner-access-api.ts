import { apiRequest } from '@/src/services/api';
import type { ShopOwnerAccessResponse } from '@/src/types/shop-owner-access';

export async function getShopOwnerAccess(
  token: string,
): Promise<ShopOwnerAccessResponse> {
  return apiRequest<ShopOwnerAccessResponse>(
    '/auth/me',
    {
      token,
    },
  );
}