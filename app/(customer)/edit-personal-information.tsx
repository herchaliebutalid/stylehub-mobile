
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { updateCustomerPersonalInformation } from '@/src/services/customer-profile-api';

type IconName = ComponentProps<typeof Ionicons>['name'];

/* HELPERS */

function normalizeEmailForComparison(
  value: string | null | undefined,
): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizePhoneForComparison(
  value: string | null | undefined,
): string {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (/^09\d{9}$/.test(digits)) {
    return `+63${digits.slice(1)}`;
  }

  if (/^9\d{9}$/.test(digits)) {
    return `+63${digits}`;
  }

  if (/^639\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  return value?.trim() ?? '';
}

function displayPhonePreview(value: string): string {
  const normalized =
    normalizePhoneForComparison(value);

  if (/^\+639\d{9}$/.test(normalized)) {
    return `0${normalized.slice(3)}`;
  }

  return value.trim() || 'No number entered';
}

/* PERSONAL INFORMATION SCREEN */

export default function EditPersonalInformationScreen() {
  const {
    user,
    token,
    syncAuthenticatedUser,
  } = useAuth();

  const [firstName, setFirstName] = useState(
    user?.first_name ?? '',
  );

  const [middleName, setMiddleName] = useState(
    user?.middle_name ?? '',
  );

  const [lastName, setLastName] = useState(
    user?.last_name ?? '',
  );

  const [email, setEmail] = useState(
    user?.email ?? '',
  );

  const [phoneNumber, setPhoneNumber] = useState(
    user?.phone_number ?? '',
  );

  const [currentPassword, setCurrentPassword] =
    useState('');

  const [passwordVisible, setPasswordVisible] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* RESTORE DETAILS FROM AUTHENTICATED USER */

  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.first_name ?? '');
    setMiddleName(user.middle_name ?? '');
    setLastName(user.last_name ?? '');
    setEmail(user.email ?? '');
    setPhoneNumber(user.phone_number ?? '');
  }, [user]);

  /* CHANGE DETECTION */

  const emailChanged = useMemo(
    () =>
      normalizeEmailForComparison(email) !==
      normalizeEmailForComparison(user?.email),
    [email, user?.email],
  );

  const phoneChanged = useMemo(
    () =>
      normalizePhoneForComparison(phoneNumber) !==
      normalizePhoneForComparison(user?.phone_number),
    [phoneNumber, user?.phone_number],
  );

  const nameChanged = useMemo(() => {
    if (!user) {
      return false;
    }

    return (
      firstName.trim() !==
        (user.first_name ?? '').trim() ||
      middleName.trim() !==
        (user.middle_name ?? '').trim() ||
      lastName.trim() !==
        (user.last_name ?? '').trim()
    );
  }, [firstName, middleName, lastName, user]);

  const sensitiveIdentityChanged =
    emailChanged || phoneChanged;

  const hasAnyChanges =
    nameChanged || sensitiveIdentityChanged;

  const changedItems = useMemo(() => {
    const items: string[] = [];

    if (nameChanged) {
      items.push('Name');
    }

    if (emailChanged) {
      items.push('Email');
    }

    if (phoneChanged) {
      items.push('Mobile');
    }

    return items;
  }, [nameChanged, emailChanged, phoneChanged]);

  /* MESSAGES */

  function clearMessages(): void {
    if (errorMessage) {
      setErrorMessage('');
    }

    if (successMessage) {
      setSuccessMessage('');
    }
  }

  /* RESTORE ORIGINAL VALUES */

  function restoreOriginalValues(): void {
    if (!user || isSaving) {
      return;
    }

    setFirstName(user.first_name ?? '');
    setMiddleName(user.middle_name ?? '');
    setLastName(user.last_name ?? '');
    setEmail(user.email ?? '');
    setPhoneNumber(user.phone_number ?? '');

    setCurrentPassword('');
    setPasswordVisible(false);
    setErrorMessage('');
    setSuccessMessage('');
  }

  /* SAVE PERSONAL INFORMATION */

  async function handleSave(): Promise<void> {
    setErrorMessage('');
    setSuccessMessage('');

    if (!token || !user) {
      setErrorMessage(
        'You must be signed in to update your personal information.',
      );
      return;
    }

    if (firstName.trim() === '') {
      setErrorMessage('Enter your first name.');
      return;
    }

    if (firstName.trim().length > 100) {
      setErrorMessage(
        'First name may not exceed 100 characters.',
      );
      return;
    }

    if (middleName.trim().length > 100) {
      setErrorMessage(
        'Middle name may not exceed 100 characters.',
      );
      return;
    }

    if (lastName.trim() === '') {
      setErrorMessage('Enter your last name.');
      return;
    }

    if (lastName.trim().length > 100) {
      setErrorMessage(
        'Last name may not exceed 100 characters.',
      );
      return;
    }

    if (email.trim() === '') {
      setErrorMessage('Enter your email address.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (email.trim().length > 255) {
      setErrorMessage(
        'Email address may not exceed 255 characters.',
      );
      return;
    }

    if (phoneNumber.trim() === '') {
      setErrorMessage('Enter your mobile number.');
      return;
    }

    if (
      !/^\+639\d{9}$/.test(
        normalizePhoneForComparison(phoneNumber),
      )
    ) {
      setErrorMessage(
        'Enter a valid Philippine mobile number.',
      );
      return;
    }

    if (
      sensitiveIdentityChanged &&
      currentPassword.trim() === ''
    ) {
      setErrorMessage(
        'Enter your current password to confirm the email or mobile number change.',
      );
      return;
    }

    if (!hasAnyChanges) {
      setSuccessMessage(
        'Your personal information is already up to date.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const result =
        await updateCustomerPersonalInformation(
          token,
          {
            firstName,
            middleName,
            lastName,
            email,
            phoneNumber,
            currentPassword: sensitiveIdentityChanged
              ? currentPassword
              : undefined,
          },
        );

      await syncAuthenticatedUser(result.user);

      setCurrentPassword('');
      setPasswordVisible(false);

      if (result.requiresPhoneVerification) {
        return;
      }

      setSuccessMessage(
        result.message ??
          'Personal information updated successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update your personal information right now.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* MAIN SCREEN */

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {/* TOP NAVIGATION */}

          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={isSaving}
              onPress={() => router.back()}
              style={styles.topIconButton}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.navy}
              />
            </TouchableOpacity>

            <View style={styles.topBarTitleBlock}>
              <Text style={styles.topBarTitle}>
                Personal information
              </Text>

              <Text style={styles.topBarCaption}>
                Customer account details
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Restore original account information"
              disabled={!hasAnyChanges || isSaving}
              onPress={restoreOriginalValues}
              style={[
                styles.topIconButton,
                (!hasAnyChanges || isSaving) &&
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

          {/* PAGE HEADER */}

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              EDIT PROFILE
            </Text>

            <Text style={styles.title}>
              Keep your account details accurate
            </Text>

            <Text style={styles.subtitle}>
              Name changes are straightforward.
              Changing your email or mobile number
              requires your current password for
              added account protection.
            </Text>
          </View>

          {/* FEEDBACK */}

          {errorMessage ? (
            <MessageBox
              type="error"
              title="Changes need attention"
              message={errorMessage}
            />
          ) : null}

          {successMessage ? (
            <MessageBox
              type="success"
              title="Account updated"
              message={successMessage}
            />
          ) : null}

          {/* ACCOUNT SUMMARY */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={COLORS.white}
                />
              </View>

              <View style={styles.summaryCopy}>
                <Text style={styles.summaryLabel}>
                  Editing customer account
                </Text>

                <Text style={styles.summaryName}>
                  {user?.full_name?.trim() ||
                    [
                      user?.first_name,
                      user?.middle_name,
                      user?.last_name,
                    ]
                      .filter(Boolean)
                      .join(' ') ||
                    'StyleHub Customer'}
                </Text>
              </View>

              <View
                style={[
                  styles.changeBadge,
                  hasAnyChanges
                    ? styles.changeBadgeActive
                    : styles.changeBadgeIdle,
                ]}
              >
                <Ionicons
                  name={
                    hasAnyChanges
                      ? 'create-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={13}
                  color={
                    hasAnyChanges
                      ? COLORS.violet
                      : COLORS.green
                  }
                />

                <Text
                  style={[
                    styles.changeBadgeText,
                    {
                      color: hasAnyChanges
                        ? COLORS.violet
                        : COLORS.green,
                    },
                  ]}
                >
                  {hasAnyChanges
                    ? `${changedItems.length} changed`
                    : 'Up to date'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryFooter}>
              <SummaryItem
                label="Email"
                value={user?.email ?? '—'}
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                label="Mobile"
                value={displayPhonePreview(
                  user?.phone_number ?? '',
                )}
              />
            </View>
          </View>

          {/* PERSONAL DETAILS */}

          <SectionHeading
            title="Personal details"
            subtitle="These fields control the name shown on your customer account."
          />

          <View style={styles.formCard}>
            <FormField
              icon="person-outline"
              label="First name"
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                clearMessages();
              }}
              placeholder="First name"
              editable={!isSaving}
              maxLength={100}
              required
            />

            <FormDivider />

            <FormField
              icon="person-outline"
              label="Middle name"
              helper="Optional"
              value={middleName}
              onChangeText={(value) => {
                setMiddleName(value);
                clearMessages();
              }}
              placeholder="Middle name"
              editable={!isSaving}
              maxLength={100}
            />

            <FormDivider />

            <FormField
              icon="person-outline"
              label="Last name"
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                clearMessages();
              }}
              placeholder="Last name"
              editable={!isSaving}
              maxLength={100}
              required
            />
          </View>

          {/* CONTACT INFORMATION */}

          <SectionHeading
            title="Contact information"
            subtitle="Email and mobile number are sensitive identity fields and require password confirmation when changed."
          />

          <View style={styles.formCard}>
            <FormField
              icon="mail-outline"
              label="Email address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearMessages();
              }}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
              maxLength={255}
              required
              changed={emailChanged}
            />

            <FormDivider />

            <FormField
              icon="call-outline"
              label="Mobile number"
              helper="Philippine mobile number"
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value);
                clearMessages();
              }}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
              maxLength={20}
              required
              changed={phoneChanged}
            />
          </View>

          {/* SECURITY CONFIRMATION */}

          {sensitiveIdentityChanged ? (
            <>
              <SectionHeading
                title="Security confirmation"
                subtitle="Confirm the sensitive account change with your current password."
              />

              <View style={styles.securityCard}>
                <View style={styles.securityNotice}>
                  <View style={styles.securityNoticeIcon}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={COLORS.warning}
                    />
                  </View>

                  <View style={styles.securityNoticeCopy}>
                    <Text
                      style={styles.securityNoticeTitle}
                    >
                      Current password required
                    </Text>

                    <Text
                      style={styles.securityNoticeText}
                    >
                      You are changing your{' '}
                      {emailChanged && phoneChanged
                        ? 'email address and mobile number'
                        : emailChanged
                          ? 'email address'
                          : 'mobile number'}.
                      {' '}Laravel checks your
                      current password before
                      saving the change.
                    </Text>
                  </View>
                </View>

                <PasswordField
                  value={currentPassword}
                  onChangeText={(value) => {
                    setCurrentPassword(value);
                    clearMessages();
                  }}
                  visible={passwordVisible}
                  editable={!isSaving}
                  onToggleVisibility={() =>
                    setPasswordVisible(
                      (current) => !current,
                    )
                  }
                />
              </View>

              {/* SESSION NOTICE */}

              <View style={styles.sessionNotice}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={18}
                  color={COLORS.blue}
                />

                <View style={styles.sessionNoticeCopy}>
                  <Text style={styles.sessionNoticeTitle}>
                    What happens after saving
                  </Text>

                  <Text style={styles.sessionNoticeText}>
                    Other StyleHub sessions are
                    revoked when your email or
                    mobile number changes. This
                    device stays signed in.
                  </Text>

                  {phoneChanged ? (
                    <Text
                      style={styles.phoneVerificationText}
                    >
                      Your new mobile number must
                      be verified again. After the
                      update, the existing Customer
                      layout will send you to phone
                      verification automatically.
                    </Text>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}

          {/* BEFORE YOU SAVE */}

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIcon}>
                <Ionicons
                  name="eye-outline"
                  size={19}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.previewHeaderCopy}>
                <Text style={styles.previewTitle}>
                  Before you save
                </Text>

                <Text style={styles.previewText}>
                  Review the identity information
                  that will be sent to Laravel.
                </Text>
              </View>
            </View>

            <View style={styles.previewRows}>
              <PreviewRow
                label="Name"
                value={
                  [
                    firstName.trim(),
                    middleName.trim(),
                    lastName.trim(),
                  ]
                    .filter(Boolean)
                    .join(' ') || '—'
                }
              />

              <PreviewRow
                label="Email"
                value={email.trim() || '—'}
              />

              <PreviewRow
                label="Mobile"
                value={displayPhonePreview(phoneNumber)}
              />
            </View>
          </View>

          {/* SAVE BUTTON */}

          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Save personal information"
            disabled={isSaving}
            onPress={() => void handleSave()}
            style={[
              styles.saveButton,
              isSaving && styles.disabledButton,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={COLORS.white}
              />
            )}

            <Text style={styles.saveButtonText}>
              {isSaving
                ? 'Saving changes...'
                : hasAnyChanges
                  ? 'Save changes'
                  : 'Check account information'}
            </Text>
          </TouchableOpacity>

          {hasAnyChanges ? (
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel="Restore original values"
              disabled={isSaving}
              onPress={restoreOriginalValues}
              style={styles.restoreButton}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={COLORS.navy}
              />

              <Text style={styles.restoreButtonText}>
                Restore original values
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* SECTION HEADING */

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

/* SUMMARY ITEM */

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.summaryItemValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* FORM FIELD */

function FormField({
  icon,
  label,
  helper,
  value,
  onChangeText,
  placeholder,
  editable,
  required = false,
  changed = false,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'words',
  autoCorrect = true,
}: {
  icon: IconName;
  label: string;
  helper?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
  required?: boolean;
  changed?: boolean;
  maxLength: number;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad';
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelRow}>
          <View style={styles.fieldIcon}>
            <Ionicons
              name={icon}
              size={17}
              color={COLORS.navy}
            />
          </View>

          <View style={styles.fieldLabelCopy}>
            <View style={styles.fieldTitleRow}>
              <Text style={styles.fieldLabel}>
                {label}
              </Text>

              {required ? (
                <Text style={styles.requiredText}>
                  Required
                </Text>
              ) : null}
            </View>

            {helper ? (
              <Text style={styles.fieldHelper}>
                {helper}
              </Text>
            ) : null}
          </View>
        </View>

        {changed ? (
          <View style={styles.changedBadge}>
            <Text style={styles.changedBadgeText}>
              Changed
            </Text>
          </View>
        ) : null}
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        selectionColor={COLORS.navy}
        style={[
          styles.input,
          !editable && styles.inputDisabled,
          changed && styles.inputChanged,
        ]}
      />
    </View>
  );
}

/* PASSWORD FIELD */

function PasswordField({
  value,
  onChangeText,
  visible,
  editable,
  onToggleVisibility,
}: {
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  editable: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <View style={styles.passwordBlock}>
      <Text style={styles.passwordLabel}>
        Current password
      </Text>

      <View style={styles.passwordInputWrap}>
        <Ionicons
          name="lock-closed-outline"
          size={18}
          color={COLORS.textMuted}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          maxLength={255}
          secureTextEntry={!visible}
          textContentType="password"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter your current password"
          placeholderTextColor={COLORS.textLight}
          selectionColor={COLORS.navy}
          style={styles.passwordInput}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            visible ? 'Hide password' : 'Show password'
          }
          disabled={!editable}
          onPress={onToggleVisibility}
          style={styles.passwordVisibilityButton}
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

function FormDivider() {
  return <View style={styles.formDivider} />;
}

/* PREVIEW ROW */

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewRowLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.previewRowValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* MESSAGE BOX */

function MessageBox({
  type,
  title,
  message,
}: {
  type: 'success' | 'error';
  title: string;
  message: string;
}) {
  const success = type === 'success';

  return (
    <View
      style={[
        styles.messageBox,
        {
          backgroundColor: success
            ? COLORS.successSoft
            : COLORS.dangerSoft,
        },
      ]}
    >
      <View style={styles.messageIcon}>
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

      <View style={styles.messageContent}>
        <Text
          style={[
            styles.messageTitle,
            {
              color: success
                ? COLORS.success
                : COLORS.danger,
            },
          ]}
        >
          {title}
        </Text>

        <Text style={styles.messageText}>
          {message}
        </Text>
      </View>
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  // Updated: 40px top spacing.
  // Preserve the original 48px bottom padding.
  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 48,
  },

  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },

  topIconButton: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
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
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    textAlign: 'center',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    textAlign: 'center',
  },

  header: {
    marginTop: SPACING.lg,
  },

  eyebrow: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  title: {
    maxWidth: 590,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 620,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
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
    backgroundColor: COLORS.surface,
  },

  messageContent: {
    flex: 1,
  },

  messageTitle: {
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  messageText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  summaryCard: {
    marginTop: SPACING.xl,
    padding: 18,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.navyMuted,
  },

  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },

  summaryLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  summaryName: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.cardTitle,
    lineHeight: 21,
    fontWeight: '800',
  },

  changeBadge: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.pill,
  },

  changeBadgeActive: {
    backgroundColor: COLORS.violetSoft,
  },

  changeBadgeIdle: {
    backgroundColor: COLORS.greenSoft,
  },

  changeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  summaryFooter: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.navyMuted,
  },

  summaryItem: {
    flex: 1,
    minWidth: 0,
  },

  summaryItemLabel: {
    color: '#AEB8C5',
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '600',
  },

  summaryItemValue: {
    marginTop: 3,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '700',
  },

  summaryDivider: {
    width: 1,
    marginHorizontal: 13,
    backgroundColor: COLORS.navyMuted,
  },

  sectionHeading: {
    marginTop: SPACING.xxl,
    marginBottom: 12,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.section,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
  },

  formCard: {
    overflow: 'hidden',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  fieldBlock: {
    paddingVertical: 15,
  },

  fieldHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  fieldLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  fieldIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  fieldLabelCopy: {
    flex: 1,
    minWidth: 0,
  },

  fieldTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  fieldLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  requiredText: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
  },

  fieldHelper: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  changedBadge: {
    minHeight: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.violetSoft,
  },

  changedBadgeText: {
    color: COLORS.violet,
    fontSize: 8,
    fontWeight: '800',
  },

  input: {
    minHeight: 50,
    marginTop: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  inputChanged: {
    borderColor: COLORS.violet,
    backgroundColor: COLORS.violetSoft,
  },

  inputDisabled: {
    opacity: 0.6,
  },

  formDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  securityCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  securityNoticeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.warningSoft,
  },

  securityNoticeCopy: {
    flex: 1,
  },

  securityNoticeTitle: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  securityNoticeText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  passwordBlock: {
    marginTop: 15,
  },

  passwordLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  passwordInputWrap: {
    minHeight: 50,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 0,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
  },

  passwordVisibilityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sessionNotice: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.blueSoft,
  },

  sessionNoticeCopy: {
    flex: 1,
  },

  sessionNoticeTitle: {
    color: COLORS.blue,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  sessionNoticeText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  phoneVerificationText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
    fontWeight: '700',
  },

  previewCard: {
    marginTop: SPACING.xxl,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  previewIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  previewHeaderCopy: {
    flex: 1,
  },

  previewTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  previewText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
    lineHeight: 16,
  },

  previewRows: {
    marginTop: 13,
    gap: 8,
    padding: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSoft,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  previewRowLabel: {
    width: 58,
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.micro,
    fontWeight: '700',
  },

  previewRowValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'right',
  },

  saveButton: {
    minHeight: LAYOUT.buttonHeight,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  restoreButton: {
    minHeight: LAYOUT.compactButtonHeight,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },

  restoreButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.48,
  },
});
