export interface ShopLocation {
  shop_id: number;

  shop_name: string;

  address: string;

  city: string;

  province: string;

  latitude: number | null;

  longitude: number | null;

  has_location: boolean;
}

export interface ShopLocationResponse {
  success: boolean;

  message?: string;

  data: {
    location: ShopLocation;
  };
}

export interface UpdateShopLocationData {
  latitude: number;

  longitude: number;
}