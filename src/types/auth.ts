export type MobileUserRole =
  | 'customer'
  | 'shop_owner';

export type UserStatus =
  | 'active'
  | 'suspended';

export type ShopType =
  | 'barber_shop'
  | 'beauty_parlor';

/* ==========================================================================
   AUTH USER
   ========================================================================== */

export interface AuthUser {
  id: number;

  first_name?:
    | string
    | null;

  middle_name?:
    | string
    | null;

  last_name?:
    | string
    | null;

  full_name?:
    | string
    | null;

  email:
    string;

  phone_number?:
    | string
    | null;

  /*
  |--------------------------------------------------------------------------
  | Phone Verification
  |--------------------------------------------------------------------------
  |
  | This value comes from Laravel.
  |
  | The mobile application must never decide on its own that a phone
  | number is verified.
  |
  */

  phone_verified:
    boolean;

  /*
  |--------------------------------------------------------------------------
  | Profile Photo
  |--------------------------------------------------------------------------
  */

  profile_photo_url?:
    | string
    | null;

  role:
    MobileUserRole;

  status:
    UserStatus;

  last_login_at?:
    | string
    | null;
}

/* ==========================================================================
   AUTH SESSION
   ========================================================================== */

export interface AuthSession {
  token:
    string;

  expiresAt:
    string | null;

  user:
    AuthUser;
}

/* ==========================================================================
   CUSTOMER REGISTRATION
   ========================================================================== */

export interface CustomerRegistrationData {
  firstName:
    string;

  middleName:
    string;

  lastName:
    string;

  email:
    string;

  phoneNumber:
    string;

  password:
    string;

  passwordConfirmation:
    string;
}

/* ==========================================================================
   SHOP OWNER REGISTRATION
   ========================================================================== */

export interface ShopOwnerRegistrationData
  extends CustomerRegistrationData {
  shop: {
    name:
      string;

    type:
      ShopType;

    description:
      string;

    phoneNumber:
      string;

    email:
      string;

    address:
      string;

    city:
      string;

    province:
      string;
  };
}

/* ==========================================================================
   LOGIN RESPONSE
   ========================================================================== */

export interface LoginResponse {
  success:
    boolean;

  message?:
    string;

  data?: {
    token?:
      string;

    token_type?:
      string;

    expires_at?:
      string | null;

    user?:
      AuthUser;
  };
}

/* ==========================================================================
   CUSTOMER REGISTRATION RESPONSE
   ========================================================================== */

export interface CustomerRegistrationResponse {
  success:
    boolean;

  message?:
    string;

  data?: {
    token?:
      string;

    token_type?:
      string;

    expires_at?:
      string | null;

    user?:
      AuthUser;
  };
}

/* ==========================================================================
   SHOP OWNER REGISTRATION RESPONSE
   ========================================================================== */

export interface ShopOwnerRegistrationResponse {
  success:
    boolean;

  message?:
    string;

  data?: {
    token?:
      string;

    token_type?:
      string;

    expires_at?:
      string | null;

    user?:
      AuthUser;

    shop?:
      unknown;
  };
}

/* ==========================================================================
   AUTHENTICATED USER RESPONSE
   ========================================================================== */

export interface MeResponse {
  success:
    boolean;

  data?: {
    user?:
      AuthUser;
  };
}

/* ==========================================================================
   PHONE VERIFICATION
   ========================================================================== */

export interface PhoneVerificationSendData {
  /*
  |--------------------------------------------------------------------------
  | Masked Phone Number
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | 0917***4567
  |
  */

  phone_number:
    string;

  /*
  |--------------------------------------------------------------------------
  | Server Expiration
  |--------------------------------------------------------------------------
  */

  expires_at:
    string;

  /*
  |--------------------------------------------------------------------------
  | Resend Cooldown
  |--------------------------------------------------------------------------
  */

  resend_after_seconds:
    number;
}

export interface PhoneVerificationSendResponse {
  success:
    boolean;

  message?:
    string;

  data?:
    PhoneVerificationSendData;
}

export interface PhoneVerificationVerifyResponse {
  success:
    boolean;

  message?:
    string;

  data?: {
    user?:
      AuthUser;
  };
}

/* ==========================================================================
   UNVERIFIED PHONE NUMBER RECOVERY
   ========================================================================== */

export interface UpdateUnverifiedPhoneNumberData {
  phoneNumber:
    string;

  currentPassword:
    string;
}

export interface UpdateUnverifiedPhoneNumberResponse {
  success:
    boolean;

  message?:
    string;

  data?: {
    user?:
      AuthUser;
  };
}