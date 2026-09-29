import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
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
  useWindowDimensions,
  View,
} from 'react-native';

import {
  COLORS,
} from '@/src/constants/colors';

import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';

import {
  useAuth,
} from '@/src/context/AuthContext';

import {
  ApiError,
} from '@/src/services/api';

import type {
  MobileUserRole,
} from '@/src/types/auth';


/* ==========================================================================
   TYPES
   ========================================================================== */

interface RoleLoginScreenProps {
  role:
    MobileUserRole;

  title:
    string;

  subtitle:
    string;

  icon:
    | 'person-outline'
    | 'storefront-outline';
}


/* ==========================================================================
   ROLE LOGIN SCREEN
   ========================================================================== */

export default function RoleLoginScreen({
  role,
  title,
  subtitle,
  icon,
}: RoleLoginScreenProps) {
  const {
    login,
    isSubmitting,
  } =
    useAuth();

  const {
    width,
    height,
  } =
    useWindowDimensions();


  /* ==========================================================================
     FORM STATE
     ========================================================================== */

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    passwordVisible,
    setPasswordVisible,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');


  /* ==========================================================================
     RESPONSIVE STATE
     ========================================================================== */

  const isSmallPhone =
    width < 360;

  const isShortScreen =
    height < 700;

  const isTablet =
    width >= 720;


  const horizontalPadding =
    isTablet
      ? 32
      : isSmallPhone
        ? 16
        : LAYOUT.screenPadding;


  /* ==========================================================================
     ROLE PRESENTATION
     ========================================================================== */

  const isCustomer =
    role ===
    'customer';

  const roleLabel =
    isCustomer
      ? 'Customer'
      : 'Shop Owner';

  const roleAccent =
    isCustomer
      ? COLORS.blue
      : COLORS.orange;

  const roleAccentSoft =
    isCustomer
      ? COLORS.blueSoft
      : COLORS.orangeSoft;

  const roleDescription =
    isCustomer
      ? 'Access your bookings, discover shops and manage your StyleHub experience.'
      : 'Access your shop dashboard, services, schedules and customer bookings.';


  /* ==========================================================================
     LOGIN
     ========================================================================== */

  async function handleLogin() {
    setErrorMessage('');

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      normalizedEmail ===
      ''
    ) {
      setErrorMessage(
        'Enter your email address.',
      );

      return;
    }

    if (
      password ===
      ''
    ) {
      setErrorMessage(
        'Enter your password.',
      );

      return;
    }

    try {
      const user =
        await login({
          role,

          email:
            normalizedEmail,

          password,
        });

      if (
        user.role ===
        'customer'
      ) {
        router.replace(
          '/(customer)/customer',
        );

        return;
      }

      router.replace(
        '/(shop-owner)/shop-owner',
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
        'Unable to sign in. Please try again.',
      );
    }
  }


  /* ==========================================================================
     FORGOT PASSWORD
     ========================================================================== */

  function handleForgotPassword() {
    router.push({
      pathname:
        '/forgot-password',

      params: {
        role,
      },
    });
  }


  /* ==========================================================================
     CREATE ACCOUNT
     ========================================================================== */

  function handleCreateAccount() {
    if (
      role ===
      'customer'
    ) {
      router.push(
        '/(auth)/customer-register',
      );

      return;
    }

    router.push(
      '/(auth)/shop-owner-register',
    );
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
          COLORS.background
        }
      />


      <KeyboardAvoidingView
        style={
          styles.keyboardView
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
            styles.scrollContent
          }
          bounces={
            false
          }
        >
          <View
            style={[
              styles.screen,

              {
                paddingHorizontal:
                  horizontalPadding,
              },

              isShortScreen &&
                styles.screenCompact,
            ]}
          >
            {/* ==============================================================
                TOP NAVIGATION
                ============================================================== */}

            <View
              style={
                styles.topBar
              }
            >
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                disabled={
                  isSubmitting
                }
                onPress={
                  () =>
                    router.back()
                }
                style={
                  styles.backButton
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={
                    COLORS.navy
                  }
                />
              </TouchableOpacity>
            </View>


            {/* ==============================================================
                HEADER
                ============================================================== */}

            <View
              style={[
                styles.headingSection,

                isShortScreen &&
                  styles.headingSectionCompact,
              ]}
            >
              <View
                style={[
                  styles.roleIconShell,

                  {
                    backgroundColor:
                      roleAccentSoft,
                  },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={
                    isSmallPhone
                      ? 25
                      : 28
                  }
                  color={
                    roleAccent
                  }
                />
              </View>


              <View
                style={[
                  styles.roleBadge,

                  {
                    backgroundColor:
                      roleAccentSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.roleBadgeDot,

                    {
                      backgroundColor:
                        roleAccent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.roleBadgeText,

                    {
                      color:
                        roleAccent,
                    },
                  ]}
                >
                  {roleLabel.toUpperCase()}
                </Text>
              </View>


              <Text
                style={[
                  styles.title,

                  isSmallPhone &&
                    styles.titleSmall,
                ]}
              >
                {title}
              </Text>


              <Text
                style={
                  styles.subtitle
                }
              >
                {subtitle}
              </Text>
            </View>


            {/* ==============================================================
                LOGIN CARD
                ============================================================== */}

            <View
              style={
                styles.loginCard
              }
            >
              <View
                style={
                  styles.cardHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardEyebrow
                    }
                  >
                    ACCOUNT ACCESS
                  </Text>

                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Sign in to continue
                  </Text>
                </View>


                <View
                  style={
                    styles.secureBadge
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={
                      COLORS.green
                    }
                  />

                  <Text
                    style={
                      styles.secureBadgeText
                    }
                  >
                    Secure
                  </Text>
                </View>
              </View>


              {/* ============================================================
                  EMAIL
                  ============================================================ */}

              <View
                style={
                  styles.field
                }
              >
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
                  <View
                    style={
                      styles.inputIcon
                    }
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={
                        COLORS.textMuted
                      }
                    />
                  </View>


                  <TextInput
                    value={email}
                    onChangeText={
                      (value) => {
                        setEmail(value);

                        if (
                          errorMessage
                        ) {
                          setErrorMessage('');
                        }
                      }
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    placeholder="name@example.com"
                    placeholderTextColor={
                      COLORS.textLight
                    }
                    editable={
                      !isSubmitting
                    }
                    multiline={false}
                    numberOfLines={1}
                    returnKeyType="next"
                    style={
                      styles.input
                    }
                  />
                </View>
              </View>


              {/* ============================================================
                  PASSWORD
                  ============================================================ */}

              <View
                style={
                  styles.field
                }
              >
                <View
                  style={
                    styles.passwordLabelRow
                  }
                >
                  <Text
                    style={
                      styles.label
                    }
                  >
                    Password
                  </Text>


                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={
                      isSubmitting
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password"
                    onPress={
                      handleForgotPassword
                    }
                    style={
                      styles.forgotButton
                    }
                  >
                    <Text
                      style={
                        styles.forgotText
                      }
                    >
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </View>


                <View
                  style={
                    styles.inputContainer
                  }
                >
                  <View
                    style={
                      styles.inputIcon
                    }
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={
                        COLORS.textMuted
                      }
                    />
                  </View>


                  <TextInput
                    value={password}
                    onChangeText={
                      (value) => {
                        setPassword(value);

                        if (
                          errorMessage
                        ) {
                          setErrorMessage('');
                        }
                      }
                    }
                    secureTextEntry={
                      !passwordVisible
                    }
                    textContentType="password"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter your password"
                    placeholderTextColor={
                      COLORS.textLight
                    }
                    editable={
                      !isSubmitting
                    }
                    multiline={false}
                    numberOfLines={1}
                    returnKeyType="done"
                    onSubmitEditing={
                      handleLogin
                    }
                    style={[
                      styles.input,

                      styles.passwordInput,
                    ]}
                  />


                  <TouchableOpacity
                    activeOpacity={0.65}
                    disabled={
                      isSubmitting
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      passwordVisible
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onPress={
                      () =>
                        setPasswordVisible(
                          (current) =>
                            !current,
                        )
                    }
                    style={
                      styles.passwordToggle
                    }
                  >
                    <Ionicons
                      name={
                        passwordVisible
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={20}
                      color={
                        COLORS.textMuted
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>


              {/* ============================================================
                  ERROR
                  ============================================================ */}

              {
                errorMessage
                  ? (
                    <View
                      style={
                        styles.errorBox
                      }
                    >
                      <View
                        style={
                          styles.errorIcon
                        }
                      >
                        <Ionicons
                          name="alert-circle-outline"
                          size={17}
                          color={
                            COLORS.danger
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.errorCopy
                        }
                      >
                        <Text
                          style={
                            styles.errorTitle
                          }
                        >
                          Unable to sign in
                        </Text>

                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {errorMessage}
                        </Text>
                      </View>
                    </View>
                  )
                  : null
              }


              {/* ============================================================
                  LOGIN BUTTON
                  ============================================================ */}

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={
                  isSubmitting
                }
                accessibilityRole="button"
                accessibilityLabel={`Sign in as ${roleLabel}`}
                onPress={
                  handleLogin
                }
                style={[
                  styles.loginButton,

                  isSubmitting &&
                    styles.loginButtonDisabled,
                ]}
              >
                {
                  isSubmitting
                    ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={
                            styles.loginButtonText
                          }
                        >
                          Signing in...
                        </Text>
                      </>
                    )
                    : (
                      <>
                        <Text
                          style={
                            styles.loginButtonText
                          }
                        >
                          Sign In
                        </Text>

                        <View
                          style={
                            styles.loginButtonIcon
                          }
                        >
                          <Ionicons
                            name="arrow-forward"
                            size={17}
                            color={
                              COLORS.white
                            }
                          />
                        </View>
                      </>
                    )
                }
              </TouchableOpacity>


              {/* ============================================================
                  ROLE INFORMATION
                  ============================================================ */}

              <View
                style={
                  styles.roleInformation
                }
              >
                <View
                  style={[
                    styles.roleInformationIcon,

                    {
                      backgroundColor:
                        roleAccentSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={icon}
                    size={16}
                    color={
                      roleAccent
                    }
                  />
                </View>


                <View
                  style={
                    styles.roleInformationCopy
                  }
                >
                  <Text
                    style={
                      styles.roleInformationTitle
                    }
                  >
                    {roleLabel} access
                  </Text>

                  <Text
                    style={
                      styles.roleInformationDescription
                    }
                  >
                    {roleDescription}
                  </Text>
                </View>
              </View>
            </View>


            {/* ==============================================================
                CREATE ACCOUNT
                ============================================================== */}

            <View
              style={
                styles.createCard
              }
            >
              <View
                style={
                  styles.createCopy
                }
              >
                <Text
                  style={
                    styles.createEyebrow
                  }
                >
                  NEW TO STYLEHUB?
                </Text>

                <Text
                  style={
                    styles.createTitle
                  }
                >
                  Create your {roleLabel.toLowerCase()} account
                </Text>

                <Text
                  style={
                    styles.createDescription
                  }
                >
                  {
                    isCustomer
                      ? 'Join StyleHub to discover shops and start booking services.'
                      : 'Register your account and submit your shop to join StyleHub.'
                  }
                </Text>
              </View>


              <TouchableOpacity
                activeOpacity={0.82}
                disabled={
                  isSubmitting
                }
                accessibilityRole="button"
                accessibilityLabel={`Create ${roleLabel} account`}
                onPress={
                  handleCreateAccount
                }
                style={
                  styles.createButton
                }
              >
                <Ionicons
                  name="person-add-outline"
                  size={17}
                  color={
                    COLORS.navy
                  }
                />

                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Create account
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={
                    COLORS.navy
                  }
                />
              </TouchableOpacity>
            </View>


            {/* ==============================================================
                SECURITY FOOTER
                ============================================================== */}

            <View
              style={
                styles.securityFooter
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={
                  COLORS.textLight
                }
              />

              <Text
                style={
                  styles.securityFooterText
                }
              >
                Secure StyleHub account access
              </Text>

              <View
                style={
                  styles.footerDot
                }
              />

              <Text
                style={
                  styles.securityFooterText
                }
              >
                {roleLabel}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },


    keyboardView: {
      flex: 1,
    },


    scrollContent: {
      flexGrow: 1,

      backgroundColor:
        COLORS.background,
    },


    screen: {
      width: '100%',

      maxWidth:
        LAYOUT.contentMaxWidth,

      flexGrow: 1,

      alignSelf: 'center',

      paddingTop:
        SPACING.sm,

      paddingBottom:
        SPACING.xxl,
    },


    screenCompact: {
      paddingTop:
        SPACING.xs,

      paddingBottom:
        SPACING.xl,
    },


    /* ======================================================================
       TOP BAR
       ====================================================================== */

    topBar: {
      minHeight: 52,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'flex-start',
    },


    backButton: {
      width:
        LAYOUT.iconButtonSize,

      height:
        LAYOUT.iconButtonSize,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surface,
    },


    /* ======================================================================
       HEADING
       ====================================================================== */

    headingSection: {
      alignItems: 'center',

      paddingTop:
        SPACING.lg,

      paddingBottom:
        SPACING.xxl,
    },


    headingSectionCompact: {
      paddingTop:
        SPACING.sm,

      paddingBottom:
        SPACING.xl,
    },


    roleIconShell: {
      width: 62,

      height: 62,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.xl,

      marginBottom:
        SPACING.md,
    },


    roleBadge: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius:
        RADII.pill,

      marginBottom:
        SPACING.sm,
    },


    roleBadgeDot: {
      width: 5,

      height: 5,

      borderRadius: 3,
    },


    roleBadgeText: {
      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1,
    },


    title: {
      maxWidth: 520,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.display,

      lineHeight: 36,

      fontWeight: '800',

      letterSpacing: -0.8,

      textAlign: 'center',
    },


    titleSmall: {
      fontSize: 26,

      lineHeight: 32,
    },


    subtitle: {
      maxWidth: 500,

      marginTop:
        SPACING.xs,

      color:
        COLORS.textMuted,

      fontSize:
        TYPOGRAPHY.secondary,

      lineHeight: 20,

      textAlign: 'center',
    },


    /* ======================================================================
       LOGIN CARD
       ====================================================================== */

    loginCard: {
      width: '100%',

      padding:
        SPACING.lg,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,

      ...SHADOWS.card,
    },


    cardHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      gap:
        SPACING.sm,

      marginBottom:
        SPACING.xl,
    },


    cardEyebrow: {
      color:
        COLORS.textLight,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1.2,
    },


    cardTitle: {
      marginTop: 3,

      color:
        COLORS.text,

      fontSize:
        TYPOGRAPHY.section,

      fontWeight: '800',

      letterSpacing: -0.25,
    },


    secureBadge: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      paddingHorizontal: 9,

      paddingVertical: 6,

      borderWidth: 1,

      borderColor:
        '#DCEDE5',

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.greenSoft,
    },


    secureBadgeText: {
      color:
        COLORS.green,

      fontSize: 9,

      fontWeight: '700',
    },


    /* ======================================================================
       FIELDS
       ====================================================================== */

    field: {
      marginBottom:
        SPACING.md,
    },


    label: {
      color:
        COLORS.navy,

      fontSize: 12,

      fontWeight: '700',
    },


    passwordLabelRow: {
      minHeight: 29,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      gap:
        SPACING.sm,

      marginBottom: 7,
    },


    forgotButton: {
      minHeight: 28,

      justifyContent: 'center',

      paddingLeft:
        SPACING.sm,
    },


    forgotText: {
      color:
        COLORS.blue,

      fontSize: 11,

      fontWeight: '700',
    },


    inputContainer: {
      minHeight: 54,

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal:
        SPACING.sm,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    inputIcon: {
      width: 31,

      height: 31,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.sm,

      backgroundColor:
        COLORS.surface,
    },


    input: {
      minWidth: 0,

      minHeight: 52,

      flex: 1,

      paddingHorizontal:
        SPACING.sm,

      paddingVertical: 0,

      color:
        COLORS.text,

      fontSize: 13,
    },


    passwordInput: {
      paddingRight:
        SPACING.xs,
    },


    passwordToggle: {
      width: 38,

      height: 42,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.sm,
    },


    /* ======================================================================
       ERROR
       ====================================================================== */

    errorBox: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap:
        SPACING.sm,

      marginBottom:
        SPACING.md,

      padding:
        SPACING.sm,

      borderWidth: 1,

      borderColor:
        '#F1CECE',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.dangerSoft,
    },


    errorIcon: {
      width: 30,

      height: 30,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.sm,

      backgroundColor:
        COLORS.white,
    },


    errorCopy: {
      minWidth: 0,

      flex: 1,
    },


    errorTitle: {
      color:
        COLORS.danger,

      fontSize: 11,

      fontWeight: '700',
    },


    errorText: {
      marginTop: 2,

      color:
        COLORS.danger,

      fontSize: 11,

      lineHeight: 16,
    },


    /* ======================================================================
       LOGIN BUTTON
       ====================================================================== */

    loginButton: {
      minHeight:
        LAYOUT.buttonHeight,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap:
        SPACING.xs,

      marginTop:
        SPACING.xs,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.navy,

      ...SHADOWS.card,
    },


    loginButtonDisabled: {
      opacity: 0.58,
    },


    loginButtonText: {
      color:
        COLORS.white,

      fontSize: 14,

      fontWeight: '700',
    },


    loginButtonIcon: {
      width: 26,

      height: 26,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.pill,

      backgroundColor:
        'rgba(255,255,255,0.08)',
    },


    /* ======================================================================
       ROLE INFORMATION
       ====================================================================== */

    roleInformation: {
      flexDirection: 'row',

      alignItems: 'center',

      gap:
        SPACING.sm,

      marginTop:
        SPACING.lg,

      paddingTop:
        SPACING.md,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,
    },


    roleInformationIcon: {
      width: 38,

      height: 38,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.md,
    },


    roleInformationCopy: {
      minWidth: 0,

      flex: 1,
    },


    roleInformationTitle: {
      color:
        COLORS.text,

      fontSize: 11,

      fontWeight: '700',
    },


    roleInformationDescription: {
      marginTop: 2,

      color:
        COLORS.textMuted,

      fontSize: 10,

      lineHeight: 15,
    },


    /* ======================================================================
       CREATE ACCOUNT
       ====================================================================== */

    createCard: {
      width: '100%',

      marginTop:
        SPACING.md,

      padding:
        SPACING.lg,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.surface,
    },


    createCopy: {
      marginBottom:
        SPACING.md,
    },


    createEyebrow: {
      color:
        COLORS.textLight,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1.1,
    },


    createTitle: {
      marginTop: 4,

      color:
        COLORS.text,

      fontSize: 14,

      fontWeight: '800',
    },


    createDescription: {
      marginTop: 4,

      color:
        COLORS.textMuted,

      fontSize: 11,

      lineHeight: 17,
    },


    createButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap:
        SPACING.xs,

      paddingHorizontal:
        SPACING.md,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    createButtonText: {
      flex: 1,

      color:
        COLORS.navy,

      fontSize: 12,

      fontWeight: '700',

      textAlign: 'center',
    },


    /* ======================================================================
       FOOTER
       ====================================================================== */

    securityFooter: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      flexWrap: 'wrap',

      gap: 7,

      marginTop:
        SPACING.xl,
    },


    securityFooterText: {
      color:
        COLORS.textLight,

      fontSize: 9,

      fontWeight: '600',
    },


    footerDot: {
      width: 3,

      height: 3,

      borderRadius: 2,

      backgroundColor:
        COLORS.textLight,
    },
  });