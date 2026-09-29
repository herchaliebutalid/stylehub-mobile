import type {
    CustomerShop,
    CustomerShopLocation,
} from '@/src/types/customer';

export interface CustomerNearbyShop
  extends CustomerShop {
  location: CustomerShopLocation;

  distance_km: number;
}

export interface CustomerNearbyShopSearch {
  radius_km: number;

  limit: number;

  results_count: number;
}

export interface CustomerNearbyShopsResponse {
  success: boolean;

  data: {
    shops: CustomerNearbyShop[];

    search: CustomerNearbyShopSearch;
  };
}

export interface CustomerNearbyShopsQuery {
  latitude: number;

  longitude: number;

  radiusKm?: number;

  limit?: number;
}