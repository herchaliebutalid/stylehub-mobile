import type {
    ShopOwnerService,
} from '@/src/types/shop-owner';


/* ==========================================================================
   SHARED IMAGE STATE
   ========================================================================== */

export interface ShopMediaImageState {
  has_image: boolean;

  image_url: string | null;
}


/* ==========================================================================
   SHOP GALLERY
   ========================================================================== */

export interface ShopGalleryImage {
  id: number;

  image_url: string;

  position: number;

  created_at?: string | null;
}


export interface ShopOwnerGalleryResponse {
  success: boolean;

  data: {
    images: ShopGalleryImage[];

    max_images: number;
  };
}


export interface UploadShopGalleryImageResponse {
  success: boolean;

  message?: string;

  data: {
    image: ShopGalleryImage;
  };
}


export interface ReorderShopGalleryResponse {
  success: boolean;

  message?: string;

  data: {
    images: ShopGalleryImage[];
  };
}


export interface DeleteShopGalleryImageResponse {
  success: boolean;

  message?: string;
}


/* ==========================================================================
   SERVICE DISPLAY IMAGE
   ========================================================================== */

export type ShopOwnerServiceWithImage =
  ShopOwnerService & {
    image: ShopMediaImageState;
  };


export interface ShopOwnerServiceImageResponse {
  success: boolean;

  message?: string;

  data: {
    service: ShopOwnerServiceWithImage;
  };
}