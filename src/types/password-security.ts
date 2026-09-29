import type {
    MobileUserRole,
} from '@/src/types/auth';

/* ==========================================================================
   FORGOT PASSWORD
   ========================================================================== */

export interface ForgotPasswordPayload {
  role:
    MobileUserRole;

  email:
    string;
}

export interface ForgotPasswordResponse {
  success:
    boolean;

  message:
    string;

  data?: {
    resend_after_seconds?:
      number;
  };
}

/* ==========================================================================
   RESET PASSWORD
   ========================================================================== */

export interface ResetPasswordPayload {
  role:
    MobileUserRole;

  email:
    string;

  code:
    string;

  password:
    string;

  passwordConfirmation:
    string;
}

export interface ResetPasswordResponse {
  success:
    boolean;

  message:
    string;
}

/* ==========================================================================
   CHANGE PASSWORD
   ========================================================================== */

export interface ChangePasswordPayload {
  currentPassword:
    string;

  password:
    string;

  passwordConfirmation:
    string;
}

export interface ChangePasswordResponse {
  success:
    boolean;

  message:
    string;
}