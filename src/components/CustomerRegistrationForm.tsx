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


/* ==========================================================================
   CUSTOMER REGISTRATION FORM
   ========================================================================== */

export default function CustomerRegistrationForm() {
  const {
    registerCustomer,
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
     PASSWORD PRESENTATION
     ========================================================================== */

  const passwordChecks =
    useMemo(
      () => ({
        length:
          password.length >= 12
          &&
          password.length <= 64,

        mixedCase:
          /[a-z]/.test(
            password,
          )
          &&
          /[A-Z]/.test(
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
          passwordStrength <=
          1
        ) {
          return 'Needs improvement';
        }

        if (
          passwordStrength <=
          3
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
     FIELD UPDATE HELPERS
     ========================================================================== */

  function clearError() {
    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }


  function updateFirstName(
    value: string,
  ) {
    setFirstName(value);

    clearError();
  }


  function updateMiddleName(
    value: string,
  ) {
    setMiddleName(value);

    clearError();
  }


  function updateLastName(
    value: string,
  ) {
    setLastName(value);

    clearError();
  }


  function updateEmail(
    value: string,
  ) {
    setEmail(value);

    clearError();
  }


  function updatePhoneNumber(
    value: string,
  ) {
    setPhoneNumber(value);

    clearError();
  }


  function updatePassword(
    value: string,
  ) {
    setPassword(value);

    clearError();
  }


  function updatePasswordConfirmation(
    value: string,
  ) {
    setPasswordConfirmation(
      value,
    );

    clearError();
  }


  /* ==========================================================================
     SUBMIT REGISTRATION
     ========================================================================== */

  async function handleSubmit() {
    setErrorMessage('');


    if (
      firstName.trim() ===
      ''
    ) {
      setErrorMessage(
        'Enter your first name.',
      );

      return;
    }


    if (
      lastName.trim() ===
      ''
    ) {
      setErrorMessage(
        'Enter your last name.',
      );

      return;
    }


    if (
      email.trim() ===
      ''
    ) {
      setErrorMessage(
        'Enter your email address.',
      );

      return;
    }


    if (
      phoneNumber.trim() ===
      ''
    ) {
      setErrorMessage(
        'Enter your mobile number.',
      );

      return;
    }


    if (
      password ===
      ''
    ) {
      setErrorMessage(
        'Enter a password.',
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
      passwordConfirmation ===
      ''
    ) {
      setErrorMessage(
        'Confirm your password.',
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
      await registerCustomer({
        firstName,

        middleName,

        lastName,

        email,

        phoneNumber,

        password,

        passwordConfirmation,
      });


      router.replace(
        '/(customer)/customer',
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
        'Unable to create your account.',
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
                  styles.customerIcon
                }
              >
                <Ionicons
                  name="person-add-outline"
                  size={27}
                  color={
                    COLORS.blue
                  }
                />
              </View>


              <View
                style={
                  styles.customerBadge
                }
              >
                <View
                  style={
                    styles.customerBadgeDot
                  }
                />

                <Text
                  style={
                    styles.customerBadgeText
                  }
                >
                  CUSTOMER REGISTRATION
                </Text>
              </View>


              <Text
                style={[
                  styles.title,

                  isSmallPhone &&
                    styles.titleSmall,
                ]}
              >
                Create your account
              </Text>


              <Text
                style={
                  styles.subtitle
                }
              >
                Join StyleHub to discover beauty and
                grooming shops, book services and manage
                your appointments in one place.
              </Text>
            </View>


            {/* ==============================================================
                REGISTRATION CARD
                ============================================================== */}

            <View
              style={
                styles.registrationCard
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
                    ACCOUNT DETAILS
                  </Text>

                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Customer information
                  </Text>
                </View>


                <View
                  style={
                    styles.stepBadge
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={
                      COLORS.blue
                    }
                  />

                  <Text
                    style={
                      styles.stepBadgeText
                    }
                  >
                    Customer
                  </Text>
                </View>
              </View>


              {/* ============================================================
                  PERSONAL INFORMATION
                  ============================================================ */}

              <FormSectionHeader
                icon="person-outline"
                title="Personal information"
                description="Enter your name as you want it shown in StyleHub."
              />


              <View
                style={[
                  styles.nameGrid,

                  isTablet &&
                    styles.nameGridTablet,
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
                      updateFirstName
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
                      updateMiddleName
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
                      updateLastName
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


              {/* ============================================================
                  CONTACT INFORMATION
                  ============================================================ */}

              <View
                style={
                  styles.sectionDivider
                }
              />


              <FormSectionHeader
                icon="chatbubble-ellipses-outline"
                title="Contact information"
                description="We'll use these details for your StyleHub account and notifications."
              />


              <RegistrationField
                icon="mail-outline"
                label="Email Address"
                value={
                  email
                }
                onChangeText={
                  updateEmail
                }
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                editable={
                  !isSubmitting
                }
              />


              <RegistrationField
                icon="phone-portrait-outline"
                label="Mobile Number"
                value={
                  phoneNumber
                }
                onChangeText={
                  updatePhoneNumber
                }
                placeholder="09XXXXXXXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={
                  !isSubmitting
                }
                helperText="Use an active Philippine mobile number. You'll need it for account verification."
              />


              {/* ============================================================
                  ACCOUNT SECURITY
                  ============================================================ */}

              <View
                style={
                  styles.sectionDivider
                }
              />


              <FormSectionHeader
                icon="shield-checkmark-outline"
                title="Account security"
                description="Create a strong password for your StyleHub account."
              />


              <PasswordField
                label="Password"
                value={
                  password
                }
                onChangeText={
                  updatePassword
                }
                visible={
                  passwordVisible
                }
                onToggleVisibility={
                  () =>
                    setPasswordVisible(
                      (current) =>
                        !current,
                    )
                }
                editable={
                  !isSubmitting
                }
                placeholder="Create password"
                autoComplete="new-password"
              />


              {/* ============================================================
                  PASSWORD STRENGTH
                  ============================================================ */}

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
                    styles.requirements
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
                    text="Uppercase and lowercase letters"
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


              <PasswordField
                label="Confirm Password"
                value={
                  passwordConfirmation
                }
                onChangeText={
                  updatePasswordConfirmation
                }
                visible={
                  confirmationVisible
                }
                onToggleVisibility={
                  () =>
                    setConfirmationVisible(
                      (current) =>
                        !current,
                    )
                }
                editable={
                  !isSubmitting
                }
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />


              {
                passwordConfirmation.length >
                  0
                  ? (
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
                            ? COLORS.green
                            : COLORS.warning
                        }
                      />

                      <Text
                        style={[
                          styles.confirmationStatusText,

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
                          Unable to create account
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
                accessibilityLabel="Create Customer Account"
                style={[
                  styles.submitButton,

                  isSubmitting &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleSubmit
                }
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
                          Creating account...
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
                          Create Customer Account
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
                  VERIFICATION NOTE
                  ============================================================ */}

              <View
                style={
                  styles.verificationNotice
                }
              >
                <View
                  style={
                    styles.verificationIcon
                  }
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={
                      COLORS.blue
                    }
                  />
                </View>


                <View
                  style={
                    styles.verificationCopy
                  }
                >
                  <Text
                    style={
                      styles.verificationTitle
                    }
                  >
                    Mobile verification required
                  </Text>

                  <Text
                    style={
                      styles.verificationText
                    }
                  >
                    New customer accounts must verify
                    their mobile number before using
                    protected customer features.
                  </Text>
                </View>
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
                  Already have an account?
                </Text>

                <Text
                  style={
                    styles.loginCardDescription
                  }
                >
                  Sign in using your existing
                  StyleHub customer account.
                </Text>
              </View>


              <TouchableOpacity
                activeOpacity={0.75}
                disabled={
                  isSubmitting
                }
                accessibilityRole="button"
                accessibilityLabel="Go to Customer Login"
                onPress={
                  () =>
                    router.replace(
                      '/(auth)/customer-login',
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
                Customer
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

  title:
    string;

  description:
    string;
}


function FormSectionHeader({
  icon,
  title,
  description,
}: FormSectionHeaderProps) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={
          styles.sectionIcon
        }
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            COLORS.navy
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
   REGISTRATION FIELD
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

  helperText?:
    string;

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
            false
          }
          numberOfLines={1}
          style={
            styles.input
          }
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

  onToggleVisibility:
    () => void;

  editable:
    boolean;

  placeholder:
    string;

  autoComplete:
    'new-password';
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
          autoComplete={
            autoComplete
          }
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
          disabled={
            !editable
          }
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
          onPress={
            onToggleVisibility
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
   STYLES
   ========================================================================== */

const styles =
  StyleSheet.create({
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
       HEADER
       ====================================================================== */

    header: {
      alignItems: 'center',

      paddingTop:
        SPACING.lg,

      paddingBottom:
        SPACING.xxl,
    },


    headerCompact: {
      paddingTop:
        SPACING.sm,

      paddingBottom:
        SPACING.xl,
    },


    customerIcon: {
      width: 62,

      height: 62,

      alignItems: 'center',

      justifyContent: 'center',

      marginBottom:
        SPACING.md,

      borderRadius:
        RADII.xl,

      backgroundColor:
        COLORS.blueSoft,
    },


    customerBadge: {
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
        COLORS.blueSoft,
    },


    customerBadgeDot: {
      width: 5,

      height: 5,

      borderRadius: 3,

      backgroundColor:
        COLORS.blue,
    },


    customerBadgeText: {
      color:
        COLORS.blue,

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
      maxWidth: 510,

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
       REGISTRATION CARD
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


    cardHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      gap:
        SPACING.sm,

      paddingBottom:
        SPACING.lg,

      marginBottom:
        SPACING.lg,

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
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

      letterSpacing: -0.2,
    },


    stepBadge: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      paddingHorizontal: 9,

      paddingVertical: 6,

      borderWidth: 1,

      borderColor:
        '#DCE4FA',

      borderRadius:
        RADII.pill,

      backgroundColor:
        COLORS.blueSoft,
    },


    stepBadgeText: {
      color:
        COLORS.blue,

      fontSize: 9,

      fontWeight: '700',
    },


    /* ======================================================================
       FORM SECTION
       ====================================================================== */

    sectionHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      gap:
        SPACING.sm,

      marginBottom:
        SPACING.lg,
    },


    sectionIcon: {
      width: 38,

      height: 38,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.accentSoft,
    },


    sectionHeaderCopy: {
      minWidth: 0,

      flex: 1,
    },


    sectionTitle: {
      color:
        COLORS.text,

      fontSize: 13,

      fontWeight: '800',
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


    /* ======================================================================
       RESPONSIVE NAME GRID
       ====================================================================== */

    nameGrid: {
      width: '100%',
    },


    nameGridTablet: {
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
       FIELD
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
      marginTop: -3,

      marginBottom:
        SPACING.lg,

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


    requirements: {
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


    /* ======================================================================
       CONFIRMATION STATUS
       ====================================================================== */

    confirmationStatus: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      marginTop: -7,

      marginBottom:
        SPACING.md,

      paddingHorizontal:
        SPACING.sm,

      paddingVertical: 8,

      borderWidth: 1,

      borderRadius:
        RADII.sm,
    },


    confirmationSuccess: {
      borderColor:
        '#CBE5D8',

      backgroundColor:
        COLORS.greenSoft,
    },


    confirmationWarning: {
      borderColor:
        '#F0DCAE',

      backgroundColor:
        COLORS.warningSoft,
    },


    confirmationStatusText: {
      fontSize: 9,

      fontWeight: '600',
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
       VERIFICATION
       ====================================================================== */

    verificationNotice: {
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


    verificationIcon: {
      width: 38,

      height: 38,

      flexShrink: 0,

      alignItems: 'center',

      justifyContent: 'center',

      borderRadius:
        RADII.md,

      backgroundColor:
        COLORS.blueSoft,
    },


    verificationCopy: {
      minWidth: 0,

      flex: 1,
    },


    verificationTitle: {
      color:
        COLORS.text,

      fontSize: 10,

      fontWeight: '700',
    },


    verificationText: {
      marginTop: 2,

      color:
        COLORS.textMuted,

      fontSize: 9,

      lineHeight: 14,
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
        COLORS.accentSoft,
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