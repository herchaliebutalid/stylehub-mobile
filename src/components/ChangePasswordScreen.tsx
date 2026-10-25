
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
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/src/constants/colors';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import { changePassword } from '@/src/services/password-security-api';
import type { MobileUserRole } from '@/src/types/auth';

/* ==========================================================================
   TYPES
   ========================================================================== */

interface ChangePasswordScreenProps {
  role: MobileUserRole;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  placeholder: string;
  editable: boolean;
  textContentType: 'password' | 'newPassword';
}

/* ==========================================================================
   CHANGE PASSWORD SCREEN
   ========================================================================== */

export default function ChangePasswordScreen({
  role,
}: ChangePasswordScreenProps) {
  const { user, token } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');

  const [currentPasswordVisible, setCurrentPasswordVisible] =
    useState(false);

  const [newPasswordVisible, setNewPasswordVisible] =
    useState(false);

  const [confirmationVisible, setConfirmationVisible] =
    useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* ========================================================================
     ROLE LABEL
     ======================================================================== */

  const roleLabel =
    role === 'customer' ? 'Customer' : 'Shop Owner';

  /* ========================================================================
     CHANGE PASSWORD
     ======================================================================== */

  async function handleChangePassword(): Promise<void> {
    setErrorMessage('');
    setSuccessMessage('');

    /*
    |--------------------------------------------------------------------------
    | Require Active Authentication
    |--------------------------------------------------------------------------
    */

    if (!token || !user) {
      setErrorMessage(
        'Your session is no longer available. Please sign in again.',
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Role Protection
    |--------------------------------------------------------------------------
    |
    | The route layout already protects the screen.
    | This additional check prevents accidentally using
    | the wrong role-specific security screen.
    |
    */

    if (user.role !== role) {
      setErrorMessage(
        'This account does not match this security screen.',
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Current Password
    |--------------------------------------------------------------------------
    */

    if (currentPassword === '') {
      setErrorMessage('Enter your current password.');
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Minimum Password Length
    |--------------------------------------------------------------------------
    |
    | Laravel remains the final authority for the
    | complete password policy:
    |
    | - minimum 12 characters
    | - uppercase
    | - lowercase
    | - number
    | - symbol
    |
    */

    if (newPassword.length < 12) {
      setErrorMessage(
        'Your new password must contain at least 12 characters.',
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | New Password Must Be Different
    |--------------------------------------------------------------------------
    */

    if (currentPassword === newPassword) {
      setErrorMessage(
        'The new password must be different from your current password.',
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Confirmation
    |--------------------------------------------------------------------------
    */

    if (newPassword !== passwordConfirmation) {
      setErrorMessage(
        'The password confirmation does not match.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
      |--------------------------------------------------------------------------
      | Laravel Performs The Real Password Change
      |--------------------------------------------------------------------------
      |
      | Laravel:
      |
      | 1. checks the current password;
      | 2. validates the new password;
      | 3. hashes and saves it;
      | 4. invalidates unused reset codes;
      | 5. revokes every OTHER Sanctum session;
      | 6. keeps this device's token active.
      |
      */

      const response = await changePassword(token, {
        currentPassword,
        password: newPassword,
        passwordConfirmation,
      });

      /*
      |--------------------------------------------------------------------------
      | Clear Sensitive Inputs
      |--------------------------------------------------------------------------
      */

      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');

      setCurrentPasswordVisible(false);
      setNewPasswordVisible(false);
      setConfirmationVisible(false);

      /*
      |--------------------------------------------------------------------------
      | Current Session Remains Logged In
      |--------------------------------------------------------------------------
      */

      setSuccessMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(
        'Unable to change your password right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ========================================================================
     RENDER
     ======================================================================== */

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {/* ================================================================
              BACK
              ================================================================ */}

          <TouchableOpacity
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            disabled={isSubmitting}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={26}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          {/* ================================================================
              HEADING
              ================================================================ */}

          <View style={styles.iconCircle}>
            <Ionicons
              name="lock-closed-outline"
              size={30}
              color={COLORS.navy}
            />
          </View>

          <Text style={styles.title}>
            Change Password
          </Text>

          <Text style={styles.subtitle}>
            Update the password for your {roleLabel} account.
            Your current device will stay signed in, while
            other StyleHub sessions will be revoked.
          </Text>

          {/* ================================================================
              SECURITY BADGE
              ================================================================ */}

          <View style={styles.securityBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={COLORS.green}
            />

            <Text style={styles.securityBadgeText}>
              Protected account security
            </Text>
          </View>

          {/* ================================================================
              CURRENT PASSWORD
              ================================================================ */}

          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={(value) => {
              setCurrentPassword(value);

              if (errorMessage) {
                setErrorMessage('');
              }
            }}
            visible={currentPasswordVisible}
            onToggleVisibility={() =>
              setCurrentPasswordVisible(
                (current) => !current,
              )
            }
            placeholder="Enter your current password"
            editable={!isSubmitting}
            textContentType="password"
          />

          {/* ================================================================
              NEW PASSWORD
              ================================================================ */}

          <PasswordField
            label="New password"
            value={newPassword}
            onChangeText={(value) => {
              setNewPassword(value);

              if (errorMessage) {
                setErrorMessage('');
              }
            }}
            visible={newPasswordVisible}
            onToggleVisibility={() =>
              setNewPasswordVisible(
                (current) => !current,
              )
            }
            placeholder="Enter your new password"
            editable={!isSubmitting}
            textContentType="newPassword"
          />

          {/* ================================================================
              CONFIRM NEW PASSWORD
              ================================================================ */}

          <PasswordField
            label="Confirm new password"
            value={passwordConfirmation}
            onChangeText={(value) => {
              setPasswordConfirmation(value);

              if (errorMessage) {
                setErrorMessage('');
              }
            }}
            visible={confirmationVisible}
            onToggleVisibility={() =>
              setConfirmationVisible(
                (current) => !current,
              )
            }
            placeholder="Confirm your new password"
            editable={!isSubmitting}
            textContentType="newPassword"
          />

          {/* ================================================================
              PASSWORD POLICY
              ================================================================ */}

          <View style={styles.policyBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.navy}
            />

            <Text style={styles.policyText}>
              Use at least 12 characters with uppercase
              and lowercase letters, a number, and a symbol.
            </Text>
          </View>

          {/* ================================================================
              SUCCESS MESSAGE
              ================================================================ */}

          {successMessage ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={COLORS.success}
              />

              <Text style={styles.successText}>
                {successMessage}
              </Text>
            </View>
          ) : null}

          {/* ================================================================
              ERROR MESSAGE
              ================================================================ */}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={COLORS.danger}
              />

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* ================================================================
              SUBMIT
              ================================================================ */}

          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Change password"
            disabled={isSubmitting}
            onPress={() => void handleChangePassword()}
            style={[
              styles.primaryButton,
              isSubmitting && styles.primaryButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <>
                <Ionicons
                  name="key-outline"
                  size={19}
                  color={COLORS.white}
                />

                <Text style={styles.primaryButtonText}>
                  Change Password
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ================================================================
              SESSION NOTICE
              ================================================================ */}

          <View style={styles.sessionNotice}>
            <Ionicons
              name="phone-portrait-outline"
              size={17}
              color={COLORS.textMuted}
            />

            <Text style={styles.sessionNoticeText}>
              After a successful password change, this
              device stays signed in. Other StyleHub
              sessions for your account are signed out
              automatically.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ==========================================================================
   PASSWORD FIELD
   ========================================================================== */

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  placeholder,
  editable,
  textContentType,
}: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={COLORS.navy}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={textContentType}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          style={styles.input}
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
          onPress={onToggleVisibility}
          style={styles.eyeButton}
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={21}
            color={COLORS.navy}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ==========================================================================
   STYLES
   ========================================================================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  /*
  |--------------------------------------------------------------------------
  | Main Screen Container
  |--------------------------------------------------------------------------
  |
  | UPDATED:
  | - Top padding changed from 18 to 40.
  | - Bottom padding remains 40.
  | - Horizontal spacing remains 24.
  | - Existing design is preserved.
  |
  */

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  /* ======================================================================
     BACK BUTTON
     ====================================================================== */

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 20,
  },

  /* ======================================================================
     HEADING
     ====================================================================== */

  iconCircle: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
  },

  title: {
    marginTop: 20,
    color: COLORS.navy,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 9,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },

  /* ======================================================================
     SECURITY BADGE
     ====================================================================== */

  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    marginTop: 17,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.greenSoft,
  },

  securityBadgeText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '700',
  },

  /* ======================================================================
     PASSWORD FIELDS
     ====================================================================== */

  field: {
    marginTop: 17,
  },

  label: {
    marginBottom: 8,
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
  },

  inputContainer: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 0,
    color: COLORS.text,
    fontSize: 12,
  },

  eyeButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ======================================================================
     PASSWORD POLICY
     ====================================================================== */

  policyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 16,
    padding: 13,
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  policyText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 9.5,
    lineHeight: 15,
  },

  /* ======================================================================
     SUCCESS MESSAGE
     ====================================================================== */

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    padding: 13,
    borderRadius: 13,
    backgroundColor: COLORS.successSoft,
  },

  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 10,
    lineHeight: 16,
  },

  /* ======================================================================
     ERROR MESSAGE
     ====================================================================== */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    padding: 13,
    borderRadius: 13,
    backgroundColor: COLORS.dangerSoft,
  },

  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 10,
    lineHeight: 16,
  },

  /* ======================================================================
     PRIMARY BUTTON
     ====================================================================== */

  primaryButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 22,
    borderRadius: 17,
    backgroundColor: COLORS.navy,
  },

  primaryButtonDisabled: {
    opacity: 0.55,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  /* ======================================================================
     SESSION NOTICE
     ====================================================================== */

  sessionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 17,
    padding: 12,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },

  sessionNoticeText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },
});
