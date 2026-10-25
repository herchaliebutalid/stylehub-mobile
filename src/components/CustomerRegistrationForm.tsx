
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

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

import { LAYOUT, SPACING } from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';

/* ==========================================================
   STYLEHUB THEME
   Matches Customer Login and Welcome screens
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
  iconSoft: '#EEF3F8',
  green: '#167C51',
  greenSoft: '#E7F7EF',
  danger: '#C43D43',
  dangerSoft: '#FFF0F0',
  warning: '#AD7516',
  warningSoft: '#FFF5DF',
};

/* ==========================================================
   CUSTOMER REGISTRATION
   ========================================================== */

export default function CustomerRegistrationForm() {
  const { registerCustomer, isSubmitting } = useAuth();
  const { width } = useWindowDimensions();

  /* FORM STATE */

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');

  const [passwordVisible, setPasswordVisible] =
    useState(false);
  const [confirmationVisible, setConfirmationVisible] =
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

  /* PASSWORD STRENGTH */

  const passwordChecks = useMemo(
    () => ({
      length:
        password.length >= 12 &&
        password.length <= 64,
      mixedCase:
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
      confirmation:
        password.length > 0 &&
        password === passwordConfirmation,
    }),
    [password, passwordConfirmation],
  );

  const passwordStrength = useMemo(
    () =>
      [
        passwordChecks.length,
        passwordChecks.mixedCase,
        passwordChecks.number,
        passwordChecks.symbol,
      ].filter(Boolean).length,
    [passwordChecks],
  );

  const passwordStrengthLabel = useMemo(() => {
    if (password.length === 0) {
      return 'Not entered';
    }

    if (passwordStrength <= 1) {
      return 'Needs improvement';
    }

    if (passwordStrength <= 3) {
      return 'Almost ready';
    }

    return 'Strong';
  }, [password, passwordStrength]);

  /* INPUT HANDLERS */

  function clearError() {
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function updateFirstName(value: string) {
    setFirstName(value);
    clearError();
  }

  function updateMiddleName(value: string) {
    setMiddleName(value);
    clearError();
  }

  function updateLastName(value: string) {
    setLastName(value);
    clearError();
  }

  function updateEmail(value: string) {
    setEmail(value);
    clearError();
  }

  function updatePhoneNumber(value: string) {
    setPhoneNumber(value);
    clearError();
  }

  function updatePassword(value: string) {
    setPassword(value);
    clearError();
  }

  function updatePasswordConfirmation(value: string) {
    setPasswordConfirmation(value);
    clearError();
  }

  /* REGISTER CUSTOMER */

  async function handleSubmit() {
    setErrorMessage('');

    if (firstName.trim() === '') {
      setErrorMessage('Enter your first name.');
      return;
    }

    if (lastName.trim() === '') {
      setErrorMessage('Enter your last name.');
      return;
    }

    if (email.trim() === '') {
      setErrorMessage('Enter your email address.');
      return;
    }

    if (phoneNumber.trim() === '') {
      setErrorMessage('Enter your mobile number.');
      return;
    }

    if (password === '') {
      setErrorMessage('Enter a password.');
      return;
    }

    if (password.length > 64) {
      setErrorMessage(
        'The password may not be greater than 64 characters.',
      );
      return;
    }

    if (passwordConfirmation === '') {
      setErrorMessage('Confirm your password.');
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(
        'The password confirmation does not match.',
      );
      return;
    }

    try {
      await registerCustomer({
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        password,
        passwordConfirmation,
      });

      router.replace('/(customer)/customer');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage('Unable to create your account.');
    }
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
        style={styles.flex}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
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
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Go back"
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

            {/* REGISTRATION HEADER */}

            <View style={styles.header}>
              <View style={styles.customerIcon}>
                <Ionicons
                  name="person-add-outline"
                  size={27}
                  color={THEME.orange}
                />
              </View>

              <View style={styles.customerBadge}>
                <View style={styles.customerBadgeDot} />

                <Text style={styles.customerBadgeText}>
                  CUSTOMER REGISTRATION
                </Text>
              </View>

              <Text
                style={[
                  styles.title,
                  isSmallPhone && styles.titleSmall,
                ]}
              >
                Create your account
              </Text>

              <Text style={styles.subtitle}>
                Join StyleHub to discover beauty and
                grooming shops, book services and manage
                your appointments in one place.
              </Text>

              <View style={styles.headerAccentLine} />
            </View>

            {/* REGISTRATION FORM */}

            <View style={styles.registrationCard}>
              <View style={styles.cardAccentLine} />

              <View style={styles.cardHeader}>
                <View style={styles.cardHeadingCopy}>
                  <Text style={styles.cardEyebrow}>
                    ACCOUNT DETAILS
                  </Text>

                  <Text style={styles.cardTitle}>
                    Customer information
                  </Text>
                </View>

                <View style={styles.stepBadge}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={THEME.orangeDark}
                  />

                  <Text style={styles.stepBadgeText}>
                    Customer
                  </Text>
                </View>
              </View>

              {/* PERSONAL INFORMATION */}

              <FormSectionHeader
                icon="person-outline"
                title="Personal information"
                description="Enter your name as you want it shown in StyleHub."
              />

              <View
                style={[
                  styles.nameGrid,
                  isTablet && styles.nameGridTablet,
                ]}
              >
                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="person-outline"
                    label="First Name"
                    value={firstName}
                    onChangeText={updateFirstName}
                    placeholder="First name"
                    editable={!isSubmitting}
                    autoComplete="given-name"
                    textContentType="givenName"
                  />
                </View>

                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="person-outline"
                    label="Middle Name"
                    optional
                    value={middleName}
                    onChangeText={updateMiddleName}
                    placeholder="Middle name"
                    editable={!isSubmitting}
                    autoComplete="additional-name"
                    textContentType="middleName"
                  />
                </View>

                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="person-outline"
                    label="Last Name"
                    value={lastName}
                    onChangeText={updateLastName}
                    placeholder="Last name"
                    editable={!isSubmitting}
                    autoComplete="family-name"
                    textContentType="familyName"
                  />
                </View>
              </View>

              {/* CONTACT INFORMATION */}

              <View style={styles.sectionDivider} />

              <FormSectionHeader
                icon="chatbubble-ellipses-outline"
                title="Contact information"
                description="We'll use these details for your StyleHub account and notifications."
              />

              <RegistrationField
                icon="mail-outline"
                label="Email Address"
                value={email}
                onChangeText={updateEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isSubmitting}
              />

              <RegistrationField
                icon="phone-portrait-outline"
                label="Mobile Number"
                value={phoneNumber}
                onChangeText={updatePhoneNumber}
                placeholder="09XXXXXXXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={!isSubmitting}
                helperText="Use an active Philippine mobile number. You'll need it for account verification."
              />

              {/* ACCOUNT SECURITY */}

              <View style={styles.sectionDivider} />

              <FormSectionHeader
                icon="shield-checkmark-outline"
                title="Account security"
                description="Create a strong password for your StyleHub account."
              />

              <PasswordField
                label="Password"
                value={password}
                onChangeText={updatePassword}
                visible={passwordVisible}
                onToggleVisibility={() =>
                  setPasswordVisible(
                    (current) => !current,
                  )
                }
                editable={!isSubmitting}
                placeholder="Create password"
                autoComplete="new-password"
              />

              {/* PASSWORD GUIDE */}

              <View style={styles.passwordGuide}>
                <View style={styles.passwordGuideHeader}>
                  <View>
                    <Text style={styles.passwordGuideEyebrow}>
                      PASSWORD STRENGTH
                    </Text>

                    <Text style={styles.passwordStrengthLabel}>
                      {passwordStrengthLabel}
                    </Text>
                  </View>

                  <Text style={styles.passwordScore}>
                    {passwordStrength}/4
                  </Text>
                </View>

                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(passwordStrength / 4) * 100}%`,
                        backgroundColor:
                          passwordStrength === 4
                            ? THEME.green
                            : THEME.orange,
                      },
                    ]}
                  />
                </View>

                <View style={styles.requirements}>
                  <PasswordRequirement
                    complete={passwordChecks.length}
                    text="12–64 characters"
                  />

                  <PasswordRequirement
                    complete={passwordChecks.mixedCase}
                    text="Uppercase and lowercase letters"
                  />

                  <PasswordRequirement
                    complete={passwordChecks.number}
                    text="At least one number"
                  />

                  <PasswordRequirement
                    complete={passwordChecks.symbol}
                    text="At least one symbol"
                  />
                </View>
              </View>

              {/* CONFIRM PASSWORD */}

              <PasswordField
                label="Confirm Password"
                value={passwordConfirmation}
                onChangeText={updatePasswordConfirmation}
                visible={confirmationVisible}
                onToggleVisibility={() =>
                  setConfirmationVisible(
                    (current) => !current,
                  )
                }
                editable={!isSubmitting}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />

              {passwordConfirmation.length > 0 ? (
                <View
                  style={[
                    styles.confirmationStatus,
                    passwordChecks.confirmation
                      ? styles.confirmationSuccess
                      : styles.confirmationWarning,
                  ]}
                >
                  <Ionicons
                    name={
                      passwordChecks.confirmation
                        ? 'checkmark-circle-outline'
                        : 'alert-circle-outline'
                    }
                    size={15}
                    color={
                      passwordChecks.confirmation
                        ? THEME.green
                        : THEME.warning
                    }
                  />

                  <Text
                    style={[
                      styles.confirmationStatusText,
                      {
                        color: passwordChecks.confirmation
                          ? THEME.green
                          : THEME.warning,
                      },
                    ]}
                  >
                    {passwordChecks.confirmation
                      ? 'Passwords match'
                      : 'Passwords do not match yet'}
                  </Text>
                </View>
              ) : null}

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
                      Unable to create account
                    </Text>

                    <Text style={styles.errorText}>
                      {errorMessage}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* CREATE ACCOUNT BUTTON */}

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Create Customer Account"
                style={[
                  styles.submitButton,
                  isSubmitting && styles.disabledButton,
                ]}
                onPress={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={THEME.navyDark}
                    />

                    <Text style={styles.submitText}>
                      Creating account...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      Create Customer Account
                    </Text>

                    <View style={styles.submitIcon}>
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color={THEME.white}
                      />
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {/* MOBILE VERIFICATION NOTE */}

              <View style={styles.verificationNotice}>
                <View style={styles.verificationIcon}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={17}
                    color={THEME.orangeDark}
                  />
                </View>

                <View style={styles.verificationCopy}>
                  <Text style={styles.verificationTitle}>
                    Mobile verification required
                  </Text>

                  <Text style={styles.verificationText}>
                    New customer accounts must verify their
                    mobile number before using protected
                    customer features.
                  </Text>
                </View>
              </View>
            </View>

            {/* ALREADY HAVE AN ACCOUNT */}

            <View style={styles.loginCard}>
              <View style={styles.loginCardIcon}>
                <Ionicons
                  name="log-in-outline"
                  size={20}
                  color={THEME.orangeDark}
                />
              </View>

              <View style={styles.loginCardCopy}>
                <Text style={styles.loginCardTitle}>
                  Already have an account?
                </Text>

                <Text style={styles.loginCardDescription}>
                  Sign in using your existing StyleHub
                  customer account.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Go to Customer Login"
                onPress={() =>
                  router.replace(
                    '/(auth)/customer-login',
                  )
                }
                style={styles.loginLinkButton}
              >
                <Text style={styles.loginLinkText}>
                  Sign In
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={THEME.orangeDark}
                />
              </TouchableOpacity>
            </View>

            {/* FOOTER */}

            <View style={styles.footer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={THEME.mutedLight}
              />

              <Text style={styles.footerText}>
                Secure StyleHub registration
              </Text>

              <View style={styles.footerDot} />

              <Text style={styles.footerText}>
                Customer
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ==========================================================
   FORM SECTION HEADER
   ========================================================== */

interface FormSectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FormSectionHeader({
  icon,
  title,
  description,
}: FormSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={THEME.navy}
        />
      </View>

      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================
   REGISTRATION FIELD
   ========================================================== */

interface RegistrationFieldProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  optional?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
  helperText?: string;

  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad';

  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';

  autoComplete?:
    | 'email'
    | 'tel'
    | 'given-name'
    | 'additional-name'
    | 'family-name';

  textContentType?:
    | 'emailAddress'
    | 'telephoneNumber'
    | 'givenName'
    | 'middleName'
    | 'familyName';
}

function RegistrationField({
  icon,
  label,
  optional = false,
  value,
  onChangeText,
  placeholder,
  editable,
  helperText,
  keyboardType = 'default',
  autoCapitalize = 'words',
  autoComplete,
  textContentType,
}: RegistrationFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.label}>
          {label}
        </Text>

        {optional ? (
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalText}>
              OPTIONAL
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Ionicons
            name={icon}
            size={17}
            color={THEME.muted}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={THEME.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          multiline={false}
          numberOfLines={1}
          selectionColor={THEME.orange}
          style={styles.input}
        />
      </View>

      {helperText ? (
        <View style={styles.helperRow}>
          <Ionicons
            name="information-circle-outline"
            size={13}
            color={THEME.orangeDark}
          />

          <Text style={styles.helperText}>
            {helperText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ==========================================================
   PASSWORD FIELD
   ========================================================== */

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  editable: boolean;
  placeholder: string;
  autoComplete: 'new-password';
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  editable,
  placeholder,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.label}>
          {label}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={THEME.muted}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={THEME.muted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType="newPassword"
          maxLength={64}
          multiline={false}
          numberOfLines={1}
          selectionColor={THEME.orange}
          style={[
            styles.input,
            styles.passwordInput,
          ]}
        />

        <TouchableOpacity
          disabled={!editable}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
          onPress={onToggleVisibility}
          style={styles.visibilityButton}
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={19}
            color={THEME.muted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ==========================================================
   PASSWORD REQUIREMENT
   ========================================================== */

interface PasswordRequirementProps {
  complete: boolean;
  text: string;
}

function PasswordRequirement({
  complete,
  text,
}: PasswordRequirementProps) {
  return (
    <View style={styles.requirementRow}>
      <View
        style={[
          styles.requirementIcon,
          complete && styles.requirementIconComplete,
        ]}
      >
        {complete ? (
          <Ionicons
            name="checkmark"
            size={12}
            color={THEME.green}
          />
        ) : null}
      </View>

      <Text
        style={[
          styles.requirementText,
          complete && styles.requirementTextComplete,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

/* ==========================================================
   STYLES
   ========================================================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.navyDark,
  },

  flex: {
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

  /* HEADER */

  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },

  customerIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(217,146,2,0.28)',
    borderRadius: 20,
    backgroundColor: 'rgba(217,146,2,0.10)',
  },

  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(217,146,2,0.30)',
    borderRadius: 999,
    backgroundColor: 'rgba(217,146,2,0.10)',
  },

  customerBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.orange,
  },

  customerBadgeText: {
    color: THEME.orange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  title: {
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
    maxWidth: 510,
    marginTop: 9,
    color: THEME.mutedLight,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  headerAccentLine: {
    width: 36,
    height: 3,
    marginTop: 19,
    borderRadius: 999,
    backgroundColor: THEME.orange,
  },

  /* REGISTRATION CARD */

  registrationCard: {
    width: '100%',
    overflow: 'hidden',
    padding: 18,
    borderRadius: 17,
    backgroundColor: THEME.white,

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.14,
        shadowRadius: 17,
      },
      android: {
        elevation: 5,
      },
      default: {},
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
    paddingBottom: 17,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
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

  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F2DFBE',
    borderRadius: 999,
    backgroundColor: THEME.orangeSoft,
  },

  stepBadgeText: {
    color: THEME.orangeDark,
    fontSize: 9,
    fontWeight: '700',
  },

  /* FORM SECTIONS */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },

  sectionIcon: {
    width: 39,
    height: 39,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.orangeSoft,
  },

  sectionHeaderCopy: {
    minWidth: 0,
    flex: 1,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: '800',
  },

  sectionDescription: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  sectionDivider: {
    height: 1,
    marginTop: 4,
    marginBottom: 22,
    backgroundColor: THEME.border,
  },

  /* NAME GRID */

  nameGrid: {
    width: '100%',
  },

  nameGridTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },

  tabletField: {
    minWidth: 0,
    flex: 1,
  },

  /* FIELDS */

  field: {
    width: '100%',
    marginBottom: 16,
  },

  fieldLabelRow: {
    minHeight: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  label: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
  },

  optionalBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: THEME.offWhite,
  },

  optionalText: {
    color: THEME.muted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
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

  visibilityButton: {
    width: 38,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 7,
    paddingHorizontal: 2,
  },

  helperText: {
    minWidth: 0,
    flex: 1,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  /* PASSWORD GUIDE */

  passwordGuide: {
    marginTop: -3,
    marginBottom: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    backgroundColor: THEME.offWhite,
  },

  passwordGuideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  passwordGuideEyebrow: {
    color: THEME.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  passwordStrengthLabel: {
    marginTop: 4,
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
  },

  passwordScore: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    backgroundColor: THEME.white,
    color: THEME.text,
    fontSize: 10,
    fontWeight: '800',
  },

  strengthTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    marginTop: 13,
    borderRadius: 999,
    backgroundColor: THEME.border,
  },

  strengthFill: {
    height: '100%',
    borderRadius: 999,
  },

  requirements: {
    marginTop: 14,
    gap: 9,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  requirementIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    backgroundColor: THEME.white,
  },

  requirementIconComplete: {
    borderColor: '#CBE5D8',
    backgroundColor: THEME.greenSoft,
  },

  requirementText: {
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  requirementTextComplete: {
    color: THEME.green,
    fontWeight: '700',
  },

  /* PASSWORD CONFIRMATION */

  confirmationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: -6,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 9,
  },

  confirmationSuccess: {
    borderColor: '#CBE5D8',
    backgroundColor: THEME.greenSoft,
  },

  confirmationWarning: {
    borderColor: '#F0DCAE',
    backgroundColor: THEME.warningSoft,
  },

  confirmationStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* ERROR */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0CCCC',
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

  /* SUBMIT BUTTON */

  submitButton: {
    minHeight: LAYOUT.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 12,
    backgroundColor: THEME.orange,

    ...Platform.select({
      ios: {
        shadowColor: '#D99202',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.18,
        shadowRadius: 9,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },

  disabledButton: {
    opacity: 0.58,
  },

  submitText: {
    color: THEME.navyDark,
    fontSize: 13,
    fontWeight: '800',
  },

  submitIcon: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: THEME.navyDark,
  },

  /* VERIFICATION NOTICE */

  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  verificationIcon: {
    width: 39,
    height: 39,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.orangeSoft,
  },

  verificationCopy: {
    minWidth: 0,
    flex: 1,
  },

  verificationTitle: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: '800',
  },

  verificationText: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  /* EXISTING ACCOUNT CARD */

  loginCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 15,
    borderRadius: 17,
    backgroundColor: THEME.white,
  },

  loginCardIcon: {
    width: 41,
    height: 41,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.orangeSoft,
  },

  loginCardCopy: {
    minWidth: 0,
    flex: 1,
  },

  loginCardTitle: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
  },

  loginCardDescription: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  loginLinkButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    backgroundColor: THEME.offWhite,
  },

  loginLinkText: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: '800',
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 25,
  },

  footerText: {
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
