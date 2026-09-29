import {
    Ionicons,
} from '@expo/vector-icons';

import {
    router,
    useLocalSearchParams,
} from 'expo-router';

import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    COLORS,
} from '@/src/constants/colors';

import {
    ApiError,
} from '@/src/services/api';

import {
    requestPasswordReset,
    resetPassword,
} from '@/src/services/password-security-api';

import type {
    MobileUserRole,
} from '@/src/types/auth';

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const OTP_LENGTH =
  6;

const DEFAULT_RESEND_SECONDS =
  60;

/* ==========================================================================
   HELPERS
   ========================================================================== */

function isMobileUserRole(
  value: unknown,
): value is MobileUserRole {
  return (
    value ===
      'customer'
    ||
    value ===
      'shop_owner'
  );
}

function sanitizeOtp(
  value: string,
): string {
  return value
    .replace(
      /\D/g,
      '',
    )
    .slice(
      0,
      OTP_LENGTH,
    );
}

function formatCountdown(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      seconds,
    );

  const minutes =
    Math.floor(
      safeSeconds /
      60,
    );

  const remainingSeconds =
    safeSeconds %
    60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(
      2,
      '0',
    )}`;
}

/* ==========================================================================
   FORGOT PASSWORD SCREEN
   ========================================================================== */

export default function ForgotPasswordScreen() {
  const params =
    useLocalSearchParams<{
      role?:
        string;
    }>();

  const role =
    useMemo<MobileUserRole>(
      () =>
        isMobileUserRole(
          params.role,
        )
          ? params.role
          : 'customer',
      [
        params.role,
      ],
    );

  const [
    step,
    setStep,
  ] =
    useState<
      'request'
      |
      'reset'
    >(
      'request',
    );

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    code,
    setCode,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] =
    useState('');

  const [
    passwordVisible,
    setPasswordVisible,
  ] =
    useState(false);

  const [
    confirmationVisible,
    setConfirmationVisible,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    resendRemaining,
    setResendRemaining,
  ] =
    useState(0);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    infoMessage,
    setInfoMessage,
  ] =
    useState('');

  /* ==========================================================================
     DERIVED DATA
     ========================================================================== */

  const roleLabel =
    role ===
    'customer'
      ? 'Customer'
      : 'Shop Owner';

  const normalizedEmail =
    email
      .trim()
      .toLowerCase();

  /* ==========================================================================
     RESEND TIMER
     ========================================================================== */

  useEffect(
    () => {
      if (
        resendRemaining <=
        0
      ) {
        return;
      }

      const timer =
        setInterval(
          () => {
            setResendRemaining(
              (current) =>
                Math.max(
                  0,
                  current - 1,
                ),
            );
          },
          1000,
        );

      return () => {
        clearInterval(
          timer,
        );
      };
    },
    [
      resendRemaining,
    ],
  );

  /* ==========================================================================
     REQUEST RESET CODE
     ========================================================================== */

  async function handleRequestCode(): Promise<void> {
    setErrorMessage('');
    setInfoMessage('');

    if (
      normalizedEmail ===
      ''
    ) {
      setErrorMessage(
        'Enter your email address.',
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      const response =
        await requestPasswordReset({
          role,

          email:
            normalizedEmail,
        });

      const cooldown =
        Math.max(
          0,
          Math.trunc(
            response
              .data
              ?.resend_after_seconds
            ??
            DEFAULT_RESEND_SECONDS,
          ),
        );

      setResendRemaining(
        cooldown,
      );

      setInfoMessage(
        response.message,
      );

      setStep(
        'reset',
      );
    } catch (error) {
      if (
        error instanceof
        ApiError
      ) {
        setErrorMessage(
          error.message,
        );

        return;
      }

      setErrorMessage(
        'Unable to request a password reset right now.',
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /* ==========================================================================
     RESEND
     ========================================================================== */

  async function handleResend(): Promise<void> {
    if (
      resendRemaining >
      0
    ) {
      return;
    }

    await handleRequestCode();
  }

  /* ==========================================================================
     RESET PASSWORD
     ========================================================================== */

  async function handleResetPassword(): Promise<void> {
    setErrorMessage('');

    const cleanCode =
      sanitizeOtp(
        code,
      );

    if (
      cleanCode.length !==
      OTP_LENGTH
    ) {
      setErrorMessage(
        'Enter the complete 6-digit password reset code.',
      );

      return;
    }

    if (
      password.length <
      12
    ) {
      setErrorMessage(
        'Your new password must contain at least 12 characters.',
      );

      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setErrorMessage(
        'The password confirmation does not match.',
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      await resetPassword({
        role,

        email:
          normalizedEmail,

        code:
          cleanCode,

        password,

        passwordConfirmation,
      });

      /*
      |--------------------------------------------------------------------------
      | Reset Was Successful
      |--------------------------------------------------------------------------
      |
      | Laravel revoked every existing Sanctum token for this account.
      |
      | The user therefore signs in again using the new password.
      |
      */

      if (
        role ===
        'customer'
      ) {
        router.replace(
          '/(auth)/customer-login',
        );

        return;
      }

      router.replace(
        '/(auth)/shop-owner-login',
      );
    } catch (error) {
      if (
        error instanceof
        ApiError
      ) {
        setErrorMessage(
          error.message,
        );

        return;
      }

      setErrorMessage(
        'Unable to reset your password right now.',
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /* ==========================================================================
     BACK
     ========================================================================== */

  function handleBack(): void {
    if (
      step ===
      'reset'
    ) {
      setStep(
        'request',
      );

      setCode('');
      setPassword('');
      setPasswordConfirmation('');
      setErrorMessage('');
      setInfoMessage('');

      return;
    }

    router.back();
  }

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.white
        }
      />

      <KeyboardAvoidingView
        style={
          styles.flex
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.container
          }
        >
          {/* ================================================================
              BACK
              ================================================================ */}

          <TouchableOpacity
            activeOpacity={
              0.65
            }
            disabled={
              isSubmitting
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={
              handleBack
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={28}
              color={
                COLORS.navy
              }
            />
          </TouchableOpacity>

          {/* ================================================================
              HEADING
              ================================================================ */}

          <View
            style={
              styles.iconCircle
            }
          >
            <Ionicons
              name="key-outline"
              size={31}
              color={
                COLORS.navy
              }
            />
          </View>

          <Text
            style={
              styles.title
            }
          >
            {
              step ===
              'request'
                ? 'Forgot your password?'
                : 'Create a new password'
            }
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {
              step ===
              'request'
                ? `Enter the email address for your ${roleLabel} account. If an eligible account matches, StyleHub will send a reset code to its registered mobile number.`
                : 'Enter the 6-digit code sent to your registered mobile number, then choose a new password.'
            }
          </Text>

          <View
            style={
              styles.roleBadge
            }
          >
            <Ionicons
              name={
                role ===
                'customer'
                  ? 'person-outline'
                  : 'storefront-outline'
              }
              size={16}
              color={
                COLORS.navy
              }
            />

            <Text
              style={
                styles.roleText
              }
            >
              {roleLabel}
            </Text>
          </View>

          {/* ================================================================
              EMAIL
              ================================================================ */}

          <Text
            style={
              styles.label
            }
          >
            Email address
          </Text>

          <View
            style={
              styles.inputContainer
            }
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={
                COLORS.navy
              }
            />

            <TextInput
              value={
                email
              }
              onChangeText={
                (
                  value,
                ) => {
                  setEmail(
                    value,
                  );

                  if (
                    errorMessage
                  ) {
                    setErrorMessage('');
                  }
                }
              }
              editable={
                !isSubmitting
                &&
                step ===
                  'request'
              }
              autoCapitalize="none"
              autoCorrect={
                false
              }
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="name@example.com"
              placeholderTextColor={
                COLORS.textLight
              }
              style={
                styles.input
              }
            />
          </View>

          {/* ================================================================
              REQUEST STEP
              ================================================================ */}

          {
            step ===
            'request'
              ? (
                <>
                  {
                    errorMessage
                      ? (
                        <ErrorBox
                          message={
                            errorMessage
                          }
                        />
                      )
                      : null
                  }

                  <TouchableOpacity
                    activeOpacity={
                      0.85
                    }
                    disabled={
                      isSubmitting
                    }
                    onPress={
                      () =>
                        void handleRequestCode()
                    }
                    style={[
                      styles.primaryButton,

                      isSubmitting &&
                        styles.disabledButton,
                    ]}
                  >
                    {
                      isSubmitting
                        ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.white
                            }
                          />
                        )
                        : (
                          <>
                            <Text
                              style={
                                styles.primaryButtonText
                              }
                            >
                              Send Reset Code
                            </Text>

                            <Ionicons
                              name="arrow-forward"
                              size={19}
                              color={
                                COLORS.white
                              }
                            />
                          </>
                        )
                    }
                  </TouchableOpacity>
                </>
              )
              : (
                <>
                  {/* ========================================================
                      OTP
                      ======================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    6-digit reset code
                  </Text>

                  <View
                    style={
                      styles.inputContainer
                    }
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={
                        COLORS.navy
                      }
                    />

                    <TextInput
                      value={
                        code
                      }
                      onChangeText={
                        (
                          value,
                        ) => {
                          setCode(
                            sanitizeOtp(
                              value,
                            ),
                          );

                          if (
                            errorMessage
                          ) {
                            setErrorMessage('');
                          }
                        }
                      }
                      editable={
                        !isSubmitting
                      }
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      maxLength={
                        OTP_LENGTH
                      }
                      placeholder="000000"
                      placeholderTextColor={
                        COLORS.textLight
                      }
                      style={[
                        styles.input,
                        styles.codeInput,
                      ]}
                    />
                  </View>

                  {/* ========================================================
                      NEW PASSWORD
                      ======================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    New password
                  </Text>

                  <View
                    style={
                      styles.inputContainer
                    }
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        COLORS.navy
                      }
                    />

                    <TextInput
                      value={
                        password
                      }
                      onChangeText={
                        setPassword
                      }
                      editable={
                        !isSubmitting
                      }
                      secureTextEntry={
                        !passwordVisible
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      textContentType="newPassword"
                      placeholder="Enter your new password"
                      placeholderTextColor={
                        COLORS.textLight
                      }
                      style={[
                        styles.input,
                        styles.passwordInput,
                      ]}
                    />

                    <TouchableOpacity
                      activeOpacity={
                        0.65
                      }
                      disabled={
                        isSubmitting
                      }
                      onPress={
                        () =>
                          setPasswordVisible(
                            (
                              current,
                            ) =>
                              !current,
                          )
                      }
                      style={
                        styles.eyeButton
                      }
                    >
                      <Ionicons
                        name={
                          passwordVisible
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={
                          COLORS.navy
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ========================================================
                      CONFIRM PASSWORD
                      ======================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Confirm new password
                  </Text>

                  <View
                    style={
                      styles.inputContainer
                    }
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        COLORS.navy
                      }
                    />

                    <TextInput
                      value={
                        passwordConfirmation
                      }
                      onChangeText={
                        setPasswordConfirmation
                      }
                      editable={
                        !isSubmitting
                      }
                      secureTextEntry={
                        !confirmationVisible
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      textContentType="newPassword"
                      placeholder="Confirm your new password"
                      placeholderTextColor={
                        COLORS.textLight
                      }
                      style={[
                        styles.input,
                        styles.passwordInput,
                      ]}
                    />

                    <TouchableOpacity
                      activeOpacity={
                        0.65
                      }
                      disabled={
                        isSubmitting
                      }
                      onPress={
                        () =>
                          setConfirmationVisible(
                            (
                              current,
                            ) =>
                              !current,
                          )
                      }
                      style={
                        styles.eyeButton
                      }
                    >
                      <Ionicons
                        name={
                          confirmationVisible
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={
                          COLORS.navy
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ========================================================
                      PASSWORD POLICY
                      ======================================================== */}

                  <View
                    style={
                      styles.policyBox
                    }
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={
                        COLORS.navy
                      }
                    />

                    <Text
                      style={
                        styles.policyText
                      }
                    >
                      Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol.
                    </Text>
                  </View>

                  {
                    infoMessage
                      ? (
                        <InfoBox
                          message={
                            infoMessage
                          }
                        />
                      )
                      : null
                  }

                  {
                    errorMessage
                      ? (
                        <ErrorBox
                          message={
                            errorMessage
                          }
                        />
                      )
                      : null
                  }

                  {/* ========================================================
                      RESET
                      ======================================================== */}

                  <TouchableOpacity
                    activeOpacity={
                      0.85
                    }
                    disabled={
                      isSubmitting
                    }
                    onPress={
                      () =>
                        void handleResetPassword()
                    }
                    style={[
                      styles.primaryButton,

                      isSubmitting &&
                        styles.disabledButton,
                    ]}
                  >
                    {
                      isSubmitting
                        ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.white
                            }
                          />
                        )
                        : (
                          <Text
                            style={
                              styles.primaryButtonText
                            }
                          >
                            Reset Password
                          </Text>
                        )
                    }
                  </TouchableOpacity>

                  {/* ========================================================
                      RESEND
                      ======================================================== */}

                  <View
                    style={
                      styles.resendSection
                    }
                  >
                    <Text
                      style={
                        styles.resendHelp
                      }
                    >
                      Didn&apos;t receive the code?
                    </Text>

                    <TouchableOpacity
                      activeOpacity={
                        0.7
                      }
                      disabled={
                        isSubmitting
                        ||
                        resendRemaining >
                          0
                      }
                      onPress={
                        () =>
                          void handleResend()
                      }
                      style={
                        styles.resendButton
                      }
                    >
                      <Text
                        style={[
                          styles.resendText,

                          (
                            isSubmitting
                            ||
                            resendRemaining >
                              0
                          )
                          &&
                            styles.resendTextDisabled,
                        ]}
                      >
                        {
                          resendRemaining >
                          0
                            ? `Resend in ${formatCountdown(resendRemaining)}`
                            : 'Resend code'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )
          }
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ==========================================================================
   INFO BOX
   ========================================================================== */

function InfoBox({
  message,
}: {
  message:
    string;
}) {
  return (
    <View
      style={
        styles.infoBox
      }
    >
      <Ionicons
        name="checkmark-circle-outline"
        size={18}
        color={
          COLORS.success
        }
      />

      <Text
        style={
          styles.infoText
        }
      >
        {message}
      </Text>
    </View>
  );
}

/* ==========================================================================
   ERROR BOX
   ========================================================================== */

function ErrorBox({
  message,
}: {
  message:
    string;
}) {
  return (
    <View
      style={
        styles.errorBox
      }
    >
      <Ionicons
        name="alert-circle-outline"
        size={18}
        color={
          COLORS.danger
        }
      />

      <Text
        style={
          styles.errorText
        }
      >
        {message}
      </Text>
    </View>
  );
}

/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.white,
    },

    flex: {
      flex:
        1,
    },

    container: {
      flexGrow:
        1,

      paddingHorizontal:
        24,

      paddingTop:
        20,

      paddingBottom:
        42,

      backgroundColor:
        COLORS.white,
    },

    backButton: {
      width:
        44,

      height:
        44,

      alignItems:
        'flex-start',

      justifyContent:
        'center',

      marginBottom:
        22,
    },

    iconCircle: {
      width:
        72,

      height:
        72,

      alignItems:
        'center',

      justifyContent:
        'center',

      alignSelf:
        'center',

      borderRadius:
        24,

      backgroundColor:
        COLORS.accentSoft,
    },

    title: {
      marginTop:
        22,

      color:
        COLORS.navy,

      fontSize:
        24,

      lineHeight:
        30,

      fontWeight:
        '700',

      textAlign:
        'center',
    },

    subtitle: {
      marginTop:
        10,

      color:
        COLORS.textMuted,

      fontSize:
        12,

      lineHeight:
        19,

      textAlign:
        'center',
    },

    roleBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      alignSelf:
        'center',

      gap:
        7,

      marginTop:
        18,

      marginBottom:
        26,

      paddingHorizontal:
        13,

      paddingVertical:
        8,

      borderRadius:
        999,

      backgroundColor:
        COLORS.accentSoft,
    },

    roleText: {
      color:
        COLORS.navy,

      fontSize:
        11,

      fontWeight:
        '700',
    },

    label: {
      marginTop:
        18,

      marginBottom:
        9,

      color:
        COLORS.navy,

      fontSize:
        13,

      fontWeight:
        '700',
    },

    inputContainer: {
      minHeight:
        58,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,

      paddingHorizontal:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,
    },

    input: {
      flex:
        1,

      minWidth:
        0,

      minHeight:
        56,

      paddingVertical:
        0,

      color:
        COLORS.text,

      fontSize:
        13,
    },

    codeInput: {
      letterSpacing:
        6,

      fontWeight:
        '700',
    },

    passwordInput: {
      paddingRight:
        2,
    },

    eyeButton: {
      width:
        38,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    policyBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      marginTop:
        14,

      padding:
        13,

      borderRadius:
        13,

      backgroundColor:
        COLORS.accentSoft,
    },

    policyText: {
      flex:
        1,

      color:
        COLORS.textMuted,

      fontSize:
        10,

      lineHeight:
        16,
    },

    infoBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      marginTop:
        14,

      padding:
        13,

      borderRadius:
        13,

      backgroundColor:
        COLORS.successSoft,
    },

    infoText: {
      flex:
        1,

      color:
        COLORS.success,

      fontSize:
        10,

      lineHeight:
        16,
    },

    errorBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      marginTop:
        14,

      padding:
        13,

      borderRadius:
        13,

      backgroundColor:
        COLORS.dangerSoft,
    },

    errorText: {
      flex:
        1,

      color:
        COLORS.danger,

      fontSize:
        10,

      lineHeight:
        16,
    },

    primaryButton: {
      minHeight:
        58,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        9,

      marginTop:
        22,

      borderRadius:
        17,

      backgroundColor:
        COLORS.navy,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontSize:
        14,

      fontWeight:
        '700',
    },

    disabledButton: {
      opacity:
        0.55,
    },

    resendSection: {
      alignItems:
        'center',

      marginTop:
        19,
    },

    resendHelp: {
      color:
        COLORS.textMuted,

      fontSize:
        10,
    },

    resendButton: {
      minHeight:
        38,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        12,
    },

    resendText: {
      color:
        COLORS.blue,

      fontSize:
        11,

      fontWeight:
        '700',
    },

    resendTextDisabled: {
      color:
        COLORS.textLight,
    },
  });