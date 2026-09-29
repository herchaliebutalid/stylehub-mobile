import {
    apiRequest,
} from '@/src/services/api';

import type {
    CustomerSavedShopMutationResponse,
    CustomerSavedShopsResponse,
    CustomerSavedShopStatusResponse,
} from '@/src/types/saved-shops';


/* ==========================================================================
   LIST SAVED SHOPS
   ========================================================================== */

export async function getCustomerSavedShops(
  token: string,
): Promise<CustomerSavedShopsResponse> {
  return apiRequest<CustomerSavedShopsResponse>(
    '/customer/saved-shops',
    {
      token,
    },
  );
}


/* ==========================================================================
   SAVED STATUS
   ========================================================================== */

export async function getCustomerSavedShopStatus(
  token: string,
  shopId: number,
): Promise<CustomerSavedShopStatusResponse> {
  return apiRequest<CustomerSavedShopStatusResponse>(
    `/customer/saved-shops/${shopId}/status`,
    {
      token,
    },
  );
}


/* ==========================================================================
   SAVE SHOP
   ========================================================================== */

export async function saveCustomerShop(
  token: string,
  shopId: number,
): Promise<CustomerSavedShopMutationResponse> {
  return apiRequest<CustomerSavedShopMutationResponse>(
    `/customer/saved-shops/${shopId}`,
    {
      method:
        'POST',

      token,
    },
  );
}


/* ==========================================================================
   REMOVE SAVED SHOP
   ========================================================================== */

export async function removeCustomerSavedShop(
  token: string,
  shopId: number,
): Promise<CustomerSavedShopMutationResponse> {
  return apiRequest<CustomerSavedShopMutationResponse>(
    `/customer/saved-shops/${shopId}`,
    {
      method:
        'DELETE',

      token,
    },
  );
}