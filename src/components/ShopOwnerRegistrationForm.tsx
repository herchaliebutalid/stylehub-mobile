import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
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
  ShopType,
} from '@/src/types/auth';


/* ==========================================================================
   SHOP OWNER REGISTRATION
   ========================================================================== */

export default function ShopOwnerRegistrationForm() {
  const {
    registerShopOwner,
    isSubmitting,
  } =
    useAuth();

  const {
    width,
    height,
  } =
    useWindowDimensions();


  /* ==========================================================================
     OWNER STATE
     ========================================================================== */

  const [
    firstName,
    setFirstName,
  ] =
    useState('');

  const [
    middleName,
    setMiddleName,
  ] =
    useState('');

  const [
    lastName,
    setLastName,
  ] =
    useState('');

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    phoneNumber,
    setPhoneNumber,
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


  /* ==========================================================================
     SHOP STATE
     ========================================================================== */

  const [
    shopName,
    setShopName,
  ] =
    useState('');

  const [
    shopType,
    setShopType,
  ] =
    useState<ShopType>(
      'barber_shop',
    );

  const [
    shopDescription,
    setShopDescription,
  ] =
    useState('');

  const [
    shopPhoneNumber,
    setShopPhoneNumber,
  ] =
    useState('');

  const [
    shopEmail,
    setShopEmail,
  ] =
    useState('');

  const [
    shopAddress,
    setShopAddress,
  ] =
    useState('');

  const [
    shopCity,
    setShopCity,
  ] =
    useState('');

  const [
    shopProvince,
    setShopProvince,
  ] =
    useState('');


  /* ==========================================================================
     UI STATE
     ========================================================================== */

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
     PASSWORD CHECKS
     ========================================================================== */

  const passwordChecks =
    useMemo(
      () => ({
        length:
          password.length >= 12
          &&
          password.length <= 64,

        mixedCase:
          /[A-Z]/.test(
            password,
          )
          &&
          /[a-z]/.test(
            password,
          ),

        number:
          /\d/.test(
            password,
          ),

        symbol:
          /[^A-Za-z0-9]/.test(
            password,
          ),

        confirmation:
          password.length > 0
          &&
          password ===
            passwordConfirmation,
      }),
      [
        password,
        passwordConfirmation,
      ],
    );


  const passwordStrength =
    useMemo(
      () =>
        [
          passwordChecks.length,
          passwordChecks.mixedCase,
          passwordChecks.number,
          passwordChecks.symbol,
        ].filter(Boolean).length,
      [
        passwordChecks,
      ],
    );


  const passwordStrengthLabel =
    useMemo(
      () => {
        if (
          password.length ===
          0
        ) {
          return 'Not entered';
        }

        if (
          passwordStrength <= 1
        ) {
          return 'Needs improvement';
        }

        if (
          passwordStrength <= 3
        ) {
          return 'Almost ready';
        }

        return 'Strong';
      },
      [
        password,
        passwordStrength,
      ],
    );


  /* ==========================================================================
     CHANGE HELPERS
     ========================================================================== */

  function clearError() {
    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }


  function updateField(
    setter:
      (
        value: string,
      ) => void,

    value:
      string,
  ) {
    setter(value);

    clearError();
  }


  /* ==========================================================================
     SUBMIT REGISTRATION
     ========================================================================== */

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
        (value) =>
          value.trim() === '',
      )
    ) {
      setErrorMessage(
        'Complete all required fields.',
      );

      return;
    }


    if (
      password.length > 64
    ) {
      setErrorMessage(
        'The password may not be greater than 64 characters.',
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
          name:
            shopName,

          type:
            shopType,

          description:
            shopDescription,

          phoneNumber:
            shopPhoneNumber,

          email:
            shopEmail,

          address:
            shopAddress,

          city:
            shopCity,

          province:
            shopProvince,
        },
      });


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
        'Unable to submit your shop registration.',
      );
    }
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
          bounces={
            false
          }
          contentContainerStyle={
            styles.scrollContent
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
                disabled={
                  isSubmitting
                }
                accessibilityRole="button"
                accessibilityLabel="Go back"
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
                styles.header,

                isShortScreen &&
                  styles.headerCompact,
              ]}
            >
              <View
                style={
                  styles.ownerIcon
                }
              >
                <Ionicons
                  name="storefront-outline"
                  size={28}
                  color={
                    COLORS.orange
                  }
                />
              </View>


              <View
                style={
                  styles.ownerBadge
                }
              >
                <View
                  style={
                    styles.ownerBadgeDot
                  }
                />

                <Text
                  style={
                    styles.ownerBadgeText
                  }
                >
                  BUSINESS REGISTRATION
                </Text>
              </View>


              <Text
                style={[
                  styles.title,

                  isSmallPhone &&
                    styles.titleSmall,
                ]}
              >
                Register your shop
              </Text>


              <Text
                style={
                  styles.subtitle
                }
              >
                Create your Shop Owner account and
                submit your barber shop or beauty
                parlor for StyleHub Administrator review.
              </Text>
            </View>


            {/* ==============================================================
                PROGRESS
                ============================================================== */}

            <View
              style={
                styles.progressCard
              }
            >
              <ProgressItem
                number="1"
                label="Owner"
                active
              />

              <View
                style={
                  styles.progressLine
                }
              />

              <ProgressItem
                number="2"
                label="Shop"
                active
              />

              <View
                style={
                  styles.progressLine
                }
              />

              <ProgressItem
                number="3"
                label="Review"
              />
            </View>


            {/* ==============================================================
                MAIN FORM CARD
                ============================================================== */}

            <View
              style={
                styles.registrationCard
              }
            >
              {/* ============================================================
                  OWNER INFORMATION
                  ============================================================ */}

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

                  isTablet &&
                    styles.tabletGridThree,
                ]}
              >
                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="person-outline"
                    label="First Name"
                    value={
                      firstName
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setFirstName,
                          value,
                        )
                    }
                    placeholder="First name"
                    editable={
                      !isSubmitting
                    }
                    autoComplete="given-name"
                    textContentType="givenName"
                  />
                </View>


                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="person-outline"
                    label="Middle Name"
                    optional
                    value={
                      middleName
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setMiddleName,
                          value,
                        )
                    }
                    placeholder="Middle name"
                    editable={
                      !isSubmitting
                    }
                    autoComplete="additional-name"
                    textContentType="middleName"
                  />
                </View>


                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="person-outline"
                    label="Last Name"
                    value={
                      lastName
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setLastName,
                          value,
                        )
                    }
                    placeholder="Last name"
                    editable={
                      !isSubmitting
                    }
                    autoComplete="family-name"
                    textContentType="familyName"
                  />
                </View>
              </View>


              <View
                style={[
                  styles.fieldGrid,

                  isTablet &&
                    styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="mail-outline"
                    label="Email Address"
                    value={
                      email
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setEmail,
                          value,
                        )
                    }
                    placeholder="owner@example.com"
                    editable={
                      !isSubmitting
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>


                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="phone-portrait-outline"
                    label="Mobile Number"
                    value={
                      phoneNumber
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setPhoneNumber,
                          value,
                        )
                    }
                    placeholder="09XXXXXXXXX"
                    editable={
                      !isSubmitting
                    }
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    helperText="Use an active Philippine mobile number for account verification."
                  />
                </View>
              </View>


              {/* ============================================================
                  SECURITY
                  ============================================================ */}

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

                  isTablet &&
                    styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <PasswordField
                    label="Password"
                    value={
                      password
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setPassword,
                          value,
                        )
                    }
                    visible={
                      passwordVisible
                    }
                    onToggle={
                      () =>
                        setPasswordVisible(
                          (
                            current,
                          ) =>
                            !current,
                        )
                    }
                    editable={
                      !isSubmitting
                    }
                    placeholder="Create password"
                  />
                </View>


                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <PasswordField
                    label="Confirm Password"
                    value={
                      passwordConfirmation
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setPasswordConfirmation,
                          value,
                        )
                    }
                    visible={
                      confirmationVisible
                    }
                    onToggle={
                      () =>
                        setConfirmationVisible(
                          (
                            current,
                          ) =>
                            !current,
                        )
                    }
                    editable={
                      !isSubmitting
                    }
                    placeholder="Re-enter password"
                  />
                </View>
              </View>


              <View
                style={
                  styles.passwordGuide
                }
              >
                <View
                  style={
                    styles.passwordGuideHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.passwordGuideEyebrow
                      }
                    >
                      PASSWORD STRENGTH
                    </Text>

                    <Text
                      style={
                        styles.passwordStrengthLabel
                      }
                    >
                      {passwordStrengthLabel}
                    </Text>
                  </View>


                  <Text
                    style={
                      styles.passwordScore
                    }
                  >
                    {passwordStrength}/4
                  </Text>
                </View>


                <View
                  style={
                    styles.strengthTrack
                  }
                >
                  <View
                    style={[
                      styles.strengthFill,

                      {
                        width:
                          `${
                            (
                              passwordStrength
                              / 4
                            )
                            * 100
                          }%`,
                      },
                    ]}
                  />
                </View>


                <View
                  style={
                    styles.requirementsGrid
                  }
                >
                  <PasswordRequirement
                    complete={
                      passwordChecks.length
                    }
                    text="12–64 characters"
                  />

                  <PasswordRequirement
                    complete={
                      passwordChecks.mixedCase
                    }
                    text="Uppercase + lowercase"
                  />

                  <PasswordRequirement
                    complete={
                      passwordChecks.number
                    }
                    text="At least one number"
                  />

                  <PasswordRequirement
                    complete={
                      passwordChecks.symbol
                    }
                    text="At least one symbol"
                  />
                </View>
              </View>


              {
                passwordConfirmation.length > 0
                  ? (
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
                            ? COLORS.green
                            : COLORS.warning
                        }
                      />

                      <Text
                        style={[
                          styles.passwordMatchText,

                          {
                            color:
                              passwordChecks.confirmation
                                ? COLORS.green
                                : COLORS.warning,
                          },
                        ]}
                      >
                        {
                          passwordChecks.confirmation
                            ? 'Passwords match'
                            : 'Passwords do not match yet'
                        }
                      </Text>
                    </View>
                  )
                  : null
              }


              {/* ============================================================
                  SHOP INFORMATION
                  ============================================================ */}

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
                value={
                  shopName
                }
                onChangeText={
                  (
                    value,
                  ) =>
                    updateField(
                      setShopName,
                      value,
                    )
                }
                placeholder="Business name"
                editable={
                  !isSubmitting
                }
              />


              {/* ============================================================
                  SHOP TYPE
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
                    selected={
                      shopType ===
                      'barber_shop'
                    }
                    disabled={
                      isSubmitting
                    }
                    onPress={
                      () => {
                        setShopType(
                          'barber_shop',
                        );

                        clearError();
                      }
                    }
                  />


                  <ShopTypeCard
                    icon="sparkles-outline"
                    title="Beauty Parlor"
                    description="Beauty and salon services"
                    selected={
                      shopType ===
                      'beauty_parlor'
                    }
                    disabled={
                      isSubmitting
                    }
                    onPress={
                      () => {
                        setShopType(
                          'beauty_parlor',
                        );

                        clearError();
                      }
                    }
                  />
                </View>
              </View>


              <RegistrationField
                icon="document-text-outline"
                label="Description"
                optional
                value={
                  shopDescription
                }
                onChangeText={
                  (
                    value,
                  ) =>
                    updateField(
                      setShopDescription,
                      value,
                    )
                }
                placeholder="Tell customers about your shop, specialties, or services"
                editable={
                  !isSubmitting
                }
                multiline
                helperText="You can update your shop profile again after registration."
              />


              {/* ============================================================
                  SHOP CONTACT
                  ============================================================ */}

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

                  isTablet &&
                    styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="call-outline"
                    label="Shop Phone Number"
                    value={
                      shopPhoneNumber
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setShopPhoneNumber,
                          value,
                        )
                    }
                    placeholder="09XXXXXXXXX"
                    editable={
                      !isSubmitting
                    }
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                </View>


                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="mail-outline"
                    label="Shop Email"
                    optional
                    value={
                      shopEmail
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setShopEmail,
                          value,
                        )
                    }
                    placeholder="shop@example.com"
                    editable={
                      !isSubmitting
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
              </View>


              {/* ============================================================
                  LOCATION
                  ============================================================ */}

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
                value={
                  shopAddress
                }
                onChangeText={
                  (
                    value,
                  ) =>
                    updateField(
                      setShopAddress,
                      value,
                    )
                }
                placeholder="Street / Barangay"
                editable={
                  !isSubmitting
                }
                autoComplete="street-address"
              />


              <View
                style={[
                  styles.fieldGrid,

                  isTablet &&
                    styles.tabletGridTwo,
                ]}
              >
                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="business-outline"
                    label="City / Municipality"
                    value={
                      shopCity
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setShopCity,
                          value,
                        )
                    }
                    placeholder="City or municipality"
                    editable={
                      !isSubmitting
                    }
                  />
                </View>


                <View
                  style={
                    isTablet
                      ? styles.tabletField
                      : undefined
                  }
                >
                  <RegistrationField
                    icon="map-outline"
                    label="Province"
                    value={
                      shopProvince
                    }
                    onChangeText={
                      (
                        value,
                      ) =>
                        updateField(
                          setShopProvince,
                          value,
                        )
                    }
                    placeholder="Province"
                    editable={
                      !isSubmitting
                    }
                  />
                </View>
              </View>


              {/* ============================================================
                  APPROVAL NOTICE
                  ============================================================ */}

              <View
                style={
                  styles.approvalNotice
                }
              >
                <View
                  style={
                    styles.approvalIcon
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={
                      COLORS.warning
                    }
                  />
                </View>


                <View
                  style={
                    styles.approvalCopy
                  }
                >
                  <View
                    style={
                      styles.approvalTitleRow
                    }
                  >
                    <Text
                      style={
                        styles.approvalTitle
                      }
                    >
                      Administrator approval required
                    </Text>

                    <View
                      style={
                        styles.pendingBadge
                      }
                    >
                      <Text
                        style={
                          styles.pendingBadgeText
                        }
                      >
                        PENDING
                      </Text>
                    </View>
                  </View>


                  <Text
                    style={
                      styles.approvalText
                    }
                  >
                    Your shop will be submitted as pending.
                    Shop management features become available
                    after a StyleHub Administrator approves it.
                  </Text>
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
                          Unable to submit registration
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
                  SUBMIT
                  ============================================================ */}

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={
                  isSubmitting
                }
                accessibilityRole="button"
                accessibilityLabel="Submit Shop Owner Registration"
                onPress={
                  handleSubmit
                }
                style={[
                  styles.submitButton,

                  isSubmitting &&
                    styles.disabledButton,
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
                            styles.submitText
                          }
                        >
                          Submitting registration...
                        </Text>
                      </>
                    )
                    : (
                      <>
                        <Text
                          style={
                            styles.submitText
                          }
                        >
                          Submit Registration
                        </Text>

                        <View
                          style={
                            styles.submitIcon
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
                  SECURITY NOTE
                  ============================================================ */}

              <View
                style={
                  styles.securityNote
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={
                    COLORS.green
                  }
                />

                <Text
                  style={
                    styles.securityNoteText
                  }
                >
                  Your account and shop information are
                  sent securely to StyleHub for registration.
                </Text>
              </View>
            </View>


            {/* ==============================================================
                EXISTING ACCOUNT
                ============================================================== */}

            <View
              style={
                styles.loginCard
              }
            >
              <View
                style={
                  styles.loginCardIcon
                }
              >
                <Ionicons
                  name="log-in-outline"
                  size={18}
                  color={
                    COLORS.navy
                  }
                />
              </View>


              <View
                style={
                  styles.loginCardCopy
                }
              >
                <Text
                  style={
                    styles.loginCardTitle
                  }
                >
                  Already registered?
                </Text>

                <Text
                  style={
                    styles.loginCardDescription
                  }
                >
                  Sign in using your existing
                  StyleHub Shop Owner account.
                </Text>
              </View>


              <TouchableOpacity
                activeOpacity={0.75}
                disabled={
                  isSubmitting
                }
                accessibilityRole="button"
                accessibilityLabel="Go to Shop Owner Login"
                onPress={
                  () =>
                    router.replace(
                      '/(auth)/shop-owner-login',
                    )
                }
                style={
                  styles.loginLinkButton
                }
              >
                <Text
                  style={
                    styles.loginLinkText
                  }
                >
                  Sign In
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={
                    COLORS.navy
                  }
                />
              </TouchableOpacity>
            </View>


            {/* ==============================================================
                FOOTER
                ============================================================== */}

            <View
              style={
                styles.footer
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={
                  COLORS.textLight
                }
              />

              <Text
                style={
                  styles.footerText
                }
              >
                Secure StyleHub registration
              </Text>

              <View
                style={
                  styles.footerDot
                }
              />

              <Text
                style={
                  styles.footerText
                }
              >
                Shop Owner
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


/* ==========================================================================
   FORM SECTION HEADER
   ========================================================================== */

interface FormSectionHeaderProps {
  icon:
    keyof typeof Ionicons.glyphMap;

  eyebrow:
    string;

  title:
    string;

  description:
    string;

  tone:
    'blue'
    | 'orange'
    | 'green'
    | 'navy';

  compact?:
    boolean;
}


function FormSectionHeader({
  icon,
  eyebrow,
  title,
  description,
  tone,
  compact = false,
}: FormSectionHeaderProps) {
  const toneStyle =
    tone === 'blue'
      ? styles.sectionIconBlue
      : tone === 'orange'
        ? styles.sectionIconOrange
        : tone === 'green'
          ? styles.sectionIconGreen
          : styles.sectionIconNavy;


  const iconColor =
    tone === 'blue'
      ? COLORS.blue
      : tone === 'orange'
        ? COLORS.orange
        : tone === 'green'
          ? COLORS.green
          : COLORS.navy;


  return (
    <View
      style={[
        styles.sectionHeader,

        compact &&
          styles.sectionHeaderCompact,
      ]}
    >
      <View
        style={[
          styles.sectionIcon,

          toneStyle,
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            iconColor
          }
        />
      </View>


      <View
        style={
          styles.sectionHeaderCopy
        }
      >
        <Text
          style={
            styles.sectionEyebrow
          }
        >
          {eyebrow}
        </Text>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          {description}
        </Text>
      </View>
    </View>
  );
}


/* ==========================================================================
   FORM FIELD
   ========================================================================== */

interface RegistrationFieldProps {
  icon:
    keyof typeof Ionicons.glyphMap;

  label:
    string;

  optional?:
    boolean;

  value:
    string;

  onChangeText:
    (
      value: string,
    ) => void;

  placeholder:
    string;

  editable:
    boolean;

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

  helperText?:
    string;

  multiline?:
    boolean;
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
    <View
      style={
        styles.field
      }
    >
      <View
        style={
          styles.fieldLabelRow
        }
      >
        <Text
          style={
            styles.label
          }
        >
          {label}
        </Text>


        {
          optional
            ? (
              <View
                style={
                  styles.optionalBadge
                }
              >
                <Text
                  style={
                    styles.optionalText
                  }
                >
                  OPTIONAL
                </Text>
              </View>
            )
            : null
        }
      </View>


      <View
        style={[
          styles.inputContainer,

          multiline &&
            styles.inputContainerMultiline,
        ]}
      >
        <View
          style={[
            styles.inputIcon,

            multiline &&
              styles.inputIconMultiline,
          ]}
        >
          <Ionicons
            name={icon}
            size={17}
            color={
              COLORS.textMuted
            }
          />
        </View>


        <TextInput
          value={
            value
          }
          onChangeText={
            onChangeText
          }
          editable={
            editable
          }
          placeholder={
            placeholder
          }
          placeholderTextColor={
            COLORS.textLight
          }
          keyboardType={
            keyboardType
          }
          autoCapitalize={
            autoCapitalize
          }
          autoCorrect={
            false
          }
          autoComplete={
            autoComplete
          }
          textContentType={
            textContentType
          }
          multiline={
            multiline
          }
          numberOfLines={
            multiline
              ? 4
              : 1
          }
          textAlignVertical={
            multiline
              ? 'top'
              : 'center'
          }
          style={[
            styles.input,

            multiline &&
              styles.multilineInput,
          ]}
        />
      </View>


      {
        helperText
          ? (
            <View
              style={
                styles.helperRow
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={12}
                color={
                  COLORS.textLight
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                {helperText}
              </Text>
            </View>
          )
          : null
      }
    </View>
  );
}


/* ==========================================================================
   PASSWORD FIELD
   ========================================================================== */

interface PasswordFieldProps {
  label:
    string;

  value:
    string;

  onChangeText:
    (
      value: string,
    ) => void;

  visible:
    boolean;

  onToggle:
    () => void;

  editable:
    boolean;

  placeholder:
    string;
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
        {label}
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
            name="lock-closed-outline"
            size={17}
            color={
              COLORS.textMuted
            }
          />
        </View>


        <TextInput
          value={
            value
          }
          onChangeText={
            onChangeText
          }
          editable={
            editable
          }
          placeholder={
            placeholder
          }
          placeholderTextColor={
            COLORS.textLight
          }
          secureTextEntry={
            !visible
          }
          autoCapitalize="none"
          autoCorrect={
            false
          }
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={64}
          multiline={
            false
          }
          numberOfLines={1}
          style={[
            styles.input,

            styles.passwordInput,
          ]}
        />


        <TouchableOpacity
          activeOpacity={0.65}
          disabled={
            !editable
          }
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
          onPress={
            onToggle
          }
          style={
            styles.visibilityButton
          }
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={19}
            color={
              COLORS.textMuted
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}


/* ==========================================================================
   PASSWORD REQUIREMENT
   ========================================================================== */

interface PasswordRequirementProps {
  complete:
    boolean;

  text:
    string;
}


function PasswordRequirement({
  complete,
  text,
}: PasswordRequirementProps) {
  return (
    <View
      style={
        styles.requirementRow
      }
    >
      <View
        style={[
          styles.requirementIcon,

          complete &&
            styles.requirementIconComplete,
        ]}
      >
        {
          complete
            ? (
              <Ionicons
                name="checkmark"
                size={11}
                color={
                  COLORS.green
                }
              />
            )
            : null
        }
      </View>


      <Text
        style={[
          styles.requirementText,

          complete &&
            styles.requirementTextComplete,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}


/* ==========================================================================
   SHOP TYPE CARD
   ========================================================================== */

interface ShopTypeCardProps {
  icon:
    keyof typeof Ionicons.glyphMap;

  title:
    string;

  description:
    string;

  selected:
    boolean;

  disabled:
    boolean;

  onPress:
    () => void;
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
      disabled={
        disabled
      }
      accessibilityRole="radio"
      accessibilityState={{
        selected,
        disabled,
      }}
      onPress={
        onPress
      }
      style={[
        styles.shopTypeCard,

        selected &&
          styles.shopTypeCardSelected,

        disabled &&
          styles.shopTypeCardDisabled,
      ]}
    >
      <View
        style={[
          styles.shopTypeIcon,

          selected &&
            styles.shopTypeIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            selected
              ? COLORS.orange
              : COLORS.textMuted
          }
        />
      </View>


      <View
        style={
          styles.shopTypeCopy
        }
      >
        <Text
          style={[
            styles.shopTypeTitle,

            selected &&
              styles.shopTypeTitleSelected,
          ]}
        >
          {title}
        </Text>

        <Text
          style={
            styles.shopTypeDescription
          }
        >
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
            ? COLORS.orange
            : COLORS.textLight
        }
      />
    </TouchableOpacity>
  );
}


/* ==========================================================================
   PROGRESS ITEM
   ========================================================================== */

interface ProgressItemProps {
  number:
    string;

  label:
    string;

  active?:
    boolean;
}


function ProgressItem({
  number,
  label,
  active = false,
}: ProgressItemProps) {
  return (
    <View
      style={
        styles.progressItem
      }
    >
      <View
        style={[
          styles.progressNumber,

          active &&
            styles.progressNumberActive,
        ]}
      >
        <Text
          style={[
            styles.progressNumberText,

            active &&
              styles.progressNumberTextActive,
          ]}
        >
          {number}
        </Text>
      </View>

      <Text
        style={[
          styles.progressLabel,

          active &&
            styles.progressLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}


/* ==========================================================================
   DIVIDER
   ========================================================================== */

function SectionDivider({
  subtle = false,
}: {
  subtle?: boolean;
}) {
  return (
    <View
      style={[
        styles.sectionDivider,

        subtle &&
          styles.sectionDividerSubtle,
      ]}
    />
  );
}


/* ==========================================================================
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
    /* ======================================================================
       ROOT
       ====================================================================== */

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },


    flex: {
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
    },


    /* ======================================================================
       TOP NAVIGATION
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
       HEADER
       ====================================================================== */

    header: {
      alignItems: 'center',

      paddingTop:
        SPACING.lg,

      paddingBottom:
        SPACING.xl,
    },


    headerCompact: {
      paddingTop:
        SPACING.sm,

      paddingBottom:
        SPACING.lg,
    },


    ownerIcon: {
      width: 64,

      height: 64,

      alignItems: 'center',

      justifyContent: 'center',

      marginBottom:
        SPACING.md,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.orangeSoft,
    },


    ownerBadge: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      paddingHorizontal: 9,

      paddingVertical: 5,

      marginBottom:
        SPACING.sm,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.orangeSoft,
    },


    ownerBadgeDot: {
      width: 5,

      height: 5,

      borderRadius: 3,

      backgroundColor:
        COLORS.orange,
    },


    ownerBadgeText: {
      color:
        COLORS.orange,

      fontSize: 8,

      fontWeight: '800',

      letterSpacing: 1,
    },


    title: {
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
      maxWidth: 520,

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
       PROGRESS
       ====================================================================== */

    progressCard: {
      width: '100%',

      minHeight: 74,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      paddingHorizontal:
        SPACING.lg,

      marginBottom:
        SPACING.md,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },


    progressItem: {
      alignItems: 'center',

      gap: 4,
    },


    progressNumber: {
      width: 27,

      height: 27,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    progressNumberActive: {
      borderColor:
        COLORS.orange,

      backgroundColor:
        COLORS.orangeSoft,
    },


    progressNumberText: {
      color:
        COLORS.textLight,

      fontSize: 9,

      fontWeight: '800',
    },


    progressNumberTextActive: {
      color:
        COLORS.orange,
    },


    progressLabel: {
      color:
        COLORS.textLight,

      fontSize: 8,

      fontWeight: '600',
    },


    progressLabelActive: {
      color:
        COLORS.textMuted,
    },


    progressLine: {
      width: 54,

      maxWidth: '15%',

      height: 1,

      marginHorizontal:
        SPACING.sm,

      backgroundColor:
        COLORS.border,
    },


    /* ======================================================================
       FORM CARD
       ====================================================================== */

    registrationCard: {
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


    /* ======================================================================
       SECTION HEADER
       ====================================================================== */

    sectionHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      gap:
        SPACING.sm,

      marginBottom:
        SPACING.lg,
    },


    sectionHeaderCompact: {
      marginBottom:
        SPACING.md,
    },


    sectionIcon: {
      width: 40,

      height: 40,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.md,
    },


    sectionIconBlue: {
      backgroundColor:
        COLORS.blueSoft,
    },


    sectionIconOrange: {
      backgroundColor:
        COLORS.orangeSoft,
    },


    sectionIconGreen: {
      backgroundColor:
        COLORS.greenSoft,
    },


    sectionIconNavy: {
      backgroundColor:
        COLORS.accentSoft,
    },


    sectionHeaderCopy: {
      minWidth: 0,

      flex: 1,
    },


    sectionEyebrow: {
      color:
        COLORS.textLight,

      fontSize: 7,

      fontWeight: '800',

      letterSpacing: 1,
    },


    sectionTitle: {
      marginTop: 2,

      color:
        COLORS.text,

      fontSize: 14,

      fontWeight: '800',

      letterSpacing: -0.15,
    },


    sectionDescription: {
      marginTop: 2,

      color:
        COLORS.textMuted,

      fontSize: 10,

      lineHeight: 15,
    },


    sectionDivider: {
      height: 1,

      marginTop:
        SPACING.xs,

      marginBottom:
        SPACING.xl,

      backgroundColor:
        COLORS.border,
    },


    sectionDividerSubtle: {
      marginTop:
        SPACING.sm,

      marginBottom:
        SPACING.lg,
    },


    /* ======================================================================
       RESPONSIVE GRIDS
       ====================================================================== */

    nameGrid: {
      width: '100%',
    },


    fieldGrid: {
      width: '100%',
    },


    tabletGridThree: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap:
        SPACING.sm,
    },


    tabletGridTwo: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap:
        SPACING.sm,
    },


    tabletField: {
      minWidth: 0,

      flex: 1,
    },


    /* ======================================================================
       FIELDS
       ====================================================================== */

    field: {
      width: '100%',

      marginBottom:
        SPACING.md,
    },


    fieldLabelRow: {
      minHeight: 23,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 7,
    },


    label: {
      color:
        COLORS.navy,

      fontSize: 11,

      fontWeight: '700',
    },


    optionalBadge: {
      paddingHorizontal: 6,

      paddingVertical: 3,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    optionalText: {
      color:
        COLORS.textLight,

      fontSize: 7,

      fontWeight: '700',

      letterSpacing: 0.5,
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


    inputContainerMultiline: {
      minHeight: 118,

      alignItems: 'flex-start',
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


    inputIconMultiline: {
      marginTop: 10,
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


    multilineInput: {
      minHeight: 110,

      paddingTop: 13,

      paddingBottom: 13,

      lineHeight: 19,
    },


    passwordInput: {
      paddingRight:
        SPACING.xs,
    },


    visibilityButton: {
      width: 38,

      height: 42,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.sm,
    },


    helperRow: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 5,

      marginTop: 6,

      paddingHorizontal: 2,
    },


    helperText: {
      minWidth: 0,

      flex: 1,

      color:
        COLORS.textLight,

      fontSize: 9,

      lineHeight: 14,
    },


    /* ======================================================================
       PASSWORD GUIDE
       ====================================================================== */

    passwordGuide: {
      marginTop: -2,

      marginBottom:
        SPACING.md,

      padding:
        SPACING.md,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    passwordGuideHeader: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      justifyContent:
        'space-between',

      gap:
        SPACING.sm,
    },


    passwordGuideEyebrow: {
      color:
        COLORS.textLight,

      fontSize: 7,

      fontWeight: '800',

      letterSpacing: 0.9,
    },


    passwordStrengthLabel: {
      marginTop: 2,

      color:
        COLORS.text,

      fontSize: 11,

      fontWeight: '700',
    },


    passwordScore: {
      paddingHorizontal: 7,

      paddingVertical: 4,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surface,

      color:
        COLORS.textMuted,

      fontSize: 8,

      fontWeight: '700',
    },


    strengthTrack: {
      width: '100%',

      height: 5,

      overflow: 'hidden',

      marginTop:
        SPACING.sm,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.border,
    },


    strengthFill: {
      height: '100%',

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.green,
    },


    requirementsGrid: {
      marginTop:
        SPACING.md,

      gap: 8,
    },


    requirementRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,
    },


    requirementIcon: {
      width: 17,

      height: 17,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.surface,
    },


    requirementIconComplete: {
      borderColor:
        '#CBE5D8',

      backgroundColor:
        COLORS.greenSoft,
    },


    requirementText: {
      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
    },


    requirementTextComplete: {
      color:
        COLORS.green,

      fontWeight: '600',
    },


    passwordMatch: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      marginTop: -5,

      marginBottom:
        SPACING.md,

      paddingHorizontal:
        SPACING.sm,

      paddingVertical: 8,

      borderWidth: 1,

      borderRadius:
        RADII.sm,
    },


    passwordMatchSuccess: {
      borderColor:
        '#CBE5D8',

      backgroundColor:
        COLORS.greenSoft,
    },


    passwordMatchWarning: {
      borderColor:
        '#F0DCAE',

      backgroundColor:
        COLORS.warningSoft,
    },


    passwordMatchText: {
      fontSize: 9,

      fontWeight: '600',
    },


    /* ======================================================================
       SHOP TYPE
       ====================================================================== */

    shopTypeGrid: {
      flexDirection: 'row',

      gap:
        SPACING.sm,

      marginTop: 7,
    },


    shopTypeGridSmall: {
      flexDirection: 'column',
    },


    shopTypeCard: {
      minWidth: 0,

      minHeight: 94,

      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',

      gap:
        SPACING.sm,

      padding:
        SPACING.sm,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surfaceSoft,
    },


    shopTypeCardSelected: {
      borderColor:
        '#F0D1B2',

      backgroundColor:
        COLORS.orangeSoft,
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

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.surface,
    },


    shopTypeIconSelected: {
      backgroundColor:
        COLORS.white,
    },


    shopTypeCopy: {
      minWidth: 0,

      flex: 1,
    },


    shopTypeTitle: {
      color:
        COLORS.text,

      fontSize: 11,

      fontWeight: '700',
    },


    shopTypeTitleSelected: {
      color:
        COLORS.orange,
    },


    shopTypeDescription: {
      marginTop: 2,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
    },


    /* ======================================================================
       APPROVAL
       ====================================================================== */

    approvalNotice: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      gap:
        SPACING.sm,

      marginTop:
        SPACING.xs,

      marginBottom:
        SPACING.lg,

      padding:
        SPACING.md,

      borderWidth: 1,

      borderColor:
        '#F0DCAE',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.warningSoft,
    },


    approvalIcon: {
      width: 38,

      height: 38,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.white,
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
      color:
        COLORS.warning,

      fontSize: 11,

      fontWeight: '800',
    },


    pendingBadge: {
      paddingHorizontal: 6,

      paddingVertical: 3,

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.white,
    },


    pendingBadgeText: {
      color:
        COLORS.warning,

      fontSize: 7,

      fontWeight: '800',

      letterSpacing: 0.5,
    },


    approvalText: {
      marginTop: 3,

      color:
        '#8A6B2C',

      fontSize: 9,

      lineHeight: 15,
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
        '#F0CCCC',

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

      fontSize: 10,

      lineHeight: 16,
    },


    /* ======================================================================
       SUBMIT
       ====================================================================== */

    submitButton: {
      minHeight:
        LAYOUT.buttonHeight,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap:
        SPACING.xs,

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.navy,

      ...SHADOWS.card,
    },


    disabledButton: {
      opacity: 0.58,
    },


    submitText: {
      color:
        COLORS.white,

      fontSize: 13,

      fontWeight: '700',
    },


    submitIcon: {
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
       SECURITY
       ====================================================================== */

    securityNote: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 6,

      marginTop:
        SPACING.md,
    },


    securityNoteText: {
      minWidth: 0,

      color:
        COLORS.textLight,

      fontSize: 9,

      lineHeight: 14,

      textAlign: 'center',
    },


    /* ======================================================================
       LOGIN CARD
       ====================================================================== */

    loginCard: {
      width: '100%',

      flexDirection: 'row',

      alignItems: 'center',

      gap:
        SPACING.sm,

      marginTop:
        SPACING.md,

      padding:
        SPACING.md,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADII.lg,

      backgroundColor:
        COLORS.surface,
    },


    loginCardIcon: {
      width: 40,

      height: 40,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.orangeSoft,
    },


    loginCardCopy: {
      minWidth: 0,

      flex: 1,
    },


    loginCardTitle: {
      color:
        COLORS.text,

      fontSize: 11,

      fontWeight: '700',
    },


    loginCardDescription: {
      marginTop: 2,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
    },


    loginLinkButton: {
      minHeight:
        LAYOUT.compactButtonHeight,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 4,

      flexShrink: 0,

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


    loginLinkText: {
      color:
        COLORS.navy,

      fontSize: 10,

      fontWeight: '700',
    },


    /* ======================================================================
       FOOTER
       ====================================================================== */

    footer: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      flexWrap: 'wrap',

      gap: 7,

      marginTop:
        SPACING.xl,
    },


    footerText: {
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