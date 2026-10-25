
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { LAYOUT } from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import type { MobileUserRole } from '@/src/types/auth';

/* ==========================================================
   STYLEHUB LOGIN THEME
   Dark Navy / Warm Orange / White
   ========================================================== */

const THEME = {
  navy: '#08131F',
  navyDark: '#06101A',
  navyLight: '#162635',

  orange: '#D99202',
  orangeDark: '#C78200',
  orangeSoft: '#F8E8CC',

  white: '#FFFFFF',
  offWhite: '#F7F8FA',

  text: '#152432',
  muted: '#6B7A89',
  mutedLight: '#B7C2CE',

  border: '#E7EBF0',
  customerSoft: '#EEF3F8',

  danger: '#C43D43',
  dangerSoft: '#FFF0F0',

  green: '#167C51',
  greenSoft: '#E7F7EF',
};

interface RoleLoginScreenProps {
  role: MobileUserRole;
  title: string;
  subtitle: string;
  icon: 'person-outline' | 'storefront-outline';
}

/* ==========================================================
   SHARED CUSTOMER / SHOP OWNER LOGIN
   ========================================================== */

export default function RoleLoginScreen({
  role,
  title,
  subtitle,
  icon,
}: RoleLoginScreenProps) {
  const { login, isSubmitting } = useAuth();

  const { width } = useWindowDimensions();

  /* FORM STATE */

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [passwordVisible, setPasswordVisible] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  /* RESPONSIVE SETTINGS */

  const isSmallPhone = width < 360;
  const isTablet = width >= 720;

  const horizontalPadding = isTablet
    ? 32
    : isSmallPhone
      ? 16
      : 22;

  /* ROLE SETTINGS */

  const isCustomer = role === 'customer';

  const roleLabel = isCustomer
    ? 'Customer'
    : 'Shop Owner';

  const roleDescription = isCustomer
    ? 'Access your bookings, discover shops and manage your StyleHub experience.'
    : 'Access your shop dashboard, services, schedules and customer bookings.';

  /* LOGIN */

  async function handleLogin() {
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === '') {
      setErrorMessage('Enter your email address.');
      return;
    }

    if (password === '') {
      setErrorMessage('Enter your password.');
      return;
    }

    try {
      const user = await login({
        role,
        email: normalizedEmail,
        password,
      });

      if (user.role === 'customer') {
        router.replace('/(customer)/customer');
        return;
      }

      router.replace('/(shop-owner)/shop-owner');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(
        'Unable to sign in. Please try again.',
      );
    }
  }

  /* FORGOT PASSWORD */

  function handleForgotPassword() {
    router.push({
      pathname: '/forgot-password',
      params: { role },
    });
  }

  /* CREATE ACCOUNT */

  function handleCreateAccount() {
    if (role === 'customer') {
      router.push('/(auth)/customer-register');
      return;
    }

    router.push('/(auth)/shop-owner-register');
  }

  /* MAIN SCREEN */

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={THEME.navyDark}
        translucent={false}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View
            style={[
              styles.screen,
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: 40,
              },
            ]}
          >
            {/* TOP NAVIGATION */}

            <View style={styles.topBar}>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                disabled={isSubmitting}
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={21}
                  color={THEME.white}
                />
              </TouchableOpacity>

              <View style={styles.topBarCaptionWrap}>
                <View style={styles.topBarDot} />

                <Text style={styles.topBarCaption}>
                  STYLEHUB ACCOUNT
                </Text>
              </View>
            </View>

            {/* HEADER */}

            <View style={styles.headingSection}>
              <View
                style={[
                  styles.roleIconShell,
                  isCustomer
                    ? styles.customerIconShell
                    : styles.ownerIconShell,
                ]}
              >
                <Ionicons
                  name={icon}
                  size={isSmallPhone ? 25 : 28}
                  color={THEME.orange}
                />
              </View>

              <View style={styles.roleBadge}>
                <View style={styles.roleBadgeDot} />

                <Text style={styles.roleBadgeText}>
                  {roleLabel.toUpperCase()}
                </Text>
              </View>

              <Text
                style={[
                  styles.title,
                  isSmallPhone && styles.titleSmall,
                ]}
              >
                {title}
              </Text>

              <Text style={styles.subtitle}>
                {subtitle}
              </Text>

              <View style={styles.headingAccentLine} />
            </View>

            {/* LOGIN CARD */}

            <View style={styles.loginCard}>
              <View style={styles.cardAccentLine} />

              <View style={styles.cardHeader}>
                <View style={styles.cardHeadingCopy}>
                  <Text style={styles.cardEyebrow}>
                    ACCOUNT ACCESS
                  </Text>

                  <Text style={styles.cardTitle}>
                    Sign in to continue
                  </Text>
                </View>

                <View style={styles.secureBadge}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={THEME.green}
                  />

                  <Text style={styles.secureBadgeText}>
                    Secure
                  </Text>
                </View>
              </View>

              {/* EMAIL ADDRESS */}

              <View style={styles.field}>
                <Text style={styles.label}>
                  Email address
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={THEME.muted}
                    />
                  </View>

                  <TextInput
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);

                      if (errorMessage) {
                        setErrorMessage('');
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    placeholder="name@example.com"
                    placeholderTextColor={THEME.muted}
                    editable={!isSubmitting}
                    multiline={false}
                    numberOfLines={1}
                    returnKeyType="next"
                    selectionColor={THEME.orange}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* PASSWORD */}

              <View style={styles.field}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>
                    Password
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password"
                    onPress={handleForgotPassword}
                    style={styles.forgotButton}
                  >
                    <Text style={styles.forgotText}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={THEME.muted}
                    />
                  </View>

                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);

                      if (errorMessage) {
                        setErrorMessage('');
                      }
                    }}
                    secureTextEntry={!passwordVisible}
                    textContentType="password"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter your password"
                    placeholderTextColor={THEME.muted}
                    editable={!isSubmitting}
                    multiline={false}
                    numberOfLines={1}
                    returnKeyType="done"
                    selectionColor={THEME.orange}
                    onSubmitEditing={handleLogin}
                    style={[
                      styles.input,
                      styles.passwordInput,
                    ]}
                  />

                  <TouchableOpacity
                    activeOpacity={0.65}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={
                      passwordVisible
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onPress={() =>
                      setPasswordVisible(
                        (current) => !current,
                      )
                    }
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={
                        passwordVisible
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={20}
                      color={THEME.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ERROR MESSAGE */}

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <View style={styles.errorIcon}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={THEME.danger}
                    />
                  </View>

                  <View style={styles.errorCopy}>
                    <Text style={styles.errorTitle}>
                      Unable to sign in
                    </Text>

                    <Text style={styles.errorText}>
                      {errorMessage}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* SIGN IN BUTTON */}

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={`Sign in as ${roleLabel}`}
                onPress={handleLogin}
                style={[
                  styles.loginButton,
                  isSubmitting &&
                    styles.loginButtonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={THEME.navyDark}
                    />

                    <Text style={styles.loginButtonText}>
                      Signing in...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>
                      Sign In
                    </Text>

                    <View style={styles.loginButtonIcon}>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={THEME.white}
                      />
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {/* ROLE INFORMATION */}

              <View style={styles.roleInformation}>
                <View style={styles.roleInformationIcon}>
                  <Ionicons
                    name={icon}
                    size={17}
                    color={THEME.orangeDark}
                  />
                </View>

                <View style={styles.roleInformationCopy}>
                  <Text style={styles.roleInformationTitle}>
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

            {/* CREATE ACCOUNT CARD */}

            <View style={styles.createCard}>
              <View style={styles.createCopy}>
                <Text style={styles.createEyebrow}>
                  NEW TO STYLEHUB?
                </Text>

                <Text style={styles.createTitle}>
                  Create your {roleLabel.toLowerCase()}{' '}
                  account
                </Text>

                <Text style={styles.createDescription}>
                  {isCustomer
                    ? 'Join StyleHub to discover shops and start booking services.'
                    : 'Register your account and submit your shop to join StyleHub.'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={`Create ${roleLabel} account`}
                onPress={handleCreateAccount}
                style={styles.createButton}
              >
                <View style={styles.createButtonIcon}>
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={THEME.orangeDark}
                  />
                </View>

                <Text style={styles.createButtonText}>
                  Create account
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={THEME.orangeDark}
                />
              </TouchableOpacity>
            </View>

            {/* FOOTER */}

            <View style={styles.securityFooter}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={THEME.mutedLight}
              />

              <Text style={styles.securityFooterText}>
                Secure StyleHub account access
              </Text>

              <View style={styles.footerDot} />

              <Text style={styles.securityFooterText}>
                {roleLabel}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ==========================================================
   STYLES
   ========================================================== */

const styles = StyleSheet.create({
  /* ROOT */

  safeArea: {
    flex: 1,
    backgroundColor: THEME.navyDark,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: THEME.navy,
  },

  screen: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    flexGrow: 1,
    alignSelf: 'center',
    paddingBottom: 40,
  },

  /* TOP NAVIGATION */

  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  topBarCaptionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  topBarDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.orange,
  },

  topBarCaption: {
    color: THEME.mutedLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  /* HEADING */

  headingSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },

  roleIconShell: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,146,2,0.28)',
    borderRadius: 20,
    marginBottom: 15,
  },

  customerIconShell: {
    backgroundColor: 'rgba(217,146,2,0.10)',
  },

  ownerIconShell: {
    backgroundColor: 'rgba(217,146,2,0.10)',
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(217,146,2,0.30)',
    borderRadius: 999,
    backgroundColor: 'rgba(217,146,2,0.10)',
    marginBottom: 12,
  },

  roleBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.orange,
  },

  roleBadgeText: {
    color: THEME.orange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  title: {
    maxWidth: 520,
    color: THEME.white,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
  },

  titleSmall: {
    fontSize: 26,
    lineHeight: 33,
  },

  subtitle: {
    maxWidth: 480,
    marginTop: 9,
    color: THEME.mutedLight,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  headingAccentLine: {
    width: 36,
    height: 3,
    marginTop: 19,
    borderRadius: 999,
    backgroundColor: THEME.orange,
  },

  /* LOGIN CARD */

  loginCard: {
    width: '100%',
    overflow: 'hidden',
    padding: 18,
    borderRadius: 17,
    backgroundColor: THEME.white,

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 7,
        },
        shadowOpacity: 0.14,
        shadowRadius: 17,
      },
      android: {
        elevation: 5,
      },
      default: {
        elevation: 3,
      },
    }),
  },

  cardAccentLine: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    left: 0,
    width: 4,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: THEME.orange,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 23,
  },

  cardHeadingCopy: {
    flex: 1,
  },

  cardEyebrow: {
    color: THEME.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  cardTitle: {
    marginTop: 5,
    color: THEME.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DCEDE5',
    borderRadius: 999,
    backgroundColor: THEME.greenSoft,
  },

  secureBadgeText: {
    color: THEME.green,
    fontSize: 9,
    fontWeight: '700',
  },

  /* INPUT FIELDS */

  field: {
    marginBottom: 17,
  },

  label: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },

  passwordLabelRow: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },

  forgotButton: {
    minHeight: 28,
    justifyContent: 'center',
    paddingLeft: 8,
  },

  forgotText: {
    color: THEME.orangeDark,
    fontSize: 11,
    fontWeight: '800',
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    backgroundColor: THEME.offWhite,
  },

  inputIcon: {
    width: 33,
    height: 33,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: THEME.white,
  },

  input: {
    minWidth: 0,
    minHeight: 52,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 0,
    color: THEME.text,
    fontSize: 13,
  },

  passwordInput: {
    paddingRight: 4,
  },

  passwordToggle: {
    width: 38,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  /* ERROR */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1CECE',
    borderRadius: 12,
    backgroundColor: THEME.dangerSoft,
  },

  errorIcon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: THEME.white,
  },

  errorCopy: {
    minWidth: 0,
    flex: 1,
  },

  errorTitle: {
    color: THEME.danger,
    fontSize: 11,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: THEME.danger,
    fontSize: 11,
    lineHeight: 17,
  },

  /* LOGIN BUTTON */

  loginButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 5,
    borderRadius: 12,
    backgroundColor: THEME.orange,

    ...Platform.select({
      ios: {
        shadowColor: '#D99202',
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.18,
        shadowRadius: 9,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },

  loginButtonDisabled: {
    opacity: 0.58,
  },

  loginButtonText: {
    color: THEME.navyDark,
    fontSize: 14,
    fontWeight: '800',
  },

  loginButtonIcon: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: THEME.navyDark,
  },

  /* ROLE INFORMATION */

  roleInformation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 19,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  roleInformationIcon: {
    width: 39,
    height: 39,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.orangeSoft,
  },

  roleInformationCopy: {
    minWidth: 0,
    flex: 1,
  },

  roleInformationTitle: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: '800',
  },

  roleInformationDescription: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  /* CREATE ACCOUNT CARD */

  createCard: {
    width: '100%',
    marginTop: 14,
    padding: 18,
    borderRadius: 17,
    backgroundColor: THEME.white,

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },

  createCopy: {
    marginBottom: 15,
  },

  createEyebrow: {
    color: THEME.orangeDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  createTitle: {
    marginTop: 5,
    color: THEME.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },

  createDescription: {
    marginTop: 5,
    color: THEME.muted,
    fontSize: 11,
    lineHeight: 17,
  },

  createButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    backgroundColor: THEME.offWhite,
  },

  createButtonIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: THEME.orangeSoft,
  },

  createButtonText: {
    flex: 1,
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  /* FOOTER */

  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 25,
  },

  securityFooterText: {
    color: THEME.mutedLight,
    fontSize: 10,
    fontWeight: '600',
  },

  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.orange,
  },
});
