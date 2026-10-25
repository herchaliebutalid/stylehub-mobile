
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
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import ShopOwnerServiceForm from '@/src/components/ShopOwnerServiceForm';
import { COLORS } from '@/src/constants/colors';
import {
  LAYOUT,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '@/src/constants/design';
import { useAuth } from '@/src/context/AuthContext';
import { ApiError } from '@/src/services/api';
import { createShopOwnerService } from '@/src/services/shop-owner-api';

/* PRICE HELPERS */

function cleanPriceInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const decimalIndex = cleaned.indexOf('.');

  if (decimalIndex === -1) {
    return cleaned;
  }

  const beforeDecimal = cleaned.slice(0, decimalIndex);
  const afterDecimal = cleaned
    .slice(decimalIndex + 1)
    .replace(/\./g, '')
    .slice(0, 2);

  return `${beforeDecimal}.${afterDecimal}`;
}

function validatePrice(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Enter the service price.';
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Price must be a valid number with at most 2 decimal places.';
  }

  const numeric = Number(trimmed);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'The service price must be greater than zero.';
  }

  if (numeric > 99999999.99) {
    return 'The service price is too large.';
  }

  return null;
}

/* MAIN ADD SERVICE SCREEN */

export default function CreateServiceScreen() {
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /* NAVIGATION */

  function handleBack() {
    router.replace(
      '/(shop-owner)/shop-owner/services',
    );
  }

  /* INPUT HANDLERS */

  function handlePriceChange(value: string) {
    setPrice(cleanPriceInput(value));
  }

  function handleDurationChange(value: string) {
    setDuration(value.replace(/[^0-9]/g, ''));
  }

  /* CREATE SERVICE */

  async function handleCreateService() {
    if (isSubmitting) {
      return;
    }

    setErrorMessage('');

    if (!token) {
      setErrorMessage(
        'You must be logged in to create a service.',
      );
      return;
    }

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    /* VALIDATE SERVICE NAME */

    if (
      cleanName.length < 2 ||
      cleanName.length > 120
    ) {
      setErrorMessage(
        'Service name must contain between 2 and 120 characters.',
      );
      return;
    }

    /* VALIDATE DESCRIPTION */

    if (cleanDescription.length > 2000) {
      setErrorMessage(
        'Description may not exceed 2000 characters.',
      );
      return;
    }

    /* VALIDATE PRICE */

    const priceError = validatePrice(price);

    if (priceError) {
      setErrorMessage(priceError);
      return;
    }

    /* VALIDATE DURATION */

    const durationMinutes = Number(duration.trim());

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 1440
    ) {
      setErrorMessage(
        'Duration must be a whole number between 5 and 1440 minutes.',
      );
      return;
    }

    /* SUBMIT TO LARAVEL */

    setIsSubmitting(true);

    try {
      const response = await createShopOwnerService(
        token,
        {
          name: cleanName,
          description: cleanDescription,
          price: Number(price).toFixed(2),
          durationMinutes,
          isActive,
        },
      );

      /*
       * After successful creation, open the
       * new service details screen so the
       * shop owner can add a service photo.
       *
       * Preserve the original route.
       */

      router.replace({
        pathname: '/(shop-owner)/service/[serviceId]',
        params: {
          serviceId: String(response.data.service.id),
          created: '1',
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to create service. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
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
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {/* TOP BAR */}

          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to services"
              onPress={handleBack}
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
                Add service
              </Text>

              <Text style={styles.topBarCaption}>
                Build your service menu
              </Text>
            </View>

            <View style={styles.topBarSpacer} />
          </View>

          {/* HEADER */}

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              NEW SERVICE
            </Text>

            <Text style={styles.title}>
              Create a service customers can book
            </Text>

            <Text style={styles.subtitle}>
              Add the service name, price, duration, and
              visibility. You can add a service photo
              immediately after creating it.
            </Text>
          </View>

          {/* STEP INFO */}

          <View style={styles.stepCard}>
            <View style={styles.stepIcon}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Step 1 of 2
              </Text>

              <Text style={styles.stepText}>
                Save the service details first. StyleHub
                will then open the service page where you
                can add its photo.
              </Text>
            </View>
          </View>

          {/* ERROR MESSAGE */}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Check your service details
                </Text>

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}

          {/* SERVICE FORM */}

          <View style={styles.formWrap}>
            <ShopOwnerServiceForm
              name={name}
              description={description}
              price={price}
              duration={duration}
              isActive={isActive}
              disabled={isSubmitting}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onPriceChange={handlePriceChange}
              onDurationChange={handleDurationChange}
              onActiveChange={setIsActive}
            />
          </View>

          {/* SAVE SERVICE */}

          <View style={styles.saveCard}>
            <View style={styles.saveCopy}>
              <Text style={styles.saveTitle}>
                Ready to add this service?
              </Text>

              <Text style={styles.saveText}>
                You can still edit all details later
                from your Services screen.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Create service"
              onPress={() => void handleCreateService()}
              style={[
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={COLORS.white}
                />
              )}

              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? 'Creating service...'
                  : 'Create service'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  /* 40px TOP SPACING */

  container: {
    width: '100%',
    maxWidth: LAYOUT.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 40,
    paddingBottom: 48,
  },

  /* TOP BAR */

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
    marginLeft: -10,
    borderRadius: RADII.pill,
  },

  topBarTitleBlock: {
    flex: 1,
    marginLeft: 4,
  },

  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  topBarCaption: {
    marginTop: 1,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.micro,
  },

  topBarSpacer: {
    width: LAYOUT.iconButtonSize,
    height: LAYOUT.iconButtonSize,
  },

  /* HEADER */

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
    maxWidth: 520,
    marginTop: 5,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 570,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
  },

  /* STEP CARD */

  stepCard: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },

  stepIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.accentSoft,
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  stepText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* ERROR BOX */

  errorBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADII.md,
    backgroundColor: COLORS.dangerSoft,
  },

  errorIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* SERVICE FORM */

  formWrap: {
    marginTop: 14,
  },

  /* SAVE CARD */

  saveCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
  },

  saveCopy: {
    marginBottom: 14,
  },

  saveTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },

  saveText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 18,
  },

  /* CREATE SERVICE BUTTON */

  primaryButton: {
    minHeight: LAYOUT.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.55,
  },
});
