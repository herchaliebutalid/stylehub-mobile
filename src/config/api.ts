/*
|--------------------------------------------------------------------------
| StyleHub Mobile API Configuration
|--------------------------------------------------------------------------
|
| EXPO_PUBLIC_API_BASE_URL can override this during development.
|
| The fallback below uses the current Wi-Fi IPv4 address of the
| development computer.
|
| IMPORTANT:
| A physical phone cannot use 127.0.0.1 or localhost to reach Laravel
| running on the development computer.
|
*/

const DEVELOPMENT_API_BASE_URL =
  'http://192.168.1.11:8000/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
  DEVELOPMENT_API_BASE_URL;

export const API_TIMEOUT_MS = 15000;