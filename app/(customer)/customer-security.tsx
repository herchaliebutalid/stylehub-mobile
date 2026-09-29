import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
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

import { COLORS } from '@/src/constants/colors';
import {
  LAYOUT,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import { changePassword } from '@/src/services/password-security-api';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

type PasswordRequirement = {
  label: string;
  met: boolean;
};

function buildDisplayName(
  firstName: string | null | undefined,
  middleName: string | null | undefined,
  lastName: string | null | undefined,
  fullName: string | null | undefined,
): string {
  const preferred =
    fullName?.trim();

  if (preferred) {
    return preferred;
  }

  return [
    firstName,
    middleName,
    lastName,
  ]
    .filter(
      (
        value,
      ): value is string =>
        typeof value === 'string'
        &&
        value.trim() !== '',
    )
    .join(' ')
    .trim()
    ||
    'StyleHub Customer';
}

export default function CustomerSecurityScreen() {
  const {
    user,
    token,
  } = useAuth();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState('');

  const [
    currentVisible,
    setCurrentVisible,
  ] = useState(false);

  const [
    newVisible,
    setNewVisible,
  ] = useState(false);

  const [
    confirmationVisible,
    setConfirmationVisible,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const displayName =
    buildDisplayName(
      user?.first_name,
      user?.middle_name,
      user?.last_name,
      user?.full_name,
    );

  const requirements =
    useMemo<PasswordRequirement[]>(
      () => [
        {
          label:
            '12–64 characters',

          met:
            newPassword.length >= 12
            &&
            newPassword.length <= 64,
        },

        {
          label:
            'At least one uppercase letter',

          met:
            /[A-Z]/.test(
              newPassword,
            ),
        },

        {
          label:
            'At least one lowercase letter',

          met:
            /[a-z]/.test(
              newPassword,
            ),
        },

        {
          label:
            'At least one number',

          met:
            /\d/.test(
              newPassword,
            ),
        },

        {
          label:
            'At least one symbol',

          met:
            /[^A-Za-z0-9]/.test(
              newPassword,
            ),
        },
      ],
      [
        newPassword,
      ],
    );

  const passwordPolicyMet =
    requirements.every(
      (requirement) =>
        requirement.met,
    );

  const confirmationMatches =
    passwordConfirmation.length > 0
    &&
    newPassword
      === passwordConfirmation;

  const newPasswordDifferent =
    newPassword.length > 0
    &&
    currentPassword
      !== newPassword;

  const formComplete =
    Boolean(
      currentPassword
      &&
      newPassword
      &&
      passwordConfirmation,
    );

  function clearMessages(): void {
    if (errorMessage) {
      setErrorMessage('');
    }

    if (successMessage) {
      setSuccessMessage('');
    }
  }

  function clearForm(): void {
    if (isSubmitting) {
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setPasswordConfirmation('');

    setCurrentVisible(false);
    setNewVisible(false);
    setConfirmationVisible(false);

    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleChangePassword(): Promise<void> {
    setErrorMessage('');
    setSuccessMessage('');

    if (
      !token
      ||
      !user
    ) {
      setErrorMessage(
        'Your session is no longer available. Please sign in again.',
      );

      return;
    }

    if (
      user.role
      !== 'customer'
    ) {
      setErrorMessage(
        'This account does not match the Customer security screen.',
      );

      return;
    }

    if (
      currentPassword === ''
    ) {
      setErrorMessage(
        'Enter your current password.',
      );

      return;
    }

    if (
      newPassword.length < 12
    ) {
      setErrorMessage(
        'Your new password must contain at least 12 characters.',
      );

      return;
    }

    if (
      newPassword.length > 64
    ) {
      setErrorMessage(
        'Your new password may not exceed 64 characters.',
      );

      return;
    }

    if (
      !/[A-Z]/.test(
        newPassword,
      )
    ) {
      setErrorMessage(
        'Your new password must contain at least one uppercase letter.',
      );

      return;
    }

    if (
      !/[a-z]/.test(
        newPassword,
      )
    ) {
      setErrorMessage(
        'Your new password must contain at least one lowercase letter.',
      );

      return;
    }

    if (
      !/\d/.test(
        newPassword,
      )
    ) {
      setErrorMessage(
        'Your new password must contain at least one number.',
      );

      return;
    }

    if (
      !/[^A-Za-z0-9]/.test(
        newPassword,
      )
    ) {
      setErrorMessage(
        'Your new password must contain at least one symbol.',
      );

      return;
    }

    if (
      currentPassword
      === newPassword
    ) {
      setErrorMessage(
        'The new password must be different from your current password.',
      );

      return;
    }

    if (
      newPassword
      !== passwordConfirmation
    ) {
      setErrorMessage(
        'The password confirmation does not match.',
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await changePassword(
          token,
          {
            currentPassword,

            password:
              newPassword,

            passwordConfirmation,
          },
        );

      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');

      setCurrentVisible(false);
      setNewVisible(false);
      setConfirmationVisible(false);

      setSuccessMessage(
        response.message,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to change your password right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
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
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={isSubmitting}
              onPress={() =>
                router.back()
              }
              style={styles.topIconButton}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.navy}
              />
            </TouchableOpacity>

            <View
              style={
                styles.topBarTitleBlock
              }
            >
              <Text
                style={
                  styles.topBarTitle
                }
              >
                Account security
              </Text>

              <Text
                style={
                  styles.topBarCaption
                }
              >
                Password & session protection
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Clear password form"
              disabled={
                !formComplete
                ||
                isSubmitting
              }
              onPress={clearForm}
              style={[
                styles.topIconButton,

                (
                  !formComplete
                  ||
                  isSubmitting
                )
                &&
                  styles.disabledButton,
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              SECURITY
            </Text>

            <Text style={styles.title}>
              Change your StyleHub password securely
            </Text>

            <Text style={styles.subtitle}>
              Confirm your current password,
              create a stronger replacement,
              and keep this device signed in
              while Laravel revokes your other
              StyleHub sessions.
            </Text>
          </View>

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Password change needs attention"
              message={errorMessage}
            />
          ) : null}

          {successMessage ? (
            <MessageBox
              type="success"
              title="Password changed"
              message={successMessage}
            />
          ) : null}

          <View
            style={styles.securityHero}
          >
            <View
              style={styles.heroTopRow}
            >
              <View
                style={styles.heroIcon}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={25}
                  color={COLORS.white}
                />
              </View>

              <View
                style={
                  styles.protectedBadge
                }
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={13}
                  color={COLORS.green}
                />

                <Text
                  style={
                    styles.protectedBadgeText
                  }
                >
                  Protected account
                </Text>
              </View>
            </View>

            <Text
              style={styles.heroName}
            >
              {displayName}
            </Text>

            <Text
              style={styles.heroEmail}
            >
              {
                user?.email
                ??
                'Customer account'
              }
            </Text>

            <View
              style={styles.heroFooter}
            >
              <HeroStat
                icon="phone-portrait-outline"
                label="This device"
                value="Stays signed in"
              />

              <View
                style={styles.heroDivider}
              />

              <HeroStat
                icon="log-out-outline"
                label="Other sessions"
                value="Revoked after change"
              />
            </View>
          </View>

          <SectionHeading
            title="Current password"
            subtitle="Laravel verifies this before changing your account password."
          />

          <View style={styles.formCard}>
            <PasswordField
              icon="lock-closed-outline"
              label="Current password"
              helper="Required to verify that this change is really yours."
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(
                  value,
                );

                clearMessages();
              }}
              visible={currentVisible}
              onToggleVisibility={() =>
                setCurrentVisible(
                  (current) =>
                    !current,
                )
              }
              placeholder="Enter your current password"
              editable={!isSubmitting}
              maxLength={255}
              textContentType="password"
            />
          </View>

          <SectionHeading
            title="New password"
            subtitle="Your backend password policy requires a strong 12–64 character password."
          />

          <View style={styles.formCard}>
            <PasswordField
              icon="key-outline"
              label="New password"
              helper="Use a password you do not use for this account now."
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                clearMessages();
              }}
              visible={newVisible}
              onToggleVisibility={() =>
                setNewVisible(
                  (current) =>
                    !current,
                )
              }
              placeholder="Create a new password"
              editable={!isSubmitting}
              maxLength={64}
              textContentType="newPassword"
            />

            <FormDivider />

            <PasswordField
              icon="checkmark-done-outline"
              label="Confirm new password"
              helper="Re-enter the new password exactly."
              value={
                passwordConfirmation
              }
              onChangeText={(value) => {
                setPasswordConfirmation(
                  value,
                );

                clearMessages();
              }}
              visible={
                confirmationVisible
              }
              onToggleVisibility={() =>
                setConfirmationVisible(
                  (current) =>
                    !current,
                )
              }
              placeholder="Confirm your new password"
              editable={!isSubmitting}
              maxLength={64}
              textContentType="newPassword"
            />
          </View>

          <View style={styles.policyCard}>
            <View
              style={styles.policyHeader}
            >
              <View
                style={styles.policyIcon}
              >
                <Ionicons
                  name="list-outline"
                  size={20}
                  color={COLORS.violet}
                />
              </View>

              <View
                style={
                  styles.policyHeaderCopy
                }
              >
                <Text
                  style={styles.policyTitle}
                >
                  Password requirements
                </Text>

                <Text
                  style={styles.policyText}
                >
                  These indicators mirror the
                  password rules configured in
                  Laravel. The backend remains
                  the final authority.
                </Text>
              </View>
            </View>

            <View
              style={styles.requirementList}
            >
              {requirements.map(
                (requirement) => (
                  <RequirementRow
                    key={
                      requirement.label
                    }
                    label={
                      requirement.label
                    }
                    met={
                      requirement.met
                    }
                    active={
                      newPassword.length > 0
                    }
                  />
                ),
              )}

              <RequirementRow
                label="Different from current password"
                met={
                  newPasswordDifferent
                }
                active={
                  newPassword.length > 0
                  &&
                  currentPassword.length > 0
                }
              />

              <RequirementRow
                label="Confirmation matches"
                met={
                  confirmationMatches
                }
                active={
                  passwordConfirmation.length > 0
                }
              />
            </View>
          </View>

          <View
            style={styles.sessionCard}
          >
            <View
              style={styles.sessionIcon}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={21}
                color={COLORS.blue}
              />
            </View>

            <View
              style={styles.sessionCopy}
            >
              <Text
                style={styles.sessionTitle}
              >
                Session protection
              </Text>

              <Text
                style={styles.sessionText}
              >
                After a successful password
                change, Laravel keeps this
                device&apos;s current token
                active and revokes your other
                StyleHub tokens. You do not need
                to sign in again on this device.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Change password"
            disabled={isSubmitting}
            onPress={() =>
              void handleChangePassword()
            }
            style={[
              styles.submitButton,

              isSubmitting
              &&
                styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={COLORS.white}
              />
            )}

            <Text
              style={
                styles.submitButtonText
              }
            >
              {isSubmitting
                ? 'Changing password...'
                : 'Change password'}
            </Text>
          </TouchableOpacity>

          {formComplete ? (
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel="Clear password fields"
              disabled={isSubmitting}
              onPress={clearForm}
              style={styles.clearButton}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={COLORS.navy}
              />

              <Text
                style={
                  styles.clearButtonText
                }
              >
                Clear password fields
              </Text>
            </TouchableOpacity>
          ) : null}

          <View
            style={styles.footerNotice}
          >
            <Ionicons
              name={
                passwordPolicyMet
                  ? 'shield-checkmark-outline'
                  : 'information-circle-outline'
              }
              size={18}
              color={
                passwordPolicyMet
                  ? COLORS.green
                  : COLORS.textMuted
              }
            />

            <Text
              style={
                styles.footerNoticeText
              }
            >
              StyleHub never displays your saved
              password. The current password and
              new password are submitted only to
              the existing authenticated
              password-change endpoint.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={styles.sectionHeading}
    >
      <Text
        style={styles.sectionTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.sectionSubtitle}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroStat}>
      <View
        style={styles.heroStatLabelRow}
      >
        <Ionicons
          name={icon}
          size={13}
          color="#AEB8C5"
        />

        <Text
          style={styles.heroStatLabel}
        >
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        style={styles.heroStatValue}
      >
        {value}
      </Text>
    </View>
  );
}

function PasswordField({
  icon,
  label,
  helper,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  placeholder,
  editable,
  maxLength,
  textContentType,
}: {
  icon: IconName;
  label: string;
  helper: string;
  value: string;
  onChangeText:
    (value: string) => void;
  visible: boolean;
  onToggleVisibility:
    () => void;
  placeholder: string;
  editable: boolean;
  maxLength: number;
  textContentType:
    | 'password'
    | 'newPassword';
}) {
  return (
    <View
      style={styles.passwordField}
    >
      <View
        style={
          styles.passwordFieldHeader
        }
      >
        <View
          style={
            styles.passwordFieldIcon
          }
        >
          <Ionicons
            name={icon}
            size={18}
            color={COLORS.navy}
          />
        </View>

        <View
          style={
            styles.passwordFieldCopy
          }
        >
          <Text
            style={
              styles.passwordFieldLabel
            }
          >
            {label}
          </Text>

          <Text
            style={
              styles.passwordFieldHelper
            }
          >
            {helper}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.passwordInputWrap
        }
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          maxLength={maxLength}
          secureTextEntry={!visible}
          textContentType={
            textContentType
          }
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={
            COLORS.textLight
          }
          selectionColor={COLORS.navy}
          style={styles.passwordInput}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? 'Hide password'
              : 'Show password'
          }
          disabled={!editable}
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
            size={20}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RequirementRow({
  label,
  met,
  active,
}: {
  label: string;
  met: boolean;
  active: boolean;
}) {
  const color =
    !active
      ? COLORS.textLight
      : met
        ? COLORS.green
        : COLORS.warning;

  return (
    <View
      style={styles.requirementRow}
    >
      <Ionicons
        name={
          !active
            ? 'ellipse-outline'
            : met
              ? 'checkmark-circle'
              : 'ellipse-outline'
        }
        size={16}
        color={color}
      />

      <Text
        style={[
          styles.requirementText,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function MessageBox({
  type,
  title,
  message,
}: {
  type:
    | 'success'
    | 'error';

  title: string;
  message: string;
}) {
  const success =
    type === 'success';

  return (
    <View
      style={[
        styles.messageBox,

        {
          backgroundColor:
            success
              ? COLORS.successSoft
              : COLORS.dangerSoft,
        },
      ]}
    >
      <View
        style={styles.messageIcon}
      >
        <Ionicons
          name={
            success
              ? 'checkmark-circle-outline'
              : 'alert-circle-outline'
          }
          size={20}
          color={
            success
              ? COLORS.success
              : COLORS.danger
          }
        />
      </View>

      <View
        style={styles.messageContent}
      >
        <Text
          style={[
            styles.messageTitle,

            {
              color:
                success
                  ? COLORS.success
                  : COLORS.danger,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={styles.messageText}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

function FormDivider() {
  return (
    <View
      style={styles.formDivider}
    />
  );
}

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

    container: {
      width: '100%',
      maxWidth:
        LAYOUT.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        LAYOUT.screenPadding,
      paddingTop: SPACING.sm,
      paddingBottom: 48,
    },

    topBar: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
    },

    topIconButton: {
      width:
        LAYOUT.iconButtonSize,
      height:
        LAYOUT.iconButtonSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADII.pill,
    },

    topBarTitleBlock: {
      flex: 1,
      marginHorizontal: 6,
    },

    topBarTitle: {
      color: COLORS.text,
      fontSize:
        TYPOGRAPHY.cardTitle,
      fontWeight: '800',
      textAlign: 'center',
    },

    topBarCaption: {
      marginTop: 1,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.micro,
      textAlign: 'center',
    },

    header: {
      marginTop: SPACING.lg,
    },

    eyebrow: {
      color: COLORS.accent,
      fontSize:
        TYPOGRAPHY.micro,
      fontWeight: '800',
      letterSpacing: 1.2,
    },

    title: {
      maxWidth: 590,
      marginTop: 5,
      color: COLORS.text,
      fontSize:
        TYPOGRAPHY.title,
      lineHeight: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
    },

    subtitle: {
      maxWidth: 620,
      marginTop: 8,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.body,
      lineHeight: 21,
    },

    messageBox: {
      marginTop: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: RADII.md,
    },

    messageIcon: {
      width: 31,
      height: 31,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor:
        COLORS.surface,
    },

    messageContent: {
      flex: 1,
    },

    messageTitle: {
      fontSize:
        TYPOGRAPHY.secondary,
      fontWeight: '800',
    },

    messageText: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.caption,
      lineHeight: 18,
    },

    securityHero: {
      marginTop: SPACING.xl,
      padding: 18,
      borderRadius: RADII.xl,
      backgroundColor:
        COLORS.primary,
      ...SHADOWS.card,
    },

    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 12,
    },

    heroIcon: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor:
        COLORS.navyMuted,
    },

    protectedBadge: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      borderRadius: RADII.pill,
      backgroundColor:
        COLORS.greenSoft,
    },

    protectedBadgeText: {
      color: COLORS.green,
      fontSize: 9,
      fontWeight: '800',
    },

    heroName: {
      marginTop: 16,
      color: COLORS.white,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
      letterSpacing: -0.4,
    },

    heroEmail: {
      marginTop: 4,
      color: '#D4DAE1',
      fontSize:
        TYPOGRAPHY.caption,
      fontWeight: '600',
    },

    heroFooter: {
      marginTop: 16,
      paddingTop: 14,
      flexDirection: 'row',
      alignItems: 'stretch',
      borderTopWidth: 1,
      borderTopColor:
        COLORS.navyMuted,
    },

    heroStat: {
      flex: 1,
      minWidth: 0,
    },

    heroStatLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    heroStatLabel: {
      color: '#AEB8C5',
      fontSize:
        TYPOGRAPHY.micro,
      fontWeight: '600',
    },

    heroStatValue: {
      marginTop: 4,
      color: COLORS.white,
      fontSize:
        TYPOGRAPHY.caption,
      lineHeight: 17,
      fontWeight: '800',
    },

    heroDivider: {
      width: 1,
      marginHorizontal: 13,
      backgroundColor:
        COLORS.navyMuted,
    },

    sectionHeading: {
      marginTop: SPACING.xxl,
      marginBottom: 12,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize:
        TYPOGRAPHY.section,
      fontWeight: '800',
      letterSpacing: -0.3,
    },

    sectionSubtitle: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.caption,
      lineHeight: 17,
    },

    formCard: {
      overflow: 'hidden',
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: RADII.xl,
      backgroundColor:
        COLORS.surface,
      ...SHADOWS.card,
    },

    passwordField: {
      paddingVertical: 15,
    },

    passwordFieldHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    passwordFieldIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor:
        COLORS.accentSoft,
    },

    passwordFieldCopy: {
      flex: 1,
    },

    passwordFieldLabel: {
      color: COLORS.text,
      fontSize:
        TYPOGRAPHY.secondary,
      fontWeight: '800',
    },

    passwordFieldHelper: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.micro,
      lineHeight: 16,
    },

    passwordInputWrap: {
      minHeight: 50,
      marginTop: 11,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 13,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: RADII.md,
      backgroundColor:
        COLORS.surfaceSoft,
    },

    passwordInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      paddingVertical: 0,
      color: COLORS.text,
      fontSize:
        TYPOGRAPHY.body,
    },

    visibilityButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    formDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
    },

    policyCard: {
      marginTop: 12,
      padding: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: RADII.xl,
      backgroundColor:
        COLORS.surface,
    },

    policyHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    policyIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor:
        COLORS.violetSoft,
    },

    policyHeaderCopy: {
      flex: 1,
    },

    policyTitle: {
      color: COLORS.text,
      fontSize:
        TYPOGRAPHY.secondary,
      fontWeight: '800',
    },

    policyText: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.micro,
      lineHeight: 16,
    },

    requirementList: {
      marginTop: 14,
      gap: 9,
      padding: 12,
      borderRadius: RADII.md,
      backgroundColor:
        COLORS.surfaceSoft,
    },

    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    requirementText: {
      flex: 1,
      fontSize:
        TYPOGRAPHY.caption,
      lineHeight: 17,
      fontWeight: '700',
    },

    sessionCard: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: RADII.lg,
      backgroundColor:
        COLORS.blueSoft,
    },

    sessionIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor:
        COLORS.surface,
    },

    sessionCopy: {
      flex: 1,
    },

    sessionTitle: {
      color: COLORS.blue,
      fontSize:
        TYPOGRAPHY.secondary,
      fontWeight: '800',
    },

    sessionText: {
      marginTop: 3,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.caption,
      lineHeight: 18,
    },

    submitButton: {
      minHeight:
        LAYOUT.buttonHeight,
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 15,
      borderRadius: RADII.md,
      backgroundColor:
        COLORS.primary,
    },

    submitButtonText: {
      color: COLORS.white,
      fontSize:
        TYPOGRAPHY.body,
      fontWeight: '800',
    },

    clearButton: {
      minHeight:
        LAYOUT.compactButtonHeight,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: RADII.md,
      backgroundColor:
        COLORS.surface,
    },

    clearButtonText: {
      color: COLORS.navy,
      fontSize:
        TYPOGRAPHY.secondary,
      fontWeight: '800',
    },

    footerNotice: {
      marginTop: SPACING.xxl,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: RADII.md,
      backgroundColor:
        COLORS.surfaceSoft,
    },

    footerNoticeText: {
      flex: 1,
      color: COLORS.textMuted,
      fontSize:
        TYPOGRAPHY.micro,
      lineHeight: 16,
    },

    disabledButton: {
      opacity: 0.48,
    },
  });