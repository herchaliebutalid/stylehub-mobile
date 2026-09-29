import {
    apiRequest,
} from '@/src/services/api';

import type {
    DeleteShopGalleryImageResponse,
    ReorderShopGalleryResponse,
    ShopOwnerGalleryResponse,
    ShopOwnerServiceImageResponse,
    UploadShopGalleryImageResponse,
} from '@/src/types/shop-media';


/* ==========================================================================
   SHOP GALLERY
   ========================================================================== */

export async function getShopOwnerGallery(
  token: string,
): Promise<ShopOwnerGalleryResponse> {
  return apiRequest<ShopOwnerGalleryResponse>(
    '/shop-owner/gallery',
    {
      token,
    },
  );
}


export async function uploadShopOwnerGalleryImage(
  token: string,
  formData: FormData,
): Promise<UploadShopGalleryImageResponse> {
  return apiRequest<UploadShopGalleryImageResponse>(
    '/shop-owner/gallery',
    {
      method: 'POST',

      token,

      body: formData,
    },
  );
}


export async function reorderShopOwnerGallery(
  token: string,
  imageIds: number[],
): Promise<ReorderShopGalleryResponse> {
  return apiRequest<ReorderShopGalleryResponse>(
    '/shop-owner/gallery/order',
    {
      method: 'PUT',

      token,

      body: {
        image_ids:
          imageIds,
      },
    },
  );
}


export async function deleteShopOwnerGalleryImage(
  token: string,
  imageId: number,
): Promise<DeleteShopGalleryImageResponse> {
  return apiRequest<DeleteShopGalleryImageResponse>(
    `/shop-owner/gallery/${imageId}`,
    {
      method: 'DELETE',

      token,
    },
  );
}


/* ==========================================================================
   SERVICE DISPLAY IMAGE
   ========================================================================== */

export async function uploadShopOwnerServiceImage(
  token: string,
  serviceId: number,
  formData: FormData,
): Promise<ShopOwnerServiceImageResponse> {
  return apiRequest<ShopOwnerServiceImageResponse>(
    `/shop-owner/services/${serviceId}/image`,
    {
      method: 'POST',

      token,

      body: formData,
    },
  );
}


export async function deleteShopOwnerServiceImage(
  token: string,
  serviceId: number,
): Promise<ShopOwnerServiceImageResponse> {
  return apiRequest<ShopOwnerServiceImageResponse>(
    `/shop-owner/services/${serviceId}/image`,
    {
      method: 'DELETE',

      token,
    },
  );
}