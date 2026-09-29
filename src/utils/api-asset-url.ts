import {
    API_BASE_URL,
} from '@/src/config/api';


/**
 * Convert Laravel Storage::url() values such as /storage/... into an absolute
 * URL the mobile app can request from the same server as the StyleHub API.
 */
export function resolveApiAssetUrl(
  value: string | null | undefined,
): string | null {
  const cleanValue =
    value?.trim();

  if (
    !cleanValue
  ) {
    return null;
  }


  /*
  |--------------------------------------------------------------------------
  | Already Absolute
  |--------------------------------------------------------------------------
  */

  if (
    /^https?:\/\//i.test(
      cleanValue,
    )
  ) {
    return cleanValue;
  }


  /*
  |--------------------------------------------------------------------------
  | Resolve Against Laravel Server
  |--------------------------------------------------------------------------
  |
  | Example API:
  |
  | http://192.168.1.11:8000/api/v1
  |
  | Laravel Storage::url():
  |
  | /storage/shop-gallery/5/image.jpg
  |
  | Result:
  |
  | http://192.168.1.11:8000/storage/shop-gallery/5/image.jpg
  |
  */

  const apiOrigin =
    API_BASE_URL.replace(
      /\/api\/v1\/?$/i,
      '',
    );


  return `${apiOrigin}${
    cleanValue.startsWith('/')
      ? ''
      : '/'
  }${cleanValue}`;
}