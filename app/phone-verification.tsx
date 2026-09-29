import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/src/constants/colors';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import { updateUnverifiedPhoneNumber } from '@/src/services/phone-verification-api';

const OTP_LENGTH = 6;

function sanitizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_LENGTH);
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function PhoneVerificationScreen() {
  const {
    user,
    token,
    isBootstrapping,
    isSubmitting,
    sendPhoneVerificationCode,
    verifyPhoneVerificationCode,
    logout,
  } = useAuth();

  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [resendRemaining, setResendRemaining] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [hasSentCode, setHasSentCode] = useState(false);

  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [updatedPhoneNumber, setUpdatedPhoneNumber] = useState<string | null>(null);

  const autoSendAttempted = useRef(false);

  const handleSendCode = useCallback(
    async (isAutomatic = false): Promise<void> => {
      if (!user || user.phone_verified) {
        return;
      }

      setErrorMessage('');

      if (!isAutomatic) {
        setInfoMessage('');
      }

      try {
        const data = await sendPhoneVerificationCode();

        setMaskedPhone(data.phone_number);
        setResendRemaining(Math.max(0, Math.trunc(data.resend_after_seconds)));
        setHasSentCode(true);
        setInfoMessage('We sent a 6-digit verification code to your mobile number.');
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to send a verification code right now.',
        );
      }
    },
    [sendPhoneVerificationCode, user],
  );

  useEffect(() => {
    if (
      isBootstrapping ||
      !user ||
      user.phone_verified ||
      autoSendAttempted.current
    ) {
      return;
    }

    autoSendAttempted.current = true;
    void handleSendCode(true);
  }, [handleSendCode, isBootstrapping, user]);

  useEffect(() => {
    if (resendRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendRemaining]);

  function openPhoneRecovery(): void {
    if (isSubmitting || isUpdatingPhone) {
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setNewPhoneNumber('');
    setCurrentPassword('');
    setShowCurrentPassword(false);
    setIsChangingPhone(true);
  }

  function cancelPhoneRecovery(): void {
    if (isUpdatingPhone) {
      return;
    }

    setNewPhoneNumber('');
    setCurrentPassword('');
    setShowCurrentPassword(false);
    setIsChangingPhone(false);
    setErrorMessage('');
  }

  async function handleUpdatePhoneNumber(): Promise<void> {
    if (!token || !user) {
      setErrorMessage('You must be signed in to change your phone number.');
      return;
    }

    const cleanPhoneNumber = newPhoneNumber.trim();

    if (!cleanPhoneNumber) {
      setErrorMessage('Enter your corrected Philippine mobile number.');
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Enter your current password to confirm this change.');
      return;
    }

    setIsUpdatingPhone(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const updatedUser = await updateUnverifiedPhoneNumber(token, {
        phoneNumber: cleanPhoneNumber,
        currentPassword,
      });

      if (updatedUser.id !== user.id || updatedUser.role !== user.role) {
        throw new ApiError(
          'The updated account did not match the current session.',
          409,
        );
      }

      if (updatedUser.phone_verified) {
        throw new ApiError(
          'The server returned an unexpected phone verification state.',
          409,
        );
      }

      setUpdatedPhoneNumber(updatedUser.phone_number ?? cleanPhoneNumber);

      // Laravel invalidates the old OTP. Clear the matching local OTP state too.
      setCode('');
      setMaskedPhone(null);
      setResendRemaining(0);
      setHasSentCode(false);

      setNewPhoneNumber('');
      setCurrentPassword('');
      setShowCurrentPassword(false);
      setIsChangingPhone(false);

      setInfoMessage(
        'Phone number updated. Tap Send verification code to verify the corrected number.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to update your phone number right now.',
      );
    } finally {
      setIsUpdatingPhone(false);
    }
  }

  async function handleVerify(): Promise<void> {
    setErrorMessage('');
    setInfoMessage('');

    const cleanCode = sanitizeOtp(code);

    if (cleanCode.length !== OTP_LENGTH) {
      setErrorMessage('Enter the complete 6-digit verification code.');
      return;
    }

    try {
      const verifiedUser = await verifyPhoneVerificationCode(cleanCode);
      setCode('');

      if (verifiedUser.role === 'customer') {
        router.replace('/(customer)/customer');
        return;
      }

      router.replace('/(shop-owner)/shop-owner');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to verify your phone number right now.',
      );
    }
  }

  async function handleLogout(): Promise<void> {
    await logout();
    router.replace('/(auth)/role-selection');
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/role-selection" />;
  }

  if (user.phone_verified) {
    return (
      <Redirect
        href={
          user.role === 'customer'
            ? '/(customer)/customer'
            : '/(shop-owner)/shop-owner'
        }
      />
    );
  }

  const displayPhone =
    maskedPhone ??
    updatedPhoneNumber ??
    user.phone_number ??
    'your registered mobile number';

  const isBusy = isSubmitting || isUpdatingPhone;
  const canSendCode = !isBusy && resendRemaining === 0;
  const canVerify = !isBusy && code.length === OTP_LENGTH;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="phone-portrait-outline"
              size={34}
              color={COLORS.white}
            />
          </View>

          <Text style={styles.title}>
            Verify your mobile number
          </Text>

          <Text style={styles.subtitle}>
            StyleHub uses phone verification to protect your account and make sure
            booking and SMS notifications go to the correct person.
          </Text>

          <View style={styles.phoneCard}>
            <Text style={styles.phoneLabel}>
              Verification number
            </Text>

            <Text style={styles.phoneValue}>
              {displayPhone}
            </Text>

            {!isChangingPhone ? (
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel="Change incorrect phone number"
                onPress={openPhoneRecovery}
                style={styles.changePhoneButton}
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={COLORS.blue}
                />

                <Text style={styles.changePhoneText}>
                  Wrong number? Change it
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isChangingPhone ? (
            <View style={styles.recoveryCard}>
              <View style={styles.recoveryHeader}>
                <View style={styles.recoveryIcon}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={19}
                    color={COLORS.navy}
                  />
                </View>

                <View style={styles.recoveryHeaderText}>
                  <Text style={styles.recoveryTitle}>
                    Correct your phone number
                  </Text>

                  <Text style={styles.recoveryDescription}>
                    This is available only while your number is unverified. Your
                    current password is required for security.
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>
                New Philippine mobile number
              </Text>

              <TextInput
                value={newPhoneNumber}
                onChangeText={(value) => {
                  setNewPhoneNumber(value);
                  setErrorMessage('');
                }}
                editable={!isBusy}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={24}
                placeholder="0917 123 4567"
                placeholderTextColor={COLORS.textLight}
                selectionColor={COLORS.navy}
                style={styles.input}
              />

              <Text style={styles.fieldHint}>
                You can enter 09XXXXXXXXX or +639XXXXXXXXX. Laravel validates and
                normalizes the number.
              </Text>

              <Text style={styles.fieldLabel}>
                Current password
              </Text>

              <View style={styles.passwordWrap}>
                <TextInput
                  value={currentPassword}
                  onChangeText={(value) => {
                    setCurrentPassword(value);
                    setErrorMessage('');
                  }}
                  editable={!isBusy}
                  secureTextEntry={!showCurrentPassword}
                  textContentType="password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter current password"
                  placeholderTextColor={COLORS.textLight}
                  selectionColor={COLORS.navy}
                  style={styles.passwordInput}
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showCurrentPassword
                      ? 'Hide current password'
                      : 'Show current password'
                  }
                  onPress={() =>
                    setShowCurrentPassword((current) => !current)
                  }
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={
                      showCurrentPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.recoveryActions}>
                <TouchableOpacity
                  activeOpacity={0.78}
                  disabled={isBusy}
                  onPress={cancelPhoneRecovery}
                  style={[
                    styles.cancelButton,
                    isBusy && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.cancelButtonText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.82}
                  disabled={isBusy}
                  onPress={() =>
                    void handleUpdatePhoneNumber()
                  }
                  style={[
                    styles.updateButton,
                    isBusy && styles.disabledButton,
                  ]}
                >
                  {isUpdatingPhone ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark-outline"
                      size={17}
                      color={COLORS.white}
                    />
                  )}

                  <Text style={styles.updateButtonText}>
                    {isUpdatingPhone
                      ? 'Updating...'
                      : 'Update Number'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Text style={styles.codeLabel}>
            6-digit verification code
          </Text>

          <TextInput
            value={code}
            onChangeText={(value) => {
              setCode(
                sanitizeOtp(value),
              );

              setErrorMessage('');
            }}
            editable={
              !isBusy &&
              hasSentCode
            }
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={OTP_LENGTH}
            placeholder="000000"
            placeholderTextColor={COLORS.textLight}
            selectionColor={COLORS.navy}
            style={styles.codeInput}
          />

          {infoMessage ? (
            <View style={styles.infoBox}>
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={COLORS.success}
              />

              <Text style={styles.infoText}>
                {infoMessage}
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={COLORS.danger}
              />

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={!canVerify}
            onPress={() =>
              void handleVerify()
            }
            style={[
              styles.verifyButton,
              !canVerify &&
                styles.disabledButton,
            ]}
          >
            {isSubmitting &&
            !isUpdatingPhone ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Text style={styles.verifyButtonText}>
                Verify Number
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendSection}>
            <Text style={styles.resendHelp}>
              {hasSentCode
                ? "Didn't receive the code?"
                : 'Ready to verify this number?'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!canSendCode}
              onPress={() =>
                void handleSendCode(false)
              }
              style={styles.resendButton}
            >
              <Text
                style={[
                  styles.resendText,
                  !canSendCode &&
                    styles.resendTextDisabled,
                ]}
              >
                {resendRemaining > 0
                  ? `Send again in ${formatCountdown(
                      resendRemaining,
                    )}`
                  : hasSentCode
                    ? 'Resend verification code'
                    : 'Send verification code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color={COLORS.navy}
            />

            <Text style={styles.securityText}>
              Never share your verification code. StyleHub staff should never ask
              you for it.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={isBusy}
            onPress={() =>
              void handleLogout()
            }
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>
              Sign out
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 42,
  },

  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 36,
    backgroundColor: COLORS.navy,
  },

  title: {
    marginTop: 22,
    color: COLORS.navy,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },

  phoneCard: {
    marginTop: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
  },

  phoneLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 13,
  },

  phoneValue: {
    marginTop: 4,
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  changePhoneButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
  },

  changePhoneText: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: '700',
  },

  recoveryCard: {
    marginTop: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },

  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  recoveryIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },

  recoveryHeaderText: {
    flex: 1,
  },

  recoveryTitle: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '700',
  },

  recoveryDescription: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 8.5,
    lineHeight: 14,
  },

  fieldLabel: {
    marginTop: 15,
    marginBottom: 7,
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: '600',
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    color: COLORS.navy,
    backgroundColor: COLORS.surfaceSoft,
    fontSize: 11,
  },

  fieldHint: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: 7.8,
    lineHeight: 12,
  },

  passwordWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceSoft,
  },

  passwordInput: {
    flex: 1,
    minHeight: 46,
    paddingLeft: 13,
    paddingRight: 4,
    color: COLORS.navy,
    fontSize: 11,
  },

  passwordToggle: {
    width: 44,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recoveryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  cancelButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceSoft,
  },

  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  updateButton: {
    minHeight: 44,
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
  },

  updateButtonText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },

  codeLabel: {
    marginTop: 24,
    marginBottom: 8,
    color: COLORS.navy,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
  },

  codeInput: {
    width: '100%',
    minHeight: 62,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    color: COLORS.navy,
    backgroundColor: COLORS.surface,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.successSoft,
  },

  infoText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 9,
    lineHeight: 14,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
  },

  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 9,
    lineHeight: 14,
  },

  verifyButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
  },

  verifyButtonText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.45,
  },

  resendSection: {
    alignItems: 'center',
    marginTop: 19,
  },

  resendHelp: {
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },

  resendButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  resendText: {
    color: COLORS.blue,
    fontSize: 9.5,
    fontWeight: '700',
  },

  resendTextDisabled: {
    color: COLORS.textLight,
  },

  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 18,
    padding: 13,
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  securityText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 8.5,
    lineHeight: 14,
  },

  logoutButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  logoutText: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '600',
  },
});