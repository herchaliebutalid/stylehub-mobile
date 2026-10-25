
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

import { LAYOUT } from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import type { ShopType } from '@/src/types/auth';

/* ==========================================================
   STYLEHUB SHOP OWNER REGISTRATION
   Matches Customer Registration and Login screens
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
   MAIN SHOP OWNER REGISTRATION
   ========================================================== */

export default function ShopOwnerRegistrationForm() {
  const { registerShopOwner, isSubmitting } = useAuth();
  const { width } = useWindowDimensions();

  /* OWNER STATE */

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');

  /* SHOP STATE */

  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] =
    useState<ShopType>('barber_shop');
  const [shopDescription, setShopDescription] =
    useState('');
  const [shopPhoneNumber, setShopPhoneNumber] =
    useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopProvince, setShopProvince] = useState('');

  /* UI STATE */

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

  /* PASSWORD CHECKS */

  const passwordChecks = useMemo(
    () => ({
      length:
        password.length >= 12 &&
        password.length <= 64,

      mixedCase:
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password),

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

  /* FIELD UPDATE HELPERS */

  function clearError() {
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function updateField(
    setter: (value: string) => void,
    value: string,
  ) {
    setter(value);
    clearError();
  }

  /* SUBMIT REGISTRATION */

  async function handleSubmit() {
    setErrorMessage('');

    const requiredValues = [
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      passwordConfirmation,
      shopName,
      shopPhoneNumber,
      shopAddress,
      shopCity,
      shopProvince,
    ];

    if (
      requiredValues.some(
        (value) => value.trim() === '',
      )
    ) {
      setErrorMessage('Complete all required fields.');
      return;
    }

    if (password.length > 64) {
      setErrorMessage(
        'The password may not be greater than 64 characters.',
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(
        'The password confirmation does not match.',
      );
      return;
    }

    try {
      await registerShopOwner({
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        password,
        passwordConfirmation,

        shop: {
          name: shopName,
          type: shopType,
          description: shopDescription,
          phoneNumber: shopPhoneNumber,
          email: shopEmail,
          address: shopAddress,
          city: shopCity,
          province: shopProvince,
        },
      });

      router.replace('/(shop-owner)/shop-owner');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(
        'Unable to submit your shop registration.',
      );
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

            {/* HEADER */}

            <View style={styles.header}>
              <View style={styles.ownerIcon}>
                <Ionicons
                  name="storefront-outline"
                  size={28}
                  color={THEME.orange}
                />
              </View>

              <View style={styles.ownerBadge}>
                <View style={styles.ownerBadgeDot} />

                <Text style={styles.ownerBadgeText}>
                  BUSINESS REGISTRATION
                </Text>
              </View>

              <Text
                style={[
                  styles.title,
                  isSmallPhone && styles.titleSmall,
                ]}
              >
                Register your shop
              </Text>

              <Text style={styles.subtitle}>
                Create your Shop Owner account and submit
                your barber shop or beauty parlor for
                StyleHub Administrator review.
              </Text>

              <View style={styles.headerAccentLine} />
            </View>

            {/* REGISTRATION PROGRESS */}

            <View style={styles.progressCard}>
              <ProgressItem
                number="1"
                label="Owner"
                active
              />

              <View style={styles.progressLine} />

              <ProgressItem
                number="2"
                label="Shop"
                active
              />

              <View style={styles.progressLine} />

              <ProgressItem
                number="3"
                label="Review"
              />
            </View>

            {/* MAIN REGISTRATION CARD */}

            <View style={styles.registrationCard}>
              <View style={styles.cardAccentLine} />

              {/* OWNER INFORMATION */}

              <FormSectionHeader
                icon="person-outline"
                eyebrow="OWNER ACCOUNT"
                title="Owner information"
                description="Enter the personal information for the account that will manage this shop."
                tone="blue"
              />

              <View
                style={[
                  styles.nameGrid,
                  isTablet && styles.tabletGridThree,
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
                    onChangeText={(value) =>
                      updateField(setFirstName, value)
                    }
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
                    onChangeText={(value) =>
                      updateField(setMiddleName, value)
                    }
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
                    onChangeText={(value) =>
                      updateField(setLastName, value)
                    }
                    placeholder="Last name"
                    editable={!isSubmitting}
                    autoComplete="family-name"
                    textContentType="familyName"
                  />
                </View>
              </View>

              {/* OWNER CONTACT INFORMATION */}

              <View
                style={[
                  styles.fieldGrid,
                  isTablet && styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="mail-outline"
                    label="Email Address"
                    value={email}
                    onChangeText={(value) =>
                      updateField(setEmail, value)
                    }
                    placeholder="owner@example.com"
                    editable={!isSubmitting}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>

                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="phone-portrait-outline"
                    label="Mobile Number"
                    value={phoneNumber}
                    onChangeText={(value) =>
                      updateField(setPhoneNumber, value)
                    }
                    placeholder="09XXXXXXXXX"
                    editable={!isSubmitting}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    helperText="Use an active Philippine mobile number for account verification."
                  />
                </View>
              </View>

              {/* ACCOUNT SECURITY */}

              <SectionDivider />

              <FormSectionHeader
                icon="shield-checkmark-outline"
                eyebrow="ACCOUNT SECURITY"
                title="Create your password"
                description="Protect access to your Shop Owner account with a strong password."
                tone="navy"
              />

              <View
                style={[
                  styles.fieldGrid,
                  isTablet && styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <PasswordField
                    label="Password"
                    value={password}
                    onChangeText={(value) =>
                      updateField(setPassword, value)
                    }
                    visible={passwordVisible}
                    onToggle={() =>
                      setPasswordVisible(
                        (current) => !current,
                      )
                    }
                    editable={!isSubmitting}
                    placeholder="Create password"
                  />
                </View>

                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <PasswordField
                    label="Confirm Password"
                    value={passwordConfirmation}
                    onChangeText={(value) =>
                      updateField(
                        setPasswordConfirmation,
                        value,
                      )
                    }
                    visible={confirmationVisible}
                    onToggle={() =>
                      setConfirmationVisible(
                        (current) => !current,
                      )
                    }
                    editable={!isSubmitting}
                    placeholder="Re-enter password"
                  />
                </View>
              </View>

              {/* PASSWORD STRENGTH */}

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
                        width: `${
                          (passwordStrength / 4) * 100
                        }%`,
                        backgroundColor:
                          passwordStrength === 4
                            ? THEME.green
                            : THEME.orange,
                      },
                    ]}
                  />
                </View>

                <View style={styles.requirementsGrid}>
                  <PasswordRequirement
                    complete={passwordChecks.length}
                    text="12–64 characters"
                  />

                  <PasswordRequirement
                    complete={passwordChecks.mixedCase}
                    text="Uppercase + lowercase"
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

              {/* PASSWORD CONFIRMATION */}

              {passwordConfirmation.length > 0 ? (
                <View
                  style={[
                    styles.passwordMatch,
                    passwordChecks.confirmation
                      ? styles.passwordMatchSuccess
                      : styles.passwordMatchWarning,
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
                      styles.passwordMatchText,
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

              {/* SHOP INFORMATION */}

              <SectionDivider />

              <FormSectionHeader
                icon="storefront-outline"
                eyebrow="BUSINESS PROFILE"
                title="Shop information"
                description="Tell StyleHub about the barber shop or beauty parlor you want to register."
                tone="orange"
              />

              <RegistrationField
                icon="storefront-outline"
                label="Shop Name"
                value={shopName}
                onChangeText={(value) =>
                  updateField(setShopName, value)
                }
                placeholder="Business name"
                editable={!isSubmitting}
              />

              {/* SHOP TYPE */}

              <View style={styles.field}>
                <Text style={styles.label}>
                  Shop Type
                </Text>

                <View
                  style={[
                    styles.shopTypeGrid,
                    isSmallPhone &&
                      styles.shopTypeGridSmall,
                  ]}
                >
                  <ShopTypeCard
                    icon="cut-outline"
                    title="Barber Shop"
                    description="Haircuts and men's grooming"
                    selected={shopType === 'barber_shop'}
                    disabled={isSubmitting}
                    onPress={() => {
                      setShopType('barber_shop');
                      clearError();
                    }}
                  />

                  <ShopTypeCard
                    icon="sparkles-outline"
                    title="Beauty Parlor"
                    description="Beauty and salon services"
                    selected={shopType === 'beauty_parlor'}
                    disabled={isSubmitting}
                    onPress={() => {
                      setShopType('beauty_parlor');
                      clearError();
                    }}
                  />
                </View>
              </View>

              {/* SHOP DESCRIPTION */}

              <RegistrationField
                icon="document-text-outline"
                label="Description"
                optional
                value={shopDescription}
                onChangeText={(value) =>
                  updateField(setShopDescription, value)
                }
                placeholder="Tell customers about your shop, specialties, or services"
                editable={!isSubmitting}
                multiline
                helperText="You can update your shop profile again after registration."
              />

              {/* SHOP CONTACT */}

              <SectionDivider subtle />

              <FormSectionHeader
                icon="call-outline"
                eyebrow="SHOP CONTACT"
                title="Business contact"
                description="Contact details customers and StyleHub can associate with the shop."
                tone="orange"
                compact
              />

              <View
                style={[
                  styles.fieldGrid,
                  isTablet && styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="call-outline"
                    label="Shop Phone Number"
                    value={shopPhoneNumber}
                    onChangeText={(value) =>
                      updateField(setShopPhoneNumber, value)
                    }
                    placeholder="09XXXXXXXXX"
                    editable={!isSubmitting}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                </View>

                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="mail-outline"
                    label="Shop Email"
                    optional
                    value={shopEmail}
                    onChangeText={(value) =>
                      updateField(setShopEmail, value)
                    }
                    placeholder="shop@example.com"
                    editable={!isSubmitting}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
              </View>

              {/* SHOP LOCATION */}

              <SectionDivider subtle />

              <FormSectionHeader
                icon="location-outline"
                eyebrow="SHOP LOCATION"
                title="Business address"
                description="Enter the physical location customers should associate with your shop."
                tone="green"
                compact
              />

              <RegistrationField
                icon="navigate-outline"
                label="Address"
                value={shopAddress}
                onChangeText={(value) =>
                  updateField(setShopAddress, value)
                }
                placeholder="Street / Barangay"
                editable={!isSubmitting}
                autoComplete="street-address"
              />

              <View
                style={[
                  styles.fieldGrid,
                  isTablet && styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="business-outline"
                    label="City / Municipality"
                    value={shopCity}
                    onChangeText={(value) =>
                      updateField(setShopCity, value)
                    }
                    placeholder="City or municipality"
                    editable={!isSubmitting}
                  />
                </View>

                <View
                  style={
                    isTablet ? styles.tabletField : undefined
                  }
                >
                  <RegistrationField
                    icon="map-outline"
                    label="Province"
                    value={shopProvince}
                    onChangeText={(value) =>
                      updateField(setShopProvince, value)
                    }
                    placeholder="Province"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* ADMINISTRATOR APPROVAL */}

              <View style={styles.approvalNotice}>
                <View style={styles.approvalIcon}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={THEME.warning}
                  />
                </View>

                <View style={styles.approvalCopy}>
                  <View style={styles.approvalTitleRow}>
                    <Text style={styles.approvalTitle}>
                      Administrator approval required
                    </Text>

                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>
                        PENDING
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.approvalText}>
                    Your shop will be submitted as pending.
                    Shop management features become
                    available after a StyleHub
                    Administrator approves it.
                  </Text>
                </View>
              </View>

              {/* ERROR */}

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
                      Unable to submit registration
                    </Text>

                    <Text style={styles.errorText}>
                      {errorMessage}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* SUBMIT BUTTON */}

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Submit Shop Owner Registration"
                onPress={handleSubmit}
                style={[
                  styles.submitButton,
                  isSubmitting && styles.disabledButton,
                ]}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={THEME.navyDark}
                    />

                    <Text style={styles.submitText}>
                      Submitting registration...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      Submit Registration
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

              {/* SECURITY NOTE */}

              <View style={styles.securityNote}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={THEME.green}
                />

                <Text style={styles.securityNoteText}>
                  Your account and shop information are
                  sent securely to StyleHub for
                  registration.
                </Text>
              </View>
            </View>

            {/* EXISTING SHOP OWNER ACCOUNT */}

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
                  Already registered?
                </Text>

                <Text style={styles.loginCardDescription}>
                  Sign in using your existing StyleHub
                  Shop Owner account.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Go to Shop Owner Login"
                onPress={() =>
                  router.replace(
                    '/(auth)/shop-owner-login',
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
                Shop Owner
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
  eyebrow: string;
  title: string;
  description: string;
  tone: 'blue' | 'orange' | 'green' | 'navy';
  compact?: boolean;
}

function FormSectionHeader({
  icon,
  eyebrow,
  title,
  description,
  tone,
  compact = false,
}: FormSectionHeaderProps) {
  return (
    <View
      style={[
        styles.sectionHeader,
        compact && styles.sectionHeaderCompact,
      ]}
    >
      <View
        style={[
          styles.sectionIcon,
          tone === 'orange'
            ? styles.sectionIconOrange
            : styles.sectionIconNavy,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            tone === 'orange'
              ? THEME.orangeDark
              : THEME.navy
          }
        />
      </View>

      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>

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
    | 'family-name'
    | 'street-address';

  textContentType?:
    | 'emailAddress'
    | 'telephoneNumber'
    | 'givenName'
    | 'middleName'
    | 'familyName';

  helperText?: string;
  multiline?: boolean;
}

function RegistrationField({
  icon,
  label,
  optional = false,
  value,
  onChangeText,
  placeholder,
  editable,
  keyboardType = 'default',
  autoCapitalize = 'words',
  autoComplete,
  textContentType,
  helperText,
  multiline = false,
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

      <View
        style={[
          styles.inputContainer,
          multiline && styles.inputContainerMultiline,
        ]}
      >
        <View
          style={[
            styles.inputIcon,
            multiline && styles.inputIconMultiline,
          ]}
        >
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
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          textAlignVertical={
            multiline ? 'top' : 'center'
          }
          selectionColor={THEME.orange}
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
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
  onToggle: () => void;
  editable: boolean;
  placeholder: string;
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
  editable,
  placeholder,
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
          autoComplete="new-password"
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
          activeOpacity={0.65}
          disabled={!editable}
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
          onPress={onToggle}
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
   SHOP TYPE CARD
   ========================================================== */

interface ShopTypeCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

function ShopTypeCard({
  icon,
  title,
  description,
  selected,
  disabled,
  onPress,
}: ShopTypeCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      style={[
        styles.shopTypeCard,
        selected && styles.shopTypeCardSelected,
        disabled && styles.shopTypeCardDisabled,
      ]}
    >
      <View
        style={[
          styles.shopTypeIcon,
          selected && styles.shopTypeIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            selected
              ? THEME.orangeDark
              : THEME.navy
          }
        />
      </View>

      <View style={styles.shopTypeCopy}>
        <Text
          style={[
            styles.shopTypeTitle,
            selected && styles.shopTypeTitleSelected,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.shopTypeDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={19}
        color={
          selected
            ? THEME.orangeDark
            : THEME.mutedLight
        }
      />
    </TouchableOpacity>
  );
}

/* ==========================================================
   PROGRESS ITEM
   ========================================================== */

interface ProgressItemProps {
  number: string;
  label: string;
  active?: boolean;
}

function ProgressItem({
  number,
  label,
  active = false,
}: ProgressItemProps) {
  return (
    <View style={styles.progressItem}>
      <View
        style={[
          styles.progressNumber,
          active && styles.progressNumberActive,
        ]}
      >
        <Text
          style={[
            styles.progressNumberText,
            active && styles.progressNumberTextActive,
          ]}
        >
          {number}
        </Text>
      </View>

      <Text
        style={[
          styles.progressLabel,
          active && styles.progressLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/* ==========================================================
   SECTION DIVIDER
   ========================================================== */

function SectionDivider({
  subtle = false,
}: {
  subtle?: boolean;
}) {
  return (
    <View
      style={[
        styles.sectionDivider,
        subtle && styles.sectionDividerSubtle,
      ]}
    />
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
    paddingBottom: 28,
  },

  ownerIcon: {
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

  ownerBadge: {
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

  ownerBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.orange,
  },

  ownerBadgeText: {
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
    maxWidth: 520,
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

  /* REGISTRATION PROGRESS */

  progressCard: {
    width: '100%',
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    borderRadius: 17,
    backgroundColor: THEME.white,
  },

  progressItem: {
    alignItems: 'center',
    gap: 5,
  },

  progressNumber: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    backgroundColor: THEME.offWhite,
  },

  progressNumberActive: {
    borderColor: '#E9BD73',
    backgroundColor: THEME.orangeSoft,
  },

  progressNumberText: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: '800',
  },

  progressNumberTextActive: {
    color: THEME.orangeDark,
  },

  progressLabel: {
    color: THEME.muted,
    fontSize: 9,
    fontWeight: '600',
  },

  progressLabelActive: {
    color: THEME.text,
    fontWeight: '800',
  },

  progressLine: {
    width: 54,
    maxWidth: '15%',
    height: 1,
    marginHorizontal: 8,
    backgroundColor: THEME.border,
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

  /* FORM SECTION HEADER */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },

  sectionHeaderCompact: {
    marginBottom: 15,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  sectionIconOrange: {
    backgroundColor: THEME.orangeSoft,
  },

  sectionIconNavy: {
    backgroundColor: THEME.iconSoft,
  },

  sectionHeaderCopy: {
    minWidth: 0,
    flex: 1,
  },

  sectionEyebrow: {
    color: THEME.orangeDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  sectionTitle: {
    marginTop: 3,
    color: THEME.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.15,
  },

  sectionDescription: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  sectionDivider: {
    height: 1,
    marginTop: 5,
    marginBottom: 22,
    backgroundColor: THEME.border,
  },

  sectionDividerSubtle: {
    marginTop: 8,
    marginBottom: 18,
  },

  /* RESPONSIVE GRIDS */

  nameGrid: {
    width: '100%',
  },

  fieldGrid: {
    width: '100%',
  },

  tabletGridThree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  tabletGridTwo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  tabletField: {
    minWidth: 0,
    flex: 1,
  },

  /* INPUT FIELDS */

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

  inputContainerMultiline: {
    minHeight: 118,
    alignItems: 'flex-start',
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

  inputIconMultiline: {
    marginTop: 10,
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

  multilineInput: {
    minHeight: 110,
    paddingTop: 13,
    paddingBottom: 13,
    lineHeight: 19,
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

  /* PASSWORD STRENGTH */

  passwordGuide: {
    marginTop: -2,
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

  requirementsGrid: {
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

  passwordMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: -5,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 9,
  },

  passwordMatchSuccess: {
    borderColor: '#CBE5D8',
    backgroundColor: THEME.greenSoft,
  },

  passwordMatchWarning: {
    borderColor: '#F0DCAE',
    backgroundColor: THEME.warningSoft,
  },

  passwordMatchText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* SHOP TYPE */

  shopTypeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 7,
  },

  shopTypeGridSmall: {
    flexDirection: 'column',
  },

  shopTypeCard: {
    minWidth: 0,
    minHeight: 96,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    backgroundColor: THEME.offWhite,
  },

  shopTypeCardSelected: {
    borderColor: '#E9BD73',
    backgroundColor: THEME.orangeSoft,
  },

  shopTypeCardDisabled: {
    opacity: 0.55,
  },

  shopTypeIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: THEME.white,
  },

  shopTypeIconSelected: {
    backgroundColor: THEME.white,
  },

  shopTypeCopy: {
    minWidth: 0,
    flex: 1,
  },

  shopTypeTitle: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: '800',
  },

  shopTypeTitleSelected: {
    color: THEME.orangeDark,
  },

  shopTypeDescription: {
    marginTop: 3,
    color: THEME.muted,
    fontSize: 9,
    lineHeight: 14,
  },

  /* ADMINISTRATOR APPROVAL */

  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0DCAE',
    borderRadius: 12,
    backgroundColor: THEME.warningSoft,
  },

  approvalIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: THEME.white,
  },

  approvalCopy: {
    minWidth: 0,
    flex: 1,
  },

  approvalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },

  approvalTitle: {
    color: THEME.warning,
    fontSize: 11,
    fontWeight: '800',
  },

  pendingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: THEME.white,
  },

  pendingBadgeText: {
    color: THEME.warning,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  approvalText: {
    marginTop: 5,
    color: '#8A6B2C',
    fontSize: 10,
    lineHeight: 16,
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

  /* SUBMIT */

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

  /* SECURITY NOTE */

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
  },

  securityNoteText: {
    minWidth: 0,
    flex: 1,
    color: THEME.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  /* EXISTING ACCOUNT */

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
